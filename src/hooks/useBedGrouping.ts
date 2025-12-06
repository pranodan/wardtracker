"use client";

import { useState, useEffect } from "react";
import { BedGroup, DEFAULT_BED_GROUPS } from "@/utils/bedGrouping";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useBedGrouping(unitId: number | string) {
    const [groups, setGroups] = useState<BedGroup[]>(DEFAULT_BED_GROUPS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // 1. Try Unit-Specific Config
                const docRef = doc(db, "config", `bed_order_${unitId}`);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setGroups(docSnap.data().groups);
                } else {
                    // 2. Try Global Config (fallback if no unit specific)
                    const globalRef = doc(db, "config", "bed_order");
                    const globalSnap = await getDoc(globalRef);
                    if (globalSnap.exists()) {
                        setGroups(globalSnap.data().groups);
                    }
                    // Else: Stick with DEFAULT_BED_GROUPS
                }
            } catch (error) {
                console.error("Error fetching bed grouping:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [unitId]);

    return { groups, loading };
}
