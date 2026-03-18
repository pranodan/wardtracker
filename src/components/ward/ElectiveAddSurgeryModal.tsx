"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { Patient } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type IntakeOptions = {
    sex: string[];
    sideToBeOperated: string[];
    consultantInCharge: string[];
    graftHarvest: string[];
    typeOfAnesthesia: string[];
    anyChronicDiseases: string[];
    npoStatus: string[];
};

type IntakeResponse = {
    headers: string[];
    schema: Array<{
        header: string;
        key: string;
        index: number;
        editable: boolean;
        hidden: boolean;
        type: string;
    }>;
    timestampPreview: string;
    options: IntakeOptions;
    diagnosisSuggestions: string[];
    procedureSuggestions: string[];
};

type FormState = {
    patientName: string;
    sex: string;
    diagnosis: string;
    dateOfSurgery: string;
    sideToBeOperated: string;
    procedure: string;
    contactNumber: string;
    anySpecificMention: string;
    consultantInCharge: string;
    ageOfPatient: string;
    graftHarvest: string;
    typeOfAnesthesia: string;
    anyChronicDiseases: string;
    npoStatus: string;
};

const DIAGNOSIS_STORAGE_KEY = "wardtracker_elective_diagnosis_suggestions";
const PROCEDURE_STORAGE_KEY = "wardtracker_elective_procedure_suggestions";

const emptyForm: FormState = {
    patientName: "",
    sex: "",
    diagnosis: "",
    dateOfSurgery: "",
    sideToBeOperated: "",
    procedure: "",
    contactNumber: "",
    anySpecificMention: "",
    consultantInCharge: "",
    ageOfPatient: "",
    graftHarvest: "",
    typeOfAnesthesia: "",
    anyChronicDiseases: "",
    npoStatus: ""
};

function canonicalizeWhitespace(value: string) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function titleCaseToken(token: string) {
    if (!token) return token;
    if (/^(rt|lt|acl|pcl|orif|mipo|thr|tkr|cmc|mcp|pip|dip)$/i.test(token)) {
        return token.toUpperCase();
    }
    if (/^[A-Z0-9/-]{2,}$/.test(token)) {
        return token.toUpperCase();
    }
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function canonicalizeSuggestion(value: string) {
    const cleaned = canonicalizeWhitespace(value);
    if (!cleaned) return "";

    return cleaned
        .split(" ")
        .map(part => part.split("-").map(titleCaseToken).join("-"))
        .join(" ")
        .replace(/\bRt\b/g, "RT")
        .replace(/\bLt\b/g, "LT")
        .replace(/\bOrif\b/g, "ORIF");
}

function uniqueNormalized(values: string[]) {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const cleaned = canonicalizeSuggestion(value);
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(cleaned);
    }

    return result;
}

function loadLocalSuggestions(key: string) {
    if (typeof window === "undefined") return [] as string[];
    try {
        const stored = window.localStorage.getItem(key);
        if (!stored) return [] as string[];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [] as string[];
        return uniqueNormalized(parsed.map(item => String(item || "")));
    } catch {
        return [] as string[];
    }
}

interface ElectiveAddSurgeryModalProps {
    open: boolean;
    onClose: () => void;
    onCreated?: (patient: Patient) => void;
}

export default function ElectiveAddSurgeryModal({ open, onClose, onCreated }: ElectiveAddSurgeryModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [metadata, setMetadata] = useState<IntakeResponse | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [customDiagnosisSuggestions, setCustomDiagnosisSuggestions] = useState<string[]>([]);
    const [customProcedureSuggestions, setCustomProcedureSuggestions] = useState<string[]>([]);
    const [expandedSuggestions, setExpandedSuggestions] = useState<"diagnosis" | "procedure" | null>(null);

    useEffect(() => {
        if (metadata) return;

        let mounted = true;
        setLoading(true);

        fetch("/api/elective-intake", { cache: "no-store" })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data?.error || "Failed to load elective form");
                }
                if (!mounted) return;
                setMetadata(data);
                setCustomDiagnosisSuggestions(loadLocalSuggestions(DIAGNOSIS_STORAGE_KEY));
                setCustomProcedureSuggestions(loadLocalSuggestions(PROCEDURE_STORAGE_KEY));
            })
            .catch(error => {
                console.error(error);
                if (open) {
                    showToast(error instanceof Error ? error.message : "Failed to load elective form", "error");
                    onClose();
                }
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [metadata, onClose, open, showToast]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(customDiagnosisSuggestions));
    }, [customDiagnosisSuggestions]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(PROCEDURE_STORAGE_KEY, JSON.stringify(customProcedureSuggestions));
    }, [customProcedureSuggestions]);

    const diagnosisSuggestions = useMemo(() => {
        return uniqueNormalized([...(metadata?.diagnosisSuggestions || []), ...customDiagnosisSuggestions]);
    }, [metadata, customDiagnosisSuggestions]);

    const procedureSuggestions = useMemo(() => {
        return uniqueNormalized([...(metadata?.procedureSuggestions || []), ...customProcedureSuggestions]);
    }, [metadata, customProcedureSuggestions]);

    if (!open) return null;

    const collapseSuggestions = () => setExpandedSuggestions(null);

    const updateField = (key: keyof FormState, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const appendSuggestion = (key: "diagnosis" | "procedure", value: string) => {
        setForm(prev => ({
            ...prev,
            [key]: prev[key] ? `${prev[key]}; ${value}` : value
        }));
        collapseSuggestions();
    };

    const addCustomSuggestion = (type: "diagnosis" | "procedure") => {
        const label = type === "diagnosis" ? "diagnosis" : "procedure";
        const value = window.prompt(`Add a ${label} suggestion:`)?.trim();
        if (!value) return;

        if (type === "diagnosis") {
            setCustomDiagnosisSuggestions(prev => uniqueNormalized([...prev, value]));
            return;
        }

        setCustomProcedureSuggestions(prev => uniqueNormalized([...prev, value]));
    };

    const removeCustomSuggestion = (type: "diagnosis" | "procedure", value: string) => {
        const key = canonicalizeSuggestion(value).toLowerCase();
        if (type === "diagnosis") {
            setCustomDiagnosisSuggestions(prev => prev.filter(item => canonicalizeSuggestion(item).toLowerCase() !== key));
            return;
        }

        setCustomProcedureSuggestions(prev => prev.filter(item => canonicalizeSuggestion(item).toLowerCase() !== key));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const response = await fetch("/api/elective-intake", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Failed to append surgery");
            }

            showToast("Surgery added to Form responses 1.", "success");
            onCreated?.(data.patient as Patient);
            setForm(emptyForm);
            setExpandedSuggestions(null);
            onClose();
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : "Failed to append surgery", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const options = metadata?.options;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold uppercase tracking-wide text-white">Add New Surgery</h2>
                        <p className="text-xs text-gray-400">Appends directly to Form responses 1.</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {loading || !metadata ? (
                    <div className="flex items-center justify-center px-6 py-20 text-gray-400">
                        <Loader2 size={20} className="mr-2 animate-spin" /> Loading form...
                    </div>
                ) : (
                    <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <ReadOnlyField label="Timestamp" value={metadata.timestampPreview} />
                            <InputField label="Patient Name" value={form.patientName} onChange={(value) => updateField("patientName", value)} onFocus={collapseSuggestions} />
                            <InputField label="Age of the Patient" value={form.ageOfPatient} onChange={(value) => updateField("ageOfPatient", value)} onFocus={collapseSuggestions} />
                            <ComboField label="Sex" value={form.sex} onChange={(value) => updateField("sex", value)} options={options?.sex || []} onFocus={collapseSuggestions} />
                            <InputField label="Date of Surgery" type="date" value={form.dateOfSurgery} onChange={(value) => updateField("dateOfSurgery", value)} onFocus={collapseSuggestions} />
                            <ComboField label="Side to be operated" value={form.sideToBeOperated} onChange={(value) => updateField("sideToBeOperated", value)} options={options?.sideToBeOperated || []} onFocus={collapseSuggestions} />
                            <ComboField label="Consultant in charge" value={form.consultantInCharge} onChange={(value) => updateField("consultantInCharge", value)} options={options?.consultantInCharge || []} onFocus={collapseSuggestions} />
                            <InputField label="Contact Number" value={form.contactNumber} onChange={(value) => updateField("contactNumber", value)} onFocus={collapseSuggestions} />
                            <ComboField label="Graft Harvest" value={form.graftHarvest} onChange={(value) => updateField("graftHarvest", value)} options={options?.graftHarvest || []} onFocus={collapseSuggestions} />
                            <ComboField label="Type of Anesthesia" value={form.typeOfAnesthesia} onChange={(value) => updateField("typeOfAnesthesia", value)} options={options?.typeOfAnesthesia || []} onFocus={collapseSuggestions} />
                            <ComboField label="Any Chronic Diseases" value={form.anyChronicDiseases} onChange={(value) => updateField("anyChronicDiseases", value)} options={options?.anyChronicDiseases || []} onFocus={collapseSuggestions} />
                            <ComboField label="NPO STATUS" value={form.npoStatus} onChange={(value) => updateField("npoStatus", value)} options={options?.npoStatus || []} onFocus={collapseSuggestions} />
                            <div className="md:col-span-2">
                                <TextAreaField label="Diagnosis" value={form.diagnosis} onChange={(value) => updateField("diagnosis", value)} onFocus={collapseSuggestions} />
                                <SuggestionChips
                                    label="Diagnosis Suggestions"
                                    suggestions={diagnosisSuggestions}
                                    expanded={expandedSuggestions === "diagnosis"}
                                    onToggle={() => setExpandedSuggestions(current => current === "diagnosis" ? null : "diagnosis")}
                                    onSelect={(value) => appendSuggestion("diagnosis", value)}
                                    onAdd={() => addCustomSuggestion("diagnosis")}
                                    onRemove={(value) => removeCustomSuggestion("diagnosis", value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <TextAreaField label="Procedure" value={form.procedure} onChange={(value) => updateField("procedure", value)} onFocus={collapseSuggestions} />
                                <SuggestionChips
                                    label="Procedure Suggestions"
                                    suggestions={procedureSuggestions}
                                    expanded={expandedSuggestions === "procedure"}
                                    onToggle={() => setExpandedSuggestions(current => current === "procedure" ? null : "procedure")}
                                    onSelect={(value) => appendSuggestion("procedure", value)}
                                    onAdd={() => addCustomSuggestion("procedure")}
                                    onRemove={(value) => removeCustomSuggestion("procedure", value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <TextAreaField label="Any specific Mention" value={form.anySpecificMention} onChange={(value) => updateField("anySpecificMention", value)} onFocus={collapseSuggestions} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || submitting || !metadata}
                        className={cn(
                            "inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black transition-opacity",
                            (loading || submitting || !metadata) && "cursor-not-allowed opacity-60"
                        )}
                    >
                        {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                        Save Surgery
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
            <input
                value={value}
                readOnly
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-300 outline-none"
            />
        </div>
    );
}

function InputField({ label, value, onChange, onFocus, type = "text" }: { label: string; value: string; onChange: (value: string) => void; onFocus?: () => void; type?: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
            <input
                type={type}
                value={value}
                onFocus={onFocus}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-primary"
            />
        </div>
    );
}

function TextAreaField({ label, value, onChange, onFocus }: { label: string; value: string; onChange: (value: string) => void; onFocus?: () => void }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
            <textarea
                value={value}
                onFocus={onFocus}
                onChange={(event) => onChange(event.target.value)}
                className="h-24 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-primary"
            />
        </div>
    );
}

function ComboField({ label, value, onChange, options, onFocus }: { label: string; value: string; onChange: (value: string) => void; options: string[]; onFocus?: () => void }) {
    const listId = useMemo(() => `list-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [label]);

    return (
        <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
            <input
                list={listId}
                value={value}
                onFocus={onFocus}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-primary"
                placeholder="Choose or type a custom value"
            />
            <datalist id={listId}>
                {options.map(option => (
                    <option key={option} value={option} />
                ))}
            </datalist>
        </div>
    );
}

function SuggestionChips({
    label,
    suggestions,
    expanded,
    onToggle,
    onSelect,
    onAdd,
    onRemove
}: {
    label: string;
    suggestions: string[];
    expanded: boolean;
    onToggle: () => void;
    onSelect: (suggestion: string) => void;
    onAdd: () => void;
    onRemove: (suggestion: string) => void;
}) {
    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400 hover:text-white"
                    >
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <span>{expanded ? "Collapse" : "Expand"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-primary hover:text-primary/80"
                    >
                        <Plus size={12} />
                        <span>Add</span>
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(suggestion => (
                        <div key={suggestion} className="group inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300">
                            <button type="button" onClick={() => onSelect(suggestion)} className="max-w-[14rem] truncate hover:text-primary" title={suggestion}>
                                {suggestion}
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(suggestion)}
                                className="ml-1 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                                aria-label={`Remove ${suggestion}`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

