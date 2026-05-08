import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Building, Tag, MessageCircle, FileText, Clock, ArrowRight, Send } from "lucide-react";
import QuotationPreviewModal from "./QuotationPreviewModal";

const statusStyle = {
    New: "bg-blue-500 text-white shadow-sm shadow-blue-500/20",
    "Follow-up": "bg-orange-500 text-white shadow-sm shadow-orange-500/20",
    Negotiation: "bg-amber-500 text-white shadow-sm shadow-amber-500/20",
    Converted: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20",
    Lost: "bg-red-500 text-white shadow-sm shadow-red-500/20",
};

let whatsappWindow = null;

export default function ViewLeadModal({ isOpen, onClose, lead }) {
    const [activeTab, setActiveTab] = useState("details");
    const [activities, setActivities] = useState([]);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [noteInput, setNoteInput] = useState("");
    const [addingNote, setAddingNote] = useState(false);
    const [quotationOpen, setQuotationOpen] = useState(false);

    // Fetch activity log when lead changes
    useEffect(() => {
        if (!isOpen || !lead?.id) { setActivities([]); return; }
        setLoadingActivity(true);
        const q = query(collection(db, "leads", lead.id, "activity"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoadingActivity(false);
        }, () => setLoadingActivity(false));
        return unsub;
    }, [isOpen, lead?.id]);

    if (!isOpen || !lead) return null;

    const cleanPhone = lead.phone?.replace(/\D/g, "");
    const whatsappMsg = encodeURIComponent(`Hello ${lead.name}, this is regarding your quotation.`);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=91${cleanPhone}&text=${whatsappMsg}`;

    async function logLeadActivity(message, type = "update") {
        if (!lead?.id) return;
        try {
            await addDoc(collection(db, "leads", lead.id, "activity"), {
                message,
                type,
                timestamp: serverTimestamp(),
            });
        } catch (err) {
            console.error("Failed to log activity:", err);
        }
    }

    function openWhatsApp() {
        if (whatsappWindow && !whatsappWindow.closed) {
            whatsappWindow.focus();
            whatsappWindow.location.replace(whatsappUrl);
            return;
        }
        whatsappWindow = window.open(whatsappUrl, "WHATSAPP_MAIN_TAB");
    }

    function formatTimestamp(ts) {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    async function handleAddNote() {
        const text = noteInput.trim();
        if (!text || !lead?.id) return;
        setAddingNote(true);
        try {
            await addDoc(collection(db, "leads", lead.id, "activity"), {
                message: text,
                type: "note",
                timestamp: serverTimestamp(),
            });
            setNoteInput("");
        } catch (err) {
            console.error("Failed to add note:", err);
        } finally {
            setAddingNote(false);
        }
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && lead && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: 20 }} className="relative w-full max-w-md h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col ml-auto">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-5 relative shrink-0">
                                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 border-none bg-transparent cursor-pointer transition-all">
                                    <X size={20} />
                                </button>
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold mb-3">
                                    {lead.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <h2 className="text-xl font-bold text-white">{lead.name}</h2>
                                {lead.company && <p className="text-sm text-white/70 mt-0.5">{lead.company}</p>}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle[lead.status] || "bg-white/20 text-white"}`}>{lead.status}</span>
                                    {lead.tags?.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">{tag}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200 shrink-0">
                                {[{ key: "details", label: "Details" }, { key: "activity", label: "Activity" }].map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setActiveTab(t.key)}
                                        className={`flex-1 py-3 text-sm font-medium border-none cursor-pointer transition-all ${activeTab === t.key ? "text-blue-600 bg-blue-50/50" : "text-slate-400 bg-transparent hover:text-slate-600"}`}
                                        style={{ borderBottom: activeTab === t.key ? "2px solid #3b82f6" : "2px solid transparent" }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto">
                                {activeTab === "details" && (
                                    <div className="px-6 py-4 flex flex-col gap-3">
                                        <InfoRow icon={Phone} label="Phone" value={lead.phone} />
                                        <InfoRow icon={Mail} label="Email" value={lead.email || "—"} />
                                        <InfoRow icon={Building} label="Company" value={lead.company || "—"} />
                                        <InfoRow icon={Tag} label="Source" value={lead.source || "—"} />



                                        {lead.notes && (
                                            <div className="mt-1 p-3 bg-slate-50 rounded-lg">
                                                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "activity" && (
                                    <div className="px-6 py-4 flex flex-col h-full">
                                        {/* Add Activity Input */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Add a note or activity..."
                                                value={noteInput}
                                                onChange={(e) => setNoteInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter" && noteInput.trim()) handleAddNote(); }}
                                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
                                            />
                                            <button
                                                onClick={handleAddNote}
                                                disabled={!noteInput.trim() || addingNote}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-500 text-white border-none cursor-pointer hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>

                                        {loadingActivity ? (
                                            <p className="text-sm text-slate-400 text-center py-8">Loading activity...</p>
                                        ) : activities.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Clock size={32} className="text-slate-200 mx-auto mb-2" />
                                                <p className="text-sm text-slate-400">No activity yet</p>
                                                <p className="text-xs text-slate-300 mt-1">Add a note above or edit the lead to see activity</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0">
                                                {activities.map((a, i) => (
                                                    <div key={a.id} className="flex gap-3 pb-4 relative">
                                                        {i < activities.length - 1 && (
                                                            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
                                                        )}
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.type === "status_change" ? "bg-blue-100" : a.type === "created" ? "bg-emerald-100" : a.type === "note" ? "bg-amber-100" : "bg-slate-100"}`}>
                                                            {a.type === "status_change" ? <ArrowRight size={14} className="text-blue-500" /> :
                                                                a.type === "created" ? <Clock size={14} className="text-emerald-500" /> :
                                                                    a.type === "note" || a.type === "quotation" ? <FileText size={14} className={a.type === "quotation" ? "text-purple-500" : "text-amber-500"} /> :
                                                                        <Clock size={14} className="text-slate-400" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-700">{a.message}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">{formatTimestamp(a.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
                                <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-all no-underline">
                                    <Phone size={16} /> Call
                                </a>
                                <button onClick={openWhatsApp} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold border-none cursor-pointer hover:bg-emerald-600 transition-all">
                                    <MessageCircle size={16} /> WhatsApp
                                </button>
                                <button onClick={() => setQuotationOpen(true)} className="flex-[1.5] flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold border-none cursor-pointer hover:shadow-md transition-all">
                                    <FileText size={16} /> Quotation
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <QuotationPreviewModal
                isOpen={quotationOpen}
                lead={lead}
                onClose={() => setQuotationOpen(false)}
                onActivity={logLeadActivity}
            />
        </>
    );
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-slate-400" />
            </div>
            <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
                <p className="text-sm text-slate-700">{value}</p>
            </div>
        </div>
    );
}
