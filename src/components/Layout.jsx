import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar onMenuClick={() => setCollapsed(!collapsed)} />
                <main className="flex-1 overflow-y-auto p-7 max-md:p-4 bg-slate-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
