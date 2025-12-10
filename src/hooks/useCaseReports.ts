
import { useState, useEffect } from "react";
import { CaseReport } from "@/types";

const SEED_DATA: CaseReport[] = [
    // --- TRAUMA: UPPER LIMB ---
    {
        id: "tr-clavicle",
        title: "Fracture Clavicle (Midshaft)",
        diagnosis: "Fracture Midshaft Clavicle {{SIDE}} Side (Robinson 2B1)",
        history: "A {{AGE}}-year-old {{GENDER}} presented with pain and swelling over the {{SIDE_LC}} shoulder following a fall from a bike 4 hours ago. Complains of difficulty lifting the arm. No history of head injury or LOC.",
        examination: "GC: Fair, Vitals stable.\nLocal Exam ({{SIDE}} Shoulder):\n- Swelling and deformity (+) over midshaft clavicle\n- Tenderness (+), Crepitus (+)\n- Skin: Intact, no tenting\n- Distal N/V status: Intact",
        investigation: "- X-ray {{SIDE}} Clavicle AP/Axial: Displaced midshaft clavicle fracture with comminution.",
        tags: ["clavicle", "shoulder", "fracture", "trauma"]
    },
    {
        id: "tr-prox-humerus",
        title: "Fracture Proximal Humerus",
        diagnosis: "Fracture Proximal Humerus {{SIDE}} Side (Neer 3-Part)",
        history: "A {{AGE}}-year-old {{GENDER}} presented with {{SIDE_LC}} shoulder pain after slipping in the bathroom. History of Osteoporosis.",
        examination: "GC: Fair.\nLocal Exam ({{SIDE}} Shoulder):\n- Diffuse swelling and ecchymosis around shoulder\n- Tenderness (+) over greater tuberosity\n- ROM: Painful and restricted\n- Axillary nerve sensation: Intact",
        investigation: "- X-ray {{SIDE}} Shoulder AP/Y/Axial: Fracture proximal humerus involving surgical neck and greater tuberosity.\n- CT Shoulder: Confirms 3-part fracture pattern.",
        tags: ["humerus", "shoulder", "fracture", "elderly"]
    },
    {
        id: "tr-humerus-shaft",
        title: "Fracture Shaft Humerus",
        diagnosis: "Fracture Shaft of Humerus {{SIDE}} Side (AO 12-A1)",
        history: "A {{AGE}}-year-old {{GENDER}} presented with pain and deformity of the {{SIDE_LC}} arm following a road traffic accident.",
        examination: "GC: Fair.\nLocal Exam ({{SIDE}} Arm):\n- Gross deformity and swelling mid-arm\n- Abnormal mobility (+), Crepitus (+)\n- Radial Nerve Palsy Check: Wrist drop (+/-), Sensation in first web space (+/-)",
        investigation: "- X-ray {{SIDE}} Arm AP/Lat: Transverse fracture midshaft humerus.",
        tags: ["humerus", "arm", "fracture", "trauma"]
    },
    {
        id: "tr-distal-radius",
        title: "Fracture Distal Radius",
        diagnosis: "Fracture Distal End Radius {{SIDE}} Side (Colles')",
        history: "A {{AGE}}-year-old {{GENDER}} presented with pain and swelling over the {{SIDE_LC}} wrist following a fall on an outstretched hand 2 hours ago. No history of ENT bleed.",
        examination: "GC: Fair.\nLocal Exam ({{SIDE}} Wrist):\n- Swelling (+), Deformity (Dinner fork +)\n- Tenderness (+) over distal radius\n- Crepitus (+), ROM painful\n- Median nerve compression signs: Negative",
        investigation: "- X-ray {{SIDE}} Wrist AP/Lat: Extra-articular fracture distal radius with dorsal tilt.",
        tags: ["radius", "wrist", "fracture", "colles"]
    },

    // --- TRAUMA: LOWER LIMB ---
    {
        id: "tr-nof",
        title: "Fracture Neck of Femur",
        diagnosis: "Fracture Neck of Femur {{SIDE}} (Intracapsular)",
        history: "A {{AGE}}-year-old {{GENDER}} presented with inability to walk and {{SIDE_LC}} hip pain after a trivial fall at home.",
        examination: "GC: Fair, Pallor (-).\nLocal Exam ({{SIDE}} Hip):\n- Attitude: External rotation and shortening\n- Tenderness (+) over scarpa's triangle\n- Active SLR: Unable to perform\n- Distal pulses: Palpable",
        investigation: "- X-ray Pelvis with B/L Hips: Fracture neck of femur {{SIDE_LC}} side (Garden Type IV).",
        tags: ["femur", "hip", "fracture", "elderly"]
    },
    {
        id: "tr-intertroch",
        title: "Intertrochanteric Fracture",
        diagnosis: "Intertrochanteric Fracture Femur {{SIDE}} (AO 31-A2)",
        history: "A {{AGE}}-year-old {{GENDER}} brought with complaints of {{SIDE_LC}} hip pain and inability to stand after a fall.",
        examination: "GC: Fair.\nLocal Exam ({{SIDE}} Hip):\n- Swelling (+), Ecchymosis over greater trochanter\n- Shortening (+), External rotation (+)\n- Tenderness (+)\n- Distal N/V: Intact",
        investigation: "- X-ray {{SIDE}} Hip AP/Lat: Comminuted intertrochanteric fracture.",
        tags: ["femur", "hip", "fracture", "it"]
    },
    {
        id: "tr-femur-shaft",
        title: "Fracture Shaft Femur",
        diagnosis: "Fracture Shaft of Femur {{SIDE}} Side",
        history: "A {{AGE}}-year-old {{GENDER}} presented after a high-velocity RTA. Complains of severe thigh pain.",
        examination: "GC: Tachycardic, BP 110/70.\nLocal Exam ({{SIDE}} Thigh):\n- Tense swelling, Deformity (+)\n- Tenderness (+), Abnormal mobility (+)\n- Distal pulses: Dorsalis Pedis (+), Posterior Tibial (+)",
        investigation: "- X-ray {{SIDE}} Thigh AP/Lat: Transverse midshaft femur fracture.",
        tags: ["femur", "thigh", "fracture", "trauma"]
    },
    {
        id: "tr-tibia-shaft",
        title: "Fracture Shaft Tibia",
        diagnosis: "Fracture Shaft of Tibia and Fibula {{SIDE}} Side",
        history: "A {{AGE}}-year-old {{GENDER}} presented with leg pain after being hit by a bike. Unable to bear weight.",
        examination: "GC: Stable.\nLocal Exam ({{SIDE}} Leg):\n- Swelling (+), Deformity (+)\n- Skin condition: Closed, abrasions present\n- Tenderness (+)\n- Compartment syndrome signs: Negative",
        investigation: "- X-ray {{SIDE}} Leg AP/Lat: Segmental fracture shaft of tibia and fibula.",
        tags: ["tibia", "leg", "fracture", "trauma"]
    },
    {
        id: "tr-ankle",
        title: "Ankle Fracture",
        diagnosis: "Bimalleolar Ankle Fracture {{SIDE}} Side",
        history: "A {{AGE}}-year-old {{GENDER}} twisted {{HIS_HER}} {{SIDE_LC}} ankle while walking down stairs. Complains of swelling and inability to walk.",
        examination: "GC: Stable.\nLocal Exam ({{SIDE}} Ankle):\n- Swelling (+), Ecchymosis (+)\n- Tenderness (+) over medial and lateral malleoli\n- ROM: Painful and restricted",
        investigation: "- X-ray {{SIDE}} Ankle AP/Lat/Mortise: Fracture of medial and lateral malleoli with talar shift.",
        tags: ["ankle", "fracture", "malleolus"]
    },

    // --- SPINE ---
    {
        id: "sp-pivd",
        title: "Lumbar Disc Herniation (PIVD)",
        diagnosis: "PIVD L4-L5 with {{SIDE}} S1 Radiculopathy",
        history: "A {{AGE}}-year-old {{GENDER}} with lower back pain radiating to the {{SIDE_LC}} leg (posterior aspect) for 3 months. Aggravated by bending/coughing. H/o lifting heavy weights.",
        examination: "GC: Good.\nSpine Exam:\n- Loss of lumbar Iordosis, Paraspinal spasm (+)\n- Tenderness at L4-L5 level\n- SLRT: Positive at 45 degrees on {{SIDE}}\n- Neurology: EHL weakness {{SIDE}} (+/-), Ankle jerk diminished",
        investigation: "- MRI LS Spine: Postero-lateral disc herniation at L4-L5 compressing {{SIDE_LC}} traversing nerve root.",
        tags: ["spine", "back", "disc", "radiculopathy"]
    },
    {
        id: "sp-lcs",
        title: "Lumbar Canal Stenosis",
        diagnosis: "Lumbar Canal Stenosis (L4-L5) with Neurogenic Claudication",
        history: "A {{AGE}}-year-old {{GENDER}} complains of back pain and heaviness in both legs after walking for 10 minutes. Relieved by sitting/bending forward.",
        examination: "GC: Fair.\nSpine Exam:\n- Movements restricted and painful\n- SLRT: Negative\n- Distal pulses: Good (Vascular claudication ruled out)",
        investigation: "- MRI LS Spine: Hypertrophy of ligamentum flavum, facet joint arthropathy causing severe central canal stenosis at L4-L5.",
        tags: ["spine", "stenosis", "claudication", "back"]
    },

    // --- ARTHROPLASTY ---
    {
        id: "ar-oa-knee",
        title: "OA Knee (TKA)",
        diagnosis: "Osteoarthritis Knee Bilateral (Kellgren-Lawrence Grade IV)",
        history: "A {{AGE}}-year-old {{GENDER}} with bilateral knee pain for 5 years, right > left. Difficulty in stair climbing and squatting. Failed conservative management.",
        examination: "GC: Fair, BMI: 30.\nLocal Exam (B/L Knees):\n- Genu Varum deformity (+)\n- Medial joint line tenderness (+)\n- Crepitus (+)\n- Fixed Flexion Deformity: 10 degrees on Right\n- ROM: 10-100 degrees",
        investigation: "- X-ray B/L Knee Standing AP/Lat: Narrowing of medial joint space, osteophytes (+), subchondral sclerosis.",
        tags: ["knee", "oa", "arthroplasty", "tka"]
    },
    {
        id: "ar-avn-hip",
        title: "AVN Hip (THR)",
        diagnosis: "Avascular Necrosis (AVN) Hip {{SIDE}} (Ficat Stage IV)",
        history: "A {{AGE}}-year-old {{GENDER}} with {{SIDE_LC}} groin pain for 1 year. History of alcohol intake (+). Limping while walking.",
        examination: "GC: Good.\nLocal Exam ({{SIDE}} Hip):\n- Antalgic Gait\n- Tenderness (+) over anterior hip joint\n- ROM: Flexion, Abduction, and Internal Rotation restricted and painful\n- Limb Length Discrepancy: 1cm shortening",
        investigation: "- X-ray Pelvis: Collapse of femoral head, loss of sphericity.\n- MRI Hip: AVN changes affecting weight-bearing dome.",
        tags: ["hip", "avn", "arthroplasty", "thr"]
    },

    // --- SPORTS ---
    {
        id: "sp-acl",
        title: "ACL Tear",
        diagnosis: "Anterior Cruciate Ligament (ACL) Tear {{SIDE}} Knee",
        history: "A {{AGE}}-year-old {{GENDER}} athlete presented with instability and pain in the {{SIDE_LC}} knee after twisting injury during a football match 1 month ago. Complains of 'giving way'.",
        examination: "GC: Good.\nLocal Exam ({{SIDE}} Knee):\n- Swelling (-), Tenderness (+) over joint line\n- Lachman test (+), Anterior Drawer test (+)\n- Pivot Shift: Positive\n- McMurray test (-)\n- ROM: Full",
        investigation: "- MRI {{SIDE}} Knee: Complete tear of ACL. Menisci intact.",
        tags: ["knee", "acl", "sports", "ligament"]
    },
    {
        id: "sp-meniscus",
        title: "Meniscus Tear",
        diagnosis: "Medial Meniscus Tear {{SIDE}} Knee (Bucket Handle)",
        history: "A {{AGE}}-year-old {{GENDER}} with locking of the {{SIDE_LC}} knee and pain along the medial aspect for 2 weeks. History of twisting injury.",
        examination: "GC: Good.\nLocal Exam ({{SIDE}} Knee):\n- Effusion (+)\n- Joint line tenderness (Medial +)\n- McMurray test: Positive for Medial Meniscus\n- ROM: Terminal extension restricted (Locking)",
        investigation: "- MRI {{SIDE}} Knee: Bucket handle tear of medial meniscus.",
        tags: ["knee", "meniscus", "sports", "locking"]
    },
    {
        id: "sp-shoulder-disloc",
        title: "Recurrent Shoulder Dislocation",
        diagnosis: "Recurrent Anterior Dislocation of Shoulder {{SIDE}}",
        history: "A {{AGE}}-year-old {{GENDER}} with history of multiple episodes of {{SIDE_LC}} shoulder dislocation (5 times in last 2 years). Last episode 1 week ago.",
        examination: "GC: Good.\nLocal Exam ({{SIDE}} Shoulder):\n- Apprehension Test: Positive\n- Relocation Test: Positive\n- Generalized Ligamentous Laxity: Negative",
        investigation: "- MRI Shoulder: Bankart lesion (+) and Hill-Sachs lesion (+).",
        tags: ["shoulder", "dislocation", "bankart", "instability"]
    },
    {
        id: "sp-rct",
        title: "Rotator Cuff Tear",
        diagnosis: "Rotator Cuff Tear {{SIDE}} Shoulder (Supraspinatus)",
        history: "A {{AGE}}-year-old {{GENDER}} with {{SIDE_LC}} shoulder pain and weakness in overhead abduction for 6 months. Night pain (+).",
        examination: "GC: Fair.\nLocal Exam ({{SIDE}} Shoulder):\n- Tenderness over greater tuberosity\n- Painful Arc Syndrome (+)\n- Drop Arm Sign (+)\n- Jobe's Test (Empty Can): Positive for weakness",
        investigation: "- MRI Shoulder: Full-thickness tear of supraspinatus tendon with retraction.",
        tags: ["shoulder", "cuff", "rotator", "tear"]
    },

    // --- HAND ---
    {
        id: "hd-cts",
        title: "Carpal Tunnel Syndrome",
        diagnosis: "Carpal Tunnel Syndrome (Bilateral)",
        history: "A {{AGE}}-year-old {{GENDER}} with tingling and numbness in the thumb, index, and middle fingers of both hands. symptoms worse at night. Drops objects frequently.",
        examination: "GC: Fair.\nLocal Exam (Hands):\n- Thenar wasting (+/-)\n- Tinel's Sign: Positive at wrist\n- Phalen's Test: Positive within 30 seconds\n- Sensation: Reduced in median nerve distribution",
        investigation: "- NCV (Nerve Conduction Velocity): Delayed sensory and motor conduction in median nerve across carpal tunnel.",
        tags: ["hand", "nerve", "cts", "median"]
    },
    {
        id: "hd-trigger",
        title: "Trigger Finger",
        diagnosis: "Trigger Finger {{SIDE}} Ring Finger (Grade 3)",
        history: "A {{AGE}}-year-old {{GENDER}} with pain and catching sensation in the {{SIDE_LC}} ring finger. Needs to use other hand to straighten the finger.",
        examination: "GC: Good.\nLocal Exam:\n- Tenderness (+) over A1 pulley\n- Palpable nodule (+)\n- Locking demonstrating on active flexion",
        investigation: "- Clinical diagnosis. No imaging required.",
        tags: ["hand", "finger", "trigger", "locking"]
    }
];

export function useCaseReports() {
    const [reports, setReports] = useState<CaseReport[]>([]);

    useEffect(() => {
        // Initialize with Seed Data
        // Strategy: Always merge SEED_DATA with stored custom reports to ensure updates to SEED_DATA are seen.
        const stored = localStorage.getItem("ward_case_reports");

        // Ensure SEED_DATA has isSystem: true
        const systemReports = SEED_DATA.map(r => ({ ...r, isSystem: true }));
        let allReports: CaseReport[] = [...systemReports];

        if (stored) {
            try {
                const storedReports: CaseReport[] = JSON.parse(stored);
                // identify user-added reports (IDs not in SEED_DATA)
                const seedIds = new Set(SEED_DATA.map(r => r.id));
                const customReports = storedReports.filter(r => !seedIds.has(r.id));

                // Combine system + custom
                allReports = [...systemReports, ...customReports];
            } catch (e) {
                console.error("Failed to parse stored reports", e);
            }
        }

        setReports(allReports);
        localStorage.setItem("ward_case_reports", JSON.stringify(allReports));
    }, []);

    const addReport = (report: CaseReport) => {
        const updated = [...reports, report];
        setReports(updated);
        localStorage.setItem("ward_case_reports", JSON.stringify(updated));
    };

    const deleteReport = (id: string) => {
        const updated = reports.filter(r => r.id !== id);
        setReports(updated);
        localStorage.setItem("ward_case_reports", JSON.stringify(updated));
    };

    const updateReport = (report: CaseReport) => {
        const updated = reports.map(r => r.id === report.id ? report : r);
        setReports(updated);
        localStorage.setItem("ward_case_reports", JSON.stringify(updated));
    };

    const searchReports = (query: string): CaseReport[] => {
        if (!query) return [];
        const lowerQ = query.toLowerCase();
        return reports.filter(r =>
            r.title.toLowerCase().includes(lowerQ) ||
            r.diagnosis.toLowerCase().includes(lowerQ) ||
            r.tags.some(t => t.toLowerCase().includes(lowerQ))
        );
    };

    return { reports, addReport, updateReport, deleteReport, searchReports };
}
