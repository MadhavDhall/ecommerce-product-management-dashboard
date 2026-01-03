"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSWRConfig } from "swr";

import Button from "@/components/ui/Button";
import { useUser } from "@/components/context/UserContext";
import ProductForm from "@/components/products/ProductForm";
import Skeleton from "@/components/ui/Skeleton";

export default function NewProductPage() {
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const { user, loading } = useUser();
    const canManageProducts = !!user?.manageProducts;
    const [submitted, setSubmitted] = useState(false);

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

    const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading } = useSWR(
        "/api/categories",
        fetcher
    );

    useEffect(() => {
        if (!loading && !canManageProducts) {
            router.replace("/dashboard/products");
        }
    }, [loading, canManageProducts, router]);

    const categories = useMemo(() => (Array.isArray(categoriesData?.categories) ? categoriesData.categories : []), [
        categoriesData,
    ]);

    if (loading || (!canManageProducts && !submitted)) {
        return (
            <div className="text-sm text-gray-600">
                {loading ? <Skeleton className="h-4 w-24" /> : "Redirecting…"}
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-gray-500">Products</div>
                    <h1 className="mt-1 text-lg font-semibold text-gray-900">New Product</h1>
                    <div className="mt-1 text-xs text-gray-600">Create a new product with pricing, category and images.</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            router.push("/dashboard/products");
                        }}
                    >
                        Back
                    </Button>
                </div>
            </div>

            {categoriesError ? (
                <div className="mt-4 text-sm text-gray-600">
                    {categoriesError?.data?.error || categoriesError?.message || "Failed to load categories."}
                </div>
            ) : null}

            <div className="mt-4">
                <ProductForm
                    categories={categories}
                    submitLabel="Create Product"
                    onSubmit={async (payload) => {
                        const res = await fetch("/api/products/new", {
                            method: "POST",
                            body: payload,
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            const err = new Error(json?.error || "Failed to create product");
                            err.status = res.status;
                            err.data = json;
                            throw err;
                        }

                        // Refresh products list cache before navigating back.
                        await mutate("/api/products");
                        setSubmitted(true);
                        router.push("/dashboard/products");
                    }}
                />
            </div>

            {categoriesLoading ? null : null}
        </>
    );
}

