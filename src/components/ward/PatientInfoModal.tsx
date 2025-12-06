"use client";

import { Patient, UNITS } from "@/types";
import { X, Phone, Edit, Activity, FileText, Calendar, User, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PatientInfoModalProps {
    patient: Patient | null;
    onClose: () => void;
    onEdit: (patient: Patient) => void;
}

export default function PatientInfoModal({ patient, onClose, onEdit }: PatientInfoModalProps) {
    if (!patient) return null;

    const handleCall = () => {
        if (patient.mobile) {
            window.location.href = `tel:${patient.mobile}`;
        } else {
            alert("No contact number available");
        }
    };

    const getUnitName = (consultantName?: string) => {
        if (!consultantName) return "N/A";
        const found = UNITS.find(u => u.consultants.some(c => c.toLowerCase().includes(consultantName.toLowerCase())));
        return found ? found.name : "General";
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-card z-10 w-full max-w-md overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl"
                >
                    {/* Header */}
                    <div className="relative bg-white/5 p-6 pb-8">
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white hover:bg-black/40"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
                                {patient.name.charAt(0)}
                            </div>
                            <h2 className="text-xl font-bold text-white">{patient.name}</h2>
                            <p className="text-sm text-gray-400">{patient.ageGender} • {patient.hospitalNo}</p>
                            <div className="mt-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary">
                                <MapPin size={12} className="mr-1" />
                                Bed: {patient.bedNo}
                            </div>
                        </div>
                    </div>

                    {/* Body - Read Only Info */}
                    <div className="space-y-4 p-6">
                        {/* Diagnosis Section */}
                        <div className="rounded-xl bg-white/5 p-4">
                            <div className="mb-2 flex items-center text-xs font-bold uppercase text-gray-500">
                                <Activity size={14} className="mr-2" /> Diagnosis
                            </div>
                            <p className={`text-sm ${!patient.diagnosis ? 'italic text-red-400' : 'text-white'}`}>
                                {patient.diagnosis || "No diagnosis recorded"}
                            </p>
                        </div>

                        {/* Procedures Section */}
                        {(patient.procedure || (patient.surgeries && patient.surgeries.length > 0)) && (
                            <div className="rounded-xl bg-white/5 p-4">
                                <div className="mb-2 flex items-center text-xs font-bold uppercase text-gray-500">
                                    <FileText size={14} className="mr-2" /> Procedures
                                </div>
                                <div className="space-y-2">
                                    {patient.procedure && (
                                        <div className="text-sm text-white">
                                            <span className="block font-medium">{patient.procedure}</span>
                                            {patient.dop && <span className="text-xs text-gray-400">DOP: {patient.dop}</span>}
                                        </div>
                                    )}
                                    {patient.surgeries?.map((s, i) => (
                                        <div key={i} className="text-sm text-white border-t border-white/10 pt-2 mt-2">
                                            <span className="block font-medium">{s.procedure}</span>
                                            <span className="text-xs text-gray-400">DOP: {s.dop}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-white/5 p-3">
                                <div className="mb-1 text-xs text-gray-500">Admission Date</div>
                                <div className="text-sm font-medium text-white">{patient.ipDate || "N/A"}</div>
                            </div>
                            <div className="rounded-xl bg-white/5 p-3">
                                <div className="mb-1 text-xs text-gray-500">Unit</div>
                                <div className="text-sm font-medium text-white">{getUnitName(patient.consultant)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 bg-black/20 p-4">
                        <button
                            onClick={handleCall}
                            className="flex items-center justify-center space-x-2 rounded-lg bg-green-500/10 py-3 text-sm font-bold text-green-500 hover:bg-green-500/20"
                        >
                            <Phone size={18} />
                            <span>Call</span>
                        </button>
                        <button
                            onClick={() => onEdit(patient)}
                            className="flex items-center justify-center space-x-2 rounded-lg bg-primary py-3 text-sm font-bold text-black hover:bg-primary/90"
                        >
                            <Edit size={18} />
                            <span>Edit / Details</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
