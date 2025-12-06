import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { Patient } from "@/types";

export async function GET() {
    try {
        const data = await getSheetData();

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

        // Transform data to match Patient interface
        const patients: Patient[] = data.map((row) => ({
            id: getValue(row, "hospital no") || Math.random().toString(),
            ipDate: getValue(row, "ip-date"),
            hospitalNo: getValue(row, "hospital no"),
            inPatNo: getValue(row, "inpat no"),
            name: getValue(row, "patient name"),
            department: getValue(row, "department"),
            consultant: getValue(row, "consultant"),
            mobile: getValue(row, "mobile"),
            ageGender: getValue(row, "age/gender"),
            bedNo: getValue(row, "bed no"),
            status: "admitted" // Default status
        }));

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
