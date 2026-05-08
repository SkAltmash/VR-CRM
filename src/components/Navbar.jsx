import { useAuth } from "../context/auth";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Search, Menu, Users, Briefcase, Loader2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export default function Navbar({ onMenuClick }) {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState({ leads: [], clients: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setSearchResults({ leads: [], clients: [] });
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                // To simulate a global search without external indexers (like Algolia), 
                // we'll fetch recently updated leads/clients and filter them in memory
                // or use a simple prefix query if we only care about exact starts.
                // We'll just fetch the top 50 active leads and clients to search against them for simplicity and cost.
                
                const leadsSnap = await getDocs(query(collection(db, "leads"), orderBy("updatedAt", "desc"), limit(100)));
                const clientsSnap = await getDocs(query(collection(db, "clients"), orderBy("updatedAt", "desc"), limit(100)));
                
                const queryLower = searchQuery.toLowerCase();
                
                const filteredLeads = leadsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(l => l.name?.toLowerCase().includes(queryLower) || l.phone?.includes(queryLower))
                    .slice(0, 4);

                const filteredClients = clientsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(c => c.name?.toLowerCase().includes(queryLower) || c.phone?.includes(queryLower) || c.projectName?.toLowerCase().includes(queryLower))
                    .slice(0, 4);

                setSearchResults({ leads: filteredLeads, clients: filteredClients });
                setShowResults(true);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    async function handleLogout() {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    }

    const initials = currentUser?.email
        ? currentUser.email.charAt(0).toUpperCase()
        : "U";

    return (
        <header className="h-16 min-h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 gap-4">
            {/* Left side */}
            <div className="flex items-center gap-4 flex-1">
                <button
                    className="flex items-center justify-center w-9 h-9 border-none rounded-lg bg-transparent text-slate-400 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-all"
                    onClick={onMenuClick}
                    aria-label="Toggle menu"
                >
                    <Menu size={22} />
                </button>
                <div ref={searchRef} className="relative flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 max-w-md w-full focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all max-md:hidden">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search leads, clients, phones..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => { if(searchQuery) setShowResults(true); }}
                        className="border-none outline-none bg-transparent text-slate-700 text-sm w-full placeholder:text-slate-400"
                    />
                    {isSearching && <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />}
                    {searchQuery && !isSearching && (
                        <button onClick={() => { setSearchQuery(""); setShowResults(false); }} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}

                    {/* Search Dropdown */}
                    {showResults && searchQuery && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                            {searchResults.leads.length === 0 && searchResults.clients.length === 0 && !isSearching ? (
                                <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchQuery}"</div>
                            ) : (
                                <div className="py-2">
                                    {searchResults.leads.length > 0 && (
                                        <div className="px-3 pb-1">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Leads</h4>
                                            {searchResults.leads.map(lead => (
                                                <div 
                                                    key={lead.id} 
                                                    onClick={() => { setShowResults(false); navigate(`/leads?lead=${lead.id}`); }}
                                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Users size={14} /></div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{lead.phone} • {lead.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.clients.length > 0 && (
                                        <div className="px-3 pt-2 mt-2 border-t border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Clients</h4>
                                            {searchResults.clients.map(client => (
                                                <div 
                                                    key={client.id}
                                                    onClick={() => { setShowResults(false); navigate(`/clients?client=${client.id}`); }}
                                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><Briefcase size={14} /></div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{client.phone} • {client.projectName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">

                <div className="relative">
                    <button
                        className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm flex items-center justify-center border-2 border-slate-200 cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-500/15 transition-all"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        {initials}
                    </button>

                    {showDropdown && (
                        <div className="absolute top-[calc(100%+8px)] right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-dropdown">
                            <div className="px-4 py-3 border-b border-slate-200">
                                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                            </div>
                            <button
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 border-none bg-transparent text-slate-500 text-sm cursor-pointer hover:bg-slate-50 hover:text-red-500 transition-all"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
