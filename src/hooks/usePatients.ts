"use client";

import { useEffect, useMemo, useState } from "react";
import { Patient } from "@/types";

import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, setDoc } from "firebase/firestore";
import {
    buildDischargeRecord,
    buildDischargeRecordId,
    normalizeAgeGender,
    sanitizeSheetValue
} from "@/lib/utils";


export function usePatients() {
    type PatientEdit = Partial<Patient> & Record<string, unknown>;

    // Raw Data States
    const [sheetData, setSheetData] = useState<Patient[]>([]);
    const [transfers, setTransfers] = useState<Record<string, { consultant: string, unitId: number }>>({});
    const [patientEdits, setPatientEdits] = useState<Record<string, PatientEdit>>({});

    // UI States
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 1. Fetch Sheet Data (Base)
    const fetchSheetData = async () => {
        try {
            setLoading(true);
            const sheetRes = await fetch("/api/patients");
            if (!sheetRes.ok) throw new Error("Failed to fetch sheet data");
            const data: Patient[] = await sheetRes.json();
            setSheetData(data);
            setError("");
        } catch (err) {
            console.error(err);
            setError("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchSheetData();
    }, []);

    const sheetConsultants = useMemo(() => {
        const orthopaedicConsultants = new Map<string, string>();

        sheetData.forEach(patient => {
            const department = sanitizeSheetValue(patient.department).toLowerCase();
            if (!department.includes("orthop")) return;

            const consultant = sanitizeSheetValue(patient.consultant);
            if (!consultant) return;

            const normalizedConsultant = consultant.toLowerCase();
            if (!orthopaedicConsultants.has(normalizedConsultant)) {
                orthopaedicConsultants.set(normalizedConsultant, consultant);
            }
        });

        return Array.from(orthopaedicConsultants.values()).sort((a, b) => a.localeCompare(b));
    }, [sheetData]);

    // 2. Listen to Transfers (Real-time)
    useEffect(() => {
        const q = query(collection(db, "transfers"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.reduce((acc, doc) => {
                const d = doc.data();
                if (d.hospitalNo) {
                    acc[d.hospitalNo] = {
                        consultant: d.newConsultant,
                        unitId: d.unitId
                    };
                }
                return acc;
            }, {} as Record<string, { consultant: string, unitId: number }>);
            setTransfers(data);
        });
        return () => unsubscribe();
    }, []);

    // 3. Listen to Patient Details/Edits (Real-time)
    useEffect(() => {
        const q = query(collection(db, "patient_data"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data();
                return acc;
            }, {} as Record<string, PatientEdit>);
            setPatientEdits(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const trackedPatients = sheetData.filter(patient => {
            if (!patient.hospitalNo || !patient.bedNo) return false;

            const saved = patientEdits[patient.hospitalNo];
            return (
                !saved?.hasBeenInMainList ||
                saved?.lastKnownBedNo !== patient.bedNo ||
                sanitizeSheetValue(String(saved?.tempProvDx || "")) !== sanitizeSheetValue(patient.tempProvDx) ||
                sanitizeSheetValue(String(saved?.tempPlanSx || "")) !== sanitizeSheetValue(patient.tempPlanSx) ||
                sanitizeSheetValue(String(saved?.tempSxDate || "")) !== sanitizeSheetValue(patient.tempSxDate)
            );
        });

        if (trackedPatients.length === 0) return;

        const trackPresence = async () => {
            const timestamp = new Date().toISOString();

            await Promise.all(
                trackedPatients.map(patient =>
                    setDoc(
                        doc(db, "patient_data", patient.hospitalNo),
                        {
                            hasBeenInMainList: true,
                            lastSeenInMainListAt: timestamp,
                            lastKnownBedNo: patient.bedNo,
                            autoDischarged: false,
                            hospitalNo: patient.hospitalNo,
                            inPatNo: patient.inPatNo,
                            name: patient.name,
                            ageGender: normalizeAgeGender(patient.ageGender),
                            mobile: patient.mobile,
                            consultant: patient.consultant,
                            department: patient.department,
                            ipDate: patient.ipDate,
                            address: patient.address || "",
                            bedNo: patient.bedNo,
                            tempProvDx: patient.tempProvDx || "",
                            tempPlanSx: patient.tempPlanSx || "",
                            tempSxDate: patient.tempSxDate || ""
                        },
                        { merge: true }
                    )
                )
            );
        };

        trackPresence().catch(error => {
            console.error("Failed to persist mainlist presence", error);
        });
    }, [sheetData, patientEdits]);

    useEffect(() => {
        const activeSheetIds = new Set(sheetData.map(patient => patient.hospitalNo).filter(Boolean));
        const ghostDischargeCandidates = Object.entries(patientEdits)
            .filter(([hospitalNo, edit]) =>
                Boolean(
                    hospitalNo &&
                    !activeSheetIds.has(hospitalNo) &&
                    edit.hasBeenInMainList &&
                    edit.status !== "discharged" &&
                    !edit.autoDischarged
                )
            );

        if (ghostDischargeCandidates.length === 0) return;

        const syncGhostDischarges = async () => {
            const timestamp = new Date().toISOString();

            await Promise.all(
                ghostDischargeCandidates.map(async ([hospitalNo, edit]) => {
                    const dischargeRecordId =
                        (typeof edit.autoDischargeRecordId === "string" ? edit.autoDischargeRecordId : "") ||
                        buildDischargeRecordId({
                            hospitalNo,
                            inPatNo: edit.inPatNo || "",
                            ipDate: edit.ipDate || ""
                        });

                    const mergedPatient = {
                        id: hospitalNo,
                        hospitalNo,
                        inPatNo: edit.inPatNo || "",
                        name: edit.name || "",
                        consultant: edit.consultant || "",
                        department: edit.department || "",
                        mobile: edit.mobile || "",
                        ageGender: normalizeAgeGender(edit.ageGender || ""),
                        bedNo: edit.lastKnownBedNo || edit.bedNo || "",
                        ipDate: edit.ipDate || "",
                        address: edit.address || "",
                        diagnosis: edit.diagnosis || "",
                        procedure: edit.procedure || "",
                        tempProvDx: edit.tempProvDx || "",
                        tempPlanSx: edit.tempPlanSx || "",
                        tempSxDate: edit.tempSxDate || "",
                        plan: edit.plan || "",
                        history: edit.history || "",
                        examination: edit.examination || "",
                        investigation: edit.investigation || "",
                        surgeries: edit.surgeries || [],
                        followUp: edit.followUp || "",
                        autoDischarged: true,
                        autoDischargeRecordId: dischargeRecordId
                    } as Patient;

                    await setDoc(
                        doc(db, "discharges", dischargeRecordId),
                        buildDischargeRecord(mergedPatient, {
                            autoDischarged: true,
                            autoDischargeRecordId: dischargeRecordId,
                            dischargeSource: "automatic_missing_from_sheet",
                            timestamp
                        }),
                        { merge: true }
                    );

                    await setDoc(
                        doc(db, "patient_data", hospitalNo),
                        {
                            autoDischarged: true,
                            autoDischargeRecordId: dischargeRecordId,
                            autoDischargeAt: timestamp,
                            lastKnownBedNo: edit.lastKnownBedNo || edit.bedNo || "",
                            hasBeenInMainList: true
                        },
                        { merge: true }
                    );
                })
            );
        };

        syncGhostDischarges().catch(error => {
            console.error("Failed to sync ghost automatic discharges", error);
        });
    }, [sheetData, patientEdits]);

    // 4. Merge Everything whenever any source changes
    useEffect(() => {
        if (sheetData.length === 0 && Object.keys(patientEdits).length === 0) return;

        const mergedData = sheetData.map(p => {
            let patient = { ...p };

            // RE-ADMISSION LOGIC: 
            // If they are in the sheetData, they are ACTIVE. 
            // Force status to "admitted" (or elective if already set by mapPatient)
            // This overrides any stale "discharged" status in Firebase.
            if (patient.status !== "elective") {
                patient.status = "admitted";
            }

            // Apply Transfers
            if (transfers[p.hospitalNo]) {
                patient.consultant = transfers[p.hospitalNo].consultant;
            }

            // Apply Edits (Notes, etc.) - BUT prefer Sheet data if Edit has error
            if (patientEdits[p.hospitalNo]) {
                const edit = patientEdits[p.hospitalNo];

                // Fields that ALWAYS come from Sheet (census authority)
                const LOCKED_FIELDS = ["bedNo", "name", "ageGender", "consultant", "ipDate", "hospitalNo", "status"];

                // Only merge fields that are NOT errors AND NOT locked
                const cleanEdit: Record<string, unknown> = {};
                Object.keys(edit).forEach(key => {
                    const val = edit[key];
                    const isBad = typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"));
                    const isLocked = LOCKED_FIELDS.includes(key);

                    if (!isBad && !isLocked) {
                        // Persist historical data if current sheet has it empty
                        const currentVal = (patient as Record<string, unknown>)[key];
                        const isCurrentEmpty = !currentVal || currentVal === "";

                        if (isCurrentEmpty) {
                            cleanEdit[key] = val;
                        } else {
                            // If current sheet has data, prefer sheet data for major fields
                            // but maybe keep the edit if it's more descriptive? 
                            // For now, let sheet win if it provides data.
                            cleanEdit[key] = currentVal;
                        }
                    }
                });

                patient = { ...patient, ...cleanEdit };
                patient.hasBeenInMainList = Boolean(edit.hasBeenInMainList);
                patient.autoDischarged = false;
                patient.autoDischargeRecordId = edit.autoDischargeRecordId || "";
            }

            // Sanitize
            patient.ipDate = sanitizeSheetValue(patient.ipDate);
            patient.name = sanitizeSheetValue(patient.name);
            patient.bedNo = sanitizeSheetValue(patient.bedNo);
            patient.ageGender = normalizeAgeGender(patient.ageGender);

            return patient;
        });

        // 5. Handle "Ghost" Patients (In transfers OR edits but not in Sheet)
        const sheetIds = new Set(sheetData.map(p => p.hospitalNo));
        const allTrackedIds = new Set([...Object.keys(transfers), ...Object.keys(patientEdits)]);

        const ghostPatients: Patient[] = Array.from(allTrackedIds).filter(id => !sheetIds.has(id)).map(id => {
            const savedData = patientEdits[id] || {};
            const transferData = transfers[id];

            if (!savedData && !transferData) return null;

            // Determine Consultant
            const persistentConsultant = transferData?.consultant || savedData.consultant || "";

            return {
                id: id,
                hospitalNo: id,
                ...savedData,
                name: savedData.name || "",
                ageGender: normalizeAgeGender(savedData.ageGender || "N/A"),
                bedNo: "",
                ipDate: savedData.ipDate || "Unknown",
                consultant: persistentConsultant,
                status: savedData.status || "admitted",
                isGhost: true,
                hasBeenInMainList: Boolean(savedData.hasBeenInMainList),
                autoDischarged: Boolean(savedData.autoDischargeRecordId) || Boolean(savedData.hasBeenInMainList),
                autoDischargeRecordId: savedData.autoDischargeRecordId || ""
            } as Patient;
        }).filter(Boolean) as Patient[];

        const finalData = [...mergedData, ...ghostPatients];
        setPatients(finalData);

        console.log(`Merged ${sheetData.length} from sheet + ${ghostPatients.length} ghosts. Total: ${finalData.length}`);
    }, [sheetData, transfers, patientEdits]);

    return { patients, loading, error, refresh: fetchSheetData, sheetConsultants };
}
