"use client";

import { Patient } from "@/types";
import { X, Phone, Clipboard, FileText, User, Calendar, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ElectiveDetailModalProps {
    patient: Patient;
    onClose: () => void;
}

export default function ElectiveDetailModal({ patient, onClose }: ElectiveDetailModalProps) {
    // Helper to render field if exists
    const renderField = (label: string, value?: string, icon?: React.ReactNode) => {
        if (!value) return null;
        return (
            <div className="rounded-lg bg-white/5 p-3">
                <div className="flex items-center space-x-2 mb-1">
                    {icon && <span className="text-gray-400">{icon}</span>}
                    <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                </div>
                <div className="text-sm text-white whitespace-pre-wrap">{value}</div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card w-full max-w-2xl overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex-none p-6 border-b border-white/10 bg-[#0a0a0a]">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase">{patient.name}</h2>
                                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-400">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">Elective</span>
                                    <span>•</span>
                                    <span>{patient.ageGender}</span>
                                    {patient.hospitalNo && (
                                        <>
                                            <span>•</span>
                                            <span>IP: {patient.hospitalNo}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body - Single Sheet View */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Contact Section */}
                        {patient.mobile && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-medium text-primary uppercase">Contact Number</div>
                                    <div className="text-lg font-bold text-white">{patient.mobile}</div>
                                </div>
                                <a
                                    href={`tel:${patient.mobile}`}
                                    className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90"
                                >
                                    <Phone size={16} />
                                    <span>Call</span>
                                </a>
                            </div>
                        )}

                        {/* Key Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("Consultant", patient.consultant, <User size={14} />)}
                            {renderField("Proposed Date", patient.ipDate, <Calendar size={14} />)}
                        </div>

                        {/* Diagnosis & Plan */}
                        <div className="space-y-4">
                            {renderField("Diagnosis", patient.diagnosis, <Activity size={14} />)}
                            {renderField("Plan / Procedure", patient.plan || patient.procedure, <Clipboard size={14} />)}
                            {renderField("NPO Status / Remarks", patient.npoStatus, <FileText size={14} />)}
                        </div>

                        {/* Clinical History Section (Read Only) */}
                        {(patient.history || patient.examination || patient.investigation) && (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Clinical Notes</h3>
                                {renderField("History of Present Illness", patient.history)}
                                {renderField("Clinical Examination", patient.examination)}
                                {renderField("Investigation", patient.investigation)}
                            </div>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
