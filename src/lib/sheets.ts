import { google } from "googleapis";

async function fetchSheetRange(range: string) {
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
        range,
    });

    return response.data.values || [];
}

function mapRowsToObjects(rows: string[][]) {
    if (!rows || rows.length === 0) {
        return [];
    }

    const headers = rows[0];

    return rows.slice(1).map((row) => {
        const entry: Record<string, string> = {};
        headers.forEach((header, index) => {
            entry[header] = row[index] || "";
        });
        return entry;
    });
}

export async function getSheetData(range: string = "Scraped!A:I") {
    try {
        const rows = await fetchSheetRange(range);
        return mapRowsToObjects(rows);
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return [];
    }
}

export async function getSheetDataFromCandidates(ranges: string[]) {
    for (const range of ranges.filter(Boolean)) {
        try {
            const rows = await fetchSheetRange(range);
            return {
                range,
                data: mapRowsToObjects(rows),
            };
        } catch (error) {
            console.warn(`Error fetching candidate sheet range ${range}:`, error);
        }
    }

    return {
        range: "",
        data: [] as Record<string, string>[],
    };
}
