"use client";

import { useState, useEffect } from "react";
import { Patient } from "@/types";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, onSnapshot } from "firebase/firestore";


export function usePatients() {
    // Raw Data States
    const [sheetData, setSheetData] = useState<Patient[]>([]);
    const [transfers, setTransfers] = useState<Record<string, { consultant: string, unitId: number }>>({});
    const [patientEdits, setPatientEdits] = useState<Record<string, any>>({});

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
            }, {} as Record<string, any>);
            setPatientEdits(data);
        });
        return () => unsubscribe();
    }, []);

    // 4. Merge Everything whenever any source changes
    useEffect(() => {
        if (sheetData.length === 0 && Object.keys(patientEdits).length === 0) return;

        const sanitize = (val: string | undefined) => {
            if (!val) return "";
            if (typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"))) {
                return "";
            }
            return val;
        };

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
                const cleanEdit: any = {};
                Object.keys(edit).forEach(key => {
                    const val = edit[key];
                    const isBad = typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"));
                    const isLocked = LOCKED_FIELDS.includes(key);

                    if (!isBad && !isLocked) {
                        // Persist historical data if current sheet has it empty
                        const currentVal = (patient as any)[key];
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
            }

            // Sanitize
            patient.ipDate = sanitize(patient.ipDate);
            patient.name = sanitize(patient.name);
            patient.bedNo = sanitize(patient.bedNo);

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
                name: savedData.name || "Unknown Patient (Left Census)",
                ageGender: savedData.ageGender || "N/A",
                bedNo: "",
                ipDate: savedData.ipDate || "Unknown",
                consultant: persistentConsultant,
                status: savedData.status || "admitted",
                isGhost: true
            } as Patient;
        }).filter(Boolean) as Patient[];

        const finalData = [...mergedData, ...ghostPatients];
        setPatients(finalData);

        console.log(`Merged ${sheetData.length} from sheet + ${ghostPatients.length} ghosts. Total: ${finalData.length}`);
    }, [sheetData, transfers, patientEdits]);

    return { patients, loading, error, refresh: fetchSheetData };
}
