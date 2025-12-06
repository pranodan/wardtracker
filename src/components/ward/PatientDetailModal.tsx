"use client";

import { Patient } from "@/types";
import { X, Save, Activity, ClipboardList, Wand2, AlertTriangle, FileOutput, Plus, Trash2, Calendar as CalendarIcon, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import TrackingTable from "@/components/ward/TrackingTable";

interface PatientDetailModalProps {
    patient: Patient | null;
    onClose: () => void;
    onSave: (updatedPatient: Patient) => Promise<void>;
    onDischarge?: (patient: Patient) => void;
    readOnly?: boolean;
    onTransfer?: (patient: Patient, consultant: string) => void;
    consultants?: string[];
    onRemove?: (patient: Patient) => void;
}

const PROCEDURE_SUGGESTIONS = [
    "ORIF", "Casting", "External Fixation", "IM Nailing", "Plating", "Pinning",
    "ACL Reconstruction", "Meniscectomy", "Total Hip Replacement", "Total Knee Replacement",
    "Discectomy", "Laminectomy", "Spinal Fusion", "Debridement", "Dressing", "Amputation", "CR"
];

export default function PatientDetailModal({ patient, onClose, onSave, onDischarge, readOnly, onTransfer, consultants, onRemove }: PatientDetailModalProps) {
    const [activeTab, setActiveTab] = useState<"clinical" | "tracking">("clinical");
    const [formData, setFormData] = useState<Partial<Patient>>(patient || {});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New Surgery State
    const [newSurgery, setNewSurgery] = useState({ procedure: "", dop: "" });
    const [isAddingSurgery, setIsAddingSurgery] = useState(false);

    // Sync state with prop changes
    useEffect(() => {
        if (patient) {
            setFormData(prev => ({ ...prev, ...patient }));
        }
    }, [patient]);

    if (!patient) return null;

    const handleSave = async () => {
        // Validation: Procedure Date is required if Procedure Name is entered
        if (formData.procedure && !formData.dop) {
            alert("Please enter the Date of Procedure (DOP) for the primary procedure.");
            return;
        }

        if (formData.surgeries && formData.surgeries.some(s => s.procedure && !s.dop)) {
            alert("Please enter the Date of Procedure (DOP) for all added surgeries.");
            return;
        }

        setIsSaving(true);
        try {
            // Ensure we pass the full patient object merged with updates
            const updatedPatient = { ...patient, ...formData } as Patient;
            await onSave(updatedPatient);
            setIsDirty(false);
            onClose();
        } catch (error) {
            console.error("Failed to save patient:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof Patient, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    // Helper to append procedure from chips
    const appendProcedure = (chip: string, isPrimary: boolean = true) => {
        if (isPrimary) {
            const current = formData.procedure || "";
            const newValue = current ? `${current} + ${chip}` : chip;
            updateField("procedure", newValue);
        } else {
            const current = newSurgery.procedure || "";
            const newValue = current ? `${current} + ${chip}` : chip;
            setNewSurgery(prev => ({ ...prev, procedure: newValue }));
        }
    };

    const toggleDischargeMark = () => {
        const newStatus = formData.status === "marked_for_discharge" ? "admitted" : "marked_for_discharge";
        setFormData({ ...formData, status: newStatus });
        setIsDirty(true);
    };

    const addSurgery = () => {
        if (!newSurgery.procedure) return;
        const currentSurgeries = formData.surgeries || [];
        // Create new array to ensure state update triggers
        const updatedSurgeries = [...currentSurgeries, newSurgery];
        updateField("surgeries", updatedSurgeries);
        setNewSurgery({ procedure: "", dop: "" });
        setIsAddingSurgery(false);
    };

    const removeSurgery = (index: number) => {
        const currentSurgeries = formData.surgeries || [];
        updateField("surgeries", currentSurgeries.filter((_, i) => i !== index));
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card z-10 flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-[#0a0a0a] border border-white/10"
                >
                    {/* Header */}
                    <div className="flex-none p-6 pb-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase">{patient.name}</h2>
                                <p className="text-sm text-gray-400 uppercase">
                                    {patient.ageGender} • Bed: <span className="text-primary font-bold">{patient.bedNo}</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="mt-6 flex space-x-4 border-b border-white/10 pb-2">
                            <TabButton active={activeTab === "clinical"} onClick={() => setActiveTab("clinical")} icon={<ClipboardList size={16} />} label="Clinical" />
                            <TabButton active={activeTab === "tracking"} onClick={() => setActiveTab("tracking")} icon={<Activity size={16} />} label="Tracking" />
                        </div>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {activeTab === "clinical" ? (
                            <div className="space-y-6">
                                <InputGroup label="Diagnosis" value={formData.diagnosis} onChange={(v: string) => updateField("diagnosis", v)} disabled={readOnly} />

                                {/* Surgeries Section */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase">Procedures</label>

                                    {/* Main Procedure */}
                                    <div className="rounded-lg bg-white/5 p-3">
                                        <div className="mb-1 text-xs text-gray-500 uppercase">Primary Procedure</div>
                                        <div className="flex space-x-2 mb-2">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={formData.procedure || ""}
                                                    onChange={(e) => updateField("procedure", e.target.value)}
                                                    className="w-full rounded bg-transparent p-1 text-sm text-white outline-none border-b border-white/10 focus:border-primary"
                                                    disabled={readOnly}
                                                    placeholder="Procedure Name"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="date"
                                                    value={formData.dop || ""}
                                                    onChange={(e) => updateField("dop", e.target.value)}
                                                    className="w-full rounded bg-transparent p-1 text-sm text-gray-400 outline-none border-b border-white/10 focus:border-primary"
                                                    disabled={readOnly}
                                                />
                                            </div>
                                        </div>
                                        {/* Chips for Primary Procedure */}
                                        {!readOnly && (
                                            <div className="flex flex-wrap gap-2">
                                                {PROCEDURE_SUGGESTIONS.map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => appendProcedure(s, true)}
                                                        className="text-[10px] text-gray-400 hover:text-primary underline decoration-dotted"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional Surgeries List */}
                                    {formData.surgeries?.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                            <div className="flex-1">
                                                <div className="font-medium text-white text-sm">{s.procedure}</div>
                                                <div className="text-xs text-gray-400">DOP: {s.dop}</div>
                                            </div>
                                            {!readOnly && (
                                                <button onClick={() => removeSurgery(i)} className="text-gray-500 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Surgery */}
                                    {!readOnly && (
                                        <div className="rounded-lg border border-dashed border-white/10 p-3">
                                            {!isAddingSurgery ? (
                                                <button
                                                    onClick={() => setIsAddingSurgery(true)}
                                                    className="flex w-full items-center justify-center space-x-2 text-sm text-gray-400 hover:text-white"
                                                >
                                                    <Plus size={16} />
                                                    <span>Add Another Procedure</span>
                                                </button>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Procedure Name"
                                                        value={newSurgery.procedure}
                                                        onChange={(e) => setNewSurgery({ ...newSurgery, procedure: e.target.value })}
                                                        className="w-full rounded bg-white/5 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                                                    />

                                                    {/* Chips for New Surgery */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {PROCEDURE_SUGGESTIONS.map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => appendProcedure(s, false)}
                                                                className="text-[10px] text-gray-400 hover:text-primary underline decoration-dotted"
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <input
                                                        type="date"
                                                        value={newSurgery.dop}
                                                        onChange={(e) => setNewSurgery({ ...newSurgery, dop: e.target.value })}
                                                        className="w-full rounded bg-white/5 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                    <div className="flex space-x-2">
                                                        <button onClick={addSurgery} className="flex-1 rounded bg-primary py-1 text-xs font-bold text-black">Add</button>
                                                        <button onClick={() => setIsAddingSurgery(false)} className="flex-1 rounded bg-white/10 py-1 text-xs font-medium text-white">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <InputGroup label="Plan" value={formData.plan} onChange={(v: string) => updateField("plan", v)} textarea disabled={readOnly} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <TrackingTable
                                    entries={formData.tracking || []}
                                    onUpdate={(entries) => setFormData({ ...formData, tracking: entries })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer - Compact Icons Only */}
                    <div className="flex-none border-t border-white/10 bg-[#0a0a0a] p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                                {!readOnly && (
                                    <>
                                        <button
                                            onClick={toggleDischargeMark}
                                            title={formData.status === "marked_for_discharge" ? "Unmark Discharge" : "Mark for Discharge"}
                                            className={cn(
                                                "rounded-lg p-2 transition-colors",
                                                formData.status === "marked_for_discharge"
                                                    ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                                                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            <AlertTriangle size={20} />
                                        </button>

                                        {onDischarge && (
                                            <button
                                                onClick={() => onDischarge({ ...patient, ...formData } as Patient)}
                                                title="Final Discharge"
                                                className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20"
                                            >
                                                <FileOutput size={20} />
                                            </button>
                                        )}

                                        {onRemove && (
                                            <button
                                                onClick={() => onRemove(patient)}
                                                title="Remove Patient"
                                                className="rounded-lg bg-gray-500/10 p-2 text-gray-400 hover:bg-gray-500/20 hover:text-white"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex space-x-2">
                                {!readOnly && (
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center space-x-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-black shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        <span>{isSaving ? "Saving..." : "Save"}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center space-x-2 border-b-2 pb-2 transition-colors",
                active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-300"
            )}
        >
            {icon}
            <span className="text-sm font-medium uppercase">{label}</span>
        </button>
    );
}

interface InputGroupProps {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    textarea?: boolean;
    disabled?: boolean;
}

function InputGroup({ label, value, onChange, textarea, disabled }: InputGroupProps) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 uppercase">{label}</label>
            {textarea ? (
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    disabled={disabled}
                />
            ) : (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50"
                    disabled={disabled}
                />
            )}
        </div>
    );
}
