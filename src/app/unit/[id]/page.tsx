"use client";

import { usePatients } from "@/hooks/usePatients";
import { UNITS, Patient } from "@/types";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import PatientList from "@/components/ward/PatientList";
import ElectiveTable from "@/components/ward/ElectiveTable";
import PatientDetailModal from "@/components/ward/PatientDetailModal";
import PatientSummaryModal from "@/components/ward/PatientSummaryModal";
import ElectiveDetailModal from "@/components/ward/ElectiveDetailModal";
import DischargeForm from "@/components/ward/DischargeForm";
import { sortPatientsByBed } from "@/utils/bedGrouping";
import { Users, Bed, List, Map, FileOutput, RefreshCcw, Home, X, Plus, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, setDoc, doc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/components/ui/Toast";
import ViewSwitcher, { ViewMode } from "@/components/ward/ViewSwitcher";
import { useBedGrouping } from "@/hooks/useBedGrouping";
import { useEffect } from "react";
import { buildDischargeRecord, buildDischargeRecordId, sanitizeSheetValue } from "@/lib/utils";

export default function UnitPage() {
    const params = useParams();
    const router = useRouter();
    const unitId = Number(params.id);
    const unit = UNITS.find((u) => u.id === unitId);
    const { patients, loading, refresh, sheetConsultants } = usePatients();
    const [activeTab, setActiveTab] = useState<"unit" | "main" | "consultant" | "elective">("unit");
    const [viewMode, setViewMode] = useState<ViewMode>("cards");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [dischargingPatient, setDischargingPatient] = useState<Patient | null>(null);
    const [collapsedConsultants, setCollapsedConsultants] = useState<Record<string, boolean>>({});
    const [collapsedOrthopedicsConsultants, setCollapsedOrthopedicsConsultants] = useState<Record<string, boolean>>({});
    const [dynamicConsultants, setDynamicConsultants] = useState<string[]>([]);
    const [showSelector, setShowSelector] = useState(false);
    const [removingConsultant, setRemovingConsultant] = useState<string | null>(null);
    const [consultantSearch, setConsultantSearch] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [mainListMode, setMainListMode] = useState<"all" | "ortho_consultants">("all");
    const { showToast } = useToast();

    const consultantMatches = (left?: string, right?: string) =>
        sanitizeSheetValue(left).toLowerCase() === sanitizeSheetValue(right).toLowerCase();
    const isOrthopedicsDepartment = (department?: string) =>
        sanitizeSheetValue(department).toLowerCase().includes("orthop");
    const belongsToUnitConsultants = (patient: Patient) => {
        const patientConsultant = sanitizeSheetValue(patient.consultant).toLowerCase();
        return dynamicConsultants.some(c => patientConsultant === sanitizeSheetValue(c).toLowerCase());
    };

    // Fetch dynamic consultants for this unit from Firestore
    useEffect(() => {
        if (!unitId) return;
        const docRef = doc(db, "unit_settings", unitId.toString());
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.consultants) {
                    setDynamicConsultants(data.consultants);
                } else if (unit) {
                    setDynamicConsultants(unit.consultants);
                }
            } else if (unit) {
                // Initialize with defaults if not set
                setDynamicConsultants(unit.consultants);
            }
        });
        return () => unsubscribe();
    }, [unitId, unit]);

    const allConsultants = useMemo(
        () => Array.from(new Set(sheetConsultants.map(c => c.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [sheetConsultants]
    );

    // Fetch dynamic bed grouping
    const { groups } = useBedGrouping(unitId);

    // Calculate total patients for this unit (regardless of active tab)
    const unitTotalPatients = useMemo(() => {
        if (!unit || dynamicConsultants.length === 0) return 0;
        return patients.filter(p => {
            if (p.status === "discharged" || p.status === "elective") return false;
            return belongsToUnitConsultants(p);
        }).length;
    }, [patients, unit, dynamicConsultants]);

    // Filter and Sort Patients
    const displayedPatients = useMemo(() => {
        if (!unit) return [];

        // Filter out discharged and elective patients (handled separately in elective tab)
        let filtered = patients.filter(
            p =>
                p.status !== "discharged" &&
                p.status !== "elective" &&
                !p.autoDischarged &&
                Boolean(sanitizeSheetValue(p.bedNo))
        );

        if (activeTab === "elective") {
            // Elective List Sorting: 
            // 1. Filter: Date >= Today - 7
            // 2. Sort: Future (Asc) -> Today -> Past (Desc)

            const today = startOfDay(new Date());

            // Use 'patients' directly since 'filtered' excludes 'elective'
            return patients.filter(p => p.status === "elective").sort((a, b) => {
                const dateA = a.ipDate ? parseISO(a.ipDate) : new Date(0);
                const dateB = b.ipDate ? parseISO(b.ipDate) : new Date(0);

                const diffA = differenceInDays(dateA, today);
                const diffB = differenceInDays(dateB, today);

                const isAFuture = diffA > 0;
                const isBFuture = diffB > 0;
                const isAToday = diffA === 0;
                const isBToday = diffB === 0;
                const isAPast = diffA < 0;
                const isBPast = diffB < 0;

                // Priority 1: Future (Ascending: Tomorrow, T+2...)
                if (isAFuture && !isBFuture) return -1;
                if (!isAFuture && isBFuture) return 1;
                if (isAFuture && isBFuture) return diffA - diffB; // Smaller diff (closer to today) first? No, "Tomorrow, Tomorrow+1". Tomorrow is diff 1. T+2 is diff 2. So Ascending diff.

                // Priority 2: Today
                if (isAToday && !isBToday) return -1;
                if (!isAToday && isBToday) return 1;
                if (isAToday && isBToday) return 0;

                // Priority 3: Past (Descending: Today-1, Today-2...)
                // We want Today-1 (diff -1) before Today-7 (diff -7).
                // diffA is -1, diffB is -7.
                // -1 > -7 ? Yes. If we sort Ascending (-7 ... -1) it puts Older first.
                // We want Descending (-1 ... -7).
                if (isAPast && isBPast) return diffB - diffA;

                return 0;
            });
        }

        if (activeTab === "unit" || activeTab === "consultant") {
            filtered = filtered.filter((p) => {
                const patientConsultant = p.consultant?.trim().toLowerCase() || "";
                return dynamicConsultants.some(c => patientConsultant === c.trim().toLowerCase());
            });

            if (activeTab === "unit" || activeTab === "consultant") {
                // Sort by bed in both Unit and Consultant views
                return sortPatientsByBed(filtered, groups);
            }
            return filtered;
        }

        if (activeTab === "main") {
            return filtered.sort((a, b) => {
                const dateA = new Date(a.ipDate || "").getTime();
                const dateB = new Date(b.ipDate || "").getTime();
                // Handle invalid dates (push to bottom)
                if (isNaN(dateA) && isNaN(dateB)) return 0;
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                // Descending order (B - A)
                return dateB - dateA;
            });
        }

        return filtered;
    }, [patients, activeTab, unit, groups, dynamicConsultants]);
    const headerPatientCount = displayedPatients.length;
    const headerPatientLabel =
        activeTab === "main"
            ? "Patients in Mainlist"
            : activeTab === "elective"
                ? "Elective Cases"
                : "Patients in Wardlist";

    const handleAddConsultant = async (consultant: string) => {
        if (dynamicConsultants.some(current => consultantMatches(current, consultant))) return;
        try {
            const newConsultants = [...dynamicConsultants, consultant];
            await setDoc(doc(db, "unit_settings", unitId.toString()), {
                consultants: newConsultants
            }, { merge: true });
            showToast(`Added ${consultant} to unit.`, "success");
            setShowSelector(false);
            setConsultantSearch("");
        } catch (err) {
            console.error(err);
            showToast("Failed to add consultant.", "error");
        }
    };

    const handleRemoveConsultantRequest = (consultant: string) => {
        setRemovingConsultant(consultant);
        setShowPasswordModal(true);
    };

    const handleConfirmRemove = async () => {
        if (passwordInput === "Pranodan124") {
            try {
                const newConsultants = dynamicConsultants.filter(c => !consultantMatches(c, removingConsultant || ""));
                await setDoc(doc(db, "unit_settings", unitId.toString()), {
                    consultants: newConsultants
                }, { merge: true });
                showToast(`Removed ${removingConsultant} from unit.`, "success");
                setShowPasswordModal(false);
                setRemovingConsultant(null);
                setPasswordInput("");
            } catch (err) {
                console.error(err);
                showToast("Failed to remove consultant.", "error");
            }
        } else {
            showToast("Invalid password.", "error");
        }
    };

    const handlePatientClick = (patient: Patient) => {
        setSelectedPatient(patient);
    };

    const handleSavePatient = async (updated: Patient) => {
        try {
            // Save to 'patient_data' collection using hospitalNo as ID
            await setDoc(doc(db, "patient_data", updated.hospitalNo), updated, { merge: true });
            console.log("Patient data saved");
            showToast("Patient details saved!", "success");
            setSelectedPatient(null);
        } catch (error) {
            console.error("Error saving patient:", error);
            showToast("Failed to save patient details.", "error");
            throw error; // Re-throw so modal knows it failed
        }
    };

    const handleDischargeClick = (patient: Patient) => {
        setSelectedPatient(null);
        setDischargingPatient(patient);
    };

    const handleTransfer = async (patient: Patient, consultant: string) => {
        if (!unit) return;

        try {
            // Save to 'transfers' collection
            await addDoc(collection(db, "transfers"), {
                hospitalNo: patient.hospitalNo,
                newConsultant: consultant,
                unitId: unitId,
                timestamp: new Date().toISOString()
            });

            // Save Snapshot of Patient Data to 'patient_data' so they persist even if removed from Sheet
            await setDoc(doc(db, "patient_data", patient.hospitalNo), {
                ...patient,
                consultant: consultant, // Update consultant in snapshot too
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            console.log("Transfer and Snapshot saved to Firebase");
            showToast(`Transferred ${patient.name} to ${unit.name} (${consultant}).`, "success");
            setSelectedPatient(null);
        } catch (error) {
            console.error("Error transferring patient:", error);
            showToast("Failed to transfer patient.", "error");
        }
    };

    const handleRemove = async (patient: Patient) => {
        const dischargeRecordId = patient.autoDischargeRecordId || (patient.status === "discharged" ? buildDischargeRecordId(patient) : "");

        if (!dischargeRecordId) {
            showToast("Discharge this patient first before removing them from the wardlist.", "error");
            return;
        }

        if (!confirm(`Remove ${patient.name} from this unit list?`)) return;

        try {
            await setDoc(
                doc(db, "discharges", dischargeRecordId),
                buildDischargeRecord(patient, {
                    autoDischargeRecordId: dischargeRecordId,
                    dischargeSource: patient.autoDischarged ? "automatic+wardlist" : "manual",
                    removedFromWardlistAt: new Date().toISOString(),
                    status: "discharged"
                }),
                { merge: true }
            );

            // Find the transfer record
            const q = query(collection(db, "transfers"), where("hospitalNo", "==", patient.hospitalNo));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                // Delete all matching transfer records
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
            }

            await setDoc(doc(db, "patient_data", patient.hospitalNo), {
                status: "discharged",
                autoDischargeRecordId: dischargeRecordId,
                removedFromWardlistAt: new Date().toISOString()
            }, { merge: true });

            showToast("Patient removed from wardlist.", "success");
            setSelectedPatient(null);
        } catch (error) {
            console.error("Error removing patient:", error);
            showToast("Failed to remove patient.", "error");
        }
    };

    const handleConfirmDischarge = async (dischargeData: Partial<Patient> & Record<string, unknown>) => {
        try {
            const dischargeRecordId =
                (typeof dischargeData.autoDischargeRecordId === "string" ? dischargeData.autoDischargeRecordId : "") ||
                dischargingPatient?.autoDischargeRecordId ||
                buildDischargeRecordId({
                    hospitalNo: String(dischargeData.hospitalNo || dischargingPatient?.hospitalNo || ""),
                    inPatNo: String(dischargeData.inPatNo || dischargingPatient?.inPatNo || ""),
                    ipDate: String(dischargeData.ipDate || dischargingPatient?.ipDate || "")
                });

            await setDoc(
                doc(db, "discharges", dischargeRecordId),
                buildDischargeRecord(
                    { ...(dischargingPatient || {}), ...dischargeData } as Patient,
                    {
                        ...dischargeData,
                        autoDischargeRecordId: dischargeRecordId,
                        dischargeSource: dischargingPatient?.autoDischarged ? "automatic+manual" : "manual",
                        status: "discharged",
                        timestamp: new Date().toISOString(),
                        unitId
                    }
                ),
                { merge: true }
            );

            // 2. Update patient status to 'discharged' in 'patient_data'
            if (typeof dischargeData.hospitalNo === "string" && dischargeData.hospitalNo) {
                await setDoc(doc(db, "patient_data", dischargeData.hospitalNo), {
                    status: "discharged",
                    autoDischargeRecordId: dischargeRecordId
                }, { merge: true });
            }

            console.log("Discharge saved to Firebase");

            setDischargingPatient(null);
            showToast("Patient discharged successfully!", "success");
        } catch (error) {
            console.error("Error discharging patient:", error);
            showToast("Failed to save discharge data.", "error");
        }
    };

    if (!unit) return <div className="p-8 text-white">Unit not found</div>;

    const isSportsUnit = unit.id === 5;
    const filteredConsultantOptions = allConsultants.filter(consultant =>
        consultant.toLowerCase().includes(consultantSearch.toLowerCase())
    );
    const orthopedicsPatients = displayedPatients.filter(patient => isOrthopedicsDepartment(patient.department));
    const groupedOrthopedicsPatients = Object.values(
        orthopedicsPatients.reduce((acc, patient) => {
            const displayName = sanitizeSheetValue(patient.consultant);
            if (!displayName) {
                return acc;
            }

            const normalizedKey = displayName.toLowerCase();
            if (!acc[normalizedKey]) {
                acc[normalizedKey] = {
                    key: normalizedKey,
                    consultant: displayName,
                    patients: []
                };
            }

            acc[normalizedKey].patients.push(patient);
            return acc;
        }, {} as Record<string, { key: string; consultant: string; patients: Patient[] }>)
    ).sort((a, b) => a.consultant.localeCompare(b.consultant));
    const unassignedOrthopedicsPatients = orthopedicsPatients.filter(patient =>
        !sanitizeSheetValue(patient.consultant)
    );

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 glass border-b border-white/10 p-4 flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-white">{unit.name}</h1>
                    <p className="text-xs text-gray-400">{headerPatientCount} {headerPatientLabel}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                        <Home size={14} />
                        <span className="hidden sm:inline">Home</span>
                    </button>
                    <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className={cn(
                            "flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all",
                            loading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <RefreshCcw size={14} className={cn("transition-all", loading && "animate-spin")} />
                        <span className="hidden sm:inline">{loading ? "Syncing..." : "Refresh"}</span>
                    </button>
                    <button
                        onClick={() => router.push("/discharges")}
                        className="flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                        <FileOutput size={14} />
                        <span className="hidden sm:inline">Discharges</span>
                    </button>
                    <button
                        onClick={() => router.push(`/admin/bed-map?unitId=${unitId}`)}
                        className="flex items-center space-x-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                        <Map size={14} />
                        <span className="hidden sm:inline">Round Map</span>
                    </button>
                </div>
            </div>

            {/* Consultant Selection Bar */}
            <div className="mx-4 mt-4 flex flex-wrap items-center gap-2">
                {dynamicConsultants.map((c) => (
                    <div key={c} className="flex items-center space-x-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary group">
                        <span>{c}</span>
                        <button
                            onClick={() => handleRemoveConsultantRequest(c)}
                            className="ml-1 text-primary/40 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                
                <div className="relative">
                    <button
                        onClick={() => setShowSelector(!showSelector)}
                        className="flex items-center space-x-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <Plus size={14} />
                        <span>Add Consultant</span>
                    </button>

                    {showSelector && (
                        <div className="absolute top-full left-0 mt-2 z-50 w-64 max-h-60 overflow-y-auto rounded-xl bg-gray-900 border border-white/10 shadow-2xl p-2 animate-in fade-in slide-in-from-top-2">
                            <div className="sticky top-0 bg-gray-900 pb-2 border-b border-white/10 mb-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search consultants..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                                        autoFocus
                                        value={consultantSearch}
                                        onChange={(e) => setConsultantSearch(e.target.value)}
                                    />
                                    {consultantSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setConsultantSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            aria-label="Clear consultant search"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                {filteredConsultantOptions.map(c => {
                                    const isSelected = dynamicConsultants.some(selected => consultantMatches(selected, c));
                                    return (
                                        <button
                                            key={c}
                                            onClick={() => !isSelected && handleAddConsultant(c)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors",
                                                isSelected
                                                    ? "bg-primary/10 text-primary border border-primary/20"
                                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                            )}
                                            disabled={isSelected}
                                        >
                                            <span className="truncate">{c}</span>
                                            {isSelected && <span className="text-[10px] font-semibold uppercase">Selected</span>}
                                        </button>
                                    );
                                })}
                                {filteredConsultantOptions.length === 0 && (
                                    <div className="px-3 py-4 text-center text-xs text-gray-500">
                                        No consultants found in the recent sheet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm glass border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center space-x-3 text-red-400">
                            <Key size={20} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Authentication Required</h3>
                        </div>
                        <p className="text-xs text-gray-400">
                            To remove <span className="text-white font-medium">{removingConsultant}</span>, please enter the administrative password.
                        </p>
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                            placeholder="Enter password"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRemove()}
                        />
                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setRemovingConsultant(null);
                                    setPasswordInput("");
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRemove}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600/20 text-red-500 text-xs font-semibold border border-red-500/20 hover:bg-red-600/30 hover:border-red-500/30 transition-all"
                            >
                                Confirm Removal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                ) : (
                    <>
                        {activeTab === "unit" && (
                            <PatientList
                                patients={displayedPatients}
                                title="My Unit"
                                onPatientClick={handlePatientClick}
                                viewMode={viewMode}
                                unitId={unitId}
                                onUpdatePatient={handleSavePatient}
                                onDischargePatient={handleDischargeClick}
                                onTransferPatient={handleTransfer}
                                consultants={dynamicConsultants}
                                onRemovePatient={handleRemove}
                                groups={groups}
                                showConsultantInitials={true}
                            />
                        )}
                        {activeTab === "elective" && (
                            <ElectiveTable
                                patients={displayedPatients}
                                onPatientClick={handlePatientClick}
                            />
                        )}
                        {activeTab === "main" && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setMainListMode("all")}
                                        className={cn(
                                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                            mainListMode === "all"
                                                ? "bg-primary text-black"
                                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        All Patients
                                    </button>
                                    <button
                                        onClick={() => setMainListMode("ortho_consultants")}
                                        className={cn(
                                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                            mainListMode === "ortho_consultants"
                                                ? "bg-primary text-black"
                                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        Orthopedics by Consultant
                                    </button>
                                </div>

                                {mainListMode === "all" ? (
                                    <PatientList
                                        patients={displayedPatients}
                                        title="All Patients"
                                        onPatientClick={handlePatientClick}
                                        readOnly={true}
                                        groupByDate={true}
                                        highlightConsultants={dynamicConsultants}
                                        viewMode={viewMode === "cards" ? "calendar" : viewMode}
                                        onUpdatePatient={handleSavePatient}
                                        onDischargePatient={handleDischargeClick}
                                        onTransferPatient={handleTransfer}
                                        consultants={dynamicConsultants}
                                        onRemovePatient={handleRemove}
                                        groups={groups}
                                        showConsultantInitials={true}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => setCollapsedOrthopedicsConsultants({})}
                                                className="text-xs text-primary hover:text-primary/80"
                                            >
                                                Expand All
                                            </button>
                                            <span className="text-xs text-gray-600">|</span>
                                            <button
                                                onClick={() => {
                                                    const allCollapsed = groupedOrthopedicsPatients.reduce((acc, group) => ({
                                                        ...acc,
                                                        [group.key]: true
                                                    }), {});
                                                    setCollapsedOrthopedicsConsultants(allCollapsed);
                                                }}
                                                className="text-xs text-primary hover:text-primary/80"
                                            >
                                                Collapse All
                                            </button>
                                        </div>
                                        {groupedOrthopedicsPatients.map(group => (
                                            <PatientList
                                                key={group.key}
                                                patients={group.patients}
                                                title={group.consultant}
                                                onPatientClick={handlePatientClick}
                                                readOnly={true}
                                                viewMode={viewMode === "cards" ? "calendar" : viewMode}
                                                onUpdatePatient={handleSavePatient}
                                                onDischargePatient={handleDischargeClick}
                                                onTransferPatient={handleTransfer}
                                                consultants={dynamicConsultants}
                                                onRemovePatient={handleRemove}
                                                groups={groups}
                                                showConsultantInitials={true}
                                                collapsible={true}
                                                isCollapsed={collapsedOrthopedicsConsultants[group.key]}
                                                onToggleCollapse={() => {
                                                    setCollapsedOrthopedicsConsultants(prev => ({
                                                        ...prev,
                                                        [group.key]: !prev[group.key]
                                                    }));
                                                }}
                                            />
                                        ))}
                                        {unassignedOrthopedicsPatients.length > 0 && (
                                            <PatientList
                                                patients={unassignedOrthopedicsPatients}
                                                title="Unassigned"
                                                onPatientClick={handlePatientClick}
                                                readOnly={true}
                                                viewMode={viewMode === "cards" ? "calendar" : viewMode}
                                                onUpdatePatient={handleSavePatient}
                                                onDischargePatient={handleDischargeClick}
                                                onTransferPatient={handleTransfer}
                                                consultants={dynamicConsultants}
                                                onRemovePatient={handleRemove}
                                                groups={groups}
                                                showConsultantInitials={true}
                                                collapsible={true}
                                            />
                                        )}
                                        {groupedOrthopedicsPatients.length === 0 && unassignedOrthopedicsPatients.length === 0 && (
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                                                No orthopedics patients found in the current mainlist.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === "consultant" && (
                            <div className="space-y-4">
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => setCollapsedConsultants({})} className="text-xs text-primary hover:text-primary/80">Expand All</button>
                                    <span className="text-xs text-gray-600">|</span>
                                    <button
                                        onClick={() => {
                                            const allCollapsed = dynamicConsultants.reduce((acc, c) => ({ ...acc, [c]: true }), {});
                                            setCollapsedConsultants(allCollapsed);
                                        }}
                                        className="text-xs text-primary hover:text-primary/80"
                                    >
                                        Collapse All
                                    </button>
                                </div>
                                {dynamicConsultants.map((consultant) => {
                                    const consultantPatients = displayedPatients.filter(p =>
                                        p.consultant?.trim().toLowerCase() === consultant.trim().toLowerCase()
                                    );
                                    if (consultantPatients.length === 0) return null;
                                    return (
                                        <PatientList
                                            key={consultant}
                                            patients={consultantPatients}
                                            title={consultant}
                                            onPatientClick={handlePatientClick}
                                            collapsible={true}
                                            isCollapsed={collapsedConsultants[consultant]}
                                            onToggleCollapse={() => {
                                                setCollapsedConsultants(prev => ({
                                                    ...prev,
                                                    [consultant]: !prev[consultant]
                                                }));
                                            }}
                                            onTransferPatient={handleTransfer}
                                            consultants={dynamicConsultants}
                                            onRemovePatient={handleRemove}
                                            groups={groups}
                                            enableBulkCopy={true}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedPatient && (
                activeTab === "elective" ? (
                    <ElectiveDetailModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                    />
                ) : activeTab === "main" ? (
                    <PatientSummaryModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        onTransfer={handleTransfer}
                        consultants={dynamicConsultants}
                    />
                ) : (
                    <PatientDetailModal
                        patient={selectedPatient}
                        onClose={() => setSelectedPatient(null)}
                        onSave={handleSavePatient}
                        onDischarge={handleDischargeClick}
                        readOnly={false}
                        onTransfer={handleTransfer}
                        consultants={dynamicConsultants}
                        onRemove={activeTab === "unit" ? handleRemove : undefined}
                    />
                )
            )}

            {/* Discharge Form */}
            {dischargingPatient && (
                <DischargeForm
                    patient={dischargingPatient}
                    onClose={() => setDischargingPatient(null)}
                    onConfirmDischarge={handleConfirmDischarge}
                    onSave={handleSavePatient}
                />
            )}

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/10 px-6 py-3">
                <div className="flex justify-around">
                    <NavButton
                        active={activeTab === "unit"}
                        onClick={() => setActiveTab("unit")}
                        icon={<Users size={20} />}
                        label="Unit"
                    />
                    {isSportsUnit && (
                        <NavButton
                            active={activeTab === "elective"}
                            onClick={() => setActiveTab("elective")}
                            icon={<List size={20} />}
                            label="Elective"
                        />
                    )}
                    <NavButton
                        active={activeTab === "main"}
                        onClick={() => setActiveTab("main")}
                        icon={<List size={20} />}
                        label="Main List"
                    />
                    <NavButton
                        active={activeTab === "consultant"}
                        onClick={() => setActiveTab("consultant")}
                        icon={<Bed size={20} />}
                        label="Consultants"
                    />
                </div>
            </div>
        </main>
    );
}

// Subcomponents helper
function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center space-y-1 rounded-lg px-4 py-2 transition-all",
                active ? "bg-primary/20 text-primary" : "text-gray-400 hover:text-white"
            )}
        >
            {icon}
            <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
        </button>
    );
}




