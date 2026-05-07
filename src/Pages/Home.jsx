import { Users, MessageCircle, FileText, TrendingUp, Loader2, UserPlus, Briefcase, FileSignature, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from "react-router-dom";

const statusStyle = {
    New: "bg-blue-50 text-blue-600",
    Contacted: "bg-purple-50 text-purple-600",
    "Quotation Sent": "bg-amber-50 text-amber-600",
    "Follow Up": "bg-indigo-50 text-indigo-600",
    Converted: "bg-emerald-50 text-emerald-600",
    Dead: "bg-red-50 text-red-600",
};

export default function DashboardHome() {
    const [stats, setStats] = useState([
        { title: "Total Leads", value: "-", icon: Users, color: "#3b82f6", bg: "bg-blue-50" },
        { title: "Contacted", value: "-", icon: MessageCircle, color: "#8b5cf6", bg: "bg-purple-50" },
        { title: "Quotation Sent", value: "-", icon: FileText, color: "#f59e0b", bg: "bg-amber-50" },
        { title: "Converted", value: "-", icon: TrendingUp, color: "#10b981", bg: "bg-emerald-50" },
    ]);
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchDashboardData() {
            try {
                const leadsRef = collection(db, "leads");
                
                // Fetch counts using getCountFromServer (1 read per 1000 docs)
                const totalCountPromise = getCountFromServer(leadsRef);
                const contactedCountPromise = getCountFromServer(query(leadsRef, where("status", "==", "Contacted")));
                const quotationCountPromise = getCountFromServer(query(leadsRef, where("status", "==", "Quotation Sent")));
                const convertedCountPromise = getCountFromServer(query(leadsRef, where("status", "==", "Converted")));

                // Fetch only the 5 most recent leads (5 reads)
                const recentLeadsPromise = getDocs(query(leadsRef, orderBy("createdAt", "desc"), limit(5)));

                const [total, contacted, quotation, converted, recentSnap] = await Promise.all([
                    totalCountPromise, contactedCountPromise, quotationCountPromise, convertedCountPromise, recentLeadsPromise
                ]);

                if (!isMounted) return;

                setStats([
                    { title: "Total Leads", value: total.data().count, icon: Users, color: "#3b82f6", bg: "bg-blue-50" },
                    { title: "Contacted", value: contacted.data().count, icon: MessageCircle, color: "#8b5cf6", bg: "bg-purple-50" },
                    { title: "Quotation Sent", value: quotation.data().count, icon: FileText, color: "#f59e0b", bg: "bg-amber-50" },
                    { title: "Converted", value: converted.data().count, icon: TrendingUp, color: "#10b981", bg: "bg-emerald-50" },
                ]);

                const leadsData = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecentLeads(leadsData);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDashboardData();

        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Welcome back! Here's an overview of your CRM.</p>
                </div>
                <Link to="/leads">
                    <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold border-none cursor-pointer shadow-md shadow-blue-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                        View Leads
                    </button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
                {stats.map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-default"
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`} style={{ color: item.color }}>
                            <item.icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">{item.title}</p>
                            <h2 className="text-2xl font-bold text-slate-800">{item.value}</h2>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Link to="/leads" className="group flex items-center p-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <UserPlus size={24} />
                    </div>
                    <div className="ml-4">
                        <h3 className="text-sm font-bold text-slate-800">Add New Lead</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Create a new prospect</p>
                    </div>
                </Link>
                <Link to="/clients" className="group flex items-center p-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                        <Briefcase size={24} />
                    </div>
                    <div className="ml-4">
                        <h3 className="text-sm font-bold text-slate-800">Manage Clients</h3>
                        <p className="text-xs text-slate-500 mt-0.5">View existing projects</p>
                    </div>
                </Link>
                <Link to="/templates" className="group flex items-center p-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                        <FileSignature size={24} />
                    </div>
                    <div className="ml-4">
                        <h3 className="text-sm font-bold text-slate-800">Quotations</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Send a new proposal</p>
                    </div>
                </Link>
            </div>

            {/* Recent Leads Table */}
            <motion.div
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Activity size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Recent Leads Activity</h2>
                    </div>
                    <Link to="/leads" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                        View All <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-white">
                                <th className="text-xs font-bold uppercase tracking-wider text-slate-400 py-4 px-6 border-b border-slate-100">Name</th>
                                <th className="text-xs font-bold uppercase tracking-wider text-slate-400 py-4 px-6 border-b border-slate-100">Contact</th>
                                <th className="text-xs font-bold uppercase tracking-wider text-slate-400 py-4 px-6 border-b border-slate-100">Status</th>
                                <th className="text-xs font-bold uppercase tracking-wider text-slate-400 py-4 px-6 border-b border-slate-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLeads.length > 0 ? (
                                recentLeads.map((lead, i) => (
                                    <tr key={lead.id || i} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6 text-sm font-semibold text-slate-800 border-b border-slate-50">{lead.name}</td>
                                        <td className="py-4 px-6 text-sm text-slate-500 border-b border-slate-50 font-medium">{lead.phone}</td>
                                        <td className="py-4 px-6 border-b border-slate-50">
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusStyle[lead.status] || "bg-slate-100 text-slate-600"}`}>
                                                {lead.status || "New"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 border-b border-slate-50 text-right">
                                            <Link to="/leads" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                                Open
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                                        No recent leads found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}