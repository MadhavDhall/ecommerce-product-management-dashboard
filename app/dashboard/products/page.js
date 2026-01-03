"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useUser } from "@/components/context/UserContext";
import useSWR, { preload } from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSWRConfig } from "swr";
import DeleteProductDialog from "@/components/products/DeleteProductDialog";
import { ChartIcon, InfoIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import Skeleton from "@/components/ui/Skeleton";

export default function ProductsPage() {
    const router = useRouter();
    const { user } = useUser();
    const canManageProducts = !!user?.manageProducts;
    const { mutate } = useSWRConfig();

    const baseColumns = useMemo(
        () => [
            { key: "product", label: "Product" },
            { key: "created", label: "Created" },
            { key: "cost", label: "Cost" },
            { key: "selling", label: "Selling" },
            { key: "category", label: "Category" },
            { key: "images", label: "Images" },
            { key: "details", label: "Details" },
            { key: "analytics", label: "Analytics" },
        ],
        []
    );

    const tableColumns = useMemo(() => {
        if (!canManageProducts) return baseColumns;
        return [...baseColumns, { key: "actions", label: "Actions" }];
    }, [baseColumns, canManageProducts]);

    const renderTableHead = () => (
        <thead>
            <tr className="text-left text-gray-500">
                {tableColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3">
                        {col.label}
                    </th>
                ))}
            </tr>
        </thead>
    );

    const preloadedKeysRef = useRef(new Set());

    const [deleteTarget, setDeleteTarget] = useState(null);

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

    const preloadSWRKeys = (keys) => {
        for (const key of keys) {
            if (!key) continue;
            if (preloadedKeysRef.current.has(key)) continue;
            preloadedKeysRef.current.add(key);
            Promise.resolve(preload(key, fetcher)).catch(() => {
                // allow retrying later if preload failed
                preloadedKeysRef.current.delete(key);
            });
        }
    };

    const { data, error, isLoading } = useSWR("/api/products", fetcher);

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
        setDeleteTarget({
            id: p?.id ?? null,
            name: String(p?.name ?? ""),
        });
    };

    const closeDelete = () => {
        setDeleteTarget(null);
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Products</h1>
                {canManageProducts ? (
                    <Button asChild className="px-3 py-2" aria-label="Add product" title="Add product">
                        <Link href="/dashboard/products/new">
                            <PlusIcon />
                            <span className="sr-only">Add Product</span>
                        </Link>
                    </Button>
                ) : null}
            </div>

            <Card className="mt-4 overflow-x-auto">
                {isLoading ? (
                    <table className="min-w-full text-sm">
                        {renderTableHead()}
                        <tbody className="divide-y divide-gray-100">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <tr key={`prod-skel-${i}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-md" />
                                            <div className="min-w-0 flex-1">
                                                <Skeleton className="h-4 w-48" />
                                                <div className="mt-2">
                                                    <Skeleton className="h-3 w-64" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-9 w-10 rounded-lg" /></td>
                                    <td className="px-4 py-3"><Skeleton className="h-9 w-10 rounded-lg" /></td>
                                    {canManageProducts ? (
                                        <td className="px-4 py-3"><Skeleton className="h-9 w-10 rounded-lg" /></td>
                                    ) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                        {renderTableHead()}
                        <tbody className="divide-y divide-gray-100">
                            {products.map((p, idx) => {
                                const imageUrls = normalizeImageUrls(p.imageUrls);
                                const preview = imageUrls.slice(0, 3);
                                const remaining = Math.max(0, imageUrls.length - preview.length);
                                const detailsHref = `/dashboard/products/${encodeURIComponent(String(p.id))}`;
                                return (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 max-w-sm">
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
                                                        <div className="mt-0.5 truncate text-xs text-gray-500" title={String(p.description)}>
                                                            {p.description}
                                                        </div>
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
                                            <Button asChild variant="outline" className="px-3 py-2">
                                                <Link
                                                    href={detailsHref}
                                                    onMouseEnter={() => {
                                                        const id = encodeURIComponent(String(p.id));
                                                        preloadSWRKeys([
                                                            `/api/products/${id}`,
                                                            "/api/categories",
                                                            `/api/reviews/${id}`,
                                                            `/api/inventory/${id}`,
                                                            `/api/orders/${id}`,
                                                        ]);
                                                    }}
                                                    onFocus={() => {
                                                        const id = encodeURIComponent(String(p.id));
                                                        preloadSWRKeys([
                                                            `/api/products/${id}`,
                                                            "/api/categories",
                                                            `/api/reviews/${id}`,
                                                            `/api/inventory/${id}`,
                                                            `/api/orders/${id}`,
                                                        ]);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    aria-label="Product details"
                                                    title="Product details"
                                                >
                                                    <InfoIcon />
                                                    <span className="sr-only">Product details</span>
                                                </Link>
                                            </Button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button asChild variant="outline">
                                                <Link
                                                    href={`/dashboard/products/${encodeURIComponent(String(p.id))}/analytics`}
                                                    prefetch={false}
                                                    onMouseEnter={() => {
                                                        const id = encodeURIComponent(String(p.id));
                                                        preloadSWRKeys([
                                                            `/api/products/${id}`,
                                                            `/api/orders/${id}`,
                                                            `/api/inventory/${id}`,
                                                        ]);
                                                    }}
                                                    onFocus={() => {
                                                        const id = encodeURIComponent(String(p.id));
                                                        preloadSWRKeys([
                                                            `/api/products/${id}`,
                                                            `/api/orders/${id}`,
                                                            `/api/inventory/${id}`,
                                                        ]);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    aria-label="View analytics"
                                                    title="View analytics"
                                                >
                                                    <ChartIcon />
                                                    <span className="sr-only">View analytics</span>
                                                </Link>
                                            </Button>
                                        </td>
                                        {canManageProducts ? (
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="outline"
                                                    className="border-red-300 text-red-700 hover:bg-red-50 px-3 py-2"
                                                    aria-label="Delete product"
                                                    title="Delete product"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        openDelete(p);
                                                    }}
                                                >
                                                    <TrashIcon />
                                                    <span className="sr-only">Delete</span>
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

            <DeleteProductDialog
                open={!!deleteTarget}
                productId={deleteTarget?.id}
                productName={deleteTarget?.name}
                onClose={closeDelete}
                onDeleted={async () => {
                    await mutate("/api/products");
                }}
            />
        </>
    );
}
