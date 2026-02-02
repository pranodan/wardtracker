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

            return {
                id: getVal("hospital no", 1) || Math.random().toString(),
                ipDate: getVal("ip-date", 0), // Specifically index 0 for English date
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
