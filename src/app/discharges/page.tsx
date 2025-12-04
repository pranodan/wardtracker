"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Patient } from "@/types";
import PatientList from "@/components/ward/PatientList";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import DischargeForm from "@/components/ward/DischargeForm";

export default function DischargesPage() {
    const [discharges, setDischarges] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDischarge, setSelectedDischarge] = useState<Patient | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchDischarges = async () => {
            try {
                const q = query(collection(db, "discharges"), orderBy("timestamp", "desc"));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
                setDischarges(data);
            } catch (error) {
                console.error("Error fetching discharges:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDischarges();
    }, []);

    return (
        <main className="min-h-screen bg-background p-4 pb-20">
            <div className="sticky top-0 z-20 mb-6 flex items-center space-x-4 glass border-b border-white/10 p-4">
                <button onClick={() => router.back()} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-white">Discharged Patients</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : (
                <PatientList
                    patients={discharges}
                    title="Recent Discharges"
                    readOnly={true}
                    collapsible={false}
                    onPatientClick={setSelectedDischarge}
                />
            )}

            {selectedDischarge && (
                <DischargeForm
                    patient={selectedDischarge}
                    onClose={() => setSelectedDischarge(null)}
                    onConfirmDischarge={() => { }} // Read-only mostly, or update if needed
                />
            )}
        </main>
    );
}
