"use client";

import { LayoutGrid, List, Map, Calendar, Grid } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "cards" | "floor" | "list" | "calendar" | "grid";

interface ViewSwitcherProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

export default function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
    return (
        <div className="flex items-center space-x-1 rounded-full bg-white/5 p-1">
            <button
                onClick={() => onViewChange("cards")}
                className={cn(
                    "rounded-full p-1.5 transition-colors",
                    currentView === "cards" || currentView === "floor" ? "bg-primary text-black" : "text-gray-400 hover:text-white"
                )}
                title="Floor View"
            >
                <Map size={16} />
            </button>
            <button
                onClick={() => onViewChange("table")}
                className={cn(
                    "rounded-full p-1.5 transition-colors",
                    currentView === "table" ? "bg-primary text-black" : "text-gray-400 hover:text-white"
                )}
                title="Table View"
            >
                <List size={16} />
            </button>
            <button
                onClick={() => onViewChange("calendar")}
                className={cn(
                    "rounded-full p-1.5 transition-colors",
                    currentView === "calendar" ? "bg-primary text-black" : "text-gray-400 hover:text-white"
                )}
                title="Calendar View"
            >
                <Calendar size={16} />
            </button>
            <button
                onClick={() => onViewChange("grid")}
                className={cn(
                    "rounded-full p-1.5 transition-colors",
                    currentView === "grid" ? "bg-primary text-black" : "text-gray-400 hover:text-white"
                )}
                title="Grid View"
            >
                <Grid size={16} />
            </button>
        </div>
    );
}
