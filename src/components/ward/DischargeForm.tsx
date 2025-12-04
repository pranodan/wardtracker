"use client";

import { Patient } from "@/types";
import { useState } from "react";
import { X, Save, Wand2, Code } from "lucide-react";
import { motion } from "framer-motion";

interface DischargeFormProps {
    patient: Patient;
    onClose: () => void;
    onConfirmDischarge: (dischargeData: any) => void;
}

const HISTORY_SUGGESTIONS = [
    "History of fall from height",
    "History of RTA",
    "History of slip and fall",
    "Complaints of pain and swelling"
];

const CLINICAL_SUGGESTIONS = [
    "Tenderness present",
    "Swelling present",
    "ROM restricted",
    "Distal neurovascular status intact"
];

export default function DischargeForm({ patient, onClose, onConfirmDischarge }: DischargeFormProps) {
    const [formData, setFormData] = useState({
        programYear: "",
        programBlock: "",
        domain: "",
        level: "",
        procedureName: (() => {
            let proc = patient.procedure || "";
            if (patient.surgeries && patient.surgeries.length > 0) {
                const surgeryText = patient.surgeries.map(s => s.procedure).join(" + ");
                proc = proc ? `${proc} + ${surgeryText}` : surgeryText;
            }
            return proc;
        })(),
        procedureDescription: "",
        date: new Date().toISOString().split('T')[0],
        inPatientId: patient.hospitalNo || "", // Mapped to 8 digit ID (Hospital No)
        patientName: patient.name || "",
        age: patient.ageGender?.split('/')[0]?.replace(/\D/g, '') || "",
        address: "",
        history: "",
        diagnosis: "", // Clinical Exam / Findings - Empty by default, not mapped from Diagnosis
        investigation: "",
        provisionalDiagnosis: patient.diagnosis || "",
        finalDiagnosis: patient.diagnosis || "",
        management: (() => {
            let mgmt = patient.plan || "";
            // Also include procedures in management as requested
            let proc = patient.procedure || "";
            if (patient.surgeries && patient.surgeries.length > 0) {
                const surgeryText = patient.surgeries.map(s => `${s.procedure} (${s.dop})`).join(", ");
                proc = proc ? `${proc}, ${surgeryText}` : surgeryText;
            }
            if (proc) {
                mgmt = mgmt ? `Procedure: ${proc}\n\n${mgmt}` : `Procedure: ${proc}`;
            }
            return mgmt;
        })(),
        followUp: "",
        submittedTo: [] as string[],
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onConfirmDischarge({
            ...formData,
            originalPatientId: patient.id,
        });
    };

    const addSuggestion = (field: "history" | "diagnosis", text: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field] ? `${prev[field]}\n${text}` : text
        }));
    };

    const [showHistorySuggestions, setShowHistorySuggestions] = useState(false);
    const [showClinicalSuggestions, setShowClinicalSuggestions] = useState(false);

    const handleCopyScript = () => {
        // Generates a script to auto-fill the eLogbook form based on the provided HTML structure
        const script = `
            (function() {
                function setVal(id, val) {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                // Dropdowns (might need specific handling for 'chosen' libraries if standard select doesn't work)
                // For now, we try setting the select value directly.
                setVal('ProgramYearId', '${formData.programYear === "First" ? "1" : formData.programYear === "Second" ? "2" : "3"}'); 
                setVal('ProgramBlockId', '${formData.programBlock === "I" ? "1" : formData.programBlock === "II" ? "2" : "3"}'); // Simplified mapping
                
                // Text Fields
                setVal('ProcedureName', \`${formData.procedureName}\`);
                setVal('ProcedureDescription', \`${formData.procedureDescription}\`);
                setVal('Date', '${formData.date}');
                setVal('InPatientId', '${formData.inPatientId}');
                setVal('PatientName', \`${formData.patientName}\`);
                setVal('Age', '${formData.age}');
                setVal('Address', \`${formData.address}\`);
                setVal('History', \`${formData.history}\`);
                setVal('Diagnosis', \`${formData.diagnosis}\`); // Clinical Findings
                setVal('Investigation', \`${formData.investigation}\`);
                setVal('ProvisionalDiagnosys', \`${formData.provisionalDiagnosis}\`);
                setVal('FinalDiagnosys', \`${formData.finalDiagnosis}\`);
                setVal('Management', \`${formData.management}\`);
                setVal('FollowUp', \`${formData.followUp}\`);
                
                alert('Data populated! Please check dropdowns manually if they did not update.');
            })();
        `;

        navigator.clipboard.writeText(script);
        alert("Auto-Fill Script copied! Open the eLogbook page, press F12 to open Console, paste, and hit Enter.");
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-[#0a0a0a]"
            >
                {/* Header */}
                <div className="flex-none border-b border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white uppercase">Discharge / Activity Log</h2>
                        <div className="flex space-x-2">
                            <button onClick={handleCopyScript} className="flex items-center space-x-2 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500 hover:bg-blue-500/20">
                                <Code size={14} />
                                <span>Copy Auto-Fill Script</span>
                            </button>
                            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* ... Fields ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <SelectField label="Program Year" value={formData.programYear} onChange={(v: string) => handleChange("programYear", v)} options={["First", "Second", "Third"]} />
                        <SelectField label="Program Block" value={formData.programBlock} onChange={(v: string) => handleChange("programBlock", v)} options={["I", "II", "III", "IV", "V", "VI"]} />
                        <SelectField label="Domain" value={formData.domain} onChange={(v: string) => handleChange("domain", v)} options={["Knowledge", "Skill", "Attitude"]} />
                        <SelectField label="Level" value={formData.level} onChange={(v: string) => handleChange("level", v)} options={["I - Observation", "II - Assistance", "III - Perform under supervision", "IV - Perform/Work independently"]} />
                    </div>

                    <div className="space-y-4 mb-6">
                        <InputField label="Procedure Name" value={formData.procedureName} onChange={(v: string) => handleChange("procedureName", v)} />
                        <TextAreaField label="Procedure Description" value={formData.procedureDescription} onChange={(v: string) => handleChange("procedureDescription", v)} />
                    </div>

                    <hr className="border-white/10 my-6" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <InputField label="Date" type="date" value={formData.date} onChange={(v: string) => handleChange("date", v)} />
                        <InputField label="InPatient ID (8 Digit)" value={formData.inPatientId} onChange={(v: string) => handleChange("inPatientId", v)} />
                        <InputField label="Patient Name" value={formData.patientName} onChange={(v: string) => handleChange("patientName", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <InputField label="Age (Years)" type="number" value={formData.age} onChange={(v: string) => handleChange("age", v)} />
                        <InputField label="Address" value={formData.address} onChange={(v: string) => handleChange("address", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <TextAreaField label="History" value={formData.history} onChange={(v: string) => handleChange("history", v)} />
                            <button onClick={() => setShowHistorySuggestions(!showHistorySuggestions)} className="text-xs text-primary mt-1 hover:underline">
                                {showHistorySuggestions ? "Hide Suggestions" : "Show Suggestions"}
                            </button>
                            {showHistorySuggestions && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {HISTORY_SUGGESTIONS.map(s => (
                                        <button key={s} onClick={() => addSuggestion("history", s)} className="text-xs rounded-full bg-white/5 px-2 py-1 text-gray-400 hover:bg-white/10 hover:text-white uppercase">+ {s}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <TextAreaField label="Clinical Examination / Findings" value={formData.diagnosis} onChange={(v: string) => handleChange("diagnosis", v)} />
                            <button onClick={() => setShowClinicalSuggestions(!showClinicalSuggestions)} className="text-xs text-primary mt-1 hover:underline">
                                {showClinicalSuggestions ? "Hide Suggestions" : "Show Suggestions"}
                            </button>
                            {showClinicalSuggestions && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {CLINICAL_SUGGESTIONS.map(s => (
                                        <button key={s} onClick={() => addSuggestion("diagnosis", s)} className="text-xs rounded-full bg-white/5 px-2 py-1 text-gray-400 hover:bg-white/10 hover:text-white uppercase">+ {s}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <TextAreaField label="Investigation" value={formData.investigation} onChange={(v: string) => handleChange("investigation", v)} />
                        <TextAreaField label="Provisional Diagnosis" value={formData.provisionalDiagnosis} onChange={(v: string) => handleChange("provisionalDiagnosis", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <TextAreaField label="Final Diagnosis" value={formData.finalDiagnosis} onChange={(v: string) => handleChange("finalDiagnosis", v)} />
                        <TextAreaField label="Management" value={formData.management} onChange={(v: string) => handleChange("management", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <InputField label="Follow Up" value={formData.followUp} onChange={(v: string) => handleChange("followUp", v)} />
                        <InputField label="Submitted To" value={formData.submittedTo.join(", ")} onChange={(v: string) => handleChange("submittedTo", [v])} placeholder="Enter consultant names..." />
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex-none border-t border-white/10 bg-[#0a0a0a] p-6">
                    <div className="flex justify-end space-x-4">
                        <button onClick={onClose} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white font-medium">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 flex items-center space-x-2">
                            <Save size={18} />
                            <span>Confirm Discharge & Save</span>
                        </button>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}

interface InputFieldProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}

function InputField({ label, value, onChange, type = "text", placeholder }: InputFieldProps) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none"
            />
        </div>
    )
}

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}

function TextAreaField({ label, value, onChange }: TextAreaFieldProps) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <textarea
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none"
            />
        </div>
    )
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none"
            >
                <option value="">-- Select --</option>
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    )
}
