import { NextResponse } from "next/server";
import { getSheetDataFromCandidates } from "@/lib/sheets";
import { Patient } from "@/types";
import { normalizeAgeGender, normalizeGenderLabel, sanitizeSheetValue } from "@/lib/utils";

export async function GET() {
    try {
        type SheetRow = Record<string, string | undefined>;

        const admittedSource = await getSheetDataFromCandidates([
            process.env.GOOGLE_SHEETS_MAIN_RANGE || "Scraped!A:Z",
            "Scraped!A:Z"
        ]);
        const admittedData = admittedSource.data as SheetRow[];

        const electiveSource = await getSheetDataFromCandidates([
            process.env.GOOGLE_SHEETS_ELECTIVE_RANGE || "SportsPreop!A:Z",
            "SportsPreop!A:Z"
        ]);
        const preopData = electiveSource.data as SheetRow[];

        const getValue = (row: SheetRow, keyPart: string) => {
            const keys = Object.keys(row);
            const normalizedTarget = keyPart.toLowerCase().trim().replace(/\s+/g, " ");

            let key = keys.find(k => k.toLowerCase().trim().replace(/\s+/g, " ") === normalizedTarget);

            if (!key) {
                key = keys.find(k => k.toLowerCase().trim().replace(/\s+/g, " ").includes(normalizedTarget));
            }

            return sanitizeSheetValue(key ? row[key] : "");
        };

        const normalizeDate = (dateStr: string): string => {
            if (!dateStr || typeof dateStr !== "string") return "";
            const trimmed = dateStr.trim();
            if (!trimmed) return "";

            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);

            const slashParts = trimmed.split("/");
            if (slashParts.length === 3) {
                const [p1, p2, p3] = slashParts.map(s => parseInt(s, 10));

                if (p1 > 2050) {
                    return `${p1}-${String(p2).padStart(2, "0")}-${String(p3).padStart(2, "0")}`;
                }

                if (p1 > 12) {
                    return `${p3}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
                }

                return `${p3}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
            }

            return trimmed;
        };

        const mapPatient = (row: SheetRow, isElective: boolean = false): Patient => {
            const getVal = (...keyParts: string[]) => {
                for (const keyPart of keyParts) {
                    const value = getValue(row, keyPart);
                    if (value) return value;
                }
                return "";
            };

            const age = getVal("age");
            const gender = getVal("gender", "sex");
            const districtName = getVal("district name");
            const districtId = getVal("district id");
            const rawDate =
                getVal("ip-date ad", "ip date ad", "ip-date", "date of surgery", "surgery date", "date")
                || getVal("ip-date bs", "ip date bs");

            return {
                id: getVal("uhid", "hospital no", "mrn") || Math.random().toString(),
                ipDate: normalizeDate(rawDate),
                hospitalNo: getVal("uhid", "hospital no", "mrn"),
                inPatNo: getVal("inpatient no", "inpat no", "inpatient"),
                name: getVal("patient name", "name", "patient", "name of patient"),
                department: getVal("department", "dept"),
                consultant: getVal("consultant", "consultant in charge", "surgeon"),
                mobile: getVal("phone number", "contact number", "contact", "mobile", "phone"),
                ageGender: normalizeAgeGender(getVal("age/gender") || (age ? `${age}${gender ? `/${normalizeGenderLabel(gender)}` : ""}` : "")),
                bedNo: getVal("bed no", "bed"),
                address: districtName || districtId || getVal("address"),
                diagnosis: getValue(row, "diagnosis"),
                procedure: getValue(row, "procedure") || getValue(row, "surgery"),
                npoStatus: getValue(row, "npo status") || getValue(row, "npo") || getValue(row, "remark") || getValue(row, "instruction"),
                status: (isElective ? "elective" : "admitted") as Patient["status"]
            };
        };

        const patients: Patient[] = [
            ...admittedData.map(row => mapPatient(row, false)),
            ...preopData.map(row => mapPatient(row, true))
        ].filter(p => p.hospitalNo || p.name);

        console.log(`API Found: ${admittedData.length} admitted rows from ${admittedSource.range || "no admitted sheet"}, ${preopData.length} preop rows from ${electiveSource.range || "no elective sheet"}. Filtered to ${patients.length} patients.`);

        return NextResponse.json(patients);
    } catch (error) {
        console.error("Sheet API Error:", error);
        return NextResponse.json({
            error: "Failed to fetch data",
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
