"use client";

import { Patient } from "@/types";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isToday, isYesterday, isValid, compareDesc } from "date-fns";
import PatientCard from "./PatientCard";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CalendarViewProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
}

export default function CalendarView({ patients, onPatientClick }: CalendarViewProps) {
    const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

    const toggleDate = (dateStr: string) => {
        setCollapsedDates(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    };

    // Group by Date
    const groupedPatients = patients.reduce((acc, patient) => {
        const dateStr = patient.ipDate || "Unknown Date";
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(patient);
        return acc;
    }, {} as Record<string, Patient[]>);

    // Sort Dates Descending
    const sortedDates = Object.keys(groupedPatients).sort((a, b) => {
        if (a === "Unknown Date") return 1;
        if (b === "Unknown Date") return -1;

        let dateA, dateB;
        try {
            dateA = parseISO(a);
            dateB = parseISO(b);
        } catch (e) {
            return 0;
        }

        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;
        return compareDesc(dateA, dateB);
    });

    const handleCollapseAll = () => {
        const allCollapsed = sortedDates.reduce((acc, date) => ({ ...acc, [date]: true }), {});
        setCollapsedDates(allCollapsed);
    };

    const handleExpandAll = () => {
        setCollapsedDates({});
    };

    const getDateHeader = (dateStr: string) => {
        if (dateStr === "Unknown Date") return "Unknown Date";
        try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return dateStr;

            if (isToday(date)) return "Today";
            if (isYesterday(date)) return "Yesterday";
            return format(date, "EEEE, MMMM d, yyyy");
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end space-x-2">
                <button onClick={handleExpandAll} className="text-xs text-primary hover:text-primary/80">Expand All</button>
                <span className="text-xs text-gray-600">|</span>
                <button onClick={handleCollapseAll} className="text-xs text-primary hover:text-primary/80">Collapse All</button>
            </div>
            {sortedDates.map(dateStr => {
                const groupPatients = groupedPatients[dateStr];
                const isCollapsed = collapsedDates[dateStr];

                return (
                    <div key={dateStr} className="space-y-3">
                        <button
                            onClick={() => toggleDate(dateStr)}
                            className="flex w-full items-center space-x-2 border-b border-white/10 pb-2 text-left hover:bg-white/5 rounded px-2 transition-colors"
                        >
                            {isCollapsed ? <ChevronRight size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
                            <h3 className="text-lg font-bold text-primary/80 uppercase tracking-wider">
                                {getDateHeader(dateStr)}
                            </h3>
                            <span className="text-sm font-medium text-gray-400">({groupPatients.length})</span>
                        </button>

                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
                                        {groupPatients.map(patient => (
                                            <PatientCard key={patient.id} patient={patient} onClick={onPatientClick} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
