"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import { UserProvider } from "@/components/context/UserContext";

export default function DashboardLayout({ children }) {
    return (
        <UserProvider>
            <DashboardShell>{children}</DashboardShell>
        </UserProvider>
    );
}
