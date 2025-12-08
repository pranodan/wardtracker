import { google } from "googleapis";

export async function getSheetData(range: string = "Scraped!A:I") {
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
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        // Extract headers
        const headers = rows[0];

        // Map rows to objects
        const data = rows.slice(1).map((row) => {
            const entry: Record<string, string> = {};
            headers.forEach((header, index) => {
                entry[header] = row[index] || "";
            });
            return entry;
        });

        return data;
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return [];
    }
}
