import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    ClipboardList,
} from "lucide-react";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Today Task", icon: ClipboardList, path: "/todaytask" },
    { label: "Leads", icon: Users, path: "/leads" },
    { label: "Clients & Projects", icon: Briefcase, path: "/clients" },
    { label: "Quotations", icon: FileText, path: "/templates" },
    { label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar({ collapsed, setCollapsed }) {
    return (
        <aside
            className={`h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative z-40 shadow-sm
                ${collapsed ? "w-[72px] min-w-[72px]" : "w-[260px] min-w-[260px]"}
                max-md:fixed max-md:left-0 max-md:top-0 max-md:z-50 ${collapsed ? "max-md:-translate-x-full max-md:w-[260px] max-md:min-w-[260px]" : "max-md:translate-x-0"}`}
        >
            {/* Logo area */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200 min-h-[72px]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <img src="/logo.png" alt="VR CRM" className="w-9 h-9 rounded-lg object-contain shrink-0" />
                    {!collapsed && (
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                            VR CRM
                        </span>
                    )}
                </div>
                <button
                    className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent text-slate-400 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-all shrink-0"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label="Toggle sidebar"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/"}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-sm font-medium whitespace-nowrap relative transition-all
                            ${isActive
                                ? "bg-blue-50 text-blue-600 sidebar-active-indicator"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            }`
                        }
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon size={20} className="shrink-0" />
                        {!collapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom branding */}
            {!collapsed && (
                <div className="px-4 py-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400 text-center">© {new Date().getFullYear()} VR CRM</p>
                </div>
            )}
        </aside>
    );
}
