"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const BackgroundBlob = dynamic(() => import("@/components/dashboard/BackgroundBlob"), { ssr: false });

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            router.push("/");
        } catch (err: any) {
            setError("Failed to login. Please check your credentials.");
        }
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
            <BackgroundBlob />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card z-10 w-full max-w-md rounded-2xl p-8"
            >
                <h2 className="mb-6 text-center text-3xl font-bold text-white">Access Portal</h2>

                {error && (
                    <div className="mb-4 rounded bg-red-500/20 p-3 text-center text-sm text-red-200 border border-red-500/50">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="doctor@clinic.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-gray-400">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-gradient-to-r from-primary to-secondary p-3 font-bold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-primary/50"
                    >
                        Authenticate
                    </button>
                </form>
            </motion.div>
        </main>
    );
}
