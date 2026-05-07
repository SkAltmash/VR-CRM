import { useState, useEffect, useCallback } from "react";
import { collection, query, orderBy, getDocs, updateDoc, doc, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { Loader2, Search, Eye, Edit2, IndianRupee, Plus, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import ViewClientModal from "../components/ViewClientModal";
import PaymentModal from "../components/PaymentModal";
import AddClientModal from "../components/AddClientModal";

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // Modals
    const [viewOpen, setViewOpen] = useState(false);
    const [viewClient, setViewClient] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentClient, setPaymentClient] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [addClientPrefill, setAddClientPrefill] = useState(null);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClients(data);
        } catch (err) {
            console.error("Failed to fetch clients:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    // Update project status
    async function handleStatusChange(id, newStatus, oldStatus) {
        if (newStatus === oldStatus) return;
        setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        try {
            await updateDoc(doc(db, "clients", id), { status: newStatus, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error("Failed to update status:", error);
            setClients(prev => prev.map(c => c.id === id ? { ...c, status: oldStatus } : c));
            toast.error("Failed to update status.");
        }
    }

    const filtered = clients.filter((c) => {
        return !search || [c.name, c.projectName, c.phone].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    });

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clients & Projects</h1>
                    <p className="text-sm text-slate-500 mt-1">{clients.length} total clients</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setAddClientPrefill(null); setAddOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold border-none cursor-pointer shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all">
                        <Plus size={16} /> Add Client
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
                    <Search size={16} className="text-slate-400" />
                    <input type="text" placeholder="Search client, project..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-none outline-none bg-transparent text-sm text-slate-700 w-full placeholder:text-slate-400" />
                </div>
            </div>

            {/* Table */}
            <motion.div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <p className="text-lg font-medium">No clients found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 px-6 w-1/3 border-r border-slate-200">Client Info</th>
                                    <th className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 px-6">Projects</th>
                                </tr>
                            </thead>
                            {(() => {
                                const groupedClients = filtered.reduce((acc, client) => {
                                    const key = client.phone || client.name;
                                    if (!acc[key]) {
                                        acc[key] = {
                                            clientInfo: { name: client.name, phone: client.phone, email: client.email, company: client.company },
                                            projects: []
                                        };
                                    }
                                    acc[key].projects.push(client);
                                    return acc;
                                }, {});

                                return Object.values(groupedClients).map((group, idx) => (
                                    <tbody key={idx} className="border-b border-slate-200 hover:bg-slate-50/30 transition-colors">
                                        <tr>
                                            <td className="py-5 px-6 align-top w-1/3 border-r border-slate-200 bg-slate-50/30">
                                                <div className="text-base font-bold text-slate-800">{group.clientInfo.name}</div>
                                                <div className="text-sm font-medium text-slate-500 mt-1">{group.clientInfo.phone || "No Phone"}</div>
                                                {group.clientInfo.email && <div className="text-xs text-slate-400 mt-1">{group.clientInfo.email}</div>}
                                                {group.clientInfo.company && <div className="text-xs text-slate-400 mt-1">{group.clientInfo.company}</div>}
                                                <button onClick={() => { setAddClientPrefill(group.clientInfo); setAddOpen(true); }} className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none shadow-sm">
                                                    <Briefcase size={14} /> Add Project
                                                </button>
                                            </td>
                                            <td className="p-0 align-top">
                                                <table className="w-full">
                                                    <tbody>
                                                        {group.projects.map((client, pIdx) => {
                                                            const paid = client.advanceReceived || 0;
                                                            const pending = (client.projectPrice || 0) - paid;
                                                            return (
                                                                <tr key={client.id} className={`${pIdx !== group.projects.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-white/80 transition-colors`}>
                                                                    <td className="py-4 px-6 w-1/3">
                                                                        <div className="text-sm font-semibold text-slate-800">{client.projectName}</div>
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <div className="text-xs text-slate-500 flex justify-between w-32">
                                                                                <span>Price:</span>
                                                                                <span className="font-semibold text-slate-700">₹{client.projectPrice?.toLocaleString() || 0}</span>
                                                                            </div>
                                                                            <div className="text-xs text-slate-500 flex justify-between w-32">
                                                                                <span>Paid:</span>
                                                                                <span className="font-semibold text-emerald-600">₹{paid.toLocaleString()}</span>
                                                                            </div>
                                                                            <div className="text-xs text-slate-500 flex justify-between w-32">
                                                                                <span>Pending:</span>
                                                                                <span className="font-semibold text-amber-600">₹{pending.toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-6 w-36">
                                                                        <select
                                                                            value={client.status}
                                                                            onChange={(e) => handleStatusChange(client.id, e.target.value, client.status)}
                                                                            className={`w-full px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer outline-none border border-slate-200 ${
                                                                                client.status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                                client.status === "On Hold" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                                "bg-blue-50 text-blue-600 border-blue-200"
                                                                            }`}
                                                                        >
                                                                            <option value="In Progress">In Progress</option>
                                                                            <option value="Completed">Completed</option>
                                                                            <option value="On Hold">On Hold</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="py-4 px-6 w-28 text-right">
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <button onClick={() => { setPaymentClient(client); setPaymentOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 bg-slate-100 border-none cursor-pointer hover:bg-emerald-100 hover:text-emerald-600 transition-all shadow-sm" title="Manage Payments">
                                                                                <IndianRupee size={14} />
                                                                            </button>
                                                                            <button onClick={() => { setViewClient(client); setViewOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 bg-slate-100 border-none cursor-pointer hover:bg-blue-100 hover:text-blue-600 transition-all shadow-sm" title="View Logs">
                                                                                <Eye size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                ));
                            })()}
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Modals */}
            <ViewClientModal isOpen={viewOpen} onClose={() => setViewOpen(false)} client={viewClient} />
            <PaymentModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} client={paymentClient} onPaymentAdded={fetchClients} />
            <AddClientModal isOpen={addOpen} onClose={() => setAddOpen(false)} onClientAdded={fetchClients} prefillData={addClientPrefill} />
        </div>
    );
}
