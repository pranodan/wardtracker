
import { useState } from "react";
import { CaseReport } from "@/types";
import { useCaseReports } from "@/hooks/useCaseReports";
import { Search, FileText, ChevronRight, BookOpen, Info, Edit2, Play, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseReportSelectorProps {
    onSelect: (report: CaseReport) => void;
    currentDiagnosis?: string;
    onClose: () => void;
}

export default function CaseReportSelector({ onSelect, currentDiagnosis, onClose }: CaseReportSelectorProps) {
    const { reports, deleteReport, updateReport } = useCaseReports();
    const [activeTab, setActiveTab] = useState<"kb" | "templates">("kb");

    // KB Search
    const [kbQuery, setKbQuery] = useState(currentDiagnosis || "");

    // Templates Search
    const [templateQuery, setTemplateQuery] = useState("");

    // Filtered Lists
    const kbReports = reports.filter(r => r.isSystem && (
        r.title.toLowerCase().includes(kbQuery.toLowerCase()) ||
        r.diagnosis.toLowerCase().includes(kbQuery.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(kbQuery.toLowerCase()))
    ));

    const userTemplates = reports.filter(r => !r.isSystem && (
        r.title.toLowerCase().includes(templateQuery.toLowerCase()) ||
        r.diagnosis.toLowerCase().includes(templateQuery.toLowerCase())
    ));

    // Preview State
    const [previewId, setPreviewId] = useState<string | null>(null);

    // Edit State (for user templates)
    const [editingTemplate, setEditingTemplate] = useState<CaseReport | null>(null);

    const handleUse = (report: CaseReport) => {
        onSelect(report);
    };

    const handleSaveEdit = () => {
        if (editingTemplate) {
            updateReport(editingTemplate);
            setEditingTemplate(null);
        }
    };

    if (editingTemplate) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <h3 className="font-bold flex items-center space-x-2">
                        <Edit2 size={16} className="text-primary" />
                        <span>Edit Template</span>
                    </h3>
                    <button onClick={() => setEditingTemplate(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <div>
                        <label className="text-xs text-gray-400">Template Name</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm" value={editingTemplate.title} onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Diagnosis</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm" value={editingTemplate.diagnosis} onChange={e => setEditingTemplate({ ...editingTemplate, diagnosis: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Procedure</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm" value={editingTemplate.procedure || ""} onChange={e => setEditingTemplate({ ...editingTemplate, procedure: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">History</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm h-20" value={editingTemplate.history} onChange={e => setEditingTemplate({ ...editingTemplate, history: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Examination</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm h-20" value={editingTemplate.examination} onChange={e => setEditingTemplate({ ...editingTemplate, examination: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Investigation</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm h-20" value={editingTemplate.investigation} onChange={e => setEditingTemplate({ ...editingTemplate, investigation: e.target.value })} />
                    </div>
                </div>
                <div className="pt-4 mt-auto">
                    <button onClick={handleSaveEdit} className="w-full bg-primary text-black font-bold py-2 rounded-lg hover:bg-primary/90">Save Changes</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4 bg-white/5 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab("kb")}
                    className={cn(
                        "flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-sm transition-all",
                        activeTab === "kb" ? "bg-primary/20 text-primary font-bold shadow-sm" : "text-gray-400 hover:text-white"
                    )}
                >
                    <BookOpen size={14} />
                    <span>Knowledge Base</span>
                </button>
                <button
                    onClick={() => setActiveTab("templates")}
                    className={cn(
                        "flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-sm transition-all",
                        activeTab === "templates" ? "bg-blue-500/20 text-blue-400 font-bold shadow-sm" : "text-gray-400 hover:text-white"
                    )}
                >
                    <FileText size={14} />
                    <span>My Templates</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={activeTab === "kb" ? kbQuery : templateQuery}
                            onChange={(e) => activeTab === "kb" ? setKbQuery(e.target.value) : setTemplateQuery(e.target.value)}
                            placeholder={activeTab === "kb" ? "Search expert cases..." : "Search your templates..."}
                            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 pl-10 text-sm text-white outline-none focus:border-primary"
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {(activeTab === "kb" ? kbReports : userTemplates).length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-gray-500 opacity-50">
                            <p className="text-sm">No items found.</p>
                        </div>
                    ) : (
                        (activeTab === "kb" ? kbReports : userTemplates).map((report) => (
                            <div key={report.id} className="group relative rounded-lg border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 transition-colors">
                                {/* Main Click Area */}
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="font-bold text-white text-sm flex items-center space-x-2">
                                            <span>{report.title}</span>
                                            {/* Preview Button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewId(previewId === report.id ? null : report.id); }}
                                                className="text-gray-500 hover:text-blue-400 p-1 rounded-full hover:bg-white/10"
                                                title="Preview Template"
                                            >
                                                <Info size={14} />
                                            </button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex space-x-1">
                                            {!report.isSystem && (
                                                <>
                                                    <button onClick={() => setEditingTemplate(report)} className="p-1 text-gray-500 hover:text-yellow-400" title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => deleteReport(report.id)} className="p-1 text-gray-500 hover:text-red-500" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleUse(report)}
                                                className="flex items-center space-x-1 bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded text-xs font-bold transition-colors"
                                            >
                                                <Play size={10} className="fill-current" />
                                                <span>USE</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono truncate">{report.diagnosis}</div>
                                </div>

                                {/* Preview Panel */}
                                {previewId === report.id && (
                                    <div className="border-t border-white/10 p-3 bg-black/20 text-xs text-gray-300 space-y-2 animate-in fade-in slide-in-from-top-1">
                                        {report.procedure && <div><span className="text-gray-500 uppercase text-[10px]">Proc:</span> {report.procedure}</div>}
                                        <div><span className="text-gray-500 uppercase text-[10px]">Hx:</span> {report.history.slice(0, 100)}...</div>
                                        <div><span className="text-gray-500 uppercase text-[10px]">Exam:</span> {report.examination.slice(0, 100)}...</div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            {activeTab === "templates" && (
                <div className="mt-2 pt-2 border-t border-white/10 text-center text-xs text-gray-500">
                    Use "Save as Template" in the main form to add new items.
                </div>
            )}
        </div>
    );
}
