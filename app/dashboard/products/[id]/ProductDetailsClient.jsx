"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ReviewListItem from "@/components/reviews/ReviewListItem";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { useUser } from "@/components/context/UserContext";
import useSWR, { preload } from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSWRConfig } from "swr";
import DeleteProductDialog from "@/components/products/DeleteProductDialog";
import { ArrowLeftIcon, ChartIcon, PencilIcon, TrashIcon } from "@/components/ui/Icons";
import Skeleton from "@/components/ui/Skeleton";

export default function ProductDetailsClient({ productId }) {
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const { user } = useUser();
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [reviewsExpanded, setReviewsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [lightboxUrl, setLightboxUrl] = useState("");
    const imagesInputRef = useRef(null);
    const preloadedKeysRef = useRef(new Set());
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [draft, setDraft] = useState({
        name: "",
        costPrice: "",
        sellingPrice: "",
        categoryId: "",
        description: "",
    });
    const [draftAttributes, setDraftAttributes] = useState([{ name: "", value: "" }]);
    const [editBaseline, setEditBaseline] = useState(null);

    const [draftKeepImageUrls, setDraftKeepImageUrls] = useState([]);
    const [draftNewImages, setDraftNewImages] = useState([]);

    const safeProductId = useMemo(() => (productId == null ? "" : String(productId)), [productId]);

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

    const {
        data: detailData,
        error: detailError,
        isLoading: isDetailLoading,
    } = useSWR(
        safeProductId ? `/api/products/${encodeURIComponent(safeProductId)}` : null,
        fetcher
    );

    const {
        data: categoriesData,
        error: categoriesError,
        isLoading: isCategoriesLoading,
    } = useSWR("/api/categories", fetcher);

    const {
        data: reviewsData,
        error: reviewsError,
        isLoading: isReviewsLoading,
    } = useSWR(
        safeProductId ? `/api/reviews/${encodeURIComponent(safeProductId)}` : null,
        fetcher
    );

    const {
        data: inventoryData,
        error: inventoryError,
        isLoading: isInventoryLoading,
    } = useSWR(
        safeProductId ? `/api/inventory/${encodeURIComponent(safeProductId)}` : null,
        fetcher
    );

    const {
        data: ordersData,
        error: ordersError,
        isLoading: isOrdersLoading,
    } = useSWR(
        safeProductId ? `/api/orders/${encodeURIComponent(safeProductId)}` : null,
        fetcher
    );

    useEffect(() => {
        if (
            detailError?.status === 401 ||
            categoriesError?.status === 401 ||
            inventoryError?.status === 401 ||
            ordersError?.status === 401
        ) {
            router.push("/login");
        }
    }, [categoriesError, detailError, inventoryError, ordersError, router]);

    const product = detailData?.product || null;

    const attributesInfo = useMemo(() => {
        const raw = product?.attributes;
        if (raw == null) return { kind: "empty", value: null };

        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed) return { kind: "empty", value: null };
            try {
                return { kind: "parsed", value: JSON.parse(trimmed) };
            } catch {
                return { kind: "string", value: trimmed };
            }
        }

        return { kind: "parsed", value: raw };
    }, [product?.attributes]);

    // Show edit UI only when server-side permission will allow saving.
    const canEditProduct = !!user?.manageProducts;

    const attributesToPairs = (info) => {
        if (!info || info.kind === "empty") return [{ name: "", value: "" }];
        if (info.kind === "string") return [{ name: "value", value: String(info.value ?? "") }];
        const v = info.value;
        if (!v || typeof v !== "object" || Array.isArray(v)) return [{ name: "", value: "" }];
        const entries = Object.entries(v);
        if (entries.length === 0) return [{ name: "", value: "" }];
        return entries.map(([k, val]) => ({
            name: String(k),
            value: val == null ? "" : (typeof val === "string" ? val : JSON.stringify(val)),
        }));
    };

    const stableStringify = (obj) => {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return JSON.stringify(obj ?? null);
        const keys = Object.keys(obj).sort();
        const sorted = {};
        for (const k of keys) sorted[k] = obj[k];
        return JSON.stringify(sorted);
    };

    const error = detailError || categoriesError || reviewsError;
    const isLoading = (!product && isDetailLoading) || (!categoriesData && isCategoriesLoading);

    const reservedStock = useMemo(() => {
        const orders = ordersData?.orders;
        if (!Array.isArray(orders)) return 0;
        let count = 0;
        for (const o of orders) {
            // Each undelivered order reserves 1 unit (no quantity field in schema).
            if (o?.delivered === false) count++;
        }
        return count;
    }, [ordersData]);

    const availableStock = useMemo(() => {
        const raw = inventoryData?.inventory?.inStock;
        const inStock = Number(raw);
        if (!Number.isFinite(inStock)) return null;
        return Math.max(0, inStock - reservedStock);
    }, [inventoryData, reservedStock]);

    const categoryChain = useMemo(() => {
        const categories = categoriesData?.categories;
        if (!product || !Array.isArray(categories)) return [];

        const byId = new Map();
        for (const c of categories) {
            if (c?.id == null) continue;
            byId.set(String(c.id), c);
        }

        const getParentId = (cat) => (cat?.parentId == null ? null : cat.parentId);

        const startId = product?.categoryId ?? product?.category?.id;
        if (startId == null) return [];

        const chain = [];
        const visited = new Set();

        let currentId = String(startId);
        // safety cap to avoid infinite loops in case of cycles
        for (let steps = 0; steps < 25; steps++) {
            if (visited.has(currentId)) break;
            visited.add(currentId);

            const current = byId.get(currentId);
            if (!current) break;
            chain.push(current);

            const parent = getParentId(current);
            if (parent == null || parent === "") break;
            currentId = String(parent);
        }

        return chain.reverse();
    }, [categoriesData, product]);

    const currency = useMemo(
        () => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }),
        []
    );

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

    const formatDateOnly = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const normalizeImageUrls = (imageUrls) => {
        if (!imageUrls) return [];
        if (Array.isArray(imageUrls)) return imageUrls.filter(Boolean);
        if (typeof imageUrls === "string") {
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

    const imageUrls = useMemo(() => normalizeImageUrls(product?.imageUrls), [product]);
    const selectedImage = imageUrls[selectedImageIndex] || imageUrls[0] || "";

    useEffect(() => {
        if (selectedImageIndex > 0 && selectedImageIndex >= imageUrls.length) {
            setSelectedImageIndex(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageUrls.length]);

    // Cleanup object URLs for newly selected images
    useEffect(() => {
        return () => {
            draftNewImages.forEach((img) => {
                if (img?.url) URL.revokeObjectURL(img.url);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const enterEditMode = () => {
        if (!product) return;
        setSaveError("");
        setIsEditing(true);

        const baseline = {
            name: product?.name ?? "",
            costPrice: product?.costPrice ?? 0,
            sellingPrice: product?.sellingPrice ?? 0,
            categoryId: product?.categoryId ?? null,
            description: product?.description ?? null,
            attributes: attributesInfo.kind === "parsed" ? attributesInfo.value : null,
        };
        setEditBaseline(baseline);

        setDraft({
            name: String(product?.name ?? ""),
            costPrice: String(product?.costPrice ?? ""),
            sellingPrice: String(product?.sellingPrice ?? ""),
            categoryId: product?.categoryId == null ? "" : String(product.categoryId),
            description: String(product?.description ?? ""),
        });

        setDraftAttributes(attributesToPairs(attributesInfo));

        setDraftKeepImageUrls(normalizeImageUrls(product?.imageUrls));
        setDraftNewImages([]);
    };

    const cancelEditMode = () => {
        setIsEditing(false);
        setIsSaving(false);
        setSaveError("");
        setEditBaseline(null);

        draftNewImages.forEach((img) => {
            if (img?.url) URL.revokeObjectURL(img.url);
        });
        setDraftNewImages([]);
    };

    const onPickNewImages = (e) => {
        const picked = Array.from(e?.target?.files || []).filter(Boolean);
        if (picked.length === 0) return;

        setDraftNewImages((prev) => {
            const prevKeys = new Set(prev.map((x) => `${x.file?.name}::${x.file?.size}::${x.file?.lastModified}`));
            const added = picked
                .filter((f) => !prevKeys.has(`${f.name}::${f.size}::${f.lastModified}`))
                .map((file) => ({
                    id: `${file.name}::${file.size}::${file.lastModified}`,
                    file,
                    url: URL.createObjectURL(file),
                }));
            return [...prev, ...added];
        });

        if (imagesInputRef.current) {
            imagesInputRef.current.value = "";
        }
    };

    const removeExistingImageUrl = (url) => {
        setDraftKeepImageUrls((prev) => prev.filter((u) => u !== url));
        if (url && url === lightboxUrl) setLightboxUrl("");
    };

    const removeNewImage = (id) => {
        setDraftNewImages((prev) => {
            const removed = prev.find((x) => x.id === id);
            if (removed?.url) URL.revokeObjectURL(removed.url);
            if (removed?.url && removed.url === lightboxUrl) setLightboxUrl("");
            return prev.filter((x) => x.id !== id);
        });
    };

    const buildAttributesObject = (pairs) => {
        const out = {};
        for (const p of pairs || []) {
            const key = p?.name == null ? "" : String(p.name).trim();
            const raw = p?.value == null ? "" : String(p.value).trim();
            if (!key && !raw) continue;
            if (!key || !raw) continue;
            // Allow value to be a JSON snippet if the user pasted it.
            if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
                try {
                    out[key] = JSON.parse(raw);
                    continue;
                } catch {
                    // fall through
                }
            }
            out[key] = raw;
        }
        return Object.keys(out).length > 0 ? out : null;
    };

    const saveEdits = async () => {
        if (!product || !safeProductId) return;
        setSaveError("");
        setIsSaving(true);

        try {
            const baseline = editBaseline;
            if (!baseline) throw new Error("No baseline");

            const nextName = String(draft.name ?? "").trim();
            const nextCost = Number(draft.costPrice);
            const nextSell = Number(draft.sellingPrice);
            const nextDesc = String(draft.description ?? "").trim();
            const nextCategoryId = String(draft.categoryId ?? "").trim();
            const nextAttrs = buildAttributesObject(draftAttributes);

            const baselineImageUrls = normalizeImageUrls(product?.imageUrls);
            const nextKeep = Array.isArray(draftKeepImageUrls) ? draftKeepImageUrls : [];
            const hasNewImages = Array.isArray(draftNewImages) && draftNewImages.length > 0;
            const imagesChanged =
                hasNewImages ||
                JSON.stringify(nextKeep) !== JSON.stringify(baselineImageUrls);

            const patch = {};
            if (nextName !== String(baseline.name ?? "")) patch.name = nextName;
            if (Number.isFinite(nextCost) && nextCost !== Number(baseline.costPrice ?? 0)) patch.costPrice = nextCost;
            if (Number.isFinite(nextSell) && nextSell !== Number(baseline.sellingPrice ?? 0)) patch.sellingPrice = nextSell;

            const baselineDesc = baseline.description == null ? "" : String(baseline.description);
            if (nextDesc !== baselineDesc) patch.description = nextDesc ? nextDesc : null;

            const baselineCat = baseline.categoryId == null ? "" : String(baseline.categoryId);
            if (nextCategoryId !== baselineCat) {
                patch.categoryId = nextCategoryId ? Number(nextCategoryId) : null;
            }

            const baselineAttrsStr = stableStringify(baseline.attributes);
            const nextAttrsStr = stableStringify(nextAttrs);
            if (nextAttrsStr !== baselineAttrsStr) patch.attributes = nextAttrs;

            if (Object.keys(patch).length === 0 && !imagesChanged) {
                cancelEditMode();
                return;
            }

            let res;
            if (imagesChanged) {
                if (nextKeep.length === 0 && !hasNewImages) {
                    throw new Error("At least one image is required");
                }

                const fd = new FormData();
                // Only send fields that changed.
                if (patch.name !== undefined) fd.set("name", patch.name);
                if (patch.costPrice !== undefined) fd.set("costPrice", String(patch.costPrice));
                if (patch.sellingPrice !== undefined) fd.set("sellingPrice", String(patch.sellingPrice));
                if (patch.categoryId !== undefined) fd.set("categoryId", patch.categoryId == null ? "" : String(patch.categoryId));
                if (patch.description !== undefined) fd.set("description", patch.description == null ? "" : String(patch.description));
                if (patch.attributes !== undefined) fd.set("attributes", patch.attributes == null ? "" : JSON.stringify(patch.attributes));

                fd.set("keepImageUrls", JSON.stringify(nextKeep));
                for (const f of draftNewImages.map((x) => x.file).filter(Boolean)) {
                    fd.append("images", f);
                }

                res = await fetch(`/api/products/${encodeURIComponent(safeProductId)}`, {
                    method: "PATCH",
                    body: fd,
                });
            } else {
                res = await fetch(`/api/products/${encodeURIComponent(safeProductId)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patch),
                });
            }
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || "Failed to update product");
            }

            const updated = json?.product || null;

            // Update caches so both list and detail views stay in sync.
            await mutate(
                "/api/products",
                (current) => {
                    if (!current || !Array.isArray(current.products) || !updated) return current;
                    const next = current.products.map((p) => (String(p?.id) === String(updated.id) ? { ...p, ...updated } : p));
                    return { ...current, products: next };
                },
                { revalidate: false }
            );
            await mutate(`/api/products/${encodeURIComponent(safeProductId)}`, { product: updated }, { revalidate: false });

            cancelEditMode();
        } catch (e) {
            setSaveError(e?.message || "Failed to update product");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <DeleteProductDialog
                open={deleteOpen}
                productId={safeProductId}
                productName={product?.name}
                onClose={() => setDeleteOpen(false)}
                onDeleted={async () => {
                    // Keep caches consistent, then return to list
                    await mutate("/api/products");
                    await mutate(`/api/products/${encodeURIComponent(safeProductId)}`);
                    router.push("/dashboard/products");
                }}
            />
            {lightboxUrl ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setLightboxUrl("")}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative w-full max-w-4xl">
                        <button
                            type="button"
                            onClick={() => setLightboxUrl("")}
                            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-gray-800 shadow-sm hover:bg-gray-50"
                            aria-label="Close preview"
                        >
                            ×
                        </button>

                        <div
                            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={lightboxUrl}
                                alt="Preview"
                                className="max-h-[80vh] w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500">Products</div>
                    <h1 className="mt-1 text-lg font-semibold text-gray-900">
                        {isLoading ? <Skeleton className="h-6 w-56" /> : (product?.name || "Product")}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {canEditProduct && product && !error && !isLoading ? (
                        isEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    disabled={isSaving}
                                    onClick={cancelEditMode}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={isSaving}
                                    onClick={saveEdits}
                                >
                                    {isSaving ? "Saving…" : "Save"}
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={enterEditMode}
                                aria-label="Edit product"
                                title="Edit product"
                            >
                                <PencilIcon />
                                <span className="sr-only">Edit product</span>
                            </Button>
                        )
                    ) : null}
                    {canEditProduct && product && !error && !isLoading ? (
                        <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            disabled={isSaving || isEditing}
                            onClick={() => setDeleteOpen(true)}
                            aria-label="Delete product"
                            title="Delete product"
                        >
                            <TrashIcon />
                            <span className="sr-only">Delete</span>
                        </Button>
                    ) : null}
                    {safeProductId ? (
                        <Button asChild variant="outline" className="px-3 py-2">
                            <Link
                                href={`/dashboard/products/${encodeURIComponent(safeProductId)}/analytics`}
                                prefetch={false}
                                onMouseEnter={() => {
                                    preloadSWRKeys([
                                        `/api/products/${encodeURIComponent(safeProductId)}`,
                                        `/api/orders/${encodeURIComponent(safeProductId)}`,
                                        `/api/inventory/${encodeURIComponent(safeProductId)}`,
                                    ]);
                                }}
                                onFocus={() => {
                                    preloadSWRKeys([
                                        `/api/products/${encodeURIComponent(safeProductId)}`,
                                        `/api/orders/${encodeURIComponent(safeProductId)}`,
                                        `/api/inventory/${encodeURIComponent(safeProductId)}`,
                                    ]);
                                }}
                                aria-label="View analytics"
                                title="View analytics"
                            >
                                <ChartIcon />
                                <span className="sr-only">View analytics</span>
                            </Link>
                        </Button>
                    ) : null}
                    <Button asChild variant="outline" className="px-3 py-2">
                        <Link
                            href="/dashboard/products"
                            onMouseEnter={() => {
                                preloadSWRKeys(["/api/products"]);
                            }}
                            onFocus={() => {
                                preloadSWRKeys(["/api/products"]);
                            }}
                            aria-label="Back to products"
                            title="Back to products"
                        >
                            <ArrowLeftIcon />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    {isLoading ? (
                        <div className="p-4">
                            <Skeleton className="aspect-square w-full rounded-lg" />
                            <div className="mt-4">
                                <Skeleton className="h-3 w-28" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-sm text-gray-600">
                            {error?.status === 401
                                ? "Redirecting to login…"
                                : (error?.data?.error || error?.message || "Failed to load product.")}
                        </div>
                    ) : !product ? (
                        <div className="p-6 text-sm text-gray-600">Product not found.</div>
                    ) : (
                        <div className="p-4">
                            <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
                                {selectedImage ? (
                                    <img
                                        src={selectedImage}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                                        No image
                                    </div>
                                )}
                            </div>

                            {imageUrls.length > 1 ? (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                    {imageUrls.map((url, idx) => {
                                        const isActive = idx === selectedImageIndex;
                                        return (
                                            <button
                                                key={`thumb-${idx}`}
                                                type="button"
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={
                                                    "h-14 w-14 flex-none overflow-hidden rounded-md border bg-white " +
                                                    (isActive ? "border-gray-400" : "border-gray-200")
                                                }
                                                aria-label={`Select image ${idx + 1}`}
                                            >
                                                <img
                                                    src={url}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <div className="mt-4 text-xs text-gray-500">
                                Product ID: <span className="text-gray-700">{product?.id ?? "—"}</span>
                            </div>
                        </div>
                    )}
                </Card>

                <div className="lg:col-span-2">
                    <Card>
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                <div>
                                    <Skeleton className="h-3 w-24" />
                                    <div className="mt-2">
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : error ? (
                            <div className="p-6 text-sm text-gray-600">
                                {error?.status === 401
                                    ? "Redirecting to login…"
                                    : (error?.data?.error || error?.message || "Failed to load product.")}
                            </div>
                        ) : !product ? (
                            <div className="p-6 text-sm text-gray-600">Product not found.</div>
                        ) : (
                            <div className="p-6">
                                {saveError ? (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {saveError}
                                    </div>
                                ) : null}

                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="edit-name">Name</Label>
                                            <Input
                                                id="edit-name"
                                                className="mt-1"
                                                disabled={isSaving}
                                                value={draft.name}
                                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="edit-cost">Cost Price</Label>
                                                <Input
                                                    id="edit-cost"
                                                    inputMode="decimal"
                                                    className="mt-1"
                                                    disabled={isSaving}
                                                    value={draft.costPrice}
                                                    onChange={(e) => setDraft((d) => ({ ...d, costPrice: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="edit-sell">Selling Price</Label>
                                                <Input
                                                    id="edit-sell"
                                                    inputMode="decimal"
                                                    className="mt-1"
                                                    disabled={isSaving}
                                                    value={draft.sellingPrice}
                                                    onChange={(e) => setDraft((d) => ({ ...d, sellingPrice: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="edit-category">Category</Label>
                                            <select
                                                id="edit-category"
                                                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                                disabled={isSaving}
                                                value={draft.categoryId}
                                                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                                            >
                                                <option value="">No category</option>
                                                {Array.isArray(categoriesData?.categories)
                                                    ? categoriesData.categories.map((c) => (
                                                        <option key={c?.id ?? c?.name} value={c?.id ?? ""}>
                                                            {c?.name || `#${c?.id}`}
                                                        </option>
                                                    ))
                                                    : null}
                                            </select>
                                        </div>

                                        <div>
                                            <Label htmlFor="edit-description">Description</Label>
                                            <textarea
                                                id="edit-description"
                                                rows={4}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                                disabled={isSaving}
                                                value={draft.description}
                                                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                            />
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500">Images</div>

                                            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                {draftKeepImageUrls.map((url, idx) => (
                                                    <div
                                                        key={`keep-${idx}`}
                                                        className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => setLightboxUrl(url)}
                                                            className="block w-full"
                                                            aria-label="Preview image"
                                                        >
                                                            <img
                                                                src={url}
                                                                alt={product?.name || "Product image"}
                                                                className="h-20 w-full object-cover"
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => removeExistingImageUrl(url)}
                                                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-sm leading-none text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            aria-label="Remove image"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}

                                                {draftNewImages.map((img) => (
                                                    <div
                                                        key={img.id}
                                                        className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => setLightboxUrl(img.url)}
                                                            className="block w-full"
                                                            aria-label="Preview image"
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={img.file?.name || "New image"}
                                                                className="h-20 w-full object-cover"
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => removeNewImage(img.id)}
                                                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-sm leading-none text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            aria-label="Remove image"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-3">
                                                <Label htmlFor="edit-images">Add images</Label>
                                                <input
                                                    ref={(el) => {
                                                        imagesInputRef.current = el;
                                                    }}
                                                    id="edit-images"
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    disabled={isSaving}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                                    onChange={onPickNewImages}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500">Attributes</div>
                                            <div className="mt-2 space-y-2">
                                                {draftAttributes.map((row, idx) => (
                                                    <div
                                                        key={`attr-${idx}`}
                                                        className="rounded-lg border border-gray-100 bg-white p-4"
                                                    >
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                                            <div className="sm:col-span-2">
                                                                <Label htmlFor={`attr-name-${idx}`}>Name</Label>
                                                                <Input
                                                                    id={`attr-name-${idx}`}
                                                                    className="mt-1"
                                                                    disabled={isSaving}
                                                                    value={row.name}
                                                                    onChange={(e) =>
                                                                        setDraftAttributes((prev) =>
                                                                            prev.map((p, i) =>
                                                                                i === idx ? { ...p, name: e.target.value } : p
                                                                            )
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <Label htmlFor={`attr-value-${idx}`}>Value</Label>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isSaving}
                                                                        onClick={() =>
                                                                            setDraftAttributes((prev) =>
                                                                                prev.length <= 1
                                                                                    ? [{ name: "", value: "" }]
                                                                                    : prev.filter((_, i) => i !== idx)
                                                                            )
                                                                        }
                                                                        className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                                <Input
                                                                    id={`attr-value-${idx}`}
                                                                    className="mt-1"
                                                                    disabled={isSaving}
                                                                    value={row.value}
                                                                    onChange={(e) =>
                                                                        setDraftAttributes((prev) =>
                                                                            prev.map((p, i) =>
                                                                                i === idx ? { ...p, value: e.target.value } : p
                                                                            )
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() =>
                                                        setDraftAttributes((prev) => [...prev, { name: "", value: "" }])
                                                    }
                                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    + Add attribute
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-1">
                                    {categoryChain.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            {categoryChain.map((c, idx) => (
                                                <div key={c.id ?? `${c.name}-${idx}`} className="flex items-center gap-2">
                                                    <span className="rounded-md border border-gray-200 bg-white px-2 py-1">
                                                        {c?.name || `#${c?.id}`}
                                                    </span>
                                                    {idx < categoryChain.length - 1 ? (
                                                        <span className="text-gray-400">→</span>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                {product.description ? (
                                    <div className="mt-4">
                                        <div className="text-xs text-gray-500">Description</div>
                                        <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                            {product.description}
                                        </div>
                                    </div>
                                ) : null}

                                {!isEditing ? (
                                    <div className="mt-4">
                                        <div className="text-xs text-gray-500">Attributes</div>
                                        {attributesInfo.kind === "empty" ? (
                                            <div className="mt-1 text-sm text-gray-600">No attributes.</div>
                                        ) : attributesInfo.kind === "string" ? (
                                            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                                {attributesInfo.value}
                                            </div>
                                        ) : Array.isArray(attributesInfo.value) ? (
                                            <pre className="mt-2 overflow-x-auto rounded-md border border-gray-100 bg-white p-3 text-xs text-gray-800">
                                                {JSON.stringify(attributesInfo.value, null, 2)}
                                            </pre>
                                        ) : attributesInfo.value && typeof attributesInfo.value === "object" ? (
                                            Object.keys(attributesInfo.value).length === 0 ? (
                                                <div className="mt-1 text-sm text-gray-600">No attributes.</div>
                                            ) : (
                                                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    {Object.entries(attributesInfo.value).map(([key, value]) => {
                                                        const isPrimitive =
                                                            value == null ||
                                                            typeof value === "string" ||
                                                            typeof value === "number" ||
                                                            typeof value === "boolean";

                                                        return (
                                                            <div
                                                                key={key}
                                                                className="rounded-lg border border-gray-100 bg-white p-4"
                                                            >
                                                                <div className="text-xs text-gray-500">{key}</div>
                                                                {isPrimitive ? (
                                                                    <div className="mt-1 text-sm font-medium text-gray-900">
                                                                        {value == null ? "—" : String(value)}
                                                                    </div>
                                                                ) : (
                                                                    <pre className="mt-2 overflow-x-auto rounded-md border border-gray-100 bg-white p-3 text-xs text-gray-800">
                                                                        {JSON.stringify(value, null, 2)}
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        ) : (
                                            <div className="mt-1 text-sm text-gray-800">
                                                {String(attributesInfo.value)}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                                        <div className="text-xs text-gray-500">Cost Price</div>
                                        <div className="mt-1 text-base font-semibold text-gray-900">
                                            {currency.format(Number(product.costPrice || 0))}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                                        <div className="text-xs text-gray-500">Selling Price</div>
                                        <div className="mt-1 text-base font-semibold text-gray-900">
                                            {currency.format(Number(product.sellingPrice || 0))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4">
                                    <div>
                                        <div className="text-xs text-gray-500">Added on</div>
                                        <div className="mt-1 text-sm text-gray-800">
                                            {formatDateOnly(product.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {ordersError ? (
                                    <div className="mt-3 text-sm text-gray-600">
                                        {ordersError?.data?.error || ordersError?.message || "Failed to load orders."}
                                    </div>
                                ) : null}

                                {inventoryError ? (
                                    <div className="mt-2 text-sm text-gray-600">
                                        {inventoryError?.data?.error || inventoryError?.message || "Failed to load inventory."}
                                    </div>
                                ) : null}

                                {inventoryData?.inventory ? (
                                    <div className="mt-2 text-xs text-gray-600">
                                        <div>
                                            In stock:{" "}
                                            <span className="font-medium text-gray-900">
                                                {isInventoryLoading ? "…" : String(inventoryData.inventory.inStock ?? "—")}
                                            </span>
                                            <span className="text-gray-500">
                                                {" "}(
                                                last updated{" "}
                                                {isInventoryLoading
                                                    ? "…"
                                                    : formatDateTime(
                                                        inventoryData?.inventory?.updated_at ||
                                                        inventoryData?.inventory?.created_at
                                                    )}
                                                )
                                            </span>
                                        </div>
                                        <div className="mt-1">
                                            Reserved:{" "}
                                            <span className="font-medium text-gray-900">
                                                {isOrdersLoading ? "…" : String(reservedStock)}
                                            </span>
                                            {availableStock != null ? (
                                                <>
                                                    {" "}• Available:{" "}
                                                    <span className="font-medium text-gray-900">{String(availableStock)}</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </Card>

                    <Card className="mt-4">
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs text-gray-500">Product</div>
                                    <div className="mt-1 text-base font-semibold text-gray-900">Reviews</div>
                                    <div className="mt-1 text-xs text-gray-600">
                                        {reviewsData?.ratingCount != null ? (
                                            <>
                                                {reviewsData.ratingCount} review{Number(reviewsData.ratingCount) === 1 ? "" : "s"}
                                                {reviewsData?.averageRating != null ? (
                                                    <>
                                                        {" "}• Avg {Number(reviewsData.averageRating).toFixed(1)}
                                                    </>
                                                ) : null}
                                            </>
                                        ) : (
                                            ""
                                        )}
                                    </div>
                                </div>

                                {Array.isArray(reviewsData?.reviews) && reviewsData.reviews.length > 3 ? (
                                    <Button
                                        onClick={() => setReviewsExpanded((v) => !v)}
                                        className="shrink-0"
                                    >
                                        {reviewsExpanded ? "Hide" : "Show all"}
                                    </Button>
                                ) : null}
                            </div>

                            {isReviewsLoading ? (
                                <div className="mt-4 space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={`prod-rev-skel-${i}`} className="rounded-lg border border-gray-100 bg-white p-4">
                                            <Skeleton className="h-4 w-40" />
                                            <div className="mt-3">
                                                <Skeleton className="h-3 w-full" />
                                                <div className="mt-2">
                                                    <Skeleton className="h-3 w-5/6" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : reviewsError ? (
                                <div className="mt-4 text-sm text-gray-600">
                                    {reviewsError?.data?.error || reviewsError?.message || "Failed to load reviews."}
                                </div>
                            ) : (
                                (() => {
                                    const all = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];
                                    const previewMax = 3;
                                    const shown = reviewsExpanded ? all : all.slice(0, previewMax);

                                    if (all.length === 0) {
                                        return <div className="mt-4 text-sm text-gray-600">No reviews yet.</div>;
                                    }

                                    return (
                                        <div className="mt-4 space-y-3">
                                            {shown.map((r, idx) => (
                                                <ReviewListItem
                                                    key={r?.id ?? `${r?.customerId ?? "c"}-${r?.created_at ?? "t"}-${idx}`}
                                                    review={r}
                                                />
                                            ))}
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
}
