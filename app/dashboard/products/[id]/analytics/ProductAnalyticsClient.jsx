"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
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

export default function ProductAnalyticsClient({ productId }) {
    const router = useRouter();

    const safeProductId = useMemo(() => (productId == null ? "" : String(productId)), [productId]);

    const {
        data: productData,
        error: productError,
        isLoading: isProductLoading,
    } = useSWR(
        safeProductId ? `/api/products/${encodeURIComponent(safeProductId)}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const {
        data: ordersData,
        error: ordersError,
        isLoading: isOrdersLoading,
    } = useSWR(
        safeProductId ? `/api/orders/${encodeURIComponent(safeProductId)}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const {
        data: inventoryData,
        error: inventoryError,
        isLoading: isInventoryLoading,
    } = useSWR(
        safeProductId ? `/api/inventory/${encodeURIComponent(safeProductId)}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    useEffect(() => {
        if (productError?.status === 401 || ordersError?.status === 401 || inventoryError?.status === 401) {
            router.push("/login");
        }
    }, [inventoryError, ordersError, productError, router]);

    const product = productData?.product || null;
    const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : [];

    const sellingPrice = Number(product?.sellingPrice ?? 0);
    const costPrice = Number(product?.costPrice ?? 0);
    const safeSelling = Number.isFinite(sellingPrice) ? sellingPrice : 0;
    const safeCost = Number.isFinite(costPrice) ? costPrice : 0;

    const getUnitEconomics = useMemo(() => {
        return () => ({ selling: safeSelling, cost: safeCost });
    }, [safeCost, safeSelling]);

    const deliveredOrdersCount = useMemo(() => {
        let count = 0;
        for (const o of orders) {
            if (o?.delivered === true) count++;
        }
        return count;
    }, [orders]);

    const totalOrdersCount = useMemo(() => orders.length, [orders]);
    const pendingOrdersCount = useMemo(
        () => Math.max(0, totalOrdersCount - deliveredOrdersCount),
        [deliveredOrdersCount, totalOrdersCount]
    );

    const salesTotals = useMemo(() => {
        const deliveredRevenue = deliveredOrdersCount * safeSelling;
        const deliveredProfit = deliveredOrdersCount * (safeSelling - safeCost);

        // Treat all existing orders as confirmed; undelivered ones are "pending".
        const expectedRevenue = totalOrdersCount * safeSelling;
        const expectedProfit = totalOrdersCount * (safeSelling - safeCost);

        return { deliveredRevenue, deliveredProfit, expectedRevenue, expectedProfit };
    }, [deliveredOrdersCount, safeCost, safeSelling]);

    const isLoading = isProductLoading || isOrdersLoading || isInventoryLoading;
    const error = productError || ordersError || inventoryError;

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500">Products</div>
                    <h1 className="mt-1 text-lg font-semibold text-gray-900">
                        {isLoading
                            ? "Loading…"
                            : (product?.name ? `${product.name} · Analytics` : "Product · Analytics")}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {safeProductId ? (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/products/${encodeURIComponent(safeProductId)}`)}
                        >
                            Product details
                        </Button>
                    ) : null}
                    <Button onClick={() => router.push("/dashboard/products")}>Back</Button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-6">
                        <div className="text-xs text-gray-500">Delivered Orders</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">
                            {isOrdersLoading ? "…" : String(deliveredOrdersCount)}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                            Pending: {isOrdersLoading ? "…" : String(pendingOrdersCount)}
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-6">
                        <div className="text-xs text-gray-500">Total Revenue</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">
                            {isLoading
                                ? "…"
                                : new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
                                    Number(salesTotals.deliveredRevenue || 0)
                                )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                            Expected (incl pending):{" "}
                            {isLoading
                                ? "…"
                                : new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
                                    Number(salesTotals.expectedRevenue || 0)
                                )}
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-6">
                        <div className="text-xs text-gray-500">Total Profit</div>
                        <div className="mt-1 text-base font-semibold text-gray-900">
                            {isLoading
                                ? "…"
                                : new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
                                    Number(salesTotals.deliveredProfit || 0)
                                )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                            Expected (incl pending):{" "}
                            {isLoading
                                ? "…"
                                : new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(
                                    Number(salesTotals.expectedProfit || 0)
                                )}
                        </div>
                    </div>
                </Card>
            </div>

            <OrdersAnalyticsCharts
                orders={orders}
                getUnitEconomics={getUnitEconomics}
                isLoading={isLoading}
                error={error}
            />
        </>
    );
}
