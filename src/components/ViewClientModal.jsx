import { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send, Image as ImageIcon, IndianRupee, FileText, CheckCircle } from "lucide-react";

export default function ViewClientModal({ isOpen, onClose, client }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [adding, setAdding] = useState(false);

    const [imageFile, setImageFile] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !client) return;
        setLoading(true);
        const clientKey = client.phone || client.name;
        const q = query(collection(db, "client_activity"), where("clientKey", "==", clientKey));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                return timeA - timeB; // oldest first → natural chat order
            });
            setActivities(data);
            setLoading(false);
        });
        return () => unsub();
    }, [isOpen, client]);

    async function handleAddNote(e) {
        e.preventDefault();
        if (!note.trim() && !imageFile) return;
        setAdding(true);
        try {
            let imageUrl = null;
            if (imageFile) {
                const formData = new FormData();
                formData.append("file", imageFile);
                formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
                
                const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: "POST",
                    body: formData
                });
                
                if (!uploadRes.ok) throw new Error("Failed to upload image");
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.secure_url;
            }

            const clientKey = client.phone || client.name;
            await addDoc(collection(db, "client_activity"), {
                clientKey,
                message: note || (imageUrl ? "Shared an image" : ""),
                type: imageUrl ? "image" : "note",
                imageUrl,
                timestamp: serverTimestamp()
            });
            setNote("");
            setImageFile(null);
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
                            <h2 className="text-lg font-bold text-slate-800">Client Logs</h2>
                            <p className="text-sm text-slate-600 truncate">{client.name} {client.phone ? `(${client.phone})` : ""}</p>
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
                                {activities.map(act => {
                                    const isPayment = act.type === "payment";
                                    const isStatus = act.type === "status_change";
                                    const isImage = act.type === "image" || !!act.imageUrl;
                                    
                                    return (
                                        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} key={act.id} className={`p-4 rounded-2xl border shadow-sm ${
                                            isPayment ? "bg-emerald-50/50 border-emerald-100" : 
                                            isStatus ? "bg-slate-50 border-slate-200 border-dashed" :
                                            "bg-white border-slate-100"
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                    isPayment ? "bg-emerald-100 text-emerald-600" :
                                                    isStatus ? "bg-slate-200 text-slate-500" :
                                                    "bg-blue-100 text-blue-500"
                                                }`}>
                                                    {isPayment ? <IndianRupee size={14} /> : 
                                                     isStatus ? <CheckCircle size={14} /> :
                                                     isImage ? <ImageIcon size={14} /> : 
                                                     <FileText size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm break-words ${
                                                        isPayment ? "text-emerald-800 font-semibold" :
                                                        isStatus ? "text-slate-600 italic" :
                                                        "text-slate-700"
                                                    }`}>{act.message}</p>
                                                    
                                                    {act.imageUrl && (
                                                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
                                                            <img src={act.imageUrl} alt="Log attachment" className="w-full max-h-60 object-cover" onClick={() => window.open(act.imageUrl, '_blank')} />
                                                        </div>
                                                    )}
                                                    
                                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                        {act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        }) : "Just now"}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
                        {imageFile && (
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-xs text-slate-600 truncate">{imageFile.name}</span>
                                <button type="button" onClick={() => setImageFile(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                            </div>
                        )}
                        <form onSubmit={handleAddNote} className="flex items-center gap-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200" title="Attach image">
                                <ImageIcon size={18} />
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setImageFile(e.target.files[0])} className="hidden" />
                            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a log note..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
                            <button type="submit" disabled={adding || (!note.trim() && !imageFile)} className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors">
                                {adding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
