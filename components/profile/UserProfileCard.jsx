"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PERMISSION_LABELS = {
    manageUsers: "Manage Users",
    manageProducts: "Manage Products",
    manageInventory: "Manage Inventory",
};

export default function UserProfileCard({ user, loading, allowNameEdit = false, onRefresh }) {
    const router = useRouter();
    const [editingName, setEditingName] = useState(false);
    const [draftName, setDraftName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);


    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    useEffect(() => {
        setDraftName(user?.name || "");
    }, [user?.name]);

    if (loading) {
        return (
            <Card className="mt-4 p-6">
                <div className="space-y-5">
                    <div>
                        <Skeleton className="h-3 w-12" />
                        <div className="mt-2 flex items-center gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                    </div>

                    <div>
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="mt-2 h-4 w-56" />
                    </div>

                    <div>
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="mt-2 h-4 w-44" />
                    </div>

                    <div>
                        <Skeleton className="h-3 w-24" />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-28 rounded-full" />
                            <Skeleton className="h-6 w-32 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    if (!user) {
        return null;
    }

    const permissions = Object.entries(PERMISSION_LABELS)
        .filter(([key]) => !!user?.[key])
        .map(([, label]) => label);

    const trimmedDraftName = String(draftName || "").trim();
    const canSaveName = trimmedDraftName.length > 0 && trimmedDraftName !== (user?.name || "");

    const saveName = async () => {
        const trimmed = String(draftName || "").trim();
        if (!trimmed) {
            setError("Name is required");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(json?.error || "Failed to update name");
                return;
            }
            setEditingName(false);
            if (typeof onRefresh === "function") {
                await onRefresh();
            }
        } catch (e) {
            setError(e?.message || "Failed to update name");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="mt-4 p-6">
            <div className="space-y-5">
                <div>
                    <div className="text-xs font-medium text-gray-500">Name</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        {editingName ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    value={draftName}
                                    onChange={(e) => setDraftName(e.target.value)}
                                    className="h-9 w-64"
                                    aria-label="Name"
                                />
                                <Button type="button" onClick={saveName} disabled={saving || !canSaveName}>
                                    {saving ? "Saving…" : "Save"}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftName(user?.name || "");
                                        setEditingName(false);
                                        setError(null);
                                    }}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-800"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm font-semibold text-gray-900">{user?.name || "—"}</div>
                                {allowNameEdit ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDraftName(user?.name || "");
                                            setEditingName(true);
                                            setError(null);
                                        }}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Edit
                                    </button>
                                ) : null}
                            </>
                        )}
                    </div>
                    {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
                </div>

                <div>
                    <div className="text-xs font-medium text-gray-500">Email</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{user?.email || "—"}</div>
                </div>

                <div>
                    <div className="text-xs font-medium text-gray-500">Company</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{user?.companyName || "—"}</div>
                </div>

                <div>
                    <div className="text-xs font-medium text-gray-500">Permissions</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {permissions.length ? (
                            permissions.map((label) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                                >
                                    {label}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-gray-600">—</span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
