export interface Patient {
    id: string; // Hospital No
    ipDate: string;
    hospitalNo: string;
    inPatNo: string;
    name: string;
    department: string;
    consultant: string;
    mobile: string;
    ageGender: string;
    bedNo: string;
    address?: string;

    // Extended data (from Firebase or local state)
    diagnosis?: string;
    procedure?: string;
    npoStatus?: string;
    dop?: string; // Date of Procedure
    surgeries?: { procedure: string; dop: string }[];
    plan?: string;
    archivedPlan?: string; // Plan from previous day
    lastPlanUpdate?: string; // ISO Date of last plan save
    tracking?: TrackingEntry[];
    status?: "admitted" | "marked_for_discharge" | "discharged" | "elective";
    isGhost?: boolean; // True if patient is removed from Sheet but exists in Unit

    // Clinical Data (for Discharge Form)
    history?: string;
    examination?: string; // Clinical Findings
    investigation?: string;
    programYear?: string;
    programBlock?: string;
    domain?: string;
    level?: string;
    followUp?: string; // For auto-filling Discharge Form
    dischargeDate?: string; // For auto-filling Discharge Form
}

export interface TrackingEntry {
    id: string;
    date: string;
    parameter: string;
    value: string;
}

export interface CaseReport {
    id: string;
    title: string;
    diagnosis: string;
    procedure?: string;
    history: string;
    examination: string;
    investigation: string;
    tags: string[];
    isSystem?: boolean;
}


export interface Unit {
    id: number;
    name: string;
    consultants: string[];
}

export const UNITS = [
    {
        id: 1,
        name: "Hip Pelvis Acetabulum",
        consultants: [
            "Prof. Dr. Ashok Kumar Banskota",
            "Dr. Bibek Banskota",
            "Dr. Ansul Rajbhandari",
            "Dr. Rajendra Aryal",
            "Dr. Birendra Bahadur Chand",
            "Dr. Nitesh Raj Pandey",
            "Dr. Orthopaedic Unit I",
            "Dr. Orthopaedic Unit (I) / TR"
        ]
    },
    {
        id: 2,
        name: "Spine",
        consultants: [
            "Dr. Babu Kaji Shrestha",
            "Dr. Ram Krishna Barakoti",
            "Dr. Rajesh Kumar Chaudhary",
            "Dr. Deepak Kaucha",
            "Dr. Orthopaedic Unit II",
            "Spine Unit"
        ]
    },
    {
        id: 3,
        name: "Trauma",
        consultants: [
            "Dr. Saroj Rijal",
            "Dr. Ishor Pradhan",
            "Dr. Subhash Regmi"
        ]
    },
    {
        id: 5,
        name: "Sports",
        consultants: [
            "Prof. Dr. Amit Joshi",
            "Dr. Nagmani Singh",
            "Dr. Bibek Basukala",
            "Dr. Rohit Bista",
            "Dr. Rajiv Sharma",
            "Sports Injury Unit"
        ]
    },
    {
        id: 6,
        name: "Hand",
        consultants: [
            "Dr. Om Prasad Shrestha",
            "Dr. Niresh Shrestha",
            "Dr. Santosh Batajoo"
        ]
    }
];
