
import { useState } from "react";
import { CaseReport } from "@/types";
import { useCaseReports } from "@/hooks/useCaseReports";
import { Search, FileText, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseReportSelectorProps {
    onSelect: (report: CaseReport) => void;
    currentDiagnosis?: string;
    onClose: () => void;
}

export default function CaseReportSelector({ onSelect, currentDiagnosis, onClose }: CaseReportSelectorProps) {
    const { reports, searchReports } = useCaseReports();
    const [searchQuery, setSearchQuery] = useState(currentDiagnosis || "");
    const [searchResults, setSearchResults] = useState<CaseReport[]>(
        currentDiagnosis ? searchReports(currentDiagnosis) : []
    );

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setSearchResults(searchReports(query));
    };

    return (
        <div className="flex h-full flex-col">
            <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-gray-400 uppercase">Search Knowledge Base</label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by diagnosis, title..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 p-3 pl-10 text-sm text-white outline-none focus:border-primary"
                        autoFocus
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {searchResults.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500">
                        <BookOpen size={48} className="mb-2 opacity-50" />
                        <p className="text-sm">No matching case reports found.</p>
                        <p className="text-xs">Try a simpler term (e.g., "femur", "fracture")</p>
                    </div>
                ) : (
                    searchResults.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => onSelect(report)}
                            className="group flex w-full flex-col items-start rounded-lg border border-white/5 bg-white/5 p-3 text-left hover:bg-white/10 hover:border-primary/50 transition-colors"
                        >
                            <div className="flex w-full items-center justify-between mb-1">
                                <span className="font-bold text-white text-sm">{report.title}</span>
                                <ChevronRight size={16} className="text-gray-500 group-hover:text-primary" />
                            </div>
                            <div className="text-xs text-primary mb-2 font-mono">{report.diagnosis}</div>
                            <div className="flex flex-wrap gap-1">
                                {report.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-gray-400 border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-gray-500 text-center">
                Select a report to auto-fill clinical data.
            </div>
        </div>
    );
}
