"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    deleteDoc,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    orderBy,
    query,
    QueryDocumentSnapshot,
    setDoc
} from "firebase/firestore";
import { Patient } from "@/types";
import PatientList from "@/components/ward/PatientList";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import DischargeForm from "@/components/ward/DischargeForm";
import { useToast } from "@/components/ui/Toast";
import { extractAgeFromAgeGender, extractGenderFromAgeGender, normalizeAgeGender, sanitizeSheetValue } from "@/lib/utils";

const PAGE_SIZE = 20;
const ROTATE_PAGE_COUNT = 7;

type DischargeRecord = Record<string, unknown>;

export default function DischargesPage() {
    const [allDischarges, setAllDischarges] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDischarge, setSelectedDischarge] = useState<Patient | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();
    const { showToast } = useToast();

    const isMissingDisplayName = (patient: Patient) => !sanitizeSheetValue(patient.name || patient.patientName || "");

    const sortDischargesForDisplay = (items: Patient[]) =>
        [...items].sort((a, b) => {
            const aMissingName = isMissingDisplayName(a);
            const bMissingName = isMissingDisplayName(b);

            if (aMissingName !== bMissingName) {
                return aMissingName ? 1 : -1;
            }

            return 0;
        });

    const rotateDischarges = (items: Patient[]) => {
        const rotateCount = Math.min(items.length, PAGE_SIZE * ROTATE_PAGE_COUNT);
        if (rotateCount === 0) return items;
        return [...items.slice(rotateCount), ...items.slice(0, rotateCount)];
    };

    const mapDischargeDoc = (snapshotDoc: QueryDocumentSnapshot<DocumentData>): Patient => {
        const data = snapshotDoc.data() as DischargeRecord;
        const ageGender = normalizeAgeGender(
            String(data.ageGender || (data.age ? `${data.age}${data.gender ? `/${data.gender}` : ""}` : ""))
        );
        const patientName = String(data.patientName || data.name || "");
        const hospitalNo = String(data.hospitalNo || data.inPatientId || "");
        const inPatNo = String(data.inPatNo || data.inPatientId || "");
        const dischargeDate = String(data.date || data.dischargeDate || "");
        const history = String(data.history || "");
        const examination = String(data.examination || data.diagnosis || "");
        const investigation = String(data.investigation || "");
        const provisionalDiagnosis = String(data.provisionalDiagnosis || data.diagnosis || "");
        const finalDiagnosis = String(data.finalDiagnosis || data.diagnosis || provisionalDiagnosis);
        const procedureName = String(data.procedureName || data.procedure || "");
        const procedureDescription = String(data.procedureDescription || data.management || "");
        const management = String(data.management || data.plan || procedureDescription);
        const submittedTo = Array.isArray(data.submittedTo)
            ? data.submittedTo.map(value => String(value))
            : sanitizeSheetValue(String(data.submittedTo || ""))
                .split(",")
                .map(value => value.trim())
                .filter(Boolean);

        return {
            id: snapshotDoc.id,
            ...data,
            name: patientName,
            patientName,
            hospitalNo,
            inPatNo,
            inPatientId: inPatNo || hospitalNo,
            dischargeDate,
            date: dischargeDate,
            ipDate: String(data.ipDate || ""),
            department: String(data.department || ""),
            ageGender,
            age: String(data.age || extractAgeFromAgeGender(ageGender)),
            gender: String(data.gender || extractGenderFromAgeGender(ageGender)),
            address: String(data.address || ""),
            consultant: String(data.consultant || ""),
            mobile: String(data.mobile || ""),
            bedNo: String(data.bedNo || ""),
            history,
            examination,
            diagnosis: finalDiagnosis,
            investigation,
            provisionalDiagnosis,
            finalDiagnosis,
            procedureName,
            procedureDescription,
            management,
            plan: management,
            followUp: String(data.followUp || ""),
            programYear: String(data.programYear || ""),
            programBlock: String(data.programBlock || ""),
            domain: String(data.domain || ""),
            level: String(data.level || ""),
            submittedTo
        } as Patient;
    };

    const enrichDischargePatient = async (patient: Patient): Promise<Patient> => {
        const hasMissingIdentity = !sanitizeSheetValue(patient.name) || !sanitizeSheetValue(patient.ageGender);

        if (!hasMissingIdentity || !patient.hospitalNo) {
            return patient;
        }

        try {
            const snapshot = await getDoc(doc(db, "patient_data", patient.hospitalNo));
            if (!snapshot.exists()) {
                return patient;
            }

            const data = snapshot.data() as DischargeRecord;
            const enrichedAgeGender = normalizeAgeGender(
                String(data.ageGender || patient.ageGender || (data.age ? `${data.age}${data.gender ? `/${data.gender}` : ""}` : ""))
            );

            const enrichedPatient = {
                ...patient,
                name: sanitizeSheetValue(String(data.name || data.patientName || "")) || patient.name,
                patientName: sanitizeSheetValue(String(data.patientName || data.name || "")) || patient.patientName || patient.name,
                ageGender: enrichedAgeGender || patient.ageGender,
                age: String(data.age || extractAgeFromAgeGender(enrichedAgeGender || patient.ageGender)),
                gender: String(data.gender || extractGenderFromAgeGender(enrichedAgeGender || patient.ageGender)),
                address: String(data.address || patient.address || ""),
                consultant: String(data.consultant || patient.consultant || ""),
                mobile: String(data.mobile || patient.mobile || ""),
                department: String(data.department || patient.department || ""),
                history: String(data.history || patient.history || ""),
                examination: String(data.examination || patient.examination || ""),
                investigation: String(data.investigation || patient.investigation || ""),
                diagnosis: String(data.diagnosis || patient.diagnosis || ""),
                procedureName: String(data.procedureName || patient.procedureName || ""),
                procedureDescription: String(data.procedureDescription || patient.procedureDescription || ""),
                plan: String(data.plan || patient.plan || ""),
                followUp: String(data.followUp || patient.followUp || "")
            };

            if (enrichedPatient.name !== patient.name || enrichedPatient.ageGender !== patient.ageGender) {
                await setDoc(doc(db, "discharges", patient.id), {
                    name: enrichedPatient.name,
                    patientName: enrichedPatient.patientName,
                    ageGender: enrichedPatient.ageGender,
                    age: enrichedPatient.age,
                    gender: enrichedPatient.gender,
                    consultant: enrichedPatient.consultant,
                    mobile: enrichedPatient.mobile,
                    department: enrichedPatient.department
                }, { merge: true });
            }

            return enrichedPatient;
        } catch (error) {
            console.warn("Failed to enrich discharge patient", patient.hospitalNo, error);
            return patient;
        }
    };

    const loadDischarges = async () => {
        setLoading(true);

        try {
            const snapshot = await getDocs(query(collection(db, "discharges"), orderBy("date", "desc")));
            const mappedPatients = snapshot.docs.map(mapDischargeDoc);
            const enrichedPatients = await Promise.all(mappedPatients.map(enrichDischargePatient));
            const rotatedPatients = rotateDischarges(sortDischargesForDisplay(enrichedPatients));
            setAllDischarges(rotatedPatients);
        } catch (error) {
            console.error("Error fetching discharges:", error);
            showToast("Failed to load discharges.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDischarges();
    }, []);

    useEffect(() => {
        setPageIndex(0);
    }, [searchQuery]);

    const filteredDischarges = useMemo(() => {
        const lowerQuery = searchQuery.trim().toLowerCase();
        if (!lowerQuery) return allDischarges;

        return allDischarges.filter(patient =>
            sanitizeSheetValue(patient.name).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.patientName).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.hospitalNo).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.inPatNo).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.consultant).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.diagnosis).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.procedureName).toLowerCase().includes(lowerQuery) ||
            sanitizeSheetValue(patient.bedNo).toLowerCase().includes(lowerQuery)
        );
    }, [allDischarges, searchQuery]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredDischarges.length / PAGE_SIZE)), [filteredDischarges.length]);

    const pagedDischarges = useMemo(() => {
        const safePage = Math.max(0, Math.min(pageIndex, totalPages - 1));
        const start = safePage * PAGE_SIZE;
        return filteredDischarges.slice(start, start + PAGE_SIZE);
    }, [filteredDischarges, pageIndex, totalPages]);

    useEffect(() => {
        if (pageIndex > totalPages - 1) {
            setPageIndex(Math.max(0, totalPages - 1));
        }
    }, [pageIndex, totalPages]);

    const handleRevert = async () => {
        if (!selectedDischarge) return;

        try {
            if (selectedDischarge.hospitalNo) {
                await setDoc(doc(db, "patient_data", selectedDischarge.hospitalNo), {
                    status: "admitted",
                    autoDischarged: false
                }, { merge: true });
            }

            await deleteDoc(doc(db, "discharges", selectedDischarge.id));
            await loadDischarges();

            showToast("Discharge reverted successfully! Patient is back in unit list.", "success");
            setSelectedDischarge(null);
        } catch (error) {
            console.error("Error reverting discharge:", error);
            showToast("Failed to revert discharge.", "error");
        }
    };

    const visiblePages = useMemo(() => {
        const maxButtons = 5;
        const start = Math.max(0, Math.min(pageIndex - 2, totalPages - maxButtons));
        const end = Math.min(totalPages, start + maxButtons);
        return Array.from({ length: end - start }, (_, index) => start + index);
    }, [pageIndex, totalPages]);

    return (
        <main className="min-h-screen bg-background p-4 pb-20">
            <div className="sticky top-0 z-20 mb-6 flex items-center space-x-4 glass border-b border-white/10 p-4">
                <button onClick={() => router.back()} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">Discharged Patients</h1>
                    <p className="text-xs text-gray-400">Showing {PAGE_SIZE} per page, searching across all discharges. The current first 7 pages have been moved to the end.</p>
                </div>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search all discharged patients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-full bg-white/5 py-2 pl-10 pr-10 text-sm text-white outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            aria-label="Clear discharge search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                    {filteredDischarges.length} result{filteredDischarges.length !== 1 ? "s" : ""}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : (
                <PatientList
                    patients={pagedDischarges}
                    title="Discharges"
                    readOnly={true}
                    collapsible={false}
                    hideSearch={true}
                    onPatientClick={setSelectedDischarge}
                    viewMode="table"
                    groupByDate={true}
                    groupDateField="dischargeDate"
                    dateColumnLabel="Discharge"
                />
            )}

            {!loading && totalPages > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <button
                        onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                        disabled={pageIndex === 0}
                        className="inline-flex items-center space-x-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {visiblePages[0] > 0 && (
                            <>
                                <button
                                    onClick={() => setPageIndex(0)}
                                    className="rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                                >
                                    1
                                </button>
                                {visiblePages[0] > 1 && <span className="text-xs text-gray-500">...</span>}
                            </>
                        )}

                        {visiblePages.map(page => (
                            <button
                                key={page}
                                onClick={() => setPageIndex(page)}
                                className={
                                    page === pageIndex
                                        ? "rounded-full bg-primary px-3 py-2 text-xs font-semibold text-black"
                                        : "rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                                }
                            >
                                {page + 1}
                            </button>
                        ))}

                        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                            <>
                                {visiblePages[visiblePages.length - 1] < totalPages - 2 && <span className="text-xs text-gray-500">...</span>}
                                <button
                                    onClick={() => setPageIndex(totalPages - 1)}
                                    className="rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white"
                                >
                                    Last
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={pageIndex >= totalPages - 1}
                        className="inline-flex items-center space-x-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span>Next</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {selectedDischarge && (
                <DischargeForm
                    patient={selectedDischarge}
                    onClose={() => setSelectedDischarge(null)}
                    onConfirmDischarge={() => {}}
                    onRevert={handleRevert}
                />
            )}
        </main>
    );
}
