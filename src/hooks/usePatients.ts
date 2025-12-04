"use client";

import { useState, useEffect } from "react";
import { Patient } from "@/types";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, onSnapshot } from "firebase/firestore";


export function usePatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let unsubscribeTransfers: () => void;
        let unsubscribeData: () => void;

        const fetchData = async () => {
            try {
                // 1. Fetch Base Data from Sheets (Static for now, re-fetch on mount)
                const sheetRes = await fetch("/api/patients");
                if (!sheetRes.ok) throw new Error("Failed to fetch sheet data");
                const sheetData: Patient[] = await sheetRes.json();

                // 2. Listen to Transfers (Real-time)
                const transfersQuery = query(collection(db, "transfers"));
                unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => {
                    const transfers = snapshot.docs.reduce((acc, doc) => {
                        const data = doc.data();
                        if (data.hospitalNo) {
                            acc[data.hospitalNo] = {
                                consultant: data.newConsultant,
                                unitId: data.unitId
                            };
                        }
                        return acc;
                    }, {} as Record<string, { consultant: string, unitId: number }>);

                    // 3. Listen to Patient Details/Edits (Real-time)
                    const dataQuery = query(collection(db, "patient_data"));
                    unsubscribeData = onSnapshot(dataQuery, (dataSnapshot) => {
                        const patientEdits = dataSnapshot.docs.reduce((acc, doc) => {
                            acc[doc.id] = doc.data(); // doc.id should be hospitalNo
                            return acc;
                        }, {} as Record<string, any>);

                        // 4. Merge Everything
                        const mergedData = sheetData.map(p => {
                            let patient = { ...p };

                            // Apply Transfers
                            if (transfers[p.hospitalNo]) {
                                patient.consultant = transfers[p.hospitalNo].consultant;
                                // We could also override unitId if we had it in Patient type
                            }

                            // Apply Edits (Notes, etc.)
                            if (patientEdits[p.hospitalNo]) {
                                patient = { ...patient, ...patientEdits[p.hospitalNo] };
                            }

                            return patient;
                        });

                        // 5. Handle "Ghost" Patients (In transfers but not in Sheet)
                        const sheetIds = new Set(sheetData.map(p => p.hospitalNo));
                        const ghostPatients: Patient[] = Object.keys(transfers).filter(id => !sheetIds.has(id)).map(id => {
                            const savedData = patientEdits[id] || {};
                            return {
                                id: id, // Use hospitalNo as ID
                                hospitalNo: id,
                                name: savedData.name || "Unknown Patient (Transferred)",
                                ageGender: savedData.ageGender || "N/A",
                                bedNo: savedData.bedNo || "N/A",
                                ipDate: savedData.ipDate || "Unknown",
                                consultant: transfers[id].consultant,
                                ...savedData,
                                status: "marked_for_discharge" // Force status
                            } as Patient;
                        });

                        const finalData = [...mergedData, ...ghostPatients];

                        setPatients(finalData);
                        setLoading(false);
                    });
                });

            } catch (err) {
                console.error(err);
                setError("Failed to sync with server");
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            if (unsubscribeTransfers) unsubscribeTransfers();
            if (unsubscribeData) unsubscribeData();
        };
    }, []);

    return { patients, loading, error };
}
