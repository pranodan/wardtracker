"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parse } from "date-fns";
import { Patient } from "@/types";
import DischargeForm from "@/components/ward/DischargeForm";
import { useRouter } from "next/navigation";
import { Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const DATE_FORMATS = ["M/d/yy", "yyyy/MM/dd", "yyyy-MM-dd"];

function parseArchiveDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    for (const fmt of DATE_FORMATS) {
        try {
            const parsed = parse(dateStr, fmt, new Date());
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {
            // Continue to next format
        }
    }
    // Try native Date as fallback for standard ISO strings
    const native = new Date(dateStr);
    return isNaN(native.getTime()) ? null : native;
}

export default function ArchivesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [modifiedPatients, setModifiedPatients] = useState<Record<string, Patient>>({});
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300); // 300ms debounce as per instruction
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch filtered data from API
    useEffect(() => {
        const fetchResults = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/archives?q=${encodeURIComponent(debouncedQuery)}`);
                if (!res.ok) throw new Error("Search failed");
                const data = await res.json();
                setFilteredData(data);
            } catch (err) {
                console.error("Search error:", err);
                showToast("Failed to search archives", "error");
            } finally {
                setIsSearching(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // Load modifications from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("archive_modifications");
        if (saved) {
            try {
                setModifiedPatients(JSON.parse(saved));
            } catch (e) { console.error("Error loading modifications:", e); }
        }
    }, []);

    // Save modifications to localStorage on change
    useEffect(() => {
        if (Object.keys(modifiedPatients).length > 0) {
            localStorage.setItem("archive_modifications", JSON.stringify(modifiedPatients));
        }
    }, [modifiedPatients]);

    // Filter data logic removed - moved to server API

    // Group filtered patients by Month of IPDate
    const groupedPatients = useMemo(() => {
        const groups: Record<string, any[]> = {};

        filteredData.forEach((item: any) => {
            const date = parseArchiveDate(item.IPDate);
            if (!date) return;

            try {
                const key = format(date, "MMMM yyyy");
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(item);
            } catch (e) {
                console.error("Error formatting date for item:", item, e);
            }
        });

        // Sort keys chronologically
        return Object.entries(groups).sort((a, b) => {
            const dateA = parseArchiveDate(a[1][0].IPDate);
            const dateB = parseArchiveDate(b[1][0].IPDate);
            if (!dateA || !dateB) return 0;
            return dateB.getTime() - dateA.getTime(); // Descending (Newest first)
        });
    }, [filteredData]);

    const handlePatientClick = async (item: any) => {
        const hospitalNo = item["Hospital no"];

        // Check if we have modified this patient in the current session
        if (modifiedPatients[hospitalNo]) {
            setSelectedPatient(modifiedPatients[hospitalNo]);
            return;
        }

        // Construct Patient object from archive data
        // Use IPDate for Date field in form per user request: "for Date in the form use IPDate"
        // IPDate format: "5/1/24" -> Needs "2024-05-01" for input type="date"
        let formDate = "";
        try {
            if (item["IPDate"]) {
                const date = parseArchiveDate(item.IPDate);
                if (date) {
                    formDate = format(date, "yyyy-MM-dd");
                }
            }
        } catch (e) {
            console.error(e);
        }

        let patient: Patient = {
            id: item["Hospital no"],
            hospitalNo: item["Hospital no"],
            ipDate: item["IPDate"],
            inPatNo: "", // N/A
            name: item["Patient Name"],
            department: item["Department"],
            consultant: "Dr Bibek Baskota", // Hardcoded per requirements
            mobile: item["Mobile"],
            ageGender: item["Age/Gender"],
            bedNo: item["Bed No"],
            address: item["Address"],
            history: item["History"] || item["history"] || "",
            examination: item["Examination"] || item["examination"] || item["Clinical Findings"] || "",
            investigation: item["Investigation"] || item["investigation"] || "",
            procedureName: item["Procedure Name"] || item["procedureName"] || "",
            procedureDescription: item["Procedure Description"] || item["procedureDescription"] || "",
            diagnosis: item["Diagnosis"] || item["diagnosis"] || "",
            plan: item["Management"] || item["management"] || item["Plan"] || "",

            // Auto-fill requirements
            dischargeDate: formDate, // Mapped to 'Date' in DischargeForm
            followUp: item["FollowUp"] || "2 weeks",
            programYear: item["ProgramYear"] || "Third",
            programBlock: item["ProgramBlock"] || "V",
            domain: item["Domain"] || "Skill",
            level: item["Level"] || "III"
        };

        // ENHANCEMENT: Try to fetch richer data from Firestore (patient_data collection)
        try {
            const docRef = doc(db, "patient_data", hospitalNo);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const fsData = docSnap.data();
                console.log("Found enrichment data in Firestore for:", hospitalNo);

                // Merge clinical fields if they are truthy and not already more detailed in JSON
                // Priority: Firestore data usually contains the actual managed findings from the ward
                patient = {
                    ...patient,
                    history: fsData.history || patient.history,
                    examination: fsData.examination || patient.examination,
                    investigation: fsData.investigation || patient.investigation,
                    procedureName: fsData.procedureName || patient.procedureName,
                    procedureDescription: fsData.procedureDescription || patient.procedureDescription,
                    diagnosis: fsData.diagnosis || patient.diagnosis,
                    plan: fsData.plan || patient.plan,
                    address: fsData.address || patient.address,
                    // Preserve BS dates if JSON has them, but allow Firestore to provide better defaults if JSON is missing them
                    programYear: fsData.programYear || patient.programYear,
                    programBlock: fsData.programBlock || patient.programBlock,
                    domain: fsData.domain || patient.domain,
                    level: fsData.level || patient.level,
                };
            }
        } catch (error) {
            console.warn("Firestore enrichment failed for archive patient:", error);
            // Non-blocking: continue with base patient data
        }

        setSelectedPatient(patient);
    };

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({
            ...prev,
            [month]: !prev[month]
        }));
    };

    // Auto-expand if searching
    useEffect(() => {
        if (debouncedQuery.trim()) {
            const allExpanded: Record<string, boolean> = {};
            groupedPatients.forEach(([month]) => {
                allExpanded[month] = true;
            });
            setExpandedMonths(allExpanded);
        } else {
            // Collapse all by default when search is cleared
            setExpandedMonths({});
        }
    }, [debouncedQuery, groupedPatients]); // Re-run when query or groups change

    const handleSave = (updatedPatient: Patient) => {
        setModifiedPatients(prev => ({
            ...prev,
            [updatedPatient.hospitalNo]: updatedPatient
        }));
        showToast("Details saved for this session. Generate script will now use updated values.", "success");
        setSelectedPatient(null);
    };

    return (
        <main className="min-h-screen bg-background pb-20 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Patient Archives</h1>
                    <p className="text-gray-400">2081 - 2082 BS</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Name or Hospital No..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-500"
                        />
                        {searchQuery !== debouncedQuery && (
                            <div className="absolute right-3 top-2.5">
                                <span className="block h-2 w-2 animate-ping rounded-full bg-primary" />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center space-x-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <Home size={18} />
                        <span className="hidden md:inline">Home</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {groupedPatients.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        {debouncedQuery ? `No patients found matching "${debouncedQuery}"` : "Loading or No Data..."}
                    </div>
                ) : (
                    groupedPatients.map(([month, patients]) => (
                        <div key={month} className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                            <button
                                onClick={() => toggleMonth(month)}
                                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-lg font-semibold text-primary">
                                        {month}
                                    </h2>
                                    <span className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded-full">
                                        {patients.length} Patients
                                    </span>
                                </div>
                                <span className={`transform transition-transform ${expandedMonths[month] ? "rotate-180" : ""}`}>
                                    ▼
                                </span>
                            </button>

                            {expandedMonths[month] && (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {patients.map((p: any, idx: number) => {
                                        const mp = modifiedPatients[p["Hospital no"]];
                                        return (
                                            <motion.div
                                                key={`${p["Hospital no"]}-${idx}`}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => handlePatientClick(p)}
                                                className={`glass-card p-4 rounded-xl cursor-pointer hover:bg-white/5 border transition-all ${mp ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' : 'border-white/10 hover:border-primary/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-mono text-gray-500">{p["Hospital no"]}</span>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                                                            {p["IPDate"]}
                                                        </span>
                                                        {mp && <span className="text-[9px] bg-primary text-black px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">Modified</span>}
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-white truncate mb-1">{mp?.name || p["Patient Name"]}</h3>
                                                <div className="text-xs text-gray-400 flex flex-col gap-1">
                                                    <span className="truncate">{mp?.address || p["Address"]}</span>
                                                    <span>{mp?.ageGender || p["Age/Gender"]}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {selectedPatient && (
                <DischargeForm
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                    onConfirmDischarge={() => { }} // No-op for archives
                    onSave={handleSave} // Calls save logic
                    hideDischargeButton={true} // Hide the confirm button
                />
            )}
        </main>
    );
}
