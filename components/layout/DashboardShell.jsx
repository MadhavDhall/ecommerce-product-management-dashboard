"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardShell({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const close = () => setSidebarOpen(false);

    return (
        <div className="flex min-h-svh bg-linear-to-br from-indigo-50 via-white to-violet-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={close}
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] min-[755px]:hidden"
                />
            )}

            {/* Sidebar */}
            <div
                className={[
                    "fixed inset-y-0 left-0 z-40 w-64 min-[755px]:static min-[755px]:z-auto",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full min-[755px]:translate-x-0",
                ].join(" ")}
            >
                <Sidebar onNavigate={close} />
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
