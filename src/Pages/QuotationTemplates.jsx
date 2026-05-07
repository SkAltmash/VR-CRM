import { useState, useEffect, useCallback } from "react";
import { collection, query, orderBy, getDocs, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { Loader2, Search, Edit2, Trash2, Plus, FileText } from "lucide-react";
import toast from "react-hot-toast";
import TemplateModal from "../components/TemplateModal";

export default function QuotationTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deleting, setDeleting] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "quotationTemplates"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => {
                const docData = d.data();
                return {
                    ...docData,
                    id: d.id,
                    materialRows: typeof docData.materialRows === 'string' ? JSON.parse(docData.materialRows) : (docData.materialRows || []),
                    financialRows: typeof docData.financialRows === 'string' ? JSON.parse(docData.financialRows) : (docData.financialRows || [])
                };
            });
            setTemplates(data);
        } catch (err) {
            console.error("Failed to fetch templates:", err);
            toast.error("Failed to fetch templates");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this template?")) return;
        setDeleting(id);
        try {
            await deleteDoc(doc(db, "quotationTemplates", id));
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success("Template deleted successfully");
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete template");
        } finally {
            setDeleting(null);
        }
    }

    const filtered = templates.filter(t => 
        !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.projectName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quotation Templates</h1>
                    <p className="text-sm text-slate-500 mt-1">{templates.length} templates available</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setEditTemplate(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold border-none cursor-pointer shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all">
                        <Plus size={16} /> Create Template
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
                    <Search size={16} className="text-slate-400" />
                    <input type="text" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-none outline-none bg-transparent text-sm text-slate-700 w-full placeholder:text-slate-400" />
                </div>
            </div>

            {/* Templates List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-xl">
                    <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl text-slate-400">
                    <FileText size={48} className="text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">No templates found</p>
                    <p className="text-sm mt-2">Create your first template to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(template => (
                        <motion.div key={template.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1" title={template.name}>{template.name}</h3>
                                        <span className="inline-block px-2 py-0.5 mt-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">{template.badge || 'Template'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => { setEditTemplate(template); setModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all border-none bg-transparent cursor-pointer" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} disabled={deleting === template.id} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer disabled:opacity-50" title="Delete">
                                        {deleting === template.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="text-xs text-slate-500 line-clamp-2 mt-2 mb-4 flex-1">
                                {template.intro}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-auto border-t border-slate-100 pt-3">
                                <div className="text-[11px]">
                                    <span className="text-slate-400 block mb-0.5">Project</span>
                                    <span className="font-semibold text-slate-700 truncate block">{template.projectName}</span>
                                </div>
                                <div className="text-[11px]">
                                    <span className="text-slate-400 block mb-0.5">Price / Label</span>
                                    <span className="font-semibold text-slate-700 truncate block">{template.amountLabel}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <TemplateModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                template={editTemplate} 
                onSave={fetchTemplates} 
            />
        </div>
    );
}
