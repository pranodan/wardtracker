import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { Patient } from "@/types";

export async function GET() {
    try {
        const admittedData = await getSheetData("Scraped!A:I"); // Default admitted sheet
        const preopData = await getSheetData("SportsPreop!A:Z"); // Elective/Preop sheet

        // Helper to find value by fuzzy key (ignoring case and extra spaces)
        const getValue = (row: any, keyPart: string) => {
            const key = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, ' ').includes(keyPart.toLowerCase()));
            const val = key ? row[key] : "";

            // Sanitize Excel/Sheet errors
            if (typeof val === "string" && (val.includes("#NAME?") || val.includes("#REF!") || val.includes("#VALUE!") || val.includes("#N/A"))) {
                return "";
            }

            return val;
        };

        const mapPatient = (row: any, isElective: boolean = false): Patient => ({
            id: getValue(row, "hospital no") || Math.random().toString(),
            ipDate: getValue(row, "ip-date") || getValue(row, "date"),
            hospitalNo: getValue(row, "hospital no") || getValue(row, "mrn"),
            inPatNo: getValue(row, "inpat no") || getValue(row, "inpatient"),
            name: getValue(row, "patient name") || getValue(row, "name") || getValue(row, "patient"),
            department: getValue(row, "department") || getValue(row, "dept"),
            consultant: getValue(row, "consultant") || getValue(row, "surgeon"),
            mobile: getValue(row, "contact") || getValue(row, "mobile") || getValue(row, "phone"),
            ageGender: getValue(row, "age/gender") || (getValue(row, "age") ? `${getValue(row, "age")}${getValue(row, "sex") || getValue(row, "gender") ? `/${getValue(row, "sex") || getValue(row, "gender")}` : ""}` : ""),
            bedNo: getValue(row, "bed no") || getValue(row, "bed"),
            diagnosis: getValue(row, "diagnosis"),
            procedure: getValue(row, "procedure") || getValue(row, "surgery"),
            npoStatus: getValue(row, "npo status") || getValue(row, "npo") || getValue(row, "remark") || getValue(row, "instruction"),
            status: isElective ? "elective" : "admitted" as any
        });

        const patients: Patient[] = [
            ...admittedData.map(row => mapPatient(row, false)),
            ...preopData.map(row => mapPatient(row, true))
        ];

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
