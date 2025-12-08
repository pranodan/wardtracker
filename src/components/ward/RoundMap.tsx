"use client";

import { Patient } from "@/types";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBedGroup, DEFAULT_BED_GROUPS } from "@/utils/bedGrouping";
import PatientCard from "./PatientCard";
import { ChevronDown, ChevronRight } from "lucide-react";

interface RoundMapProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
    onSaveLayout?: (patients: Patient[]) => void;
    grouped?: boolean;
    groups?: import("@/utils/bedGrouping").BedGroup[];
    showConsultantInitials?: boolean;
}

export default function RoundMap({ patients, onPatientClick, onSaveLayout, grouped = true, groups = DEFAULT_BED_GROUPS, showConsultantInitials }: RoundMapProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Group patients
    const groupedPatients = patients.reduce((acc, patient) => {
        const group = getBedGroup(patient.bedNo, groups);
        if (!acc[group]) acc[group] = [];
        acc[group].push(patient);
        return acc;
    }, {} as Record<string, Patient[]>);

    // Get groups in order, plus any others found
    const sortedGroupNames = [
        ...groups.map(g => g.name),
        ...Object.keys(groupedPatients).filter(k => !groups.some(bg => bg.name === k))
    ];

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const handleCollapseAll = () => {
        const allCollapsed = sortedGroupNames.reduce((acc, name) => ({ ...acc, [name]: true }), {});
        setCollapsedGroups(allCollapsed);
    };

    const handleExpandAll = () => {
        setCollapsedGroups({});
    };

    if (!grouped) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {patients.map(patient => (
                    <PatientCard
                        key={patient.id}
                        patient={patient}
                        onClick={onPatientClick}
                        showConsultantInitials={showConsultantInitials}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end space-x-2">
                <button onClick={handleExpandAll} className="text-xs text-primary hover:text-primary/80">Expand All</button>
                <span className="text-xs text-gray-600">|</span>
                <button onClick={handleCollapseAll} className="text-xs text-primary hover:text-primary/80">Collapse All</button>
            </div>
            {sortedGroupNames.map(groupName => {
                const groupPatients = groupedPatients[groupName];
                if (!groupPatients || groupPatients.length === 0) return null;
                const isCollapsed = collapsedGroups[groupName];

                return (
                    <div key={groupName} className="space-y-3">
                        <button
                            onClick={() => toggleGroup(groupName)}
                            className="flex w-full items-center space-x-2 border-b border-white/10 pb-2 text-left hover:bg-white/5 rounded px-2 transition-colors"
                        >
                            {isCollapsed ? <ChevronRight size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
                            <h3 className="text-lg font-bold text-primary/80 uppercase tracking-wider">
                                {groupName}
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
                                            <PatientCard
                                                key={patient.id}
                                                patient={patient}
                                                onClick={onPatientClick}
                                                showConsultantInitials={showConsultantInitials}
                                            />
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
