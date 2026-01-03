"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useUser } from "@/components/context/UserContext";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const canManageInventory = !!user?.manageInventory;

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

    const { data, error, isLoading, mutate } = useSWR("/api/inventory", fetcher);

    const [draftByProductId, setDraftByProductId] = useState({});
    const [lastEditedAtByProductId, setLastEditedAtByProductId] = useState({});
    const [saveError, setSaveError] = useState("");
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (error?.status === 401) router.push("/login");
    }, [error, router]);

    const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

    const inventoryRows = useMemo(() => {
        return items.map((row) => {
            const product = row?.product || {};
            const inv = row?.inventory || null;
            const reserved = Number(row?.reservedCount || 0);
            const stock = Number(inv?.inStock || 0);

            const inStock = Number.isFinite(stock) ? stock : 0;
            const reservedCount = Number.isFinite(reserved) ? reserved : 0;
            const minAllowed = reservedCount;

            const draftRaw = draftByProductId?.[product?.id];
            const hasDraft = draftRaw !== undefined;
            const draftParsed = hasDraft ? Number.parseInt(String(draftRaw), 10) : inStock;
            const isDraftNumber = Number.isFinite(draftParsed);
            const nextInStock = isDraftNumber ? draftParsed : inStock;
            const isDirty = hasDraft && isDraftNumber && draftParsed !== inStock;
            const isInvalid = hasDraft && (!isDraftNumber || draftParsed < minAllowed);

            return {
                product,
                inv,
                inStock,
                reservedCount,
                available: Math.max(0, inStock - reservedCount),
                minAllowed,
                draftRaw,
                nextInStock,
                isDirty,
                isInvalid,
                editedAt: lastEditedAtByProductId?.[product?.id] || 0,
            };
        });
    }, [items, draftByProductId, lastEditedAtByProductId]);

    const sortedRows = useMemo(() => {
        // Edited rows should float to the top; among them, most recently edited first.
        return [...inventoryRows].sort((a, b) => {
            const aPinned = a.isDirty || a.isInvalid ? 1 : 0;
            const bPinned = b.isDirty || b.isInvalid ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            if (aPinned === 1 && a.editedAt !== b.editedAt) return b.editedAt - a.editedAt;
            const aId = Number(a?.product?.id || 0);
            const bId = Number(b?.product?.id || 0);
            return aId - bId;
        });
    }, [inventoryRows]);

    const dirtyRows = useMemo(() => sortedRows.filter((r) => r.isDirty), [sortedRows]);
    const invalidRows = useMemo(() => sortedRows.filter((r) => r.isInvalid), [sortedRows]);
    const canSave = canManageInventory && !saving && dirtyRows.length > 0 && invalidRows.length === 0;

    const pinnedCount = useMemo(
        () => sortedRows.filter((r) => r.isDirty || r.isInvalid).length,
        [sortedRows]
    );

    const normalizeImageUrls = (imageUrls) => {
        if (!imageUrls) return [];
        if (Array.isArray(imageUrls)) return imageUrls.filter(Boolean);
        if (typeof imageUrls === "string") {
            const trimmed = imageUrls.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                } catch {
                    // ignore
                }
            }
            return [trimmed];
        }
        return [];
    };

    const formatDateTime = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const onChangeDraft = (productId, value) => {
        setDraftByProductId((prev) => ({ ...prev, [productId]: value }));
        setLastEditedAtByProductId((prev) => ({ ...prev, [productId]: Date.now() }));
        if (saveError) setSaveError("");
    };

    const cancelEditing = () => {
        setEditMode(false);
        setDraftByProductId({});
        setLastEditedAtByProductId({});
        setSaveError("");
    };

    const saveChanges = async () => {
        if (!canSave) return;

        setSaving(true);
        setSaveError("");
        try {
            const updates = dirtyRows.map((r) => ({
                productId: r.product?.id,
                inStock: r.nextInStock,
            }));

            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ updates }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(json?.error || "Failed to update inventory");
                err.status = res.status;
                err.data = json;
                throw err;
            }

            await mutate();
            setDraftByProductId({});
            setLastEditedAtByProductId({});
        } catch (e) {
            if (e?.status === 401) {
                router.push("/login");
                return;
            }
            setSaveError(e?.message || "Failed to update inventory");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
                    <div className="mt-1 text-sm text-gray-600">Stock, reserved, and availability per product.</div>
                    {canManageInventory && editMode ? (
                        <div className="mt-1 text-xs text-gray-500">Edited items stay pinned to the top until you save.</div>
                    ) : null}
                </div>

                {canManageInventory ? (
                    <div className="flex flex-col items-end gap-1">
                        {editMode ? (
                            <div className="flex items-center gap-2">
                                <Button onClick={cancelEditing} disabled={saving} variant="outline">
                                    Cancel
                                </Button>
                                <Button onClick={saveChanges} disabled={!canSave}>
                                    {saving ? "Saving…" : dirtyRows.length > 0 ? `Save (${dirtyRows.length})` : "Save"}
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={() => setEditMode(true)} variant="outline">
                                Edit
                            </Button>
                        )}
                        {editMode && invalidRows.length > 0 ? (
                            <div className="text-xs text-red-600">Fix invalid rows to save.</div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <Card className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-gray-500">
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">In Stock</th>
                            <th className="px-4 py-3">Reserved</th>
                            <th className="px-4 py-3">Available</th>
                            <th className="px-4 py-3">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {saveError ? (
                            <tr>
                                <td className="px-4 py-3 text-sm text-red-700" colSpan={5}>
                                    {saveError}
                                </td>
                            </tr>
                        ) : null}
                        {error ? (
                            <tr>
                                <td className="px-4 py-6 text-sm text-gray-700" colSpan={5}>
                                    {error?.data?.error || error?.message || "Failed to load inventory."}
                                </td>
                            </tr>
                        ) : isLoading || userLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={`inv-skel-${i}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-md" />
                                            <div className="min-w-0 flex-1">
                                                <Skeleton className="h-4 w-48" />
                                                <div className="mt-2">
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                                </tr>
                            ))
                        ) : sortedRows.length === 0 ? (
                            <tr>
                                <td className="px-4 py-6 text-sm text-gray-700" colSpan={5}>
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((r, idx) => {
                                const product = r.product || {};
                                const inv = r.inv || null;

                                const images = normalizeImageUrls(product?.imageUrls);
                                const preview = images[0] || "";
                                const lastUpdated = inv?.updated_at || inv?.created_at || "";

                                const rowClass = r.isInvalid
                                    ? "bg-red-50"
                                    : r.isDirty
                                        ? "bg-indigo-50"
                                        : "";

                                const isFirstUnpinnedRow = editMode && pinnedCount > 0 && idx === pinnedCount;
                                const separationClass = isFirstUnpinnedRow ? "border-t-8 border-gray-100" : "";

                                return (
                                    <tr
                                        key={product?.id ?? product?.name}
                                        className={[rowClass, separationClass].filter(Boolean).join(" ")}
                                    >
                                        <td className="px-4 py-3 text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                                                    {preview ? (
                                                        <img
                                                            src={preview}
                                                            alt={product?.name || "Product"}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-gray-900">
                                                        {product?.name || "—"}
                                                    </div>
                                                    <div className="text-xs text-gray-500">ID: {product?.id ?? "—"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-900">
                                            {canManageInventory && editMode ? (
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="number"
                                                        className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                                                        value={r.draftRaw !== undefined ? r.draftRaw : r.inStock}
                                                        min={r.minAllowed}
                                                        step={1}
                                                        disabled={saving}
                                                        onChange={(e) => onChangeDraft(product?.id, e.target.value)}
                                                    />
                                                    {r.isInvalid ? (
                                                        <div className="text-xs text-red-700">Min allowed: {r.minAllowed}</div>
                                                    ) : r.isDirty ? (
                                                        <div className="text-xs text-indigo-700">Will update to {r.nextInStock}</div>
                                                    ) : (
                                                        <div className="text-xs text-gray-500">Min: {r.minAllowed}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                r.inStock
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900">{r.reservedCount}</td>
                                        <td className="px-4 py-3 text-gray-900">{r.available}</td>
                                        <td className="px-4 py-3 text-gray-700">{formatDateTime(lastUpdated)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </Card>
        </>
    );
}
