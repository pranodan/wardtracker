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

    // Extended data (from Firebase or local state)
    diagnosis?: string;
    procedure?: string;
    dop?: string; // Date of Procedure
    surgeries?: { procedure: string; dop: string }[];
    plan?: string;
    tracking?: TrackingEntry[];
    status?: "admitted" | "marked_for_discharge" | "discharged";
}

export interface TrackingEntry {
    id: string;
    date: string;
    parameter: string;
    value: string;
}

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

    // Extended data (from Firebase or local state)
    diagnosis?: string;
    procedure?: string;
    plan?: string;
    tracking?: TrackingEntry[];
    status?: "admitted" | "marked_for_discharge" | "discharged";
}

export interface TrackingEntry {
    id: string;
    date: string;
    parameter: string;
    value: string;
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
            "Dr. Nitesh Raj Pandey"
        ]
    },
    {
        id: 2,
        name: "Spine",
        consultants: [
            "Dr. Babu Kaji Shrestha",
            "Dr. Ram Krishna Barakoti",
            "Dr. Rajesh Kumar Chaudhary",
            "Dr. Deepak Kaucha"
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
            "Dr. Rajiv Sharma"
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
