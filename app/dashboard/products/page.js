"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useUser } from "@/components/context/UserContext";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { useSWRConfig } from "swr";

export default function ProductsPage() {
    const router = useRouter();
    const { user } = useUser();
    const canManageProducts = !!user?.manageProducts;
    const { mutate } = useSWRConfig();

    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: "" });
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

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

    const { data, error, isLoading } = useSWR("/api/products", fetcher, {
        revalidateOnFocus: false,
    });

    useEffect(() => {
        if (error?.status === 401) {
            router.push("/login");
        }
    }, [error, router]);

    const products = useMemo(() => data?.products || [], [data]);

    const currency = useMemo(
        () => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }),
        []
    );

    const formatDate = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    };

    const normalizeImageUrls = (imageUrls) => {
        if (!imageUrls) return [];
        if (Array.isArray(imageUrls)) return imageUrls.filter(Boolean);
        if (typeof imageUrls === "string") {
            // Sometimes jsonb can come through as a JSON string in custom proxies
            const trimmed = imageUrls.trim();
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                } catch {
                    // fall through
                }
            }
            return trimmed ? [trimmed] : [];
        }
        return [];
    };

    const openDelete = (p) => {
        setDeleteError("");
        setDeleteConfirmName("");
        setDeleteDialog({ open: true, id: p?.id ?? null, name: String(p?.name ?? "") });
    };

    const closeDelete = () => {
        if (isDeleting) return;
        setDeleteDialog({ open: false, id: null, name: "" });
        setDeleteConfirmName("");
        setDeleteError("");
    };

    const confirmMatches = deleteConfirmName.trim() === deleteDialog.name;

    const doDelete = async () => {
        if (!deleteDialog.id || !confirmMatches) return;
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(`/api/products/${encodeURIComponent(String(deleteDialog.id))}`, {
                method: "DELETE",
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDeleteError(json?.error || "Failed to delete product.");
                return;
            }

            await mutate("/api/products");
            closeDelete();
        } catch (e) {
            setDeleteError(e?.message || "Failed to delete product.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Products</h1>
                {canManageProducts ? (
                    <Button
                        onClick={() => {
                            router.push("/dashboard/products/new");
                        }}
                    >
                        Add Product
                    </Button>
                ) : null}
            </div>

            <Card className="mt-4 overflow-x-auto">
                {isLoading ? (
                    <div className="p-6 text-sm text-gray-600">Loading products…</div>
                ) : error ? (
                    <div className="p-6 text-sm text-gray-600">
                        {error?.status === 401
                            ? "Redirecting to login…"
                            : (error?.data?.error || error?.message || "Failed to load products.")}
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-6 text-sm text-gray-600">No products found.</div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500">
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3">Cost</th>
                                <th className="px-4 py-3">Selling</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Images</th>
                                <th className="px-4 py-3">Analytics</th>
                                {canManageProducts ? <th className="px-4 py-3">Actions</th> : null}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.map((p, idx) => {
                                const imageUrls = normalizeImageUrls(p.imageUrls);
                                const preview = imageUrls.slice(0, 3);
                                const remaining = Math.max(0, imageUrls.length - preview.length);
                                const href = `/dashboard/products/${p.id}?i=${idx}`;
                                return (
                                    <tr
                                        key={p.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        tabIndex={0}
                                        onClick={() => router.push(href)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                router.push(href);
                                            }
                                        }}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 overflow-hidden rounded-md border border-gray-200 bg-white">
                                                    {imageUrls[0] ? (
                                                        <img src={imageUrls[0]} alt={p.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-gray-900">{p.name}</div>
                                                    {p.description ? (
                                                        <div className="mt-0.5 truncate text-xs text-gray-500">{p.description}</div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{formatDate(p.created_at)}</td>
                                        <td className="px-4 py-3 text-gray-900">{currency.format(Number(p.costPrice || 0))}</td>
                                        <td className="px-4 py-3 text-gray-900">{currency.format(Number(p.sellingPrice || 0))}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {p?.category?.name || (p.categoryId == null ? "—" : `#${p.categoryId}`)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {imageUrls.length === 0 ? (
                                                <span className="text-gray-500">—</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {preview.map((url, idx) => (
                                                            <div key={`${p.id}-img-${idx}`} className="h-7 w-7 overflow-hidden rounded-md border border-gray-200 bg-white">
                                                                <img src={url} alt={p.name} className="h-full w-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {imageUrls.length} image{imageUrls.length === 1 ? "" : "s"}
                                                        {remaining > 0 ? ` (+${remaining})` : ""}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/products/${encodeURIComponent(String(p.id))}/analytics`);
                                                }}
                                            >
                                                View analytics
                                            </Button>
                                        </td>
                                        {canManageProducts ? (
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="outline"
                                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        openDelete(p);
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </td>
                                        ) : null}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </Card>

            {deleteDialog.open ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Delete product confirmation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeDelete();
                    }}
                >
                    <Card className="w-full max-w-lg p-6">
                        <div className="text-base font-semibold text-gray-900">Delete product</div>
                        <div className="mt-1 text-sm text-gray-600">
                            This action can’t be undone. Type <span className="font-semibold text-gray-900">{deleteDialog.name}</span> to confirm.
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="deleteConfirm">Product name</Label>
                            <Input
                                id="deleteConfirm"
                                className="mt-1"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={deleteDialog.name}
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
                                    confirmMatches
                                        ? "bg-red-600 text-white hover:bg-red-700"
                                        : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                                }
                                onClick={doDelete}
                                disabled={!confirmMatches || isDeleting}
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
