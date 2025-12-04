"use client";

import { Patient } from "@/types";
import { motion } from "framer-motion";
import { differenceInDays, parseISO, isValid, compareDesc } from "date-fns";

interface PatientCardProps {
    patient: Patient;
    onClick: (patient: Patient) => void;
}

export default function PatientCard({ patient, onClick }: PatientCardProps) {
    const hasDiagnosis = !!patient.diagnosis;
    const procedures: { text: string; date: Date }[] = [];

    // Helper to calculate POD
    const getPOD = (dateString?: string) => {
        if (!dateString) return "";
        try {
            const date = parseISO(dateString);
            if (!isValid(date)) return "";
            const today = new Date();
            const diff = differenceInDays(today, date);
            return diff >= 0 ? `${diff}POD` : "";
        } catch (e) {
            return "";
        }
    };

    if (patient.procedure) {
        const pod = getPOD(patient.dop);
        procedures.push({
            text: pod ? `${pod} ${patient.procedure}` : patient.procedure,
            date: patient.dop ? parseISO(patient.dop) : new Date(0)
        });
    }
    if (patient.surgeries) {
        patient.surgeries.forEach(s => {
            const pod = getPOD(s.dop);
            procedures.push({
                text: pod ? `${pod} ${s.procedure}` : s.procedure,
                date: s.dop ? parseISO(s.dop) : new Date(0)
            });
        });
    }

    // Sort by date descending (latest first)
    procedures.sort((a, b) => compareDesc(a.date, b.date));

    // Extract text only
    const procedureTexts = procedures.map(p => p.text);

    // Surgery Display Logic: If > 2 procedures, join with comma. Otherwise, stack them?
    const useCommaSeparation = procedureTexts.length > 2;

    return (
        <motion.div
            layout
            onClick={() => onClick(patient)}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-[#121212] p-4 shadow-lg transition-colors hover:border-primary/30 hover:bg-[#1a1a1a]"
        >
            <div className={`absolute left-0 top-0 h-full w-1 ${hasDiagnosis ? 'bg-primary' : 'bg-red-500'}`} />
            <div className="pl-3">
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-baseline space-x-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{patient.name}</h3>
                        <span className="text-sm font-bold text-white uppercase">{patient.ageGender}</span>
                    </div>
                    <div className="flex items-center justify-center rounded bg-white/10 px-2 py-1 text-xs font-bold text-primary">
                        {patient.bedNo}
                    </div>
                </div>
                <div className="mb-1">
                    <p className={`line-clamp-2 text-xs font-medium ${hasDiagnosis ? 'text-gray-300' : 'text-red-400 italic'}`}>
                        {patient.diagnosis || "No Diagnosis Recorded"}
                    </p>
                </div>
                <div className="mt-2">
                    {procedureTexts.length > 0 ? (
                        useCommaSeparation ? (
                            <div className="text-[10px] font-medium text-primary uppercase leading-tight">
                                {procedureTexts.join(", ")}
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-1">
                                {procedureTexts.map((proc, idx) => (
                                    <span key={idx} className="text-[10px] font-medium text-primary uppercase">
                                        {proc}
                                    </span>
                                ))}
                            </div>
                        )
                    ) : (
                        <span className="text-[10px] text-gray-600 italic">No Procedures</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
