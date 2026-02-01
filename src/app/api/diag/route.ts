import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export async function GET() {
    try {
        console.log("Starting Firebase diagnostic...");
        const q = query(collection(db, "patient_data"), limit(1));
        const snapshot = await getDocs(q);

        return NextResponse.json({
            status: "success",
            message: "Firebase connection successful",
            dataCount: snapshot.size,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
    } catch (error: any) {
        console.error("Firebase diagnostic failed:", error);
        return NextResponse.json({
            status: "error",
            message: error.message,
            code: error.code,
            stack: error.stack,
            envSet: {
                apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            }
        }, { status: 500 });
    }
}
