"use client";

import { Patient } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { parseAnyDate, cn } from "@/lib/utils";
import PatientDetailModal from "./PatientDetailModal";
import PatientSummaryModal from "./PatientSummaryModal";
import DischargeForm from "./DischargeForm";
import RoundMap from "./RoundMap";
import CalendarView from "./CalendarView";
import GalleryView from "./GalleryView";
import { formatBulkPatientList } from "@/utils/patientFormatter";

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
    enableBulkCopy?: boolean;
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
    showConsultantInitials,
    unitId,
    enableBulkCopy
}: PatientListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showDischargeForm, setShowDischargeForm] = useState(false);
    const [dischargePatient, setDischargePatient] = useState<Patient | null>(null);
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [editingQueue, setEditingQueue] = useState<Patient[]>([]);
    const [pendingIncompletePatients, setPendingIncompletePatients] = useState<Patient[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;

    const handleToggleCollapse = () => {
        if (onToggleCollapse) {
            onToggleCollapse();
        } else {
            setInternalIsCollapsed(!internalIsCollapsed);
        }
    };

    // Serial Editing Logic
    const startSerialEditing = (incompletePatients: Patient[]) => {
        setEditingQueue(incompletePatients);
        if (incompletePatients.length > 0) {
            setSelectedPatient(incompletePatients[0]);
        }
    };

    const handleSerialSave = async (updatedPatient: Patient) => {
        if (onUpdatePatient) {
            await onUpdatePatient(updatedPatient);
        }

        // Remove processed patient from queue
        // Note: We use the *updated* patient ID just in case, but index 0 is always current
        const nextQueue = editingQueue.slice(1);
        setEditingQueue(nextQueue);

        if (nextQueue.length > 0) {
            setSelectedPatient(nextQueue[0]);
        } else {
            setSelectedPatient(null);
            // Finished!
            alert("Editing Complete. Please click 'Copy All Details' again to copy the updated data.");
        }
    };

    const handleSerialSkip = () => {
        const nextQueue = editingQueue.slice(1);
        setEditingQueue(nextQueue);
        if (nextQueue.length > 0) {
            setSelectedPatient(nextQueue[0]);
        } else {
            setSelectedPatient(null);
        }
    };

    const performCopy = (targetPatients: Patient[]) => {
        const text = formatBulkPatientList(title || "Unit List", targetPatients);
        navigator.clipboard.writeText(text);

        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleBulkCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!patients || patients.length === 0) return;

        // Check for incomplete
        const incomplete = patients.filter(p => {
            // 1. Diagnosis Check
            const diag = p.diagnosis?.trim() || "";
            const isDiagInvalid = diag === "" || diag.toLowerCase().includes("no diagnosis");

            // 2. Procedure Check
            // Valid if: has procedure string OR has surgeries array
            const procStr = p.procedure?.trim() || "";
            const hasSurgeries = p.surgeries && p.surgeries.length > 0;
            const isProcInvalid = procStr === "" && !hasSurgeries;

            // 3. Plan Check
            const plan = p.plan?.trim() || "";
            const isPlanInvalid = plan === "" || plan.toLowerCase().includes("to be decided");

            return isDiagInvalid || isProcInvalid || isPlanInvalid;
        });

        if (incomplete.length > 0) {
            setPendingIncompletePatients(incomplete);
            return;
        }

        performCopy(patients);
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

    if (!isMounted) return null;

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

                {/* Bulk Copy Button - Exclusively for enabled lists (Consultant View) */}
                {enableBulkCopy && (
                    <button
                        onClick={handleBulkCopy}
                        className={cn(
                            "flex items-center space-x-2 rounded-full px-4 py-2 text-xs font-bold transition-all",
                            hasCopied
                                ? "bg-green-500/20 text-green-400"
                                : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        title="Copy All Patients"
                    >
                        {hasCopied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{hasCopied ? "Copied All" : "Copy All Details"}</span>
                    </button>
                )}

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

            {/* Incomplete Patients Warning Modal */}
            {pendingIncompletePatients.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Incomplete Patient Details</h3>
                            <p className="text-gray-400">
                                {pendingIncompletePatients.length} patients have missing Diagnosis, Procedure, or Plan.
                            </p>
                            <p className="text-sm text-gray-500">
                                It is recommended to review and update these details before copying.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={() => {
                                    startSerialEditing(pendingIncompletePatients);
                                    setPendingIncompletePatients([]);
                                }}
                                className="w-full bg-primary hover:bg-primary/80 text-black font-bold py-3 rounded-xl transition-all"
                            >
                                Review & Edit (Recommended)
                            </button>
                            <button
                                onClick={() => {
                                    performCopy(patients);
                                    setPendingIncompletePatients([]);
                                }}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-xl transition-all"
                            >
                                Ignore & Copy Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            unitId ? (
                                <GalleryView
                                    patients={filteredPatients}
                                    onPatientClick={handleCardClick}
                                    showConsultantInitials={showConsultantInitials}
                                />
                            ) : (
                                <CalendarView
                                    patients={filteredPatients}
                                    onPatientClick={handleCardClick}
                                    showConsultantInitials={showConsultantInitials}
                                />
                            )
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
                        onClose={() => {
                            setSelectedPatient(null);
                            setEditingQueue([]); // Cancel serial edit on manual close
                        }}
                        onSave={onUpdatePatient || (async () => { })}
                        onDischarge={handleDischargeClick}
                        onTransfer={onTransferPatient}
                        consultants={consultants}
                        onRemove={onRemovePatient}
                        // Serial Edit Props
                        onSaveAndNext={editingQueue.length > 0 ? handleSerialSave : undefined}
                        onSkip={editingQueue.length > 0 ? handleSerialSkip : undefined}
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
                    onSave={async (p) => {
                        if (onUpdatePatient) await onUpdatePatient(p as Patient);
                        setShowDischargeForm(false);
                    }}
                />
            )}
        </div>
    );
}
