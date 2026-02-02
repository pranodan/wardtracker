import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { google } from "googleapis";

export async function GET() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const sheets = google.sheets({ version: "v4", auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            range: "Scraped!A:Z",
        });

        const rawValues = response.data.values || [];
        const rawHeaders = rawValues.length > 0 ? rawValues[0] : [];
        const rawFirstRow = rawValues.length > 1 ? rawValues[1] : [];

        return NextResponse.json({
            scrapedRange: "Scraped!A:Z",
            scrapedCount: rawValues.length - 1,
            scrapedRawHeaders: rawHeaders,
            scrapedRawFirstRow: rawFirstRow,
            scrapedRawFirstRowIndices: rawFirstRow.map((v, i) => `${i}: ${v}`),
            rawDataRows: rawValues.slice(0, 10) // Show first 10 raw rows
        });
    } catch (error: any) {
        console.error("Debug API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
