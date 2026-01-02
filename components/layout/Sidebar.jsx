"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/context/UserContext";

const baseNavItems = [
    { name: "Overview", href: "/dashboard", icon: OverviewIcon },
    { name: "Products", href: "/dashboard/products", icon: BoxIcon },
    { name: "Inventory", href: "/dashboard/inventory", icon: ShelvesIcon },
    { name: "Reviews", href: "/dashboard/reviews", icon: StarIcon },
];

export default function Sidebar({ onNavigate }) {
    const pathname = usePathname();
    const { user } = useUser();

    const navItems = [...baseNavItems];
    if (user?.manageUsers) {
        navItems.push({ name: "Users", href: "/dashboard/users", icon: UsersIcon });
    }

    return (
        <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="px-4 py-4">
                <div className="inline-flex items-center gap-2">
                    <img src="/logo.svg" alt="Dhall Ecom" className="h-8 w-8" />
                    <span className="text-base font-semibold tracking-tight text-gray-900">Dhall Ecom</span>
                </div>
            </div>

            <nav className="mt-2 flex-1 px-2">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={[
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                        active
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-700 hover:bg-gray-100",
                                    ].join(" ")}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="px-4 py-4 text-xs text-gray-500">
                © {new Date().getFullYear()} Dhall Ecom
            </div>
        </aside>
    );
}

function OverviewIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 3h7v7H3z" />
            <path d="M14 3h7v4h-7z" />
            <path d="M14 9h7v12h-7z" />
            <path d="M3 12h7v9H3z" />
        </svg>
    );
}

function BoxIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M21 7v10l-9 4-9-4V7" />
            <path d="M12 11v10" />
        </svg>
    );
}

function ShelvesIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 5h18" />
            <path d="M3 12h18" />
            <path d="M3 19h18" />
            <path d="M6 5v14" />
            <path d="M18 5v14" />
        </svg>
    );
}

function StarIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
    );
}

function UsersIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    );
}
