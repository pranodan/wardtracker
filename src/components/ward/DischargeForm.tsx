"use client";

import { Patient } from "@/types";
import { useState } from "react";
import { X, Save, Wand2, Code, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DISCHARGE_PROCEDURE_OPTIONS, ProcedureCategory } from "./dischargeOptions";

interface DischargeFormProps {
    patient: Patient;
    onClose: () => void;
    onConfirmDischarge: (dischargeData: any) => void;
    onSave?: (patientData: Patient) => void;
    onRevert?: () => void;
    hideDischargeButton?: boolean;
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

export default function DischargeForm({ patient, onClose, onConfirmDischarge, onSave, onRevert, hideDischargeButton }: DischargeFormProps) {
    const [category, setCategory] = useState<ProcedureCategory | "">("");
    const [isProcedureOpen, setIsProcedureOpen] = useState(false);

    const [formData, setFormData] = useState(() => {
        try {
            console.log("Initializing DischargeForm with patient:", patient);
            const p = patient as any; // Cast for easier access to collection-specific fields

            const getCombinedProcedures = () => {
                let proc = p.procedure || "";
                if (Array.isArray(p.surgeries) && p.surgeries.length > 0) {
                    const surgeryText = p.surgeries.map((s: any) => `${s.procedure} (${s.dop})`).join(" + ");
                    proc = proc ? `${proc} + ${surgeryText}` : surgeryText;
                }
                return proc;
            };

            const combinedProcedures = getCombinedProcedures();

            return {
                programYear: p.programYear || "",
                programBlock: p.programBlock || "",
                domain: p.domain || "Skill",
                level: p.level || "",
                procedureName: p.procedureName || "",
                procedureDescription: p.procedureDescription || combinedProcedures,
                date: p.date || p.dischargeDate || new Date().toISOString().split('T')[0],
                inPatientId: p.inPatientId || p.hospitalNo || "",
                patientName: p.patientName || p.name || "",
                age: p.age || (() => {
                    try {
                        return String(p.ageGender || "").split('/')[0]?.replace(/\D/g, '') || "";
                    } catch (e) { return ""; }
                })(),
                address: p.address || "",
                history: p.history || "",
                diagnosis: p.examination || p.diagnosis || "", // Load Clinical Examination / Findings
                investigation: p.investigation || "",
                provisionalDiagnosis: p.provisionalDiagnosis || p.diagnosis || "",
                finalDiagnosis: p.finalDiagnosis || p.diagnosis || "",
                management: p.management || combinedProcedures || p.plan || "",
                followUp: p.followUp || "2 weeks",
                submittedTo: p.submittedTo || ["Dr Bibek Baskota"],
            };
        } catch (err) {
            console.error("Error initializing DischargeForm state:", err);
            return {
                programYear: "", programBlock: "", domain: "Skill", level: "", procedureName: "", procedureDescription: "", date: "", inPatientId: "", patientName: "", age: "", address: "", history: "", diagnosis: "", investigation: "", provisionalDiagnosis: "", finalDiagnosis: "", management: "", followUp: "", submittedTo: []
            };
        }
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (cat: string) => {
        setCategory(cat as ProcedureCategory);
        handleChange("procedureName", ""); // Reset procedure when category changes
        setTimeout(() => setIsProcedureOpen(true), 150);
    };

    const handleSubmit = () => {
        onConfirmDischarge({
            ...formData,
            hospitalNo: patient.hospitalNo, // CRITICAL: Required for UnitPage to identify and discharge the patient
            originalPatientId: patient.id,
        });
    };

    const handleJustSave = () => {
        if (onSave) {
            // Map form data back to patient structure where appropriate
            onSave({
                ...patient,
                name: formData.patientName,
                address: formData.address,
                dischargeDate: formData.date,
                programYear: formData.programYear,
                programBlock: formData.programBlock,
                domain: formData.domain,
                level: formData.level,
                history: formData.history, // Map back
                examination: formData.diagnosis, // Map "Diagnosis" field (Clinical Findings) back to 'examination'
                investigation: formData.investigation,
                procedureName: formData.procedureName,
                procedureDescription: formData.procedureDescription,
                diagnosis: formData.finalDiagnosis || formData.provisionalDiagnosis, // Prefer final diagnosis
                plan: formData.management, // Map 'Management' back to 'plan'
                followUp: formData.followUp
            });
            onClose();
        }
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
            // Iframe Detection: The form is likely inside an iframe
            var doc = document;
            var frames = document.getElementsByTagName('iframe');
            for (var i = 0; i < frames.length; i++) {
                try {
                    if (frames[i].contentDocument && frames[i].contentDocument.getElementById('ProgramYearId')) {
                        doc = frames[i].contentDocument;
                        console.log("Found form inside iframe:", frames[i]);
                        break;
                    }
                } catch (e) { console.warn("Access to iframe denied or error:", e); }
            }

            function setVal(id, val) {
                const el = doc.getElementById(id);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Handle Chosen / jQuery if present (check both parent and iframe window)
                    var win = doc.defaultView || window;
                    if (win.jQuery) {
                        win.jQuery('#' + id).trigger('chosen:updated');
                        win.jQuery('#' + id).trigger('change');
                    }
                }
            }

            // --- MAPPING LOGIC ---
            // Dropdowns with specific Value Mappings
            const yearMap = { "First": "1", "Second": "2", "Third": "3" };
            setVal('ProgramYearId', yearMap["${formData.programYear}"] || "");

            const blockMap = { "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5", "VI": "6" };
            setVal('ProgramBlockId', blockMap["${formData.programBlock}"] || "");

            const domainMap = { "Knowledge": "1", "Skill": "2", "Attitude": "4" };
            setVal('ProgramDomainId', domainMap["${formData.domain}"] || "2"); 

            const levelMap = { "I": "1", "II": "2", "III": "3", "IV": "4" };
            setVal('LevelId', levelMap["${formData.level}"] || "");

            // --- TEXT FIELDS ---
            setVal('ProcedureName', \`${formData.procedureName}\`);
            setVal('ProcedureDescription', \`${formData.procedureDescription}\`);
            setVal('Date', '${formData.date.replace(/-/g, "")}'); 
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

            // --- CONSULTANTS (Multi-select) ---
            const submittedNames = "${formData.submittedTo.join(",")}".split(",");
            const submittedSelect = doc.getElementById('SubmittedList');
            if (submittedSelect && submittedNames.length > 0) {
                const valuesToSelect = [];
                for (let i = 0; i < submittedSelect.options.length; i++) {
                    const optText = submittedSelect.options[i].text.toLowerCase();
                    submittedNames.forEach(name => {
                        if (name.trim() && optText.includes(name.trim().toLowerCase())) {
                            valuesToSelect.push(submittedSelect.options[i].value);
                        }
                    });
                }
                
                if (valuesToSelect.length > 0) {
                    var win = doc.defaultView || window;
                    if (win.jQuery) {
                        win.jQuery('#SubmittedList').val(valuesToSelect).trigger('chosen:updated');
                    } else {
                        for (let i = 0; i < submittedSelect.options.length; i++) {
                            submittedSelect.options[i].selected = valuesToSelect.includes(submittedSelect.options[i].value);
                        }
                    }
                }
            }
            
            alert('Data Auto-Filled! (Target: ' + (doc === document ? 'Main Page' : 'Iframe') + ')');
        })();
    `;
        navigator.clipboard.writeText(script);
        alert("Script copied! 1. Go to NBMS. 2. console paste. (Script now auto-detects iframes)");
    };

    const [showMobileSetup, setShowMobileSetup] = useState(false);

    const handleCopyMobileData = () => {
        // --- MOBILE DATA PREPARATION ---
        const yearMap = { "First": "1", "Second": "2", "Third": "3" };
        const blockMap = { "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5", "VI": "6" };
        const domainMap = { "Knowledge": "1", "Skill": "2", "Attitude": "4" };
        const levelMap = { "I": "1", "II": "2", "III": "3", "IV": "4" };

        const consultantMap: Record<string, string> = {
            "Ashok": "26", "Banskota": "26", "Bibek Baskota": "27", "Rajesh": "28",
            "Bibek Basukala": "29", "Nagmani": "30", "Ram Krishna": "85", "Ishwor": "86"
        };

        const resolveConsultants = (names: string[]) => {
            const ids: string[] = [];
            names.forEach(n => {
                for (const key in consultantMap) {
                    if (n.toLowerCase().includes(key.toLowerCase())) {
                        ids.push(consultantMap[key]);
                        break;
                    }
                }
            });
            return ids;
        };

        const data = {
            "ProgramYearId": yearMap[formData.programYear as keyof typeof yearMap] || "",
            "ProgramBlockId": blockMap[formData.programBlock as keyof typeof blockMap] || "",
            "ProgramDomainId": domainMap[formData.domain as keyof typeof domainMap] || "2",
            "LevelId": levelMap[formData.level as keyof typeof levelMap] || "",
            "ProcedureName": formData.procedureName,
            "ProcedureDescription": formData.procedureDescription,
            "Date": formData.date.replace(/-/g, ""),
            "InPatientId": formData.inPatientId,
            "PatientName": formData.patientName,
            "Age": formData.age,
            "Address": formData.address,
            "History": formData.history,
            "Diagnosis": formData.diagnosis,
            "Investigation": formData.investigation,
            "ProvisionalDiagnosys": formData.provisionalDiagnosis,
            "FinalDiagnosys": formData.finalDiagnosis,
            "Management": formData.management,
            "FollowUp": formData.followUp,
            "SubmittedList": resolveConsultants(formData.submittedTo)
        };

        navigator.clipboard.writeText(JSON.stringify(data));
        alert("Mobile Data Copied! Now open NBMS > Run Bookmarklet > Paste.");
    };

    const BOOKMARKLET_CODE = `javascript:(function(){
    if(document.getElementById('nbms-filler-overlay'))return;
    var overlay=document.createElement('div');
    overlay.id='nbms-filler-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
    var box=document.createElement('div');
    box.style.cssText='background:#fff;padding:20px;border-radius:12px;width:90%;max-width:400px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
    var title=document.createElement('h3');
    title.innerText='📋 Paste App Data Here';
    title.style.margin='0 0 15px 0';title.style.color='#333';
    var txt=document.createElement('textarea');
    txt.placeholder='Long press & Paste JSON here...';
    txt.style.cssText='width:100%;height:120px;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:15px;';
    var btn=document.createElement('button');
    btn.innerText='✨ Fill Form';
    btn.style.cssText='width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;';
    var close=document.createElement('div');
    close.innerText='Close';
    close.style.cssText='margin-top:15px;color:#666;font-size:13px;text-decoration:underline;cursor:pointer;';
    close.onclick=function(){document.body.removeChild(overlay);};
    box.appendChild(title);box.appendChild(txt);box.appendChild(btn);box.appendChild(close);
    overlay.appendChild(box);document.body.appendChild(overlay);
    btn.onclick=function(){
        var d=txt.value;
        if(!d){alert('Please paste data first!');return;}
        try{
            var j=JSON.parse(d);
            var doc=document;
            var frames=document.getElementsByTagName('iframe');
            var targetFrame=null;
            for(var i=0;i<frames.length;i++){try{if(frames[i].contentDocument&&frames[i].contentDocument.getElementById('ProgramYearId')){doc=frames[i].contentDocument;targetFrame=frames[i];break;}}catch(e){}}
            if(!targetFrame&&!doc.getElementById('ProgramYearId')){
                if(frames.length>0){
                    var directUrl=frames[0].src;
                    if(confirm("⚠️ Browser Security Blocked Access!\\n\\nClick OK to open the form directly, then run this bookmark again.")){window.location.href=directUrl;}
                }else{alert("Error: No form found on this page.");}
                document.body.removeChild(overlay);return;
            }
            var win=doc.defaultView||window;
            for(var k in j){
                var e=doc.getElementById(k);
                if(e){
                    if(k==='SubmittedList'){
                        var opts=e.options;
                        for(var z=0;z<opts.length;z++){if(j[k].includes(opts[z].value))opts[z].selected=true;}
                        if(win.jQuery)win.jQuery('#'+k).trigger('chosen:updated');
                    }else{
                        e.value=j[k];
                        e.dispatchEvent(new Event('input',{bubbles:true}));
                        e.dispatchEvent(new Event('change',{bubbles:true}));
                        if(win.jQuery)win.jQuery('#'+k).trigger('chosen:updated');
                    }
                }
            }
            alert("✅ Data Auto-Filled Successfully!");
            document.body.removeChild(overlay);
        }catch(e){alert("Error: "+e.message);}
    };
})();`.replace(/\s+/g, ' ');

    const handleOpenNBMS = () => {
        window.open("https://nbms.mec.gov.np/activity", "_blank");
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-[#0a0a0a] relative"
            >
                <AnimatePresence>
                    {showMobileSetup && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 rounded-2xl p-8"
                        >
                            <div className="max-w-md w-full text-center space-y-6">
                                <h3 className="text-xl font-bold text-white">Mobile Setup (One-Time)</h3>
                                <p className="text-gray-400 text-sm">
                                    1. <strong>Copy</strong> the code below.<br />
                                    2. Create a new bookmark in your mobile browser.<br />
                                    3. Name it <strong>"Fill NBMS"</strong> and paste the code as URL.
                                </p>
                                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-left">
                                    <code className="text-xs text-green-400 break-all block max-h-40 overflow-y-auto">
                                        {BOOKMARKLET_CODE}
                                    </code>
                                </div>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(BOOKMARKLET_CODE);
                                            alert("Bookmarklet Code Copied!");
                                        }}
                                        className="px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90"
                                    >
                                        Copy Code
                                    </button>
                                    <button
                                        onClick={() => setShowMobileSetup(false)}
                                        className="px-6 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex-none border-b border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white uppercase">Discharge / Activity Log</h2>
                        <div className="flex space-x-2">
                            <button onClick={handleOpenNBMS} className="flex items-center space-x-2 rounded-lg bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500 hover:bg-green-500/20">
                                <span className="uppercase">Open NBMS Site</span>
                            </button>
                            <div className="flex bg-blue-500/10 rounded-lg">
                                <button onClick={handleCopyScript} className="flex items-center space-x-2 px-3 py-1 text-xs font-bold text-blue-500 hover:bg-blue-500/20 border-r border-blue-500/20">
                                    <Code size={14} />
                                    <span>Copy Script (PC)</span>
                                </button>
                                <button onClick={handleCopyMobileData} className="flex items-center space-x-2 px-3 py-1 text-xs font-bold text-blue-500 hover:bg-blue-500/20">
                                    <span>Mobile</span>
                                </button>
                            </div>
                            <button onClick={() => setShowMobileSetup(true)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                                <Code size={20} />
                            </button>
                            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <SelectField label="Program Year" value={formData.programYear} onChange={(v) => handleChange("programYear", v)} options={["First", "Second", "Third"]} />
                        <SelectField label="Program Block" value={formData.programBlock} onChange={(v) => handleChange("programBlock", v)} options={["I", "II", "III", "IV", "V", "VI"]} />
                        <SelectField label="Domain" value={formData.domain} onChange={(v) => handleChange("domain", v)} options={["Knowledge", "Skill", "Attitude"]} />
                        <SelectField label="Level" value={formData.level} onChange={(v) => handleChange("level", v)} options={["I", "II", "III", "IV"]} />
                    </div>

                    <hr className="border-white/10 my-6" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <SelectField
                            label="Procedure Category"
                            value={category}
                            onChange={(v) => handleCategoryChange(v)}
                            options={Object.keys(DISCHARGE_PROCEDURE_OPTIONS)}
                        />
                        <div className="relative">
                            {category && (
                                <CustomSelect
                                    label="Procedure Name"
                                    value={formData.procedureName}
                                    onChange={(v) => handleChange("procedureName", v)}
                                    options={category ? DISCHARGE_PROCEDURE_OPTIONS[category as ProcedureCategory] : []}
                                    isOpen={isProcedureOpen}
                                    setIsOpen={setIsProcedureOpen}
                                />
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <TextAreaField label="Procedure Description" value={formData.procedureDescription} onChange={(v) => handleChange("procedureDescription", v)} />
                        </div>
                    </div>

                    <hr className="border-white/10 my-6" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <InputField label="Date" type="date" value={formData.date} onChange={(v) => handleChange("date", v)} />
                        <InputField label="InPatient ID (8 Digit)" value={formData.inPatientId} onChange={(v) => handleChange("inPatientId", v)} />
                        <InputField label="Patient Name" value={formData.patientName} onChange={(v) => handleChange("patientName", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <InputField label="Age (Years)" type="number" value={formData.age} onChange={(v) => handleChange("age", v)} />
                        <InputField label="Address" value={formData.address} onChange={(v) => handleChange("address", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <TextAreaField label="History" value={formData.history} onChange={(v) => handleChange("history", v)} />
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
                            <TextAreaField label="Clinical Examination / Findings" value={formData.diagnosis} onChange={(v) => handleChange("diagnosis", v)} />
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
                        <TextAreaField label="Investigation" value={formData.investigation} onChange={(v) => handleChange("investigation", v)} />
                        <TextAreaField label="Provisional Diagnosis" value={formData.provisionalDiagnosis} onChange={(v) => handleChange("provisionalDiagnosis", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <TextAreaField label="Final Diagnosis" value={formData.finalDiagnosis} onChange={(v) => handleChange("finalDiagnosis", v)} />
                        <TextAreaField label="Management" value={formData.management} onChange={(v) => handleChange("management", v)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <InputField label="Follow Up" value={formData.followUp} onChange={(v) => handleChange("followUp", v)} />
                        <InputField label="Submitted To" value={formData.submittedTo.join(", ")} onChange={(v) => handleChange("submittedTo", [v])} placeholder="Enter consultant names..." />
                    </div>
                </div>

                <div className="flex-none border-t border-white/10 bg-[#0a0a0a] p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            {onRevert && (
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to revert this discharge? The patient will be moved back to the active unit list.")) {
                                            onRevert();
                                        }
                                    }}
                                    className="px-6 py-2 rounded-lg bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 flex items-center space-x-2"
                                >
                                    <RefreshCcw size={18} />
                                    <span>Revert Discharge</span>
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={onClose} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white font-medium">Cancel</button>
                            {onSave && (
                                <button onClick={handleJustSave} className="px-6 py-2 rounded-lg bg-blue-500/10 text-blue-400 font-bold hover:bg-blue-500/20 flex items-center space-x-2">
                                    <Save size={18} />
                                    <span>Save</span>
                                </button>
                            )}
                            {!hideDischargeButton && (
                                <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 flex items-center space-x-2">
                                    <Save size={18} />
                                    <span>Confirm Discharge & Save</span>
                                </button>
                            )}
                        </div>
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
                onClick={(e) => type === "date" && e.currentTarget.showPicker()}
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
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none [&>option]:bg-[#0a0a0a] [&>option]:text-white"
            >
                <option value="" className="bg-[#0a0a0a] text-white">-- Select --</option>
                {options.map((opt: string) => (
                    <option key={opt} value={opt} className="bg-[#0a0a0a] text-white">{opt}</option>
                ))}
            </select>
        </div>
    )
}

interface CustomSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

function CustomSelect({ label, value, onChange, options, isOpen, setIsOpen }: CustomSelectProps) {
    return (
        <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none flex justify-between items-center text-left min-h-[46px]"
            >
                <span className={`block truncate mr-2 ${!value ? "text-gray-500" : ""}`}>{value || "-- Select --"}</span>
                <span className="text-xs opacity-50 shrink-0">▼</span>
            </button>

            <AnimatePresence>
                {isOpen && options.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-[#0a0a0a] border border-white/20 shadow-xl custom-scrollbar"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                            >
                                {opt}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
