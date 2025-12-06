"use client";

import { UNITS } from "@/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
        <div className="flex h-[50vh] w-full items-center justify-center">
            <div className="relative flex flex-wrap justify-center gap-8 p-8">
                {UNITS.map((unit, i) => (
                    <motion.div
                        key={unit.id}
                        whileHover={{ scale: 1.1 }}
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
                        className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-white/10 bg-black/20 backdrop-blur-md transition-all hover:border-white/50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                        style={{
                            borderColor: UNIT_COLORS[unit.id] || "#fff",
                            boxShadow: `0 0 10px ${UNIT_COLORS[unit.id]}40`
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-full opacity-20 transition-opacity group-hover:opacity-40"
                            style={{ backgroundColor: UNIT_COLORS[unit.id] }}
                        />
                        <span className="z-10 text-center text-xs font-bold text-white drop-shadow-md">
                            {unit.name}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
