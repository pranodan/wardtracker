"use client";

import { Patient } from "@/types";
import { X, User, Calendar, Phone, Bed, FileText, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface PatientSummaryModalProps {
    patient: Patient;
    onClose: () => void;
    onTransfer?: (patient: Patient, consultant: string) => void;
    consultants?: string[];
}

export default function PatientSummaryModal({ patient, onClose, onTransfer, consultants }: PatientSummaryModalProps) {
    const [selectedConsultant, setSelectedConsultant] = useState("");

    // Check if patient needs transfer (consultant not in list or empty)
    const needsTransfer = consultants && (!patient.consultant || !consultants.some(c => patient.consultant?.toLowerCase().includes(c.toLowerCase())));

    const handleTransfer = () => {
        if (onTransfer && selectedConsultant) {
            onTransfer(patient, selectedConsultant);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Patient Summary</h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Name & ID */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase">{patient.name}</h3>
                                <p className="text-sm text-gray-400 uppercase">{patient.ageGender}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-primary uppercase">ID: {patient.hospitalNo}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            {/* Bed */}
                            <div className="flex items-center space-x-3 rounded-lg bg-white/5 p-3">
                                <Bed className="text-primary" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-500">Bed No</p>
                                    <p className="font-bold text-white">{patient.bedNo}</p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center space-x-3 rounded-lg bg-white/5 p-3">
                                <Phone className="text-primary" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-500">Contact</p>
                                    <p className="font-bold text-white">{patient.contactNo || "N/A"}</p>
                                </div>
                            </div>

                            {/* DOA */}
                            <div className="flex items-center space-x-3 rounded-lg bg-white/5 p-3">
                                <Calendar className="text-primary" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-500">Admitted</p>
                                    <p className="font-bold text-white">{patient.ipDate || "N/A"}</p>
                                </div>
                            </div>

                            {/* Consultant */}
                            <div className="flex items-center space-x-3 rounded-lg bg-white/5 p-3">
                                <User className="text-primary" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-500">Consultant</p>
                                    <p className="font-bold text-white truncate max-w-[100px]" title={patient.consultant}>
                                        {patient.consultant || "Unassigned"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Transfer Section */}
                        {needsTransfer && onTransfer && (
                            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                                <h4 className="mb-2 text-sm font-bold text-primary uppercase">Transfer to Unit</h4>
                                <p className="mb-3 text-xs text-gray-400">
                                    This patient is not assigned to this unit. Select a consultant to transfer them.
                                </p>
                                <div className="flex space-x-2">
                                    <select
                                        value={selectedConsultant}
                                        onChange={(e) => setSelectedConsultant(e.target.value)}
                                        className="flex-1 rounded bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Select Consultant</option>
                                        {consultants?.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleTransfer}
                                        disabled={!selectedConsultant}
                                        className="flex items-center space-x-1 rounded bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span>Transfer</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
