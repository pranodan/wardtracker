import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toTitleCase(str: string | undefined | null): string {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function parseAnyDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    // 1. Try ISO (YYYY-MM-DD)
    const d1 = new Date(dateStr);
    if (!isNaN(d1.getTime())) return d1;

    // 2. Try simple slash format (M/d/YYYY) manual parse if standard fails
    // (Browsers usually handle M/d/YYYY well in new Date(), but just in case)
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = new Date(
            parseInt(parts[2]), // Y
            parseInt(parts[0]) - 1, // M (0-indexed)
            parseInt(parts[1]) // D
        );
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}
