export interface BedGroup {
    name: string;
    prefix?: string;
    match?: string;
    exclude?: string[];
    specific?: string[];
}

export const DEFAULT_BED_GROUPS: BedGroup[] = [
    // Old Building
    { name: "5A", prefix: "50" },
    { name: "5B", prefix: "52", exclude: ["527", "528", "529"] },
    { name: "5C", specific: ["527", "528", "529"] },
    { name: "4A (MHCU)", prefix: "40" },
    { name: "Cubicle", prefix: "41" },
    { name: "Neuro (ASU)", prefix: "42" },
    { name: "3A", prefix: "30" },
    { name: "3B", prefix: "31" },
    { name: "POW", match: "POW" },
    { name: "1st Floor", prefix: "10" },
    { name: "1st Floor (NICU)", match: "NICU" },
    { name: "1st Floor (CAR)", match: "CAR" },
    { name: "1st Floor (CCU)", match: "CCU" },

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

    for (const group of groups) {
        if (group.specific?.includes(bed)) return group.name;
        if (group.match && bed.includes(group.match)) return group.name;
        if (group.prefix && bed.startsWith(group.prefix)) {
            if (group.exclude?.includes(bed)) continue;
            return group.name;
        }
    }
    return "General Ward"; // Fallback
}
