import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Simple in-memory cache to avoid repeated file reads
let cachedData: any[] | null = null;
let lastReadTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function getArchiveData(): Promise<any[]> {
    const now = Date.now();
    if (cachedData && (now - lastReadTime < CACHE_TTL)) {
        return cachedData;
    }

    try {
        const filePath = path.join(process.cwd(), "2081AND2082.json");
        const fileContent = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
            cachedData = parsed;
            lastReadTime = now;
            return cachedData;
        }
        return [];
    } catch (error) {
        console.error("Error reading archive JSON:", error);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    const data = await getArchiveData();

    if (!query.trim()) {
        // Return only top 50 if no query to prevent bandwidth spike, 
        // though usually client will only call this with a query.
        return NextResponse.json(data.slice(0, 50));
    }

    const results = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const name = (item["Patient Name"] || "").toLowerCase();
        const hosp = (item["Hospital no"] || "").toLowerCase();

        if (name.includes(query) || hosp.includes(query)) {
            results.push(item);
            if (results.length >= 100) break; // Limit to 100 results
        }
    }

    return NextResponse.json(results);
}
