export interface BedGroup {
    name: string;
    prefix?: string;
    match?: string;
    exclude?: string[];
    specific?: string[];
}

const canonicalizeBedToken = (value: string) => value.toUpperCase().replace(/[\s-]+/g, "");

export const DEFAULT_BED_GROUPS: BedGroup[] = [
    // Old Building
    { name: "5A", prefix: "50" },
    { name: "5B", prefix: "52", exclude: ["527", "528", "529"] },
    { name: "5C", specific: ["527", "528", "529"] },
    { name: "4A (MHCU)", prefix: "40" },
    { name: "Cubicle", prefix: "41" },
    { name: "Neuro (ASU)", match: "ASU" },
    { name: "Neuro (ASU)", prefix: "42" },
    { name: "3A", prefix: "30" },
    { name: "3B", prefix: "31" },
    { name: "POW", match: "POW" },
    { name: "1st Floor", prefix: "10" },
    { name: "1st Floor (NICU)", match: "NICU" },
    { name: "1st Floor Cardio", match: "CAR DB" },
    { name: "1st Floor Cardio", match: "CAR-DB" },
    { name: "1st Floor Cardio", match: "CCU" },
    { name: "1st Floor Cardio", match: "CAR" },

    // New Building
    { name: "HDU", match: "HDU" },
    { name: "ICU", match: "ICU" },
    { name: "AW", match: "AW" },
    { name: "4th Plus", prefix: "24" },
    { name: "5th Plus", prefix: "25" },
];

export function getBedGroup(bedNo: string, groups: BedGroup[] = DEFAULT_BED_GROUPS): string {
    if (!bedNo) return "Unassigned";
    const bed = bedNo.toUpperCase();
    const canonicalBed = canonicalizeBedToken(bed);
    // Normalize bed for specific/exclude checks (e.g. "528-8" -> "528")
    const baseBed = bed.split('-')[0].trim();
    const canonicalBaseBed = canonicalizeBedToken(baseBed);

    for (const group of groups) {
        if (group.specific?.some(value => canonicalizeBedToken(value) === canonicalBaseBed)) return group.name;
        if (group.match && canonicalBed.includes(canonicalizeBedToken(group.match))) return group.name;
        if (group.prefix && bed.startsWith(group.prefix)) {
            if (group.exclude?.some(value => canonicalizeBedToken(value) === canonicalBaseBed)) continue;
            return group.name;
        }
    }

    // Support legacy saved routing groups that predate the newer aliases.
    if (canonicalBed.includes("ASU")) return "Neuro (ASU)";
    if (canonicalBed.includes("CARDB") || canonicalBed.includes("CCU") || canonicalBed.includes("CAR")) {
        return "1st Floor Cardio";
    }

    return "General Ward"; // Fallback
}

import { Patient } from "@/types";
import { hasAssignedBed } from "@/lib/utils";

export function sortPatientsByBed(patients: Patient[], groups: BedGroup[] = DEFAULT_BED_GROUPS): Patient[] {
    return [...patients].sort((a, b) => {
        const hasBedA = hasAssignedBed(a.bedNo);
        const hasBedB = hasAssignedBed(b.bedNo);

        if (hasBedA !== hasBedB) {
            return hasBedA ? -1 : 1;
        }

        const groupA = getBedGroup(a.bedNo, groups);
        const groupB = getBedGroup(b.bedNo, groups);

        const indexA = groups.findIndex(g => g.name === groupA);
        const indexB = groups.findIndex(g => g.name === groupB);

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
