"use client";

import { Patient } from "@/types";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { parseAnyDate } from "@/lib/utils";
import PatientDetailModal from "./PatientDetailModal";
import PatientSummaryModal from "./PatientSummaryModal";
import DischargeForm from "./DischargeForm";
import RoundMap from "./RoundMap";
import CalendarView from "./CalendarView";

interface PatientListProps {
    patients: Patient[];
    onUpdatePatient?: (patient: Patient) => Promise<void>;
    onDischargePatient?: (patient: Patient) => void;
    onTransferPatient?: (patient: Patient, consultant: string) => void;
    consultants?: string[];
    onRemovePatient?: (patient: Patient) => void;
    viewMode?: "table" | "cards" | "floor" | "list" | "calendar" | "grid"; // Added calendar and grid
    title?: string;
    unitId?: number;
    onPatientClick?: (patient: Patient) => void;
    readOnly?: boolean;
    groupByDate?: boolean;
    highlightConsultants?: string[];
    collapsible?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    groups?: import("@/utils/bedGrouping").BedGroup[];
    showConsultantInitials?: boolean;
}

export default function PatientList({
    patients,
    onUpdatePatient,
    onDischargePatient,
    onTransferPatient,
    consultants,
    onRemovePatient,
    viewMode = "cards",
    groups,
    onPatientClick,
    title,
    collapsible,
    isCollapsed: externalIsCollapsed,
    onToggleCollapse,
    groupByDate,
    showConsultantInitials
}: PatientListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showDischargeForm, setShowDischargeForm] = useState(false);
    const [dischargePatient, setDischargePatient] = useState<Patient | null>(null);
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

    const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
    const handleToggleCollapse = () => {
        if (onToggleCollapse) {
            onToggleCollapse();
        } else {
            setInternalIsCollapsed(!internalIsCollapsed);
        }
    };

    // Filter Logic
    const filteredPatients = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase();
        return patients.filter(p =>
            (p.name?.toLowerCase() || "").includes(lowerQuery) ||
            p.hospitalNo?.includes(lowerQuery) ||
            (p.bedNo?.toLowerCase() || "").includes(lowerQuery) ||
            (p.consultant?.toLowerCase() || "").includes(lowerQuery) ||
            (p.diagnosis?.toLowerCase() || "").includes(lowerQuery)
        );
    }, [patients, searchQuery]);

    const handleCardClick = (patient: Patient) => {
        if (onPatientClick) {
            onPatientClick(patient);
        } else {
            setSelectedPatient(patient);
        }
    };

    const handleDischargeClick = (patient: Patient) => {
        setDischargePatient(patient);
        setShowDischargeForm(true);
    };

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                {/* Title & Collapse */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    {collapsible ? (
                        <button
                            onClick={handleToggleCollapse}
                            className="flex items-center space-x-2 w-full text-left hover:bg-white/5 rounded px-2 py-1 transition-colors"
                        >
                            {isCollapsed ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />}
                            {title && (
                                <h2 className="text-xl font-bold text-white uppercase tracking-wider">{title}</h2>
                            )}
                            <span className="text-sm font-medium text-gray-400">({patients.length})</span>
                        </button>
                    ) : (
                        title && (
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">{title}</h2>
                        )
                    )}
                </div>

                {/* Search */}
                {!collapsible && (
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-full bg-white/5 py-2 pl-10 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                )}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {viewMode === "table" ? (
                            groupByDate ? (
                                <div className="space-y-8">
                                    {(() => {
                                        // 1. Group Patients
                                        const grouped = filteredPatients.reduce((acc, patient) => {
                                            const date = patient.ipDate || "Unknown Date";
                                            if (!acc[date]) acc[date] = [];
                                            acc[date].push(patient);
                                            return acc;
                                        }, {} as Record<string, Patient[]>);

                                        // 2. Sort Dates
                                        const sortedDates = Object.keys(grouped).sort((a, b) => {
                                            if (a === "Unknown Date") return 1;
                                            if (b === "Unknown Date") return -1;
                                            try {
                                                const dateA = new Date(a);
                                                const dateB = new Date(b);
                                                if (isNaN(dateA.getTime())) return 1;
                                                if (isNaN(dateB.getTime())) return -1;
                                                return dateB.getTime() - dateA.getTime();
                                            } catch { return 0; }
                                        });

                                        // 3. Render Groups
                                        return sortedDates.map(dateStr => (
                                            <div key={dateStr} className="space-y-3">
                                                <h3 className="text-lg font-bold text-primary/80 uppercase tracking-wider pl-2 border-l-4 border-primary/50">
                                                    {(() => {
                                                        if (dateStr === "Unknown Date") return "Unknown Date";
                                                        try {
                                                            const d = new Date(dateStr);
                                                            if (isNaN(d.getTime())) return dateStr;
                                                            const today = new Date();
                                                            const yesterday = new Date();
                                                            yesterday.setDate(yesterday.getDate() - 1);

                                                            if (d.toDateString() === today.toDateString()) return "Today";
                                                            if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
                                                            return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                                        } catch { return dateStr; }
                                                    })()}
                                                    <span className="ml-2 text-sm text-gray-500">({grouped[dateStr].length})</span>
                                                </h3>
                                                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                                    <table className="w-full text-left text-sm text-gray-400">
                                                        <thead className="bg-black/20 text-xs font-bold uppercase text-gray-500">
                                                            <tr>
                                                                <th className="p-4">ID</th>
                                                                <th className="p-4">Name</th>
                                                                <th className="p-4">Age/Sex</th>
                                                                <th className="p-4">Phone</th>
                                                                <th className="p-4">Bed</th>
                                                                <th className="p-4">DOA</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {grouped[dateStr].map(patient => (
                                                                <tr
                                                                    key={patient.id}
                                                                    onClick={() => handleCardClick(patient)}
                                                                    className="cursor-pointer hover:bg-white/5"
                                                                >
                                                                    <td className="p-4 text-xs">{patient.hospitalNo}</td>
                                                                    <td className="p-4 font-bold text-white uppercase">{patient.name}</td>
                                                                    <td className="p-4 uppercase">{patient.ageGender}</td>
                                                                    <td className="p-4">{patient.mobile || "N/A"}</td>
                                                                    <td className="p-4 font-bold text-primary">{patient.bedNo}</td>
                                                                    <td className="p-4 text-xs">{patient.ipDate}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-black/20 text-xs font-bold uppercase text-gray-500">
                                            <tr>
                                                <th className="p-4">ID</th>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">Age/Sex</th>
                                                <th className="p-4">Phone</th>
                                                <th className="p-4">Bed</th>
                                                <th className="p-4">DOA</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredPatients.map(patient => (
                                                <tr
                                                    key={patient.id}
                                                    onClick={() => handleCardClick(patient)}
                                                    className="cursor-pointer hover:bg-white/5"
                                                >
                                                    <td className="p-4 text-xs">{patient.hospitalNo}</td>
                                                    <td className="p-4 font-bold text-white uppercase">{patient.name}</td>
                                                    <td className="p-4 uppercase">{patient.ageGender}</td>
                                                    <td className="p-4">{patient.mobile}</td>
                                                    <td className="p-4 font-bold text-primary">{patient.bedNo}</td>
                                                    <td className="p-4 text-xs">{patient.ipDate}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : viewMode === "calendar" ? (
                            <CalendarView
                                patients={filteredPatients}
                                onPatientClick={handleCardClick}
                                showConsultantInitials={showConsultantInitials}
                            />
                        ) : (
                            // Floor / Cards / Grid (re-using RoundMap for now as it supports grid layout)
                            <RoundMap
                                patients={filteredPatients}
                                onPatientClick={handleCardClick}
                                grouped={viewMode !== "grid"}
                                onSaveLayout={async (updatedPatients) => {
                                    for (const p of updatedPatients) {
                                        if (onUpdatePatient) await onUpdatePatient(p);
                                    }
                                }}
                                groups={groups}
                                showConsultantInitials={showConsultantInitials}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {selectedPatient && (
                viewMode === "calendar" ? (
                    <PatientSummaryModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        onTransfer={onTransferPatient}
                        consultants={consultants}
                    />
                ) : (
                    <PatientDetailModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        onSave={onUpdatePatient || (async () => { })}
                        onDischarge={handleDischargeClick}
                        onTransfer={onTransferPatient}
                        consultants={consultants}
                        onRemove={onRemovePatient}
                    />
                )
            )}

            {showDischargeForm && dischargePatient && (
                <DischargeForm
                    patient={dischargePatient}
                    onClose={() => setShowDischargeForm(false)}
                    onConfirmDischarge={(data) => {
                        if (onDischargePatient) onDischargePatient({ ...dischargePatient, ...data, status: "discharged" });
                        setShowDischargeForm(false);
                    }}
                />
            )}
        </div>
    );
}
