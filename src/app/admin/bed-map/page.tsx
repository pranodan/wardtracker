"use client";

import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, Save, Maximize2, Minimize2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Reorder, motion } from "framer-motion";
import { DEFAULT_BED_GROUPS, BedGroup } from "@/utils/bedGrouping";

export default function BedMapPage() {
    const [groups, setGroups] = useState<BedGroup[]>(DEFAULT_BED_GROUPS);
    const [loading, setLoading] = useState(true);
    const [fitToScreen, setFitToScreen] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const unitId = searchParams.get("unitId") || "default"; // Support unit-specific config

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Fetch unit-specific config if available, fallback to default
                const docRef = doc(db, "config", `bed_order_${unitId}`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setGroups(docSnap.data().groups);
                } else if (unitId !== "default") {
                    // Try global default if unit specific doesn't exist
                    const globalRef = doc(db, "config", "bed_order");
                    const globalSnap = await getDoc(globalRef);
                    if (globalSnap.exists()) {
                        setGroups(globalSnap.data().groups);
                    }
                }
            } catch (error) {
                console.error("Error fetching bed order:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [unitId]);

    const moveGroup = (index: number, direction: "up" | "down") => {
        const newGroups = [...groups];
        if (direction === "up" && index > 0) {
            [newGroups[index], newGroups[index - 1]] = [newGroups[index - 1], newGroups[index]];
        } else if (direction === "down" && index < newGroups.length - 1) {
            [newGroups[index], newGroups[index + 1]] = [newGroups[index + 1], newGroups[index]];
        }
        setGroups(newGroups);
    };

    const handleSave = async () => {
        try {
            await setDoc(doc(db, "config", `bed_order_${unitId}`), { groups });
            alert("Round routing order saved for this unit!");
            // Exit to Unit List
            if (unitId !== "default") {
                router.push(`/unit/${unitId}`);
            } else {
                router.push("/");
            }
        } catch (error) {
            console.error("Error saving bed order:", error);
            alert("Failed to save.");
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <main className="min-h-screen bg-background p-4 text-white overflow-hidden flex flex-col">
            <div className="sticky top-0 z-50 flex items-center justify-between bg-background/80 backdrop-blur-md p-4 border-b border-white/10 mb-4 rounded-xl">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Round Routing</h1>
                    <p className="text-xs text-gray-400">Unit: {unitId === "default" ? "Global" : unitId}</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setFitToScreen(!fitToScreen)}
                        className="flex items-center space-x-2 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                    >
                        {fitToScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span>{fitToScreen ? "Expand" : "Fit"}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90"
                    >
                        <Save size={16} />
                        <span>Save & Exit</span>
                    </button>
                </div>
            </div>

            <div className={`flex-1 overflow-auto ${fitToScreen ? 'flex items-center justify-center' : ''}`}>
                <motion.div
                    className="w-full max-w-2xl mx-auto"
                    animate={fitToScreen ? { scale: 0.8 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <p className="mb-4 text-gray-400 text-sm">Drag to reorder.</p>

                    <Reorder.Group axis="y" values={groups} onReorder={setGroups} className="space-y-2">
                        {groups.map((group, index) => (
                            <Reorder.Item key={group.name} value={group}>
                                <div className="flex cursor-grab items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 active:cursor-grabbing hover:bg-white/10 transition-colors">
                                    <span className="font-bold text-sm">{group.name}</span>
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveGroup(index, "up"); }}
                                            disabled={index === 0}
                                            className="rounded bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-30"
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveGroup(index, "down"); }}
                                            disabled={index === groups.length - 1}
                                            className="rounded bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-30"
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </motion.div>
            </div>
        </main>
    );
}
