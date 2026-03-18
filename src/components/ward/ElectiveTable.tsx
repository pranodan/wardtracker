"use client";

import { Patient } from "@/types";
import { addDays, format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, addMonths, subMonths, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, User, Phone, Calendar, Plus } from "lucide-react";
import ElectiveAddSurgeryModal from "@/components/ward/ElectiveAddSurgeryModal";

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
    } catch {
        return null;
    }
    return null;
}

function getTomorrow() {
    return startOfDay(addDays(new Date(), 1));
}

export default function ElectiveTable({ patients, onPatientClick }: ElectiveTableProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(getTomorrow);
    const [currentMonth, setCurrentMonth] = useState<Date>(getTomorrow);
    const [showAddModal, setShowAddModal] = useState(false);
    const [manualPatients, setManualPatients] = useState<Patient[]>([]);

    const allPatients = useMemo(() => {
        const seen = new Set<string>();
        return [...manualPatients, ...patients].filter(patient => {
            const key = [patient.name, patient.consultant, patient.ipDate, patient.procedure].join("|").toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [manualPatients, patients]);

    const surgeryDates = useMemo(() => {
        const map = new Map<string, number>();
        allPatients.forEach(p => {
            const d = parseDateSafe(p.ipDate);
            if (d) {
                const key = format(d, "yyyy-MM-dd");
                map.set(key, (map.get(key) || 0) + 1);
            }
        });
        return map;
    }, [allPatients]);

    const displayedPatients = useMemo(() => {
        return allPatients
            .filter(p => {
                const d = parseDateSafe(p.ipDate);
                return d && isSameDay(d, selectedDate);
            })
            .sort((a, b) => (a.consultant || "").localeCompare(b.consultant || ""));
    }, [allPatients, selectedDate]);

    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDayOfWeek = getDay(start);
        return { days, startDayOfWeek };
    }, [currentMonth]);

    const resetToTomorrow = () => {
        const tomorrow = getTomorrow();
        setSelectedDate(tomorrow);
        setCurrentMonth(tomorrow);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Elective Surgeries</h3>
                    <p className="text-xs text-gray-400">Showing tomorrow&apos;s list by default to keep the view fast.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black"
                >
                    <Plus size={14} />
                    <span>Add New Surgery</span>
                </button>
            </div>

            <div className="mx-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        {format(currentMonth, "MMMM yyyy")}
                    </h3>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="mb-1 grid grid-cols-7 gap-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="py-1 text-center text-[10px] font-medium uppercase text-gray-500">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: calendarDays.startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {calendarDays.days.map(day => {
                        const key = format(day, "yyyy-MM-dd");
                        const count = surgeryDates.get(key) || 0;
                        const isSelected = isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    aspect-square rounded-lg relative flex flex-col items-center justify-center text-xs transition-all
                                    ${isSelected
                                        ? "bg-primary font-bold text-black ring-2 ring-primary/50"
                                        : isTodayDate
                                            ? "bg-white/10 font-bold text-white ring-1 ring-primary/30"
                                            : count > 0
                                                ? "cursor-pointer bg-primary/15 text-primary hover:bg-primary/25"
                                                : "text-gray-600 hover:bg-white/5"
                                    }
                                `}
                            >
                                <span>{format(day, "d")}</span>
                                {count > 0 && (
                                    <span className={`mt-0.5 text-[8px] font-bold ${isSelected ? "text-black/70" : "text-primary/80"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded bg-primary/15" /> Has cases
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded bg-primary" /> Selected
                        </span>
                    </div>
                    <button onClick={resetToTomorrow} className="font-medium text-primary hover:text-primary/80">
                        Reset to Tomorrow
                    </button>
                </div>
            </div>

            <h3 className="px-4 text-sm font-bold uppercase tracking-wider text-primary">
                {isToday(selectedDate) ? "Today, " : isSameDay(selectedDate, getTomorrow()) ? "Tomorrow, " : ""}
                {format(selectedDate, "EEEE, d MMM yyyy")}
                <span className="ml-2 font-normal text-gray-400">({displayedPatients.length} case{displayedPatients.length !== 1 ? "s" : ""})</span>
            </h3>

            {displayedPatients.length > 0 ? (
                <div className="mx-4 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                            <tr>
                                <th className="p-3">Patient</th>
                                <th className="p-3">Consultant</th>
                                <th className="p-3">Diagnosis</th>
                                <th className="p-3">Procedure</th>
                                <th className="p-3">NPO / Remarks</th>
                                <th className="hidden p-3 sm:table-cell">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayedPatients.map(patient => (
                                <tr
                                    key={patient.id}
                                    onClick={() => onPatientClick(patient)}
                                    className="cursor-pointer transition-colors hover:bg-white/5"
                                >
                                    <td className="p-3">
                                        <div className="font-bold text-white">{patient.name || "-"}</div>
                                        <div className="text-xs text-gray-400">{patient.ageGender || "-"}{patient.hospitalNo ? ` • ${patient.hospitalNo}` : ""}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                                                {patient.consultant?.charAt(0) || <User size={12} />}
                                            </div>
                                            <span className="text-gray-300">{patient.consultant || "-"}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-gray-300">{patient.diagnosis || "-"}</td>
                                    <td className="p-3 text-gray-300">{patient.procedure || "-"}</td>
                                    <td className="p-3 text-gray-300">{patient.npoStatus || patient.address || "-"}</td>
                                    <td className="hidden p-3 text-gray-400 sm:table-cell">
                                        {patient.mobile ? (
                                            <div className="flex items-center space-x-2">
                                                <span>{patient.mobile}</span>
                                                <a
                                                    href={`tel:${patient.mobile}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="rounded-full bg-green-500/20 p-1.5 text-green-500 transition-colors hover:bg-green-500 hover:text-white"
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
            ) : (
                <div className="py-20 text-center text-gray-500">
                    No elective cases scheduled for {format(selectedDate, "d MMM yyyy")}.
                </div>
            )}

            <ElectiveAddSurgeryModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCreated={(patient) => setManualPatients(prev => [patient, ...prev])}
            />
        </div>
    );
}
