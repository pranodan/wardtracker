
import { NextResponse } from "next/server";

// Groq API Configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
    try {
        // Support GROQ Key or fallback to DeepSeek if user insists later, but focus on Groq
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Groq API Key not configured. Please add GROQ_API_KEY to .env.local" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { patient, type, prompt: userPrompt } = body;

        if (!patient) {
            return NextResponse.json(
                { error: "Patient data is required" },
                { status: 400 }
            );
        }

        // Construct detailed patient context
        const patientContext = `
Patient Name: ${patient.name}
Age/Gender: ${patient.ageGender}
Hospital No: ${patient.hospitalNo || "N/A"}
Bed No: ${patient.bedNo}
Diagnosis: ${patient.diagnosis}
Procedure/Plan: ${patient.management}
Current Status: ${patient.status || "Admitted"}
Consultant: ${patient.consultant}
`;

        const baseSystemInstruction = `You are an expert medical AI assistant for a hospital ward.
Your task is to generate professional, clinically accurate medical notes based on patient details.
Use standard medical terminology and abbreviations (e.g., POD, HTN, DM).
Ensure the tone is objective and formal.
Do not invent critical information not supported by the context, but you may infer standard routine checks (e.g., "Vitals stable" if not specified otherwise, or ask to verify).`;

        let messages = [
            { role: "system", content: baseSystemInstruction },
        ];

        if (type === "clinical_generation") {
            const specificInstruction = `
Generates clinical notes in strictly valid JSON format.
The JSON object must have exactly these keys: "history", "examination", "investigation".
- history: Write a concise "History of Present Illness" and "Past Medical History" relevant to the diagnosis (${patient.diagnosis}).
- examination: Write a "Clinical Examination" summary including general survey and systemic exam relevant to the diagnosis.
- investigation: Suggest relevant "Investigations" (Labs/Imaging) that strictly match the diagnosis.

Output ONLY valid JSON. No markdown formatting. No code blocks.
`;
            messages.push({ role: "system", content: specificInstruction });
            messages.push({ role: "user", content: `Generate clinical data for this patient:\n${patientContext}` });
        } else {
            messages.push({ role: "user", content: `Context:\n${patientContext}\n\nTask: ${userPrompt || "Generate a daily progress note."}` });
        }

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Free, high performance model on Groq
                messages: messages,
                stream: false,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", errorText);
            return NextResponse.json(
                { error: `Groq API Error: ${response.status} ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";

        // Clean up markdown if AI adds it despite instructions
        const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

        return NextResponse.json({ result: cleanContent });

    } catch (error: any) {
        console.error("Error generating content:", error);
        return NextResponse.json(
            { error: "Failed to generate content", details: error.message },
            { status: 500 }
        );
    }
}
