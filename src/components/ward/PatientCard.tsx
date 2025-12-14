import { Patient, TrackingEntry } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, isValid, compareDesc } from "date-fns";
import { cn, parseAnyDate, getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Activity, X, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";

interface PatientCardProps {
    patient: Patient;
    onClick: (patient: Patient) => void;
    showConsultantInitials?: boolean;
}

import { getBedGroup } from "@/utils/bedGrouping";

export default function PatientCard({ patient, onClick, showConsultantInitials }: PatientCardProps) {
    const hasDiagnosis = !!patient.diagnosis;
    const procedures: { text: string; date: Date }[] = [];

    // Helper to calculate POD
    const getPOD = (dateString?: string) => {
        if (!dateString) return "";
        try {
            const date = parseAnyDate(dateString);
            if (!date || !isValid(date)) return "";
            const today = new Date();
            const diff = differenceInDays(today, date);
            return diff >= 0 ? `${diff}POD` : "";
        } catch (e) {
            return "";
        }
    };

    if (patient.procedure) {
        const pod = getPOD(patient.dop);
        const date = parseAnyDate(patient.dop);
        procedures.push({
            text: pod ? `${pod} ${patient.procedure}` : patient.procedure,
            date: date || new Date(0)
        });
    }
    if (patient.surgeries) {
        patient.surgeries.forEach(s => {
            const pod = getPOD(s.dop);
            const date = parseAnyDate(s.dop);
            procedures.push({
                text: pod ? `${pod} ${s.procedure}` : s.procedure,
                date: date || new Date(0)
            });
        });
    }

    // Sort by date descending (latest first)
    procedures.sort((a, b) => compareDesc(a.date, b.date));

    // Extract text only
    const procedureTexts = procedures.map(p => p.text);

    // Surgery Display Logic: If > 2 procedures, join with comma. Otherwise, stack them?
    const useCommaSeparation = procedureTexts.length > 2;

    return (
        <motion.div
            // layout
            onClick={() => onClick(patient)}
            className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-[#121212] p-4 shadow-lg transition-colors hover:border-primary/30 hover:bg-[#1a1a1a]",
                patient.isGhost && "animate-pulse border-red-500/50 hover:border-red-500"
            )}
        >
            <div className={`absolute left-0 top-0 h-full w-1 ${patient.isGhost ? 'bg-red-600' : hasDiagnosis ? 'bg-primary' : 'bg-red-500'}`} />
            <div className="pl-3">
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-baseline space-x-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{patient.name}</h3>
                        <span className="text-sm font-bold text-white uppercase">{patient.ageGender}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {(() => {
                            const ward = getBedGroup(patient.bedNo);
                            if (ward === "General Ward" || ward === "Unassigned") return null;
                            return (
                                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                    {ward}
                                </span>
                            );
                        })()}
                        <div className="flex items-center justify-center rounded bg-white/10 px-2 py-1 text-xs font-bold text-primary">
                            {patient.bedNo}
                        </div>
                    </div>
                </div>
                {showConsultantInitials && patient.consultant && (
                    <div className="mb-2 text-[10px] font-bold text-gray-500 uppercase pl-[1px]">
                        {getInitials(patient.consultant)}
                    </div>
                )}
                <div className="mb-1">
                    <p className={`line-clamp-2 text-xs font-medium ${hasDiagnosis ? 'text-gray-300' : 'text-red-400 italic'}`}>
                        {patient.diagnosis || "No Diagnosis Recorded"}
                    </p>
                </div>
                <div className="mt-2">
                    {procedureTexts.length > 0 ? (
                        useCommaSeparation ? (
                            <div className="text-[10px] font-medium text-primary uppercase leading-tight">
                                {procedureTexts.join(", ")}
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-1">
                                {procedureTexts.map((proc, idx) => (
                                    <span key={idx} className="text-[10px] font-medium text-primary uppercase">
                                        {proc}
                                    </span>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col space-y-1">
                            {patient.ipDate && (
                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                    DOA: {patient.ipDate}
                                    {(() => {
                                        try {
                                            const date = parseAnyDate(patient.ipDate);
                                            if (date && isValid(date)) {
                                                const diff = differenceInDays(new Date(), date);
                                                if (diff >= 0) return `, ${diff}DOA`;
                                            }
                                        } catch (e) { return ""; }
                                        return "";
                                    })()}
                                </span>
                            )}
                            <span className="text-[10px] text-gray-600 italic">No Procedures</span>
                        </div>
                    )}
                </div>

                {/* Trend Graph */}
                {patient.tracking && patient.tracking.length > 0 && (
                    <div className="mt-3">
                        <TrendGraphGroup data={patient.tracking} />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function TrendGraphGroup({ data }: { data: TrackingEntry[] }) {
    const [expandedParam, setExpandedParam] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!expandedParam) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setExpandedParam(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [expandedParam]);

    // 1. Group by Parameter
    const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.parameter]) acc[curr.parameter] = [];
        acc[curr.parameter].push(curr);
        return acc;
    }, {} as Record<string, TrackingEntry[]>);

    // 2. Filter for usable params (>= 2 points) and sort by count desc
    const validParams = Object.keys(grouped)
        .filter(k => {
            const points = grouped[k].filter(p => !isNaN(parseFloat(p.value.split('/')[0])) && !isNaN(new Date(p.date).getTime()));
            return points.length >= 2;
        })
        .sort((a, b) => grouped[b].length - grouped[a].length);

    if (validParams.length === 0) return null;

    // Take top 2
    const topParams = validParams.slice(0, 2);

    return (
        <div ref={containerRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex space-x-2">
                {topParams.map(param => (
                    <div
                        key={param}
                        className="flex items-center space-x-2 cursor-zoom-in group/graph"
                        onClick={() => setExpandedParam(param)}
                    >
                        <Sparkline
                            data={grouped[param]}
                            width={80}
                            height={24}
                            color={param === topParams[0] ? "#22c55e" : "#3b82f6"}
                        />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{param}</span>
                    </div>
                ))}
            </div>

            {/* Expanded View Overlay */}
            <AnimatePresence>
                {expandedParam && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-20 bg-[#0a0a0a] flex flex-col items-center justify-center p-4 border border-white/20 rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExpandedChart
                            param={expandedParam}
                            allParams={validParams}
                            data={grouped}
                            onClose={() => setExpandedParam(null)}
                            onSwitch={(newParam) => setExpandedParam(newParam)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Sparkline({ data, width, height, color }: { data: TrackingEntry[], width: number, height: number, color: string }) {
    const points = data
        .map(e => ({ date: new Date(e.date), value: parseFloat(e.value.split('/')[0]) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const min = Math.min(...points.map(p => p.value));
    const max = Math.max(...points.map(p => p.value));
    const range = max - min || 1;

    const pathD = points.map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p.value - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(" ");

    return (
        <div style={{ width, height }} className="relative opacity-60 transition-opacity hover:opacity-100">
            <svg viewBox={`0 0 ${width} ${height}`} className="overflow-visible fill-none stroke-2" style={{ stroke: color }}>
                <path d={pathD} vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}



function ExpandedChart({ param, allParams, data, onClose, onSwitch }: {
    param: string,
    allParams: string[],
    data: Record<string, TrackingEntry[]>,
    onClose: () => void,
    onSwitch: (p: string) => void
}) {
    const currentIndex = allParams.indexOf(param);
    const prevParam = currentIndex > 0 ? allParams[currentIndex - 1] : null;
    const nextParam = currentIndex < allParams.length - 1 ? allParams[currentIndex + 1] : null;

    const [direction, setDirection] = useState(0);

    const handleSwitch = (newParam: string, newDir: number) => {
        setDirection(newDir);
        onSwitch(newParam);
    };

    const onTouchEnd = (e: React.TouchEvent, touchStart: number) => {
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        // Swipe Threshold
        if (Math.abs(diff) > 50) {
            if (diff > 0 && nextParam) {
                // Swipe Left -> Next
                handleSwitch(nextParam, 1);
            } else if (diff < 0 && prevParam) {
                // Swipe Right -> Prev
                handleSwitch(prevParam, -1);
            }
        }
    };

    // Wrapper for swipe state (closure issue workaround)
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const chartVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (dir: number) => ({
            x: dir < 0 ? 100 : -100,
            opacity: 0
        })
    };

    // Get points for current param
    const points = data[param]
        .map(e => ({ date: new Date(e.date), value: parseFloat(e.value.split('/')[0]) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const min = Math.min(...points.map(p => p.value));
    const max = Math.max(...points.map(p => p.value));
    const range = max - min || 1;
    const w = 280;
    const h = 120; // Corrected height variable reference

    const pathD = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p.value - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'} ${x},${Math.max(0, Math.min(h, y))}`;
    }).join(" ");

    return (
        <div
            className="w-full h-full flex flex-col"
            onTouchStart={(e) => setTouchStartX(e.targetTouches[0].clientX)}
            onTouchEnd={(e) => { if (touchStartX !== null) onTouchEnd(e, touchStartX); setTouchStartX(null); }}
        >
            <div className="flex items-center justify-between mb-2 z-10">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => prevParam && handleSwitch(prevParam, -1)}
                        disabled={!prevParam}
                        className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-opacity"
                    >
                        <ChevronLeft size={14} />
                    </button>

                    <AnimatePresence mode="wait">
                        <motion.h4
                            key={param}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="text-xs font-bold text-primary uppercase w-20 text-center"
                        >
                            {param}
                        </motion.h4>
                    </AnimatePresence>

                    <button
                        onClick={() => nextParam && handleSwitch(nextParam, 1)}
                        disabled={!nextParam}
                        className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-opacity"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <Minimize2 size={16} />
                </button>
            </div>

            <div className="flex-1 w-full relative pl-6 overflow-hidden">
                {/* Static Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[8px] text-gray-500 py-1">
                    <span>{max}</span>
                    <span>{Math.round((max + min) / 2)}</span>
                    <span>{min}</span>
                </div>

                {/* Animated Chart Area */}
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={param}
                        custom={direction}
                        variants={chartVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-full h-full flex flex-col justify-end pb-4"
                    >
                        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                            <line x1="0" y1="0" x2={w} y2="0" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
                            <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="white" strokeOpacity="0.1" strokeWidth="1" />
                            <line x1="0" y1={h} x2={w} y2={h} stroke="white" strokeOpacity="0.1" strokeWidth="1" />

                            <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" vectorEffect="non-scaling-stroke" />
                            {points.map((p, i) => {
                                const x = (i / (points.length - 1)) * w;
                                const y = h - ((p.value - min) / range) * h;
                                return (
                                    <circle key={i} cx={x} cy={Math.max(0, Math.min(h, y))} r="3" className="fill-black stroke-white stroke-2" />
                                );
                            })}
                        </svg>
                    </motion.div>
                </AnimatePresence>

                <div className="absolute bottom-0 left-6 right-0 flex justify-between text-[8px] text-gray-500 uppercase">
                    <span>{points[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>{points[points.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>
        </div>
    );
}

