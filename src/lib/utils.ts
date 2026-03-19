import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Patient } from "@/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const SHEET_ERROR_MARKERS = ["#NAME?", "#REF!", "#VALUE!", "#N/A"];

export function toTitleCase(str: string | undefined | null): string {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function parseAnyDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    // 1. Try ISO (YYYY-MM-DD)
    const d1 = new Date(dateStr);
    if (!isNaN(d1.getTime())) return d1;

    // 2. Try simple slash format (M/d/YYYY) manual parse if standard fails
    // (Browsers usually handle M/d/YYYY well in new Date(), but just in case)
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = new Date(
            parseInt(parts[2]), // Y
            parseInt(parts[0]) - 1, // M (0-indexed)
            parseInt(parts[1]) // D
        );
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}

export function getInitials(name: string | undefined): string {
    if (!name) return "";

    const isProfessor = /prof/i.test(name);

    // Remove "Dr.", "Prof.", "Prof. Dr." etc, split by space
    // We remove "Prof" variations specifically to clean the name
    const cleanName = name
        .replace(/^(Prof\.?\s*Dr\.?|Prof\.?|Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "") // Standard prefixes
        .replace(/\b(Prof|Dr)\b\.?/gi, "") // Any rogue titles
        .trim();

    const initials = cleanName
        .split(' ')
        .filter(part => part.length > 0 && /^[a-zA-Z]/.test(part))
        .map(part => part[0].toUpperCase())
        .join('');

    return `${isProfessor ? "Prof" : "Dr"} ${initials}`;
}

export function sanitizeSheetValue(value?: string | null): string {
    if (!value) return "";
    const trimmed = value.trim();
    if (SHEET_ERROR_MARKERS.some(marker => trimmed.includes(marker))) {
        return "";
    }
    return trimmed;
}

export function normalizeGenderLabel(gender?: string | null): string {
    const clean = sanitizeSheetValue(gender);
    if (!clean) return "";

    const normalized = clean.toLowerCase();
    if (normalized === "male" || normalized === "m") return "M";
    if (normalized === "female" || normalized === "f") return "F";
    return clean;
}

export function normalizeAgeGender(ageGender?: string | null): string {
    const clean = sanitizeSheetValue(ageGender);
    if (!clean) return "";

    return clean
        .replace(/\bfemale\b/gi, "F")
        .replace(/\bmale\b/gi, "M")
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s{2,}/g, " ")
        .trim();
}

export function hasAssignedBed(bedNo?: string | null): boolean {
    return sanitizeSheetValue(bedNo).length > 0;
}

export function extractAgeFromAgeGender(ageGender?: string | null): string {
    const match = normalizeAgeGender(ageGender).match(/\d+/);
    return match ? match[0] : "";
}

export function extractGenderFromAgeGender(ageGender?: string | null): string {
    const normalized = normalizeAgeGender(ageGender).toLowerCase();
    if (normalized.includes("/m") || normalized.endsWith(" m") || normalized === "m") return "M";
    if (normalized.includes("/f") || normalized.endsWith(" f") || normalized === "f") return "F";
    return "";
}

export function resolveDiagnosis(patient: Partial<Patient>): string {
    return sanitizeSheetValue(patient.diagnosis) || sanitizeSheetValue(patient.finalDiagnosis) || sanitizeSheetValue(patient.tempProvDx);
}

export function resolveProcedure(patient: Partial<Patient>): string {
    return sanitizeSheetValue(patient.procedure) || sanitizeSheetValue(patient.procedureName) || sanitizeSheetValue(patient.tempPlanSx);
}

export function resolveProcedureDate(patient: Partial<Patient>): string {
    return sanitizeSheetValue(patient.dop) || sanitizeSheetValue(patient.tempSxDate);
}

export function getCombinedProcedureText(patient: Partial<Patient>): string {
    const procedures: string[] = [];

    if (sanitizeSheetValue(patient.procedure)) {
        procedures.push(sanitizeSheetValue(patient.procedure));
    }

    (patient.surgeries || []).forEach(surgery => {
        const procedure = sanitizeSheetValue(surgery?.procedure);
        if (!procedure) return;

        const dop = sanitizeSheetValue(surgery?.dop);
        procedures.push(dop ? `${procedure} (${dop})` : procedure);
    });

    return procedures.join(" + ");
}

export function buildDischargeRecordId(patient: Pick<Patient, "hospitalNo" | "inPatNo" | "ipDate">): string {
    const seed = patient.inPatNo || patient.hospitalNo || patient.ipDate || `discharge_${Date.now()}`;
    return seed.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

export function buildDischargeRecord(
    patient: Partial<Patient>,
    overrides: Record<string, unknown> = {}
) {
    const nowIso = new Date().toISOString();
    const dischargeDate =
        overrides.date ||
        overrides.dischargeDate ||
        patient.dischargeDate ||
        nowIso.split("T")[0];
    const ageGender = normalizeAgeGender(patient.ageGender);
    const resolvedDiagnosis = resolveDiagnosis(patient);
    const resolvedProcedure = resolveProcedure(patient);
    const resolvedProcedureDate = resolveProcedureDate(patient);
    const normalizedPatient = {
        ...patient,
        diagnosis: patient.diagnosis || resolvedDiagnosis,
        procedure: patient.procedure || resolvedProcedure,
        dop: patient.dop || resolvedProcedureDate
    };
    const procedureText = getCombinedProcedureText(normalizedPatient);

    return {
        ...normalizedPatient,
        hospitalNo: normalizedPatient.hospitalNo || "",
        inPatNo: normalizedPatient.inPatNo || "",
        inPatientId: overrides.inPatientId || normalizedPatient.inPatNo || normalizedPatient.hospitalNo || "",
        patientName: overrides.patientName || normalizedPatient.name || "",
        name: normalizedPatient.name || overrides.patientName || "",
        ageGender,
        age: overrides.age || extractAgeFromAgeGender(ageGender),
        gender: overrides.gender || extractGenderFromAgeGender(ageGender),
        consultant: normalizedPatient.consultant || "",
        mobile: normalizedPatient.mobile || "",
        address: normalizedPatient.address || "",
        bedNo: normalizedPatient.bedNo || "",
        ipDate: normalizedPatient.ipDate || "",
        history: normalizedPatient.history || "",
        examination: normalizedPatient.examination || "",
        investigation: normalizedPatient.investigation || "",
        diagnosis: resolvedDiagnosis || "",
        provisionalDiagnosis: overrides.provisionalDiagnosis || normalizedPatient.provisionalDiagnosis || resolvedDiagnosis || "",
        finalDiagnosis: overrides.finalDiagnosis || normalizedPatient.finalDiagnosis || resolvedDiagnosis || "",
        procedureName: normalizedPatient.procedureName || resolvedProcedure || "",
        procedureDescription: normalizedPatient.procedureDescription || procedureText || normalizedPatient.plan || "",
        management: overrides.management || normalizedPatient.plan || procedureText || "",
        followUp: overrides.followUp || normalizedPatient.followUp || "",
        dischargeDate,
        date: dischargeDate,
        timestamp: overrides.timestamp || nowIso,
        ...overrides
    };
}
