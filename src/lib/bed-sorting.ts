import { Patient } from "@/types";

// Bed Groups Definition
export const BED_GROUPS = [
    { name: "5A", prefix: "50" },
    { name: "5B", prefix: "52", exclude: ["527", "528", "529"] },
    { name: "5C", specific: ["527", "528", "529"] },
    { name: "4A (MHCU)", prefix: "40" },
    { name: "Cubicle", prefix: "41" },
    { name: "Neuro (ASU)", prefix: "42" },
    { name: "3A", prefix: "30" },
    { name: "3B", prefix: "31" },
    { name: "POW", match: "POW" },
    { name: "1st Floor (NICU/CAR/CCU)", prefix: "10" },
    { name: "HDU", match: "HDU" },
    { name: "ICU", match: "ICU" },
    { name: "AW", match: "AW" },
    { name: "4th Plus", prefix: "24" },
    { name: "5th Plus", prefix: "25" },
];

export function getBedGroup(bedNo: string): string {
    if (!bedNo) return "Unassigned";
    const bed = bedNo.toString().trim().toUpperCase();

    // Check specific matches first (e.g., 5C beds)
    for (const group of BED_GROUPS) {
        if (group.specific?.some(s => bed.startsWith(s))) return group.name;
    }

    // Then check match strings and prefixes
    for (const group of BED_GROUPS) {
        if (group.match && bed.includes(group.match)) return group.name;
        if (group.prefix && bed.startsWith(group.prefix)) {
            if (group.exclude && group.exclude.some(e => bed.startsWith(e))) continue;
            return group.name;
        }
    }
    return "Other";
}

export function sortPatientsByBed(patients: Patient[]): Patient[] {
    return [...patients].sort((a, b) => {
        const groupA = getBedGroup(a.bedNo);
        const groupB = getBedGroup(b.bedNo);

        const indexA = BED_GROUPS.findIndex(g => g.name === groupA);
        const indexB = BED_GROUPS.findIndex(g => g.name === groupB);

        // Sort by Group Index first
        if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
            return indexA - indexB;
        }
        // Put known groups before unknown
        if (indexA !== -1 && indexB === -1) return -1;
        if (indexA === -1 && indexB !== -1) return 1;

        // If in same group (or both unknown), sort alphanumerically
        return a.bedNo.localeCompare(b.bedNo, undefined, { numeric: true });
    });
}
