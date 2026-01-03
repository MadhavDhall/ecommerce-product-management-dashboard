"use client";

import Avatar from "@/components/ui/Avatar";
import Dropdown from "@/components/ui/Dropdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useUser } from "@/components/context/UserContext";
import Skeleton from "@/components/ui/Skeleton";

export default function Topbar({ onMenuClick }) {
    const router = useRouter();
    const { user, loading } = useUser();

    const handleLogout = async () => {
        try {
            await axios.post("/api/logout");
        }
        catch (e) {
            console.error("Logout failed:", e);
        }
        finally {
            router.push("/login");
        }
    };

    return (
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-3 backdrop-blur-sm sm:px-4">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Open Menu"
                    onClick={onMenuClick}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 min-[755px]:hidden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className="hidden min-[755px]:inline-flex items-center gap-2">
                    <img src="/logo.svg" alt="Dhall Ecom" className="h-6 w-6" />
                    <span className="max-w-[16rem] truncate text-sm font-semibold tracking-tight text-gray-900">
                        {loading ? (
                            <Skeleton className="h-4 w-32" />
                        ) : (
                            (user?.companyName || "Dhall Ecom")
                        )}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Dropdown
                    trigger={
                        <Avatar
                            alt={loading ? "" : (user?.name || user?.email || "")}
                            className="cursor-pointer"
                        />
                    }
                >
                    <div className="px-2 py-1 text-xs text-gray-500">
                        {loading ? (
                            <Skeleton className="h-3 w-40" />
                        ) : (
                            `Signed in as ${user?.name || user?.email || "Unknown"}`
                        )}
                    </div>
                    <Link href="/dashboard/profile" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Profile</Link>
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full text-left rounded-md px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                        Logout
                    </button>
                </Dropdown>
            </div>
        </header>
    );
}
