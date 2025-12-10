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

            // Apply Transfers
            if (transfers[p.hospitalNo]) {
                patient.consultant = transfers[p.hospitalNo].consultant;
            }

            // Apply Edits (Notes, etc.) - BUT prefer Sheet data if Edit has error
            if (patientEdits[p.hospitalNo]) {
                const edit = patientEdits[p.hospitalNo];

                // Fields that ALWAYS come from Sheet (unless missing in Sheet)
                const LOCKED_FIELDS = ["bedNo", "name", "ageGender", "consultant", "ipDate", "hospitalNo", "procedure"];

                // Only merge fields that are NOT errors AND NOT locked
                const cleanEdit: any = {};
                Object.keys(edit).forEach(key => {
                    const val = edit[key];
                    // Check if value is a "Bad Spreadsheet Value"
                    const isBad = typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"));

                    // Check if we should ignore this edit because Sheet has authority
                    // We only ignore the edit if the Sheet actually provided a value (which it did, because 'p' comes from sheetData)
                    // Note: If you want Sheet to ALWAYS win even if empty, remove the check.
                    // Here we let Sheet win.
                    const isLocked = LOCKED_FIELDS.includes(key);

                    if (!isBad && !isLocked) {
                        cleanEdit[key] = val;
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

            // If we have neither saved data nor transfer data, we can't reconstruct the patient
            // (This shouldn't happen given the key union, but for safety)
            if (!savedData && !transferData) return null;

            // Determine Consultant: Transfer > Saved > "Unknown"
            // If they have NO consultant, they won't show in any Unit list anyway, but we should create the object.
            const persistentConsultant = transferData?.consultant || savedData.consultant || "";

            return {
                id: id,
                hospitalNo: id,
                // Spread saved data FIRST
                ...savedData,
                name: savedData.name || "Unknown Patient (Left Census)",
                ageGender: savedData.ageGender || "N/A",
                bedNo: "", // Ghost patients have no bed in the Census
                ipDate: savedData.ipDate || "Unknown",
                consultant: persistentConsultant,
                status: savedData.status || "admitted",
                isGhost: true // Flag for UI
            } as Patient;
        }).filter(Boolean) as Patient[];

        const finalData = [...mergedData, ...ghostPatients];
        setPatients(finalData);
    }, [sheetData, transfers, patientEdits]);

    return { patients, loading, error, refresh: fetchSheetData };
}
