"use client";

import { useState } from "react";
import { Patient } from "@/types";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import PatientCard from "./PatientCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryViewProps {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
    showConsultantInitials?: boolean;
}

export default function GalleryView({ patients, onPatientClick, showConsultantInitials }: GalleryViewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isVertical, setIsVertical] = useState(false);

    // Infinite Pagination
    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        setCurrentIndex((prevIndex) => {
            const nextIndex = prevIndex + newDirection;
            if (nextIndex < 0) return patients.length - 1;
            if (nextIndex >= patients.length) return 0;
            return nextIndex;
        });
    };

    const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        const offset = isVertical ? info.offset.y : info.offset.x;

        if (offset < -threshold) {
            paginate(1);
        } else if (offset > threshold) {
            paginate(-1);
        }
    };

    const variants = {
        enter: (direction: number) => {
            if (isVertical) {
                return {
                    y: direction > 0 ? 300 : -300,
                    x: 0,
                    opacity: 0,
                    scale: 0.8,
                    zIndex: 0
                };
            }
            return {
                x: direction > 0 ? 300 : -300,
                y: 0,
                opacity: 0,
                scale: 0.8,
                zIndex: 0
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => {
            if (isVertical) {
                return {
                    y: direction < 0 ? 300 : -300,
                    x: 0,
                    opacity: 0,
                    scale: 0.8,
                    zIndex: 0
                };
            }
            return {
                x: direction < 0 ? 300 : -300,
                y: 0,
                opacity: 0,
                scale: 0.8,
                zIndex: 0
            };
        }
    };

    if (!patients || patients.length === 0) {
        return <div className="text-center text-gray-500 py-20">No patients to display</div>;
    }

    // Circular indices for neighbors
    const prevIndex = (currentIndex - 1 + patients.length) % patients.length;
    const nextIndex = (currentIndex + 1) % patients.length;

    const prevPatient = patients[prevIndex];
    const nextPatient = patients[nextIndex];

    return (
        <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden bg-black/20 rounded-xl">
            {/* View Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={() => setIsVertical(!isVertical)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/50 hover:text-white"
                    title={isVertical ? "Switch to Horizontal Swipe" : "Switch to Vertical Scroll"}
                >
                    {isVertical ? "↔" : "↕"}
                </button>
            </div>

            {/* Previous Card (Background) */}
            <div
                className={cn(
                    "absolute z-0 opacity-30 scale-90 blur-[1px] transition-all duration-300",
                    isVertical ? "-translate-y-48 top-50" : "-translate-x-12 sm:-translate-x-32"
                )}
            >
                <PatientCard patient={prevPatient} onClick={() => paginate(-1)} showConsultantInitials={showConsultantInitials} />
            </div>

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        type: "spring", stiffness: 300, damping: 30
                    }}
                    drag={isVertical ? "y" : "x"}
                    dragConstraints={isVertical ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={onDragEnd}
                    className="absolute z-20 w-full max-w-sm sm:max-w-md px-4 cursor-grab active:cursor-grabbing"
                    whileTap={{ cursor: "grabbing" }}
                >
                    <PatientCard
                        patient={patients[currentIndex]}
                        onClick={onPatientClick}
                        showConsultantInitials={showConsultantInitials}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Next Card (Background) */}
            <div
                className={cn(
                    "absolute z-0 opacity-30 scale-90 blur-[1px] transition-all duration-300",
                    isVertical ? "translate-y-48" : "translate-x-12 sm:translate-x-32"
                )}
            >
                <PatientCard patient={nextPatient} onClick={() => paginate(1)} showConsultantInitials={showConsultantInitials} />
            </div>

            {/* Navigation Controls Overlay */}
            <div className={cn(
                "absolute flex justify-center items-center pointer-events-none",
                isVertical ? "top-0 bottom-0 right-4 flex-col space-y-4" : "bottom-4 left-0 right-0 space-x-4"
            )}>
                <button
                    onClick={() => paginate(-1)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all pointer-events-auto backdrop-blur-sm"
                >
                    {isVertical ? <ChevronLeft className="rotate-90 text-white" size={24} /> : <ChevronLeft size={24} className="text-white" />}
                </button>
                <span className="text-sm font-bold text-white/50 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    {currentIndex + 1} / {patients.length}
                </span>
                <button
                    onClick={() => paginate(1)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all pointer-events-auto backdrop-blur-sm"
                >
                    {isVertical ? <ChevronRight className="rotate-90 text-white" size={24} /> : <ChevronRight size={24} className="text-white" />}
                </button>
            </div>
        </div>
    );
}
