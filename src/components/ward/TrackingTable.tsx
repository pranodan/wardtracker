"use client";

import { TrackingEntry } from "@/types";
import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrackingTableProps {
    entries: TrackingEntry[];
    onUpdate: (entries: TrackingEntry[]) => void;
}

export default function TrackingTable({ entries, onUpdate }: TrackingTableProps) {
    const [newEntry, setNewEntry] = useState<Partial<TrackingEntry>>({
        date: new Date().toISOString().split('T')[0],
        parameter: "",
        value: ""
    });

    const handleAdd = () => {
        if (!newEntry.parameter || !newEntry.value) return;

        const entry: TrackingEntry = {
            id: Math.random().toString(36).substr(2, 9),
            date: newEntry.date || new Date().toISOString().split('T')[0],
            parameter: newEntry.parameter,
            value: newEntry.value
        };

        onUpdate([...entries, entry]);
        setNewEntry({
            date: new Date().toISOString().split('T')[0],
            parameter: "",
            value: ""
        });
    };

    const handleDelete = (id: string) => {
        onUpdate(entries.filter(e => e.id !== id));
    };

    const commonParameters = ["Hb", "TC", "Platelets", "Drain", "Temp", "BP", "Urine Output"];

    // Sort entries by date descending (newest first)
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Helper to get trend arrow
    const getTrendIcon = (currentEntry: TrackingEntry, index: number) => {
        // Find the next (older) entry with the same parameter
        const previousEntry = sortedEntries.slice(index + 1).find(e => e.parameter === currentEntry.parameter);

        if (!previousEntry) return null; // No previous data for this parameter (Oldest date)

        const currentVal = parseFloat(currentEntry.value);
        const prevVal = parseFloat(previousEntry.value);

        if (isNaN(currentVal) || isNaN(prevVal)) return <Minus size={14} className="text-gray-500" />;

        if (currentVal > prevVal) return <ArrowUp size={14} className="text-green-500" />;
        if (currentVal < prevVal) return <ArrowDown size={14} className="text-red-500" />;
        return <Minus size={14} className="text-gray-500" />;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Parameter</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEntries.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    No tracking data yet. Add an entry below.
                                </td>
                            </tr>
                        ) : (
                            sortedEntries.map((entry, index) => (
                                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="px-4 py-3">{entry.date}</td>
                                    <td className="px-4 py-3 font-medium text-white">{entry.parameter}</td>
                                    <td className="px-4 py-3 flex items-center space-x-2">
                                        <span>{entry.value}</span>
                                        {getTrendIcon(entry, index)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add New Entry */}
            <div className="glass-card p-4 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Add New Entry</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    />
                    <div className="relative">
                        <input
                            list="params"
                            type="text"
                            placeholder="Parameter (e.g. Hb)"
                            value={newEntry.parameter}
                            onChange={(e) => setNewEntry({ ...newEntry, parameter: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                        <datalist id="params">
                            {commonParameters.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Value"
                            value={newEntry.value}
                            onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                        />
                        <button
                            onClick={handleAdd}
                            className="bg-primary text-black rounded px-3 hover:bg-primary/90"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
