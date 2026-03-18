import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { normalizeAgeGender, normalizeGenderLabel, sanitizeSheetValue } from "@/lib/utils";
import { Patient } from "@/types";

type SheetValues = string[][];
type SheetRow = Record<string, string>;

type ElectiveIntakePayload = {
    patientName?: string;
    sex?: string;
    diagnosis?: string;
    dateOfSurgery?: string;
    sideToBeOperated?: string;
    procedure?: string;
    contactNumber?: string;
    anySpecificMention?: string;
    consultantInCharge?: string;
    ageOfPatient?: string;
    graftHarvest?: string;
    typeOfAnesthesia?: string;
    anyChronicDiseases?: string;
    npoStatus?: string;
};

const TIME_ZONE = "Asia/Katmandu";
const HEADER_ROW_RANGE = "A1:S2";
const DATA_RANGE = "A:P";
const REQUIRED_FIELDS: Array<keyof ElectiveIntakePayload> = [
    "patientName",
    "dateOfSurgery",
    "procedure",
    "consultantInCharge"
];

const FIXED_OPTIONS = {
    sex: ["Male", "Female"],
    sideToBeOperated: ["Right", "Left", "Bilateral"],
    consultantInCharge: [
        "Prof. Dr. Amit Joshi",
        "Dr. Nagmani Singh",
        "Dr. Bibek Basukala",
        "Dr. Rohit Bista",
        "Dr. Rajiv Sharma",
        "Dr. Ishor Pradhan",
        "Dr. Subhash Regmi"
    ],
    anyChronicDiseases: ["None", "DM", "HTN", "Thyroid", "Others (Mention)"],
    npoStatus: ["MNPO", "5AM", "6AM", "7AM", "8AM", "9AM"]
};

function getSpreadsheetId() {
    return process.env.ELECTIVE_INTAKE_SPREADSHEET_ID || "";
}

function getSheetTitle() {
    return process.env.ELECTIVE_INTAKE_SHEET_TITLE || "Form responses 1";
}

async function getSheetsClient(scopes: string[]) {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n")
        },
        scopes
    });

    return google.sheets({ version: "v4", auth });
}

async function getRawValues(range: string, scopes: string[]) {
    const spreadsheetId = getSpreadsheetId();
    const sheetTitle = getSheetTitle();
    const sheets = await getSheetsClient(scopes);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetTitle}'!${range}`
    });

    return (response.data.values || []) as SheetValues;
}

function mapRows(headers: string[], rows: string[][]) {
    return rows.map((row) => {
        const entry: SheetRow = {};
        headers.forEach((header, index) => {
            entry[header] = sanitizeSheetValue(row[index]);
        });
        return entry;
    });
}

function canonicalizeWhitespace(value: string) {
    return sanitizeSheetValue(value).replace(/\s+/g, " ").trim();
}

function titleCaseToken(token: string) {
    if (!token) return token;
    if (/^(rt|lt|acl|pcl|orif|mipo|thr|tkr|k-wire|kwire|cmc|mcp|pip|dip)$/i.test(token)) {
        return token.toUpperCase();
    }
    if (/^[A-Z0-9/-]{2,}$/.test(token)) {
        return token.toUpperCase();
    }
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function canonicalizeSuggestion(value: string) {
    const cleaned = canonicalizeWhitespace(value);
    if (!cleaned) return "";

    return cleaned
        .split(" ")
        .map(part => part.split("-").map(titleCaseToken).join("-"))
        .join(" ")
        .replace(/\bRt\b/g, "RT")
        .replace(/\bLt\b/g, "LT")
        .replace(/\bOrif\b/g, "ORIF");
}

function buildFrequencyOptions(values: string[], limit = 40) {
    const counts = new Map<string, number>();
    for (const value of values) {
        const cleaned = canonicalizeSuggestion(value);
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        const current = counts.get(key) || 0;
        counts.set(key, current + 1);
    }

    const displayMap = new Map<string, string>();
    for (const value of values) {
        const cleaned = canonicalizeSuggestion(value);
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (!displayMap.has(key)) displayMap.set(key, cleaned);
    }

    return [...counts.entries()]
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return (displayMap.get(a[0]) || a[0]).localeCompare(displayMap.get(b[0]) || b[0]);
        })
        .slice(0, limit)
        .map(([key]) => displayMap.get(key) || key);
}

function hasSideMention(value: string) {
    return /\b(right|left|rt|lt|bilateral|b\/?l)\b/i.test(value);
}

function buildSuggestions(values: string[], options?: { requireSide?: boolean; limit?: number }) {
    const requireSide = options?.requireSide || false;
    const limit = options?.limit || 50;
    const counts = new Map<string, number>();
    const displayMap = new Map<string, string>();

    for (const rawValue of values) {
        const cleaned = canonicalizeWhitespace(rawValue);
        if (!cleaned) continue;
        if (requireSide && !hasSideMention(cleaned)) continue;

        const display = canonicalizeSuggestion(cleaned);
        if (!display) continue;

        const key = display.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!displayMap.has(key)) displayMap.set(key, display);
    }

    return [...counts.entries()]
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return (displayMap.get(a[0]) || a[0]).localeCompare(displayMap.get(b[0]) || b[0]);
        })
        .slice(0, limit)
        .map(([key]) => displayMap.get(key) || key);
}

function formatKathmanduTimestamp(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(date);

    const get = (type: string) => parts.find(part => part.type === type)?.value || "00";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function normalizeDateForSheet(value: string) {
    const cleaned = sanitizeSheetValue(value);
    if (!cleaned) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
        return cleaned;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const [year, month, day] = cleaned.split("-");
        return `${day}/${month}/${year}`;
    }

    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(parsed);
        const get = (type: string) => parts.find(part => part.type === type)?.value || "00";
        return `${get("day")}/${get("month")}/${get("year")}`;
    }

    return cleaned;
}

function normalizeDateForPatient(value: string) {
    const cleaned = sanitizeSheetValue(value);
    if (!cleaned) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
    }
    return cleaned;
}

function headerToField(header: string) {
    const normalized = sanitizeSheetValue(header).toLowerCase();
    switch (normalized) {
        case "timestamp":
            return "timestamp";
        case "name of patient":
            return "patientName";
        case "sex":
            return "sex";
        case "diagnosis":
            return "diagnosis";
        case "date of surgery":
            return "dateOfSurgery";
        case "side to be operated":
            return "sideToBeOperated";
        case "procedure":
            return "procedure";
        case "contact number":
            return "contactNumber";
        case "any specific mention":
            return "anySpecificMention";
        case "consultant in charge":
            return "consultantInCharge";
        case "age of the patient":
            return "ageOfPatient";
        case "graft harvest":
            return "graftHarvest";
        case "type of anesthesia":
            return "typeOfAnesthesia";
        case "any chronic diseases":
            return "anyChronicDiseases";
        case "npo status":
            return "npoStatus";
        case "day of surgery":
            return "dayOfSurgery";
        case "reg":
            return "reg";
        case "bed":
            return "bed";
        default:
            return "";
    }
}

function buildAppendRow(headers: string[], payload: ElectiveIntakePayload, timestamp: string) {
    return headers.map((header, index) => {
        const normalized = sanitizeSheetValue(header).toLowerCase();
        if (normalized === "timestamp") return timestamp;
        if (!normalized && index === 2) return "";
        if (normalized === "day of surgery" || normalized === "reg" || normalized === "bed") return "";
        if (normalized === "date of surgery") return normalizeDateForSheet(payload.dateOfSurgery || "");

        const field = headerToField(header);
        if (!field) return "";
        return sanitizeSheetValue(payload[field as keyof ElectiveIntakePayload] || "");
    });
}

function buildOptimisticPatient(payload: ElectiveIntakePayload, timestamp: string): Patient {
    const age = sanitizeSheetValue(payload.ageOfPatient || "");
    const sex = normalizeGenderLabel(payload.sex || "");

    return {
        id: `elective-manual-${Date.now()}`,
        ipDate: normalizeDateForPatient(payload.dateOfSurgery || ""),
        hospitalNo: "",
        inPatNo: "",
        name: sanitizeSheetValue(payload.patientName || ""),
        department: "",
        consultant: sanitizeSheetValue(payload.consultantInCharge || ""),
        mobile: sanitizeSheetValue(payload.contactNumber || ""),
        ageGender: normalizeAgeGender(age ? `${age}${sex ? `/${sex}` : ""}` : ""),
        bedNo: "",
        diagnosis: sanitizeSheetValue(payload.diagnosis || ""),
        procedure: sanitizeSheetValue(payload.procedure || ""),
        npoStatus: sanitizeSheetValue(payload.npoStatus || payload.anySpecificMention || ""),
        status: "elective",
        dop: timestamp
    };
}

async function getHeaderAndRows() {
    const values = await getRawValues(DATA_RANGE, ["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const headers = (values[0] || []).map(value => sanitizeSheetValue(value));
    const rows = values.slice(1);
    return { headers, rows };
}

export async function GET() {
    try {
        const { headers, rows } = await getHeaderAndRows();
        const mappedRows = mapRows(headers, rows);

        const schema = headers
            .map((header, index) => ({
                header,
                key: headerToField(header),
                index,
                editable: !["timestamp", "day of surgery", "reg", "bed"].includes(headerToField(header)) && !(index === 2 && !sanitizeSheetValue(header)),
                hidden: index === 2 || ["dayOfSurgery", "reg", "bed"].includes(headerToField(header)),
                type: headerToField(header) === "dateOfSurgery" ? "date" : "text"
            }))
            .filter(field => field.key || field.index === 2);

        return NextResponse.json({
            headers,
            schema,
            timestampPreview: formatKathmanduTimestamp(),
            options: {
                sex: FIXED_OPTIONS.sex,
                sideToBeOperated: FIXED_OPTIONS.sideToBeOperated,
                consultantInCharge: FIXED_OPTIONS.consultantInCharge,
                graftHarvest: buildFrequencyOptions(mappedRows.map(row => row["Graft Harvest"])),
                typeOfAnesthesia: buildFrequencyOptions(mappedRows.map(row => row["Type of Anesthesia"])),
                anyChronicDiseases: FIXED_OPTIONS.anyChronicDiseases,
                npoStatus: FIXED_OPTIONS.npoStatus
            },
            diagnosisSuggestions: buildSuggestions(mappedRows.map(row => row["Diagnosis"]), { requireSide: true, limit: 40 }),
            procedureSuggestions: buildSuggestions(mappedRows.map(row => row["Procedure"]), { limit: 40 })
        });
    } catch (error) {
        console.error("Elective intake GET error:", error);
        return NextResponse.json({
            error: "Failed to load elective intake schema",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = (await request.json()) as ElectiveIntakePayload;

        for (const field of REQUIRED_FIELDS) {
            if (!sanitizeSheetValue(payload[field] || "")) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        const headerValues = await getRawValues(HEADER_ROW_RANGE, ["https://www.googleapis.com/auth/spreadsheets"]);
        const headers = (headerValues[0] || []).map(value => sanitizeSheetValue(value));
        if (headers.length === 0) {
            return NextResponse.json({ error: "Target sheet headers could not be read" }, { status: 500 });
        }

        const timestamp = formatKathmanduTimestamp();
        const row = buildAppendRow(headers, payload, timestamp);
        const spreadsheetId = getSpreadsheetId();
        const sheetTitle = getSheetTitle();
        const sheets = await getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetTitle}'!A:S`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [row]
            }
        });

        return NextResponse.json({
            success: true,
            timestamp,
            patient: buildOptimisticPatient(payload, timestamp)
        });
    } catch (error) {
        console.error("Elective intake POST error:", error);
        return NextResponse.json({
            error: "Failed to append elective surgery",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
