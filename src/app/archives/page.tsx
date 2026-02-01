"use client";

import { useState, useMemo, useEffect } from "react";
import archiveData from "../../../2081AND2082.json";
import { format, parse } from "date-fns";
import { Patient } from "@/types";
import DischargeForm from "@/components/ward/DischargeForm";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

export default function ArchivesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [modifiedPatients, setModifiedPatients] = useState<Record<string, Patient>>({});

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300); // 300ms debounce as per instruction
        return () => clearTimeout(handler);
    }, [searchQuery]);

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

    // Filter data logic
    const filteredData = useMemo(() => {
        const data = archiveData as any[];
        if (!debouncedQuery.trim()) return data;

        const query = debouncedQuery.toLowerCase();
        // Performance: Filter and limit to top 100 results to prevent freezing
        const results = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (
                (item["Patient Name"]?.toLowerCase() || "").includes(query) ||
                (item["Hospital no"]?.toLowerCase() || "").includes(query)
            ) {
                results.push(item);
                if (results.length >= 100) break; // Hard limit for performance
            }
        }
        return results;
    }, [debouncedQuery]);

    // Group filtered patients by Month of IPDate
    const groupedPatients = useMemo(() => {
        const groups: Record<string, any[]> = {};

        filteredData.forEach((item: any) => {
            try {
                // IPDate format example: "5/1/24" (M/D/YY)
                // Use 1st column (IPDate) as requested
                // Fix Date parsing for IPDate (M/D/YY to YYYY-MM-DD)
                const date = parse(item.IPDate, "M/d/yy", new Date());
                if (isNaN(date.getTime())) return;

                const key = format(date, "MMMM yyyy");
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(item);
            } catch (e) {
                console.error("Error parsing date for item:", item, e);
            }
        });

        // Sort keys chronologically
        return Object.entries(groups).sort((a, b) => {
            // Fix Date parsing for IPDate (M/D/YY to YYYY-MM-DD)
            const dateA = parse(a[1][0].IPDate, "M/d/yy", new Date());
            const dateB = parse(b[1][0].IPDate, "M/d/yy", new Date());
            return dateB.getTime() - dateA.getTime(); // Descending (Newest first)
        });
    }, [filteredData]);

    const handlePatientClick = (item: any) => {
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
                const date = parse(item.IPDate, "M/d/yy", new Date()); // Use parse for robustness
                if (!isNaN(date.getTime())) {
                    formDate = format(date, "yyyy-MM-dd");
                }
            }
        } catch (e) {
            console.error(e);
        }

        const patient: Patient = {
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

            // Auto-fill requirements
            dischargeDate: formDate, // Mapped to 'Date' in DischargeForm
            followUp: "2 weeks",
            programYear: "Third",
            programBlock: "V",
            domain: "Skill",
            level: "III"
        };
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
