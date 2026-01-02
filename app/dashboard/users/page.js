"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/context/UserContext";
import useSWR from "swr";

export default function UsersPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const [editingId, setEditingId] = useState(null);
    const [draftPerms, setDraftPerms] = useState({ manageUsers: false, manageProducts: false, manageInventory: false });
    const [savingId, setSavingId] = useState(null);
    const [rowError, setRowError] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: "", email: "" });
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const requiredDeletePhrase = "Yes, I am sure";

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

    const { data, error: usersError, isLoading: usersLoading, mutate } = useSWR(
        user?.manageUsers ? "/api/users" : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    useEffect(() => {
        if (loading) return;
        if (user && !user.manageUsers) {
            router.replace("/dashboard");
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (usersError?.status === 401) {
            router.replace("/dashboard");
        }
    }, [usersError, router]);

    if (loading) {
        return <div className="text-sm text-gray-500">Loading…</div>;
    }

    if (user && !user.manageUsers) {
        return null;
    }

    const users = Array.isArray(data?.users) ? data.users : [];

    const startEdit = (u) => {
        setRowError(null);
        setEditingId(u?.id ?? null);
        setDraftPerms({
            manageUsers: !!u?.manageUsers,
            manageProducts: !!u?.manageProducts,
            manageInventory: !!u?.manageInventory,
        });
    };

    const cancelEdit = () => {
        setRowError(null);
        setEditingId(null);
        setSavingId(null);
    };

    const openDelete = (u) => {
        setDeleteError("");
        setDeleteConfirmText("");
        setDeleteDialog({
            open: true,
            id: u?.id ?? null,
            name: String(u?.name ?? ""),
            email: String(u?.email ?? ""),
        });
    };

    const closeDelete = () => {
        if (isDeleting) return;
        setDeleteDialog({ open: false, id: null, name: "", email: "" });
        setDeleteError("");
        setDeleteConfirmText("");
    };

    const deleteUser = async () => {
        if (!deleteDialog?.id) return;
        if (deleteConfirmText.trim() !== requiredDeletePhrase) return;
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(`/api/users/${encodeURIComponent(String(deleteDialog.id))}`, {
                method: "DELETE",
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDeleteError(json?.error || "Failed to delete user");
                return;
            }
            await mutate();
            closeDelete();
        } catch (e) {
            setDeleteError(e?.message || "Failed to delete user");
        } finally {
            setIsDeleting(false);
        }
    };

    const savePermissions = async (targetId) => {
        setSavingId(targetId);
        setRowError(null);
        try {
            const res = await fetch(`/api/users/${targetId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draftPerms),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setRowError(json?.error || "Failed to update permissions");
                return;
            }
            await mutate();
            setEditingId(null);
        } catch (e) {
            setRowError(e?.message || "Failed to update permissions");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Users</h1>
                <Button asChild>
                    <Link href="/dashboard/users/new">Add User</Link>
                </Button>
            </div>
            <Card className="mt-4 overflow-x-auto">
                {usersLoading ? (
                    <div className="p-4 text-sm text-gray-600">Loading users…</div>
                ) : usersError ? (
                    <div className="p-4 text-sm text-red-600">{usersError.message || "Failed to load users"}</div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500">
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Permissions</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <tr key={u.id ?? u.email}>
                                    <td className="px-4 py-3 text-gray-800">{u.name || "—"}</td>
                                    <td className="px-4 py-3 text-gray-600">{u.email || "—"}</td>
                                    <td className="px-4 py-3">
                                        {editingId === u.id ? (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4"
                                                            checked={!!draftPerms.manageUsers}
                                                            onChange={(e) => setDraftPerms((p) => ({ ...p, manageUsers: e.target.checked }))}
                                                        />
                                                        Manage Users
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4"
                                                            checked={!!draftPerms.manageProducts}
                                                            onChange={(e) => setDraftPerms((p) => ({ ...p, manageProducts: e.target.checked }))}
                                                        />
                                                        Manage Products
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4"
                                                            checked={!!draftPerms.manageInventory}
                                                            onChange={(e) => setDraftPerms((p) => ({ ...p, manageInventory: e.target.checked }))}
                                                        />
                                                        Manage Inventory
                                                    </label>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={() => savePermissions(u.id)}
                                                        disabled={savingId === u.id}
                                                    >
                                                        {savingId === u.id ? "Saving…" : "Save"}
                                                    </Button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEdit}
                                                        className="text-sm font-medium text-gray-600 hover:text-gray-800"
                                                        disabled={savingId === u.id}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                                {rowError ? <div className="text-sm text-red-600">{rowError}</div> : null}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {u.manageUsers ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Manage Users</span>
                                                    ) : null}
                                                    {u.manageProducts ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Manage Products</span>
                                                    ) : null}
                                                    {u.manageInventory ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Manage Inventory</span>
                                                    ) : null}
                                                    {!u.manageUsers && !u.manageProducts && !u.manageInventory ? (
                                                        <span className="text-sm text-gray-600">—</span>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {u.id && u.id !== user?.id && !u.isOwner ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(u)}
                                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                                        >
                                                            Edit
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3">
                                        {u.id && u.id !== user?.id && !u.isOwner ? (
                                            <Button
                                                variant="outline"
                                                className="border-red-300 text-red-700 hover:bg-red-50"
                                                onClick={() => openDelete(u)}
                                            >
                                                Delete
                                            </Button>
                                        ) : (
                                            <span className="text-sm text-gray-500">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {deleteDialog.open ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Delete user confirmation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeDelete();
                    }}
                >
                    <Card className="w-full max-w-lg p-6">
                        <div className="text-base font-semibold text-gray-900">Delete user</div>
                        <div className="mt-1 text-sm text-gray-600">
                            Are you sure you want to delete
                            <span className="font-semibold text-gray-900"> {deleteDialog.name || deleteDialog.email || "this user"}</span>?
                            This action can’t be undone.
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="deleteUserConfirm">Type “{requiredDeletePhrase}” to confirm</Label>
                            <Input
                                id="deleteUserConfirm"
                                className="mt-1"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={requiredDeletePhrase}
                                autoFocus
                                disabled={isDeleting}
                            />
                        </div>

                        {deleteError ? (
                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {deleteError}
                            </div>
                        ) : null}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeDelete} disabled={isDeleting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className={
                                    deleteConfirmText.trim() === requiredDeletePhrase
                                        ? "bg-red-600 text-white hover:bg-red-700"
                                        : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                                }
                                onClick={deleteUser}
                                disabled={isDeleting || deleteConfirmText.trim() !== requiredDeletePhrase}
                            >
                                {isDeleting ? "Deleting…" : "Delete"}
                            </Button>
                        </div>
                    </Card>
                </div>
            ) : null}
        </>
    );
}
