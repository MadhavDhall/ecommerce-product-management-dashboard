"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import Card from "@/components/ui/Card";
import OrdersAnalyticsCharts from "@/components/analytics/OrdersAnalyticsCharts";

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

const normalizeItems = (data) => {
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.orders)) return data.orders;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data)) return data;
    return [];
};

export default function DashboardPage() {
    const router = useRouter();

    const { data: productsCountData, error: productsCountError, isLoading: isProductsCountLoading } = useSWR(
        "/api/products/count",
        fetcher,
        { revalidateOnFocus: false }
    );
    const { data: inventoryCountData, error: inventoryCountError, isLoading: isInventoryCountLoading } = useSWR(
        "/api/inventory/count",
        fetcher,
        { revalidateOnFocus: false }
    );
    const { data: ordersCountData, error: ordersCountError, isLoading: isOrdersCountLoading } = useSWR(
        "/api/orders/count",
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: productsData, isLoading: productsLoading, error: productsError } = useSWR("/api/products", fetcher);
    const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useSWR("/api/orders", fetcher);
    const { data: inventoryData, isLoading: inventoryLoading, error: inventoryError } = useSWR("/api/inventory", fetcher);

    useEffect(() => {
        const unauthorized =
            productsCountError?.status === 401 ||
            inventoryCountError?.status === 401 ||
            ordersCountError?.status === 401 ||
            productsError?.status === 401 ||
            ordersError?.status === 401 ||
            inventoryError?.status === 401;

        if (unauthorized) router.push("/login");
    }, [
        productsCountError,
        inventoryCountError,
        ordersCountError,
        productsError,
        ordersError,
        inventoryError,
        router,
    ]);

    const number = useMemo(() => new Intl.NumberFormat(undefined), []);
    const formatCount = (value, isLoading, error) => {
        if (isLoading) return "…";
        if (error) return "—";
        const n = Number(value ?? 0);
        if (!Number.isFinite(n)) return "—";
        return number.format(n);
    };

    const productsCount = productsCountData?.productsCount;
    const totalInStock = inventoryCountData?.totalInStock;
    const ordersCount = ordersCountData?.ordersCount;

    const products = normalizeItems(productsData);
    const orders = normalizeItems(ordersData);
    const inventoryItems = normalizeItems(inventoryData);

    const productById = useMemo(() => {
        return new Map(products.map((p) => [String(p.id), p]));
    }, [products]);

    const getUnitEconomics = useMemo(() => {
        return (order) => {
            const p = productById.get(String(order?.productId ?? ""));
            const selling = Number(p?.sellingPrice ?? 0);
            const cost = Number(p?.costPrice ?? 0);
            return {
                selling: Number.isFinite(selling) ? selling : 0,
                cost: Number.isFinite(cost) ? cost : 0,
            };
        };
    }, [productById]);

    const analyticsIsLoading = productsLoading || ordersLoading || inventoryLoading;
    const analyticsError = productsError || ordersError || inventoryError;

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                    {
                        label: "Total Products",
                        value: formatCount(productsCount, isProductsCountLoading, productsCountError),
                    },
                    {
                        label: "Total Inventory (In Stock)",
                        value: formatCount(totalInStock, isInventoryCountLoading, inventoryCountError),
                    },
                    {
                        label: "Total Orders",
                        value: formatCount(ordersCount, isOrdersCountLoading, ordersCountError),
                    },
                ].map((kpi) => (
                    <Card key={kpi.label} className="p-5">
                        <div className="text-xs font-medium text-gray-500">{kpi.label}</div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{kpi.value}</div>
                    </Card>
                ))}
            </div>

            <div className="mt-6">
                <div className="mb-3">
                    <div className="text-sm font-semibold text-gray-900">Company Analytics</div>
                    <div className="text-xs text-gray-600">Orders & revenue across all products.</div>
                </div>

                <OrdersAnalyticsCharts
                    orders={orders}
                    inventoryItems={inventoryItems}
                    getUnitEconomics={getUnitEconomics}
                    isLoading={analyticsIsLoading}
                    error={analyticsError}
                />
            </div>
        </>
    );
}
