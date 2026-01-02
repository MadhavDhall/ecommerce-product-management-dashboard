"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const router = useRouter();

    const fetcher = async (url) => {
        const res = await fetch(url, { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(json?.error || "Request failed");
            err.status = res.status;
            err.data = json;
            throw err;
        }
        return json;
    };

    const { data, error, isLoading, mutate } = useSWR("/api/me", fetcher, {
        revalidateOnFocus: false,
    });

    const user = data?.user || null;
    const loading = !!isLoading;
    const refresh = mutate;

    useEffect(() => {
        if (error?.status === 401) {
            router.push("/login");
        }
    }, [error, router]);

    const value = useMemo(() => ({ user, loading, error, refresh }), [user, loading, error, refresh]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error("useUser must be used within <UserProvider>");
    }
    return ctx;
}
