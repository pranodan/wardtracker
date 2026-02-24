"use client";

import { Patient } from "@/types";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, addMonths, subMonths, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, User, Phone, Calendar } from "lucide-react";

interface ElectiveTableProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
}

function parseDateSafe(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    try {
        const d = parseISO(dateStr);
        if (!isNaN(d.getTime())) return startOfDay(d);
        const d2 = new Date(dateStr);
        if (!isNaN(d2.getTime())) return startOfDay(d2);
    } catch { /* ignore */ }
    return null;
}

export default function ElectiveTable({ patients, onPatientClick }: ElectiveTableProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Build a map of dates that have surgeries
    const surgeryDates = useMemo(() => {
        const map = new Map<string, number>();
        patients.forEach(p => {
            const d = parseDateSafe(p.ipDate);
            if (d) {
                const key = format(d, "yyyy-MM-dd");
                map.set(key, (map.get(key) || 0) + 1);
            }
        });
        return map;
    }, [patients]);

    // Get patients for the selected date, or all if none selected
    const displayedPatients = useMemo(() => {
        if (!selectedDate) {
            // Show all, sorted by date descending then consultant
            return [...patients].sort((a, b) => {
                const da = parseDateSafe(a.ipDate);
                const db = parseDateSafe(b.ipDate);
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                const diff = db.getTime() - da.getTime();
                if (diff !== 0) return diff;
                return (a.consultant || "").localeCompare(b.consultant || "");
            });
        }
        return patients.filter(p => {
            const d = parseDateSafe(p.ipDate);
            return d && isSameDay(d, selectedDate);
        }).sort((a, b) => (a.consultant || "").localeCompare(b.consultant || ""));
    }, [patients, selectedDate]);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDayOfWeek = getDay(start); // 0=Sun
        return { days, startDayOfWeek };
    }, [currentMonth]);

    const handleDateClick = (day: Date) => {
        if (selectedDate && isSameDay(selectedDate, day)) {
            setSelectedDate(null); // Deselect
        } else {
            setSelectedDate(day);
        }
    };

    return (
        <div className="space-y-6">
            {/* Calendar */}
            <div className="mx-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {format(currentMonth, "MMMM yyyy")}
                    </h3>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="text-center text-[10px] font-medium text-gray-500 uppercase py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: calendarDays.startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {calendarDays.days.map(day => {
                        const key = format(day, "yyyy-MM-dd");
                        const count = surgeryDates.get(key) || 0;
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={key}
                                onClick={() => handleDateClick(day)}
                                className={`
                                    aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all
                                    ${isSelected
                                        ? "bg-primary text-black font-bold ring-2 ring-primary/50"
                                        : isTodayDate
                                            ? "bg-white/10 text-white font-bold ring-1 ring-primary/30"
                                            : count > 0
                                                ? "bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer"
                                                : "text-gray-600 hover:bg-white/5"
                                    }
                                `}
                            >
                                <span>{format(day, "d")}</span>
                                {count > 0 && (
                                    <span className={`text-[8px] font-bold mt-0.5 ${isSelected ? "text-black/70" : "text-primary/80"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend / selection info */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-primary/15 inline-block" /> Has cases
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-primary inline-block" /> Selected
                        </span>
                    </div>
                    {selectedDate ? (
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="text-primary hover:text-primary/80 font-medium"
                        >
                            Clear filter · Show all
                        </button>
                    ) : (
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{patients.length} total cases</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Header */}
            {selectedDate && (
                <h3 className="px-4 text-sm font-bold uppercase tracking-wider text-primary">
                    {isToday(selectedDate) ? "Today, " : ""}{format(selectedDate, "EEEE, d MMM yyyy")}
                    <span className="ml-2 text-gray-400 font-normal">({displayedPatients.length} case{displayedPatients.length !== 1 ? "s" : ""})</span>
                </h3>
            )}

            {/* Patient Table */}
            {displayedPatients.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 mx-4">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                            <tr>
                                <th className="p-3">Patient</th>
                                {!selectedDate && <th className="p-3">Date</th>}
                                <th className="p-3">Consultant</th>
                                <th className="p-3">Diagnosis</th>
                                <th className="p-3">Procedure</th>
                                <th className="p-3">NPO / Remarks</th>
                                <th className="p-3 hidden sm:table-cell">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayedPatients.map(patient => {
                                const surgDate = parseDateSafe(patient.ipDate);
                                return (
                                    <tr
                                        key={patient.id}
                                        onClick={() => onPatientClick(patient)}
                                        className="cursor-pointer transition-colors hover:bg-white/5"
                                    >
                                        <td className="p-3">
                                            <div className="font-bold text-white">{patient.name}</div>
                                            <div className="text-xs text-gray-400">{patient.ageGender} • {patient.hospitalNo}</div>
                                        </td>
                                        {!selectedDate && (
                                            <td className="p-3 text-gray-300 whitespace-nowrap text-xs">
                                                {surgDate ? format(surgDate, "d MMM yyyy") : "-"}
                                            </td>
                                        )}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-20 text-center text-gray-500">
                    {selectedDate
                        ? `No elective cases scheduled for ${format(selectedDate, "d MMM yyyy")}.`
                        : "No elective cases found."}
                </div>
            )}
        </div>
    );
}
