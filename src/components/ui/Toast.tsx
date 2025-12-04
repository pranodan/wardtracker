"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-20 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            layout
                            className={cn(
                                "pointer-events-auto flex items-center space-x-3 rounded-lg border p-4 shadow-lg backdrop-blur-md min-w-[300px]",
                                toast.type === "success" && "bg-green-500/10 border-green-500/20 text-green-500",
                                toast.type === "error" && "bg-red-500/10 border-red-500/20 text-red-500",
                                toast.type === "info" && "bg-blue-500/10 border-blue-500/20 text-blue-500"
                            )}
                        >
                            {toast.type === "success" && <CheckCircle size={20} />}
                            {toast.type === "error" && <AlertCircle size={20} />}
                            {toast.type === "info" && <Info size={20} />}
                            <p className="flex-1 text-sm font-medium">{toast.message}</p>
                            <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
