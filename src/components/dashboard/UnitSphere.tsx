"use client";

import { UNITS } from "@/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Activity, Shield, Zap, Trophy, Hand, Archive, HeartPulse } from "lucide-react";

const UNIT_ICONS: Record<number, any> = {
    1: Activity,    // Hip
    2: Shield,      // Spine
    3: Zap,         // Trauma
    5: Trophy,      // Sports
    6: Hand,        // Hand
};

const UNIT_COLORS: Record<number, string> = {
    1: "#00f3ff", // Hip
    2: "#bc13fe", // Spine
    3: "#ff0055", // Trauma
    5: "#00ff9d", // Sports
    6: "#ffaa00", // Hand
};

export default function UnitSphere() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [randomValues, setRandomValues] = useState<{ x: number[], y: number[], duration: number }[]>([]);

    useEffect(() => {
        setMounted(true);
        setRandomValues(UNITS.map(() => ({
            y: [0, (Math.random() * 20 - 10), 0],
            x: [0, (Math.random() * 20 - 10), 0, (Math.random() * 20 - 10), 0],
            duration: 4 + Math.random() * 2
        })));
    }, []);

    if (!mounted) return null; // Or return a static loading state

    return (
        <div className="flex min-h-[50vh] w-full items-center justify-center py-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 p-2 sm:p-8 max-w-4xl mx-auto items-center justify-items-center">
                {UNITS.map((unit, i) => (
                    <motion.div
                        key={unit.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                            y: randomValues[i]?.y || [0, 0, 0],
                            x: randomValues[i]?.x || [0, 0, 0, 0, 0],
                        }}
                        transition={{
                            duration: randomValues[i]?.duration || 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5,
                        }}
                        onClick={() => router.push(`/unit/${unit.id}`)}
                        className="group relative flex h-28 w-28 sm:h-36 sm:w-36 cursor-pointer flex-col items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-md transition-all hover:border-white/50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                        style={{
                            borderColor: UNIT_COLORS[unit.id] || "#fff",
                            boxShadow: `0 0 10px ${UNIT_COLORS[unit.id]}40`
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-full opacity-10 transition-opacity group-hover:opacity-30"
                            style={{ backgroundColor: UNIT_COLORS[unit.id] }}
                        />
                        {(() => {
                            const Icon = UNIT_ICONS[unit.id] || HeartPulse;
                            return <Icon className="z-10 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" size={20} strokeWidth={1.5} />;
                        })()}
                        <span className="z-10 text-center text-[10px] sm:text-xs font-bold text-white drop-shadow-md px-2 leading-tight">
                            {unit.name}
                        </span>
                    </motion.div>
                ))}

                {/* Archives Button */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        y: [0, -5, 0],
                        x: [0, 5, 0, -5, 0],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    onClick={() => router.push("/archives")}
                    className="group relative flex h-28 w-28 sm:h-36 sm:w-36 cursor-pointer flex-col items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-md transition-all hover:border-white/50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    style={{
                        borderColor: "#94a3b8",
                        boxShadow: "0 0 10px #94a3b840"
                    }}
                >
                    <div
                        className="absolute inset-0 rounded-full opacity-10 transition-opacity group-hover:opacity-30"
                        style={{ backgroundColor: "#94a3b8" }}
                    />
                    <Archive className="z-10 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" size={20} strokeWidth={1.5} />
                    <span className="z-10 text-center text-[10px] sm:text-xs font-bold text-white drop-shadow-md leading-tight">
                        Archives
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
