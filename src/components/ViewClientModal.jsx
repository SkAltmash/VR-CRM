import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send } from "lucide-react";

export default function ViewClientModal({ isOpen, onClose, client }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (!isOpen || !client?.id) return;
        setLoading(true);
        const q = query(collection(db, "clients", client.id, "activity"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [isOpen, client?.id]);

    async function handleAddNote(e) {
        e.preventDefault();
        if (!note.trim()) return;
        setAdding(true);
        try {
            await addDoc(collection(db, "clients", client.id, "activity"), {
                message: note,
                type: "note",
                timestamp: serverTimestamp()
            });
            setNote("");
        } catch (error) {
            console.error("Failed to add note:", error);
        } finally {
            setAdding(false);
        }
    }

    if (!isOpen || !client) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.95, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: 20 }} className="relative w-full max-w-md h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col ml-auto">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Project Logs</h2>
                            <p className="text-sm text-slate-600 truncate">{client.projectName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-blue-100/50 rounded-xl"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : activities.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-10">No logs yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {activities.map(act => (
                                    <div key={act.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <p className="text-sm text-slate-700">{act.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                            {act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString('en-IN') : "Just now"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100">
                        <form onSubmit={handleAddNote} className="flex items-center gap-2">
                            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a log note..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
                            <button type="submit" disabled={adding || !note.trim()} className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors">
                                {adding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
