"use client";

import { Patient } from "@/types";
import { format, parseISO, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { ArrowUpDown, User, Phone } from "lucide-react";

interface ElectiveTableProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
}

export default function ElectiveTable({ patients, onPatientClick }: ElectiveTableProps) {
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // Group patients by Date (Future -> Today -> Past logic is already handled by parent)
    // Here we just need to render them in standard table groups.
    // Parent already sorts by date priorities. We should respect that high-level order 
    // but allow sorting by consultant WITHIN those date groups? 
    // OR allow sorting the whole list by consultant?
    // "sortable table view which can be sorted by consultant. grouping to be done by date."
    // This implies Date is the primary key (Group), and Consultant is secondary sort within group.

    const groupedPatients = useMemo(() => {
        // First, apply consultant sort if needed
        const sorted = [...patients].sort((a, b) => {
            if (sortOrder === "asc") return (a.consultant || "").localeCompare(b.consultant || "");
            return (b.consultant || "").localeCompare(a.consultant || "");
        });

        // Then group by Date (preserving the parent's date filtering/logic somewhat? 
        // No, parent passed the list sorted by date logic. If we sort by consultant first, we lose date order.
        // Requirement: "grouping to be done by date".
        // So: Group by Date first. Then inside each group, sort by Consultant.

        const groups: Record<string, Patient[]> = {};

        patients.forEach(p => {
            let dateObj: Date | undefined;
            if (p.ipDate) {
                // Try ParseISO
                const d1 = parseISO(p.ipDate);
                if (!isNaN(d1.getTime())) {
                    dateObj = d1;
                } else {
                    // Try standard constructor (handles slashes often)
                    const d2 = new Date(p.ipDate);
                    if (!isNaN(d2.getTime())) {
                        dateObj = d2;
                    }
                }
            }

            const dateKey = dateObj ? format(dateObj, "yyyy-MM-dd") : "No Date";
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(p);
        });

        // Now sort the date keys according to the Elective Logic (Future Asc -> Today -> Past Desc)
        // We need a helper to sort these keys.
        const sortedKeys = Object.keys(groups).sort((keyA, keyB) => {
            if (keyA === "No Date") return 1;
            if (keyB === "No Date") return -1;

            let dateA: Date, dateB: Date;
            try {
                dateA = parseISO(keyA);
                if (isNaN(dateA.getTime())) dateA = new Date(0);
            } catch { dateA = new Date(0); }

            try {
                dateB = parseISO(keyB);
                if (isNaN(dateB.getTime())) dateB = new Date(0);
            } catch { dateB = new Date(0); }

            const today = startOfDay(new Date());

            const isAFuture = dateA > today;
            const isBFuture = dateB > today;
            const isAToday = dateA.getTime() === today.getTime();
            const isBToday = dateB.getTime() === today.getTime();
            const isAPast = dateA < today;
            const isBPast = dateB < today;

            // Priority 1: Future (Asc)
            if (isAFuture && !isBFuture) return -1;
            if (!isAFuture && isBFuture) return 1;
            if (isAFuture && isBFuture) return dateA.getTime() - dateB.getTime();

            // Priority 2: Today
            if (isAToday && !isBToday) return -1;
            if (!isAToday && isBToday) return 1;
            if (isAToday && isBToday) return 0; // Same day

            // Priority 3: Past (Desc)
            if (isAPast && isBPast) return dateB.getTime() - dateA.getTime();

            return 0;
        });

        // Sort patients within each group by Consultant
        sortedKeys.forEach(key => {
            groups[key].sort((a, b) => {
                const consA = a.consultant || "";
                const consB = b.consultant || "";
                return sortOrder === "asc" ? consA.localeCompare(consB) : consB.localeCompare(consA);
            });
        });

        return { groups, sortedKeys };
    }, [patients, sortOrder]);

    const toggleSort = () => {
        setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end px-4">
                <button
                    onClick={toggleSort}
                    className="flex items-center space-x-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                    <ArrowUpDown size={14} />
                    <span>Sort by Consultant ({sortOrder.toUpperCase()})</span>
                </button>
            </div>

            {groupedPatients.sortedKeys.map(dateKey => {
                const isToday = new Date().toISOString().split('T')[0] === dateKey;
                const groupDate = dateKey === "No Date" ? null : parseISO(dateKey);
                const displayDate = groupDate ? format(groupDate, "EEEE, d MMM yyyy") : "No Date";

                return (
                    <div key={dateKey} className="space-y-2">
                        <h3 className={`px-4 text-sm font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-gray-500"}`}>
                            {isToday ? "Today, " : ""}{displayDate}
                        </h3>

                        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 mx-4">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-xs uppercase text-gray-400">
                                    <tr>
                                        <th className="p-3">Patient</th>
                                        <th className="p-3">Consultant</th>
                                        <th className="p-3">Diagnosis</th>
                                        <th className="p-3">Procedure</th>
                                        <th className="p-3">NPO / Remarks</th>
                                        <th className="p-3 hidden sm:table-cell">Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {groupedPatients.groups[dateKey].map(patient => (
                                        <tr
                                            key={patient.id}
                                            onClick={() => onPatientClick(patient)}
                                            className="cursor-pointer transition-colors hover:bg-white/5"
                                        >
                                            <td className="p-3">
                                                <div className="font-bold text-white">{patient.name}</div>
                                                <div className="text-xs text-gray-400">{patient.ageGender} • {patient.hospitalNo}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                                                        {patient.consultant?.charAt(0) || <User size={12} />}
                                                    </div>
                                                    <span className="text-gray-300">{patient.consultant}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-300">{patient.diagnosis || "-"}</td>
                                            <td className="p-3 text-gray-300">{patient.procedure || "-"}</td>
                                            <td className="p-3 text-gray-300">{patient.npoStatus || "-"}</td>
                                            <td className="p-3 hidden sm:table-cell text-gray-400">
                                                {patient.mobile ? (
                                                    <div className="flex items-center space-x-2">
                                                        <span>{patient.mobile}</span>
                                                        <a
                                                            href={`tel:${patient.mobile}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="rounded-full bg-green-500/20 p-1.5 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
                                                            title="Call"
                                                        >
                                                            <Phone size={12} />
                                                        </a>
                                                    </div>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {patients.length === 0 && (
                <div className="py-20 text-center text-gray-500">
                    No elective cases found within the date range.
                </div>
            )}
        </div>
    );
}
