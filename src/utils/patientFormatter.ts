import { Patient } from "@/types";
import { format, differenceInDays, isValid, compareDesc } from "date-fns";
import { parseAnyDate } from "@/lib/utils";

export function formatPatientDetails(patient: Patient): string {
    // 1. Determine Most Recent Procedure
    let recentProcText = "";
    let recentProcDateLine = "";
    let diagnosisPrefix = "";

    // Collect all procedures
    const allProcedures: { name: string; date: Date | null; dopStr: string }[] = [];

    if (patient.procedure) {
        allProcedures.push({
            name: patient.procedure,
            date: parseAnyDate(patient.dop || "") || null,
            dopStr: patient.dop || ""
        });
    }
    if (patient.surgeries && patient.surgeries.length > 0) {
        patient.surgeries.forEach(s => {
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
        if (allProcedures.length > 1) {
            const older = allProcedures[1];
            if (older.date && isValid(older.date)) {
                const diff = differenceInDays(new Date(), older.date);
                const pod = diff >= 0 ? `${diff}POD` : "";
                diagnosisPrefix = `${pod ? pod + " " : ""}${older.name} for `;
            } else {
                diagnosisPrefix = `${older.name} for `;
            }
        }

        // Format Procedure Section
        let dateStr = latest.dopStr;
        if (latest.date && isValid(latest.date)) {
            dateStr = format(latest.date, "dd-MMM-yyyy");
        }

        recentProcDateLine = dateStr ? `${dateStr}` : "";
        recentProcText = latest.name;
    }

    // Format Diagnosis Line
    const finalDiagnosis = diagnosisPrefix
        ? `${diagnosisPrefix}${patient.diagnosis || ""}`
        : (patient.diagnosis || "");

    const lines = [
        `*Patient Name:* ${patient.name}`,
        `*Age/Sex:* ${patient.ageGender || 'N/A'}`,
        `*Bed:* ${patient.bedNo || 'N/A'}`,
        `*Diagnosis:* ${finalDiagnosis}`,
        "",
        `*Procedure:*`,
        recentProcDateLine ? `${recentProcDateLine}` : null,
        recentProcText ? `${recentProcText}` : null,
        "",
        `*Plan:*`,
        patient.plan || "To be decided"
    ];

    // Filter nulls and join
    return lines.filter(l => l !== null).join("\n");
}

export function formatBulkPatientList(consultantName: string, patients: Patient[]): string {
    const header = [
        `*Consultant:* ${consultantName}`,
        `*Date:* ${format(new Date(), "dd-MMM-yyyy")}`,
        `*Total Patients:* ${patients.length}`,
        "----------------------------------------"
    ].join("\n");

    const body = patients.map((p, index) => {
        return `[${index + 1}] ${formatPatientDetails(p)}`;
    }).join("\n\n----------------------------------------\n\n");

    return `${header}\n\n${body}`;
}
