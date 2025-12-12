"use client";

import { Patient } from "@/types";
import { X, Save, Activity, ClipboardList, BookOpen, AlertTriangle, FileOutput, Plus, Trash2, Calendar as CalendarIcon, ChevronUp, ChevronDown, Loader2, FileText, ArrowRightLeft, Copy, Check } from "lucide-react";
import { format, differenceInDays, isValid, compareDesc } from "date-fns";
import { parseAnyDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import TrackingTable from "./TrackingTable";
import CaseReportSelector from "./CaseReportSelector";
import { CaseReport } from "@/types";
import { useCaseReports } from "@/hooks/useCaseReports";

interface PatientDetailModalProps {
    patient: Patient;
    onClose: () => void;
    onSave: (updatedPatient: Patient) => void;
    onDischarge?: (patient: Patient) => void;
    readOnly?: boolean;
    onTransfer?: (patient: Patient, consultant: string) => void;
    consultants?: string[];
    onRemove?: (patient: Patient) => void;
}

const PROCEDURE_SUGGESTIONS = [
    "Debridement",
    "Closed Reduction",
    "IMIL Nailing",
    "ORIF",
    "Plating",
    "Percutaneous pinning",
    "STSG",
    "FTSG",
    "Amputation",
    "Fasciotomy",
    "External Fixator application",
    "Tendon Repair",
    "Flap Coverage",
    "Reimplantation",
    "Tendon Transfer"
];

export default function PatientDetailModal({ patient, onClose, onSave, onDischarge, readOnly, onTransfer, consultants, onRemove }: PatientDetailModalProps) {
    const [activeTab, setActiveTab] = useState<"clinical" | "clinical_data" | "tracking">("clinical");
    const [formData, setFormData] = useState<Partial<Patient>>(patient || {});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [newSurgery, setNewSurgery] = useState({ procedure: "", dop: "" });
    const [isAddingSurgery, setIsAddingSurgery] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    // Knowledge Base State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { addReport } = useCaseReports();

    // Sync state with prop changes
    useEffect(() => {
        if (patient) {
            setFormData(patient);
        }
    }, [patient]);

    const updateField = (field: keyof Patient, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600));
        onSave({ ...patient, ...formData } as Patient);
        setIsSaving(false);
        setIsDirty(false);
    };

    const toggleDischargeMark = () => {
        const newStatus = formData.status === "marked_for_discharge" ? "admitted" : "marked_for_discharge";
        updateField("status", newStatus);
    };

    const addSurgery = () => {
        if (!newSurgery.procedure) return;
        const currentSurgeries = formData.surgeries || [];
        updateField("surgeries", [...currentSurgeries, newSurgery]);
        setNewSurgery({ procedure: "", dop: "" });
        setIsAddingSurgery(false);
    };

    const appendProcedure = (proc: string, isPrimary: boolean) => {
        if (isPrimary) {
            updateField("procedure", formData.procedure ? `${formData.procedure}, ${proc}` : proc);
        } else {
            setNewSurgery(prev => ({ ...prev, procedure: prev.procedure ? `${prev.procedure}, ${proc}` : proc }));
        }
    };

    const removeSurgery = (index: number) => {
        const currentSurgeries = formData.surgeries || [];
        updateField("surgeries", currentSurgeries.filter((_, i) => i !== index));
    };

    const updateSurgery = (index: number, field: "procedure" | "dop", value: string) => {
        const currentSurgeries = [...(formData.surgeries || [])];
        if (currentSurgeries[index]) {
            currentSurgeries[index] = { ...currentSurgeries[index], [field]: value };
            updateField("surgeries", currentSurgeries);
        }
    };

    const processTemplate = (text: string, patientData: Patient) => {
        let processed = text;
        const currentDiag = (patientData.diagnosis || "").toLowerCase();

        // 1. Extract Age and Gender
        const ageMatch = patientData.ageGender?.match(/(\d+)/);
        const age = ageMatch ? ageMatch[1] : "___";

        let gender = "patient";
        let heShe = "he/she";
        let hisHer = "his/her";
        const genderLower = (patientData.ageGender || "").toLowerCase();
        if (genderLower.includes("f") || genderLower.includes("w") || genderLower.includes("female")) {
            gender = "female";
            heShe = "she";
            hisHer = "her";
        } else if (genderLower.includes("m") || genderLower.includes("male")) {
            gender = "male";
            heShe = "he";
            hisHer = "his";
        }

        // 2. Infer Side
        let side = "___";
        let sideLc = "___";

        if (currentDiag.includes("bilateral") || currentDiag.includes(" b/l")) {
            side = "Bilateral";
            sideLc = "bilateral";
        } else {
            const match = currentDiag.match(/\b(right|left|rt|lt)\b/i);
            if (match) {
                const found = match[1].toLowerCase();
                if (found === "right" || found === "rt") {
                    side = "Right";
                    sideLc = "right";
                } else {
                    side = "Left";
                    sideLc = "left";
                }
            }
        }

        // 3. Replace Placeholders
        processed = processed.replace(/{{AGE}}/g, age);
        processed = processed.replace(/{{GENDER}}/g, gender);
        processed = processed.replace(/{{SIDE}}/g, side);
        processed = processed.replace(/{{SIDE_LC}}/g, sideLc);
        processed = processed.replace(/{{HE_SHE}}/g, heShe);
        processed = processed.replace(/{{HIS_HER}}/g, hisHer);

        return processed;
    };

    const generateSmartQuery = (diagnosis?: string) => {
        if (!diagnosis) return "";
        const stopWords = ["fracture", "of", "the", "left", "right", "bilateral", "side", "rt", "lt", "grade", "type", "with", "and", "severe", "mild", "old", "new", "union", "non-union", "malunion", "closed", "open", "for", "surgery", "post", "op", "status"];

        return diagnosis.split(" ")
            .map(w => w.replace(/[(),.]/g, "").trim())
            .filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()))
            .join(" ");
    };

    const handleReportSelect = (report: CaseReport) => {
        const currentData = { ...patient, ...formData };
        if (report.history) updateField("history", processTemplate(report.history, currentData as Patient));
        if (report.examination) updateField("examination", processTemplate(report.examination, currentData as Patient));
        if (report.investigation) updateField("investigation", processTemplate(report.investigation, currentData as Patient));
        if (report.procedure) updateField("procedure", report.procedure);

        setIsSearchOpen(false);
    };

    const handleSaveTemplate = () => {
        const name = window.prompt("Enter a name for this template:");
        if (!name) return;

        const newReport: CaseReport = {
            id: `custom-${Date.now()}`,
            title: name,
            diagnosis: formData.diagnosis || "Unknown Diagnosis",
            procedure: formData.procedure,
            history: formData.history || "",
            examination: formData.examination || "",
            investigation: formData.investigation || "",
            tags: ["custom"],
            isSystem: false
        };

        addReport(newReport);
        alert("Template saved successfully!");
    };
    useEffect(() => {
        // Load defaults if empty
        if (!formData.programYear) updateField("programYear", localStorage.getItem("last_programYear") || "");
        if (!formData.programBlock) updateField("programBlock", localStorage.getItem("last_programBlock") || "");
        if (!formData.domain) updateField("domain", localStorage.getItem("last_domain") || "");
        if (!formData.level) updateField("level", localStorage.getItem("last_level") || "");
    }, []); // Run once on mount (when modal opens)

    // Save on change
    useEffect(() => { if (formData.programYear) localStorage.setItem("last_programYear", formData.programYear); }, [formData.programYear]);
    useEffect(() => { if (formData.programBlock) localStorage.setItem("last_programBlock", formData.programBlock); }, [formData.programBlock]);
    useEffect(() => { if (formData.domain) localStorage.setItem("last_domain", formData.domain); }, [formData.domain]);
    useEffect(() => { if (formData.level) localStorage.setItem("last_level", formData.level); }, [formData.level]);

    const handleCopy = () => {
        const p = { ...patient, ...formData } as Patient;

        // 1. Determine Most Recent Procedure
        let recentProcText = "";
        let recentProcDateLine = "";
        let diagnosisPrefix = "";

        // Collect all procedures
        const allProcedures: { name: string; date: Date | null; dopStr: string }[] = [];

        if (p.procedure) {
            allProcedures.push({
                name: p.procedure,
                date: parseAnyDate(p.dop || "") || null,
                dopStr: p.dop || ""
            });
        }
        if (p.surgeries && p.surgeries.length > 0) {
            p.surgeries.forEach(s => {
                allProcedures.push({
                    name: s.procedure,
                    date: parseAnyDate(s.dop) || null,
                    dopStr: s.dop
                });
            });
        }

        // Sort desc
        allProcedures.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return compareDesc(a.date, b.date); // Latest first
        });

        if (allProcedures.length > 0) {
            const latest = allProcedures[0];

            // Format Diagnosis Prefix: "2POD Radial head replacement for "
            // ONLY if there is more than 1 procedure
            // Format Diagnosis Prefix: "2POD Radial head replacement for "
            // ONLY if there is more than 1 procedure
            if (allProcedures.length > 1) {
                const older = allProcedures[1];
                if (older.date && isValid(older.date)) {
                    const diff = differenceInDays(new Date(), older.date);
                    const pod = diff >= 0 ? `${diff}POD` : "";
                    // If diff is negative (future date), maybe just show date? assuming past for POD
                    diagnosisPrefix = `${pod ? pod + " " : ""}${older.name} for `;
                } else {
                    diagnosisPrefix = `${older.name} for `;
                }
            }

            // Format Procedure Section
            // Use the date string provided by user if valid, else fallback
            let dateStr = latest.dopStr;
            if (latest.date && isValid(latest.date)) {
                dateStr = format(latest.date, "dd-MMM-yyyy");
            }

            recentProcDateLine = dateStr ? `${dateStr}` : "";
            recentProcText = latest.name;
        }

        // Format Diagnosis Line
        // Logic: If we have a recent procedure, we prefix. 
        // Example: "2POD Radial head replacement for Right radial head fracture"
        const finalDiagnosis = diagnosisPrefix
            ? `${diagnosisPrefix}${p.diagnosis || ""}`
            : (p.diagnosis || "");


        const lines = [
            "Namaste Sir,",
            "*Case Update*",
            "",
            "*Patient Name:*",
            p.name,
            "",
            "*Age/Sex:*",
            p.ageGender,
            "",
            "*Current Bed:*",
            p.bedNo,
            "",
            "*Diagnosis:*",
            finalDiagnosis,
            "",
            "*Procedure:*",
            recentProcDateLine,
            recentProcText,
            "",
            "*Plan:*",
            p.plan || ""
        ];

        // Filter out empty lines if needed? The format asks for blank lines between sections, so we keep them.
        // Copy to clipboard
        navigator.clipboard.writeText(lines.join("\n"));

        // Feedback
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };


    const handleTransferClick = (c: string) => {
        if (onTransfer) onTransfer(patient, c);
        setIsTransferring(false);
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
                            <TabButton active={activeTab === "clinical"} onClick={() => setActiveTab("clinical")} icon={<ClipboardList size={16} />} label="Overview" />
                            <TabButton active={activeTab === "clinical_data"} onClick={() => setActiveTab("clinical_data")} icon={<FileText size={16} />} label="Clinical Data" />
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
                                                <div className="flex-1">
                                                    <ExpandableInput
                                                        value={formData.procedure || ""}
                                                        onChange={(v) => updateField("procedure", v)}
                                                        className="w-full rounded bg-transparent p-1 text-sm text-white outline-none border-b border-white/10 focus:border-primary"
                                                        placeHolder="Procedure Name"
                                                        disabled={readOnly}
                                                    />
                                                </div>                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="date"
                                                    value={formData.dop || ""}
                                                    onChange={(e) => updateField("dop", e.target.value)}
                                                    onClick={(e) => e.currentTarget.showPicker()}
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
                                            <div className="flex-1 flex gap-2">
                                                <ExpandableInput
                                                    value={s.procedure}
                                                    onChange={(v) => updateSurgery(i, "procedure", v)}
                                                    className="flex-1 bg-transparent text-sm text-white outline-none border-b border-transparent focus:border-primary transition-colors"
                                                    disabled={readOnly}
                                                    placeHolder="Procedure Name"
                                                />
                                                <input
                                                    type="date"
                                                    value={s.dop}
                                                    onChange={(e) => updateSurgery(i, "dop", e.target.value)}
                                                    onClick={(e) => e.currentTarget.showPicker()}
                                                    className="w-32 bg-transparent text-xs text-gray-400 outline-none border-b border-transparent focus:border-primary transition-colors"
                                                    disabled={readOnly}
                                                />
                                            </div>
                                            {!readOnly && (
                                                <button onClick={() => removeSurgery(i)} className="ml-2 text-gray-500 hover:text-red-500">
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
                                                        onClick={(e) => e.currentTarget.showPicker()}
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

                                <InputGroup label="Plan" value={formData.plan} onChange={(v: string) => updateField("plan", v)} disabled={readOnly} />

                            </div>
                        ) : activeTab === "clinical_data" ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-gray-400">Clinical Evaluation</h3>
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="flex items-center space-x-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20"
                                    >
                                        <BookOpen size={12} />
                                        <span>Templates / Search</span>
                                    </button>
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="flex items-center space-x-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                                        title="Save current form as a reusable template"
                                    >
                                        <Save size={12} />
                                        <span>Save as Template</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label="Program Year" value={formData.programYear} onChange={(v) => updateField("programYear", v)} options={["First", "Second", "Third"]} disabled={readOnly} />
                                    <SelectField label="Program Block" value={formData.programBlock} onChange={(v) => updateField("programBlock", v)} options={["I", "II", "III", "IV", "V", "VI"]} disabled={readOnly} />
                                    <SelectField label="Domain" value={formData.domain} onChange={(v) => updateField("domain", v)} options={["Knowledge", "Skill", "Attitude"]} disabled={readOnly} />
                                    <SelectField label="Level" value={formData.level} onChange={(v) => updateField("level", v)} options={["I", "II", "III", "IV"]} disabled={readOnly} />
                                </div>
                                <InputGroup label="History of Present Illness" value={formData.history} onChange={(v) => updateField("history", v)} textarea disabled={readOnly} />
                                <InputGroup label="Clinical Examination" value={formData.examination} onChange={(v) => updateField("examination", v)} textarea disabled={readOnly} />
                                <InputGroup label="Investigation" value={formData.investigation} onChange={(v) => updateField("investigation", v)} textarea disabled={readOnly} />
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
                                {/* AI Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className={cn(
                                            "rounded-lg p-2 transition-colors",
                                            isSearchOpen ? "bg-green-500/20 text-green-400" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                        )}
                                        title="Search Case Reports (Knowledge Base)"
                                    >
                                        <BookOpen size={20} />
                                    </button>

                                    {/* Copy Button */}
                                    <button
                                        onClick={handleCopy}
                                        className={cn(
                                            "rounded-lg p-2 transition-colors",
                                            hasCopied ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                        )}
                                        title="Copy Patient Details"
                                    >
                                        {hasCopied ? <Check size={20} /> : <Copy size={20} />}
                                    </button>
                                </div>

                                {!readOnly && (
                                    <>
                                        {/* Transfer Button */}
                                        {onTransfer && consultants && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsTransferring(!isTransferring)}
                                                    title="Transfer Patient"
                                                    className={cn(
                                                        "rounded-lg p-2 transition-colors",
                                                        isTransferring ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                    )}
                                                >
                                                    <ArrowRightLeft size={20} />
                                                </button>
                                                {isTransferring && (
                                                    <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-white/10 bg-[#1a1a1a] p-2 shadow-xl">
                                                        <div className="mb-2 text-xs font-medium text-gray-400">Transfer to:</div>
                                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                                            {consultants.map(c => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => {
                                                                        onTransfer(patient, c);
                                                                        setIsTransferring(false);
                                                                    }}
                                                                    className="w-full rounded px-2 py-1 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white truncate"
                                                                >
                                                                    {c}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

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

                {/* AI Result Modal */}
                <AnimatePresence>
                    {/* Smart Search Modal */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="glass-card w-full max-w-2xl h-[70vh] rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col"
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 p-4">
                                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                                            <BookOpen size={18} className="text-green-400" />
                                            <span>Knowledge Base</span>
                                        </h3>
                                        <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                                    </div>
                                    <div className="p-4 overflow-hidden flex-1">
                                        <CaseReportSelector
                                            onSelect={handleReportSelect}
                                            currentDiagnosis={generateSmartQuery(formData.diagnosis)}
                                            onClose={() => setIsSearchOpen(false)}
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </AnimatePresence>
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


interface SelectFieldProps {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    options: string[];
    disabled?: boolean;
}

function SelectField({ label, value, onChange, options, disabled }: SelectFieldProps) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 uppercase">{label}</label>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50 [&>option]:bg-[#0a0a0a] [&>option]:text-white"
                disabled={disabled}
            >
                <option value="" className="bg-[#0a0a0a] text-white">-- Select --</option>
                {options.map((opt: string) => (
                    <option key={opt} value={opt} className="bg-[#0a0a0a] text-white">{opt}</option>
                ))}
            </select>
        </div>
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
    const [isExpanded, setIsExpanded] = useState(false);

    if (textarea) {
        return (
            <div>
                <label className="mb-1 block text-xs font-medium text-gray-400 uppercase">{label}</label>
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    disabled={disabled}
                />
            </div>
        );
    }

    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-gray-400 uppercase">{label}</label>
            {isExpanded ? (
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setIsExpanded(false)}
                    autoFocus
                    className="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50 animate-in fade-in zoom-in-95 duration-200"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    disabled={disabled}
                />
            ) : (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => !disabled && setIsExpanded(true)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50 transition-all"
                    disabled={disabled}
                />
            )}
        </div>
    );
}

interface ExpandableInputProps {
    value: string;
    onChange: (val: string) => void;
    placeHolder?: string;
    disabled?: boolean;
    className?: string;
}

function ExpandableInput({ value, onChange, placeHolder, disabled, className }: ExpandableInputProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isExpanded) {
        return (
            <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setIsExpanded(false)}
                autoFocus
                className="h-24 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-primary disabled:opacity-50 animate-in fade-in zoom-in-95 duration-200"
                placeholder={placeHolder}
                disabled={disabled}
            />
        );
    }
    return (
        <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => !disabled && setIsExpanded(true)}
            className={className}
            placeholder={placeHolder}
            disabled={disabled}
        />
    );
}
