import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { Patient } from "@/types";

export async function GET() {
    try {
        const admittedData = await getSheetData("Scraped!A:Z"); // Expanded range
        const preopData = await getSheetData("SportsPreop!A:Z");

        // Helper to find value by fuzzy key (ignoring case and extra spaces)
        const getValue = (row: any, keyPart: string) => {
            const key = Object.keys(row).find(k => {
                const normalizedK = k.toLowerCase().trim().replace(/\s+/g, ' ');
                const normalizedKeyPart = keyPart.toLowerCase().trim().replace(/\s+/g, ' ');
                return normalizedK === normalizedKeyPart || normalizedK.includes(normalizedKeyPart);
            });
            const val = key ? row[key] : "";

            // Sanitize Excel/Sheet errors
            if (typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"))) {
                return "";
            }

            return val;
        };

        // Normalize date strings from mixed formats (M/D/YYYY, DD/MM/YYYY, YYYY/MM/DD) to YYYY-MM-DD
        const normalizeDate = (dateStr: string): string => {
            if (!dateStr || typeof dateStr !== "string") return "";
            const trimmed = dateStr.trim();
            if (!trimmed) return "";

            // Already ISO format (YYYY-MM-DD)?
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);

            // Nepali calendar dates (e.g. 2082/10/18) - year > 2050
            const slashParts = trimmed.split("/");
            if (slashParts.length === 3) {
                const [p1, p2, p3] = slashParts.map(s => parseInt(s, 10));

                // YYYY/MM/DD format (Nepali dates: year > 2050)
                if (p1 > 2050) {
                    return `${p1}-${String(p2).padStart(2, "0")}-${String(p3).padStart(2, "0")}`;
                }

                // If first part > 12, it must be DD/MM/YYYY
                if (p1 > 12) {
                    return `${p3}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
                }

                // Otherwise treat as M/D/YYYY (US format - common in Google Sheets)
                return `${p3}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
            }

            return trimmed; // Return as-is if unrecognized
        };

        const mapPatient = (row: any, isElective: boolean = false): Patient => {
            // Helper to get value by original column index (if available) or fuzzy key
            const getVal = (keyPart: string, index?: number) => {
                if (!isElective && index !== undefined) {
                    // For 'Scraped' sheet, we can use the raw key if we know its position
                    // getSheetData returns objects with keys = headers
                    const keys = Object.keys(row);
                    if (keys[index]) return row[keys[index]];
                }
                return getValue(row, keyPart);
            };

            const rawDate = getVal("ip-date", 0) || getVal("date of surgery") || getVal("surgery date") || getVal("date");

            return {
                id: getVal("hospital no", 1) || Math.random().toString(),
                ipDate: normalizeDate(rawDate),
                hospitalNo: getVal("hospital no", 1) || getVal("mrn"),
                inPatNo: getVal("inpat no", 2) || getVal("inpatient"),
                name: getVal("patient name", 3) || getVal("name") || getVal("patient"),
                department: getVal("department", 4) || getVal("dept"),
                consultant: getVal("consultant", 5) || getVal("surgeon"),
                mobile: getVal("contact", 6) || getVal("mobile") || getVal("phone"),
                ageGender: getVal("age/gender", 7) || (getValue(row, "age") ? `${getValue(row, "age")}${getValue(row, "sex") || getValue(row, "gender") ? `/${getValue(row, "sex") || getValue(row, "gender")}` : ""}` : ""),
                bedNo: getVal("bed no", 8) || getVal("bed"),
                address: getVal("address", 10), // Specifically index 10 for recently added column
                diagnosis: getValue(row, "diagnosis"),
                procedure: getValue(row, "procedure") || getValue(row, "surgery"),
                npoStatus: getValue(row, "npo status") || getValue(row, "npo") || getValue(row, "remark") || getValue(row, "instruction"),
                status: isElective ? "elective" : "admitted" as any
            };
        };

        const patients: Patient[] = [
            ...admittedData.map(row => mapPatient(row, false)),
            ...preopData.map(row => mapPatient(row, true))
        ].filter(p => p.hospitalNo || p.name); // Filter out empty rows

        console.log(`API Found: ${admittedData.length} admitted rows, ${preopData.length} preop rows. Filtered to ${patients.length} patients.`);

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
