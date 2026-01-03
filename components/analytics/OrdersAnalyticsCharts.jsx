"use client";

import { useEffect, useMemo, useRef } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

import {
    Chart,
    PieController,
    BarController,
    LineController,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";

Chart.register(
    PieController,
    BarController,
    LineController,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
);

const getBrandColors = () => {
    if (typeof window === "undefined") return { start: "#4f46e5", end: "#7c3aed" };
    const styles = getComputedStyle(document.documentElement);
    const start = (styles.getPropertyValue("--brand-start") || "#4f46e5").trim();
    const end = (styles.getPropertyValue("--brand-end") || "#7c3aed").trim();
    return { start, end };
};

const hexToRgb = (hex) => {
    const h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) {
        const r = Number.parseInt(h[0] + h[0], 16);
        const g = Number.parseInt(h[1] + h[1], 16);
        const b = Number.parseInt(h[2] + h[2], 16);
        return { r, g, b };
    }
    if (h.length === 6) {
        const r = Number.parseInt(h.slice(0, 2), 16);
        const g = Number.parseInt(h.slice(2, 4), 16);
        const b = Number.parseInt(h.slice(4, 6), 16);
        return { r, g, b };
    }
    return { r: 79, g: 70, b: 229 };
};

const rgbToHsl = ({ r, g, b }) => {
    // r,g,b in [0,255]
    const rn = (Number(r) || 0) / 255;
    const gn = (Number(g) || 0) / 255;
    const bn = (Number(b) || 0) / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rn:
                h = ((gn - bn) / delta) % 6;
                break;
            case gn:
                h = (bn - rn) / delta + 2;
                break;
            default:
                h = (rn - gn) / delta + 4;
                break;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    return {
        h,
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
};

const hslCss = (h, s, l, a = 1) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;

const makePalette = (count, { baseHue = 250, s = 72, l = 52, alpha = 0.85 } = {}) => {
    // Golden-angle hue stepping gives visually distinct colors.
    const goldenAngle = 137.508;
    const n = Math.max(1, Number(count) || 1);
    const colors = [];

    for (let i = 0; i < n; i++) {
        const hue = (baseHue + i * goldenAngle) % 360;
        colors.push(hslCss(hue, s, l, alpha));
    }

    return colors;
};

const formatDayKey = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
};

const safeMoney = (value) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};

export default function OrdersAnalyticsCharts({ orders, getUnitEconomics, isLoading, error, inventoryItems }) {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeInventoryItems = Array.isArray(inventoryItems) ? inventoryItems : [];

    const regionAgg = useMemo(() => {
        const byRegion = new Map();

        for (const o of safeOrders) {
            const region = o?.customer?.region ? String(o.customer.region) : "Unknown";
            const prev = byRegion.get(region) || { totalOrders: 0, deliveredRevenue: 0, expectedRevenue: 0 };

            const econ = getUnitEconomics?.(o) || {};
            const safeSelling = safeMoney(econ.selling);

            prev.totalOrders += 1;
            prev.expectedRevenue += safeSelling;
            if (o?.delivered === true) {
                prev.deliveredRevenue += safeSelling;
            }

            byRegion.set(region, prev);
        }

        const labels = Array.from(byRegion.keys()).sort((a, b) => a.localeCompare(b));
        const totals = labels.map((l) => byRegion.get(l));

        return {
            labels,
            totalOrders: totals.map((v) => v.totalOrders),
            deliveredRevenue: totals.map((v) => v.deliveredRevenue),
            expectedRevenue: totals.map((v) => v.expectedRevenue),
        };
    }, [getUnitEconomics, safeOrders]);

    const timeAgg = useMemo(() => {
        const byDay = new Map();

        for (const o of safeOrders) {
            const day = formatDayKey(o?.created_at);
            if (!day) continue;

            const prev = byDay.get(day) || { orders: 0, deliveredRevenue: 0, expectedRevenue: 0 };

            const econ = getUnitEconomics?.(o) || {};
            const safeSelling = safeMoney(econ.selling);

            prev.orders += 1;
            prev.expectedRevenue += safeSelling;
            if (o?.delivered === true) {
                prev.deliveredRevenue += safeSelling;
            }

            byDay.set(day, prev);
        }

        const labels = Array.from(byDay.keys()).sort();
        const series = labels.map((k) => byDay.get(k));

        return {
            labels,
            orders: series.map((v) => v.orders),
            deliveredRevenue: series.map((v) => v.deliveredRevenue),
            expectedRevenue: series.map((v) => v.expectedRevenue),
        };
    }, [getUnitEconomics, safeOrders]);

    const timeAggCumulative = useMemo(() => {
        let ordersRunning = 0;
        let deliveredRevenueRunning = 0;
        let expectedRevenueRunning = 0;

        const cumulativeOrders = [];
        const cumulativeDeliveredRevenue = [];
        const cumulativeExpectedRevenue = [];

        for (let i = 0; i < timeAgg.labels.length; i++) {
            ordersRunning += Number(timeAgg.orders[i] || 0);
            deliveredRevenueRunning += Number(timeAgg.deliveredRevenue[i] || 0);
            expectedRevenueRunning += Number(timeAgg.expectedRevenue[i] || 0);

            cumulativeOrders.push(ordersRunning);
            cumulativeDeliveredRevenue.push(deliveredRevenueRunning);
            cumulativeExpectedRevenue.push(expectedRevenueRunning);
        }

        return {
            labels: timeAgg.labels,
            orders: cumulativeOrders,
            deliveredRevenue: cumulativeDeliveredRevenue,
            expectedRevenue: cumulativeExpectedRevenue,
        };
    }, [timeAgg]);

    const inventoryAgg = useMemo(() => {
        let inStockTotal = 0;
        let reservedTotal = 0;

        for (const item of safeInventoryItems) {
            const inStock = Number(item?.inventory?.inStock ?? 0);
            const reserved = Number(item?.reservedCount ?? 0);
            if (Number.isFinite(inStock)) inStockTotal += Math.max(0, inStock);
            if (Number.isFinite(reserved)) reservedTotal += Math.max(0, reserved);
        }

        return {
            inStockTotal,
            reservedTotal,
            hasData: safeInventoryItems.length > 0,
        };
    }, [safeInventoryItems]);

    const pieCanvasRef = useRef(null);
    const barCanvasRef = useRef(null);
    const timeCanvasRef = useRef(null);
    const cumulativeCanvasRef = useRef(null);
    const inventoryCanvasRef = useRef(null);

    const pieChartRef = useRef(null);
    const barChartRef = useRef(null);
    const timeChartRef = useRef(null);
    const cumulativeChartRef = useRef(null);
    const inventoryChartRef = useRef(null);

    const destroyCharts = () => {
        for (const ref of [pieChartRef, barChartRef, timeChartRef, cumulativeChartRef, inventoryChartRef]) {
            if (ref.current) {
                ref.current.destroy();
                ref.current = null;
            }
        }
    };

    useEffect(() => {
        destroyCharts();

        const { start, end } = getBrandColors();
        const brandHsl = rgbToHsl(hexToRgb(start));
        const baseHue = Number.isFinite(brandHsl.h) ? brandHsl.h : 250;

        const series = makePalette(6, { baseHue, s: 72, l: 50, alpha: 1 });
        const seriesFill = (idx, alpha) => {
            const h = (baseHue + idx * 137.508) % 360;
            return hslCss(h, 72, 50, alpha);
        };

        // Inventory chart can render even when there are 0 orders.
        if (inventoryCanvasRef.current && inventoryAgg.hasData) {
            const invCtx = inventoryCanvasRef.current.getContext("2d");
            inventoryChartRef.current = new Chart(invCtx, {
                type: "bar",
                data: {
                    labels: ["In Stock", "Reserved"],
                    datasets: [
                        {
                            label: "Count",
                            data: [inventoryAgg.inStockTotal, inventoryAgg.reservedTotal],
                            backgroundColor: [seriesFill(4, 0.35), seriesFill(5, 0.35)],
                            borderColor: [seriesFill(4, 0.65), seriesFill(5, 0.65)],
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 },
                        },
                    },
                },
            });
        }

        // Orders charts require order data and their canvases.
        if (!safeOrders.length) return;
        if (!pieCanvasRef.current || !barCanvasRef.current || !timeCanvasRef.current || !cumulativeCanvasRef.current) {
            return;
        }

        const pieCtx = pieCanvasRef.current.getContext("2d");
        const pieColors = makePalette(regionAgg.labels.length, { baseHue, s: 74, l: 52, alpha: 0.85 });

        pieChartRef.current = new Chart(pieCtx, {
            type: "pie",
            data: {
                labels: regionAgg.labels,
                datasets: [
                    {
                        label: "Orders",
                        data: regionAgg.totalOrders,
                        backgroundColor: pieColors,
                        borderColor: "rgba(255 255 255 / 0.9)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${Number(ctx.raw || 0)}`,
                        },
                    },
                },
            },
        });

        const barCtx = barCanvasRef.current.getContext("2d");
        barChartRef.current = new Chart(barCtx, {
            type: "bar",
            data: {
                labels: regionAgg.labels,
                datasets: [
                    {
                        label: "Orders",
                        data: regionAgg.totalOrders,
                        backgroundColor: seriesFill(0, 0.25),
                        borderColor: seriesFill(0, 0.55),
                        borderWidth: 1,
                        yAxisID: "y",
                    },
                    {
                        label: "Revenue (Delivered)",
                        data: regionAgg.deliveredRevenue,
                        backgroundColor: seriesFill(1, 0.35),
                        borderColor: seriesFill(1, 0.65),
                        borderWidth: 1,
                        yAxisID: "y1",
                    },
                    {
                        label: "Revenue (Expected)",
                        data: regionAgg.expectedRevenue,
                        backgroundColor: seriesFill(2, 0.28),
                        borderColor: seriesFill(2, 0.6),
                        borderWidth: 1,
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: {
                    y: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        ticks: { precision: 0 },
                    },
                    y1: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });

        const timeCtx = timeCanvasRef.current.getContext("2d");
        timeChartRef.current = new Chart(timeCtx, {
            type: "line",
            data: {
                labels: timeAgg.labels,
                datasets: [
                    {
                        label: "Orders",
                        data: timeAgg.orders,
                        borderColor: seriesFill(0, 0.75),
                        backgroundColor: seriesFill(0, 0.1),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y",
                    },
                    {
                        label: "Revenue (Delivered)",
                        data: timeAgg.deliveredRevenue,
                        borderColor: series[1],
                        backgroundColor: seriesFill(1, 0.06),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y1",
                    },
                    {
                        label: "Revenue (Expected)",
                        data: timeAgg.expectedRevenue,
                        borderColor: series[2],
                        backgroundColor: seriesFill(2, 0.06),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10,
                        },
                    },
                    y: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        ticks: { precision: 0 },
                    },
                    y1: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });

        const cumulativeCtx = cumulativeCanvasRef.current.getContext("2d");
        cumulativeChartRef.current = new Chart(cumulativeCtx, {
            type: "line",
            data: {
                labels: timeAggCumulative.labels,
                datasets: [
                    {
                        label: "Orders (Till date)",
                        data: timeAggCumulative.orders,
                        borderColor: seriesFill(0, 0.8),
                        backgroundColor: seriesFill(0, 0.1),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y",
                    },
                    {
                        label: "Revenue Delivered (Till date)",
                        data: timeAggCumulative.deliveredRevenue,
                        borderColor: series[1],
                        backgroundColor: seriesFill(1, 0.06),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y1",
                    },
                    {
                        label: "Revenue Expected (Till date)",
                        data: timeAggCumulative.expectedRevenue,
                        borderColor: series[2],
                        backgroundColor: seriesFill(2, 0.06),
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 6,
                        },
                    },
                    y: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        ticks: { precision: 0 },
                    },
                    y1: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });

        return () => destroyCharts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inventoryAgg, regionAgg, timeAgg, timeAggCumulative, safeOrders]);

    useEffect(() => () => destroyCharts(), []);

    return (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {inventoryItems ? (
                <Card>
                    <div className="p-6">
                        <div className="text-sm font-semibold text-gray-900">Inventory: In stock vs reserved</div>
                        <div className="mt-1 text-xs text-gray-600">Company-wide totals from inventory & pending orders.</div>

                        {error ? (
                            <div className="mt-4 text-sm text-gray-600">
                                {error?.data?.error || error?.message || "Failed to load analytics data."}
                            </div>
                        ) : isLoading ? (
                            <div className="mt-4">
                                <Skeleton className="h-72 w-full" />
                            </div>
                        ) : !inventoryAgg.hasData ? (
                            <div className="mt-4 text-sm text-gray-600">No inventory data found.</div>
                        ) : (
                            <div className="mt-4 h-72">
                                <canvas ref={inventoryCanvasRef} />
                            </div>
                        )}
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="p-6">
                    <div className="text-sm font-semibold text-gray-900">Region-wise share of orders</div>
                    <div className="mt-1 text-xs text-gray-600">Pie chart based on total orders.</div>

                    {error ? (
                        <div className="mt-4 text-sm text-gray-600">
                            {error?.data?.error || error?.message || "Failed to load analytics data."}
                        </div>
                    ) : isLoading ? (
                        <div className="mt-4">
                            <Skeleton className="h-72 w-full" />
                        </div>
                    ) : safeOrders.length === 0 ? (
                        <div className="mt-4 text-sm text-gray-600">No orders found.</div>
                    ) : (
                        <div className="mt-4 h-72">
                            <canvas ref={pieCanvasRef} />
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <div className="p-6">
                    <div className="text-sm font-semibold text-gray-900">Region-wise orders & revenue</div>
                    <div className="mt-1 text-xs text-gray-600">
                        Orders (left axis) and revenue (right axis) — delivered vs expected.
                    </div>

                    {error ? (
                        <div className="mt-4 text-sm text-gray-600">
                            {error?.data?.error || error?.message || "Failed to load analytics data."}
                        </div>
                    ) : isLoading ? (
                        <div className="mt-4">
                            <Skeleton className="h-72 w-full" />
                        </div>
                    ) : safeOrders.length === 0 ? (
                        <div className="mt-4 text-sm text-gray-600">No orders found.</div>
                    ) : (
                        <div className="mt-4 h-72">
                            <canvas ref={barCanvasRef} />
                        </div>
                    )}
                </div>
            </Card>

            <Card className="lg:col-span-2">
                <div className="p-6">
                    <div className="text-sm font-semibold text-gray-900">Time-wise orders & revenue (line chart)</div>
                    <div className="mt-1 text-xs text-gray-600">
                        Daily buckets using order created time; revenue shows delivered and expected (incl pending).
                    </div>

                    {error ? (
                        <div className="mt-4 text-sm text-gray-600">
                            {error?.data?.error || error?.message || "Failed to load analytics data."}
                        </div>
                    ) : isLoading ? (
                        <div className="mt-4">
                            <Skeleton className="h-80 w-full" />
                        </div>
                    ) : safeOrders.length === 0 ? (
                        <div className="mt-4 text-sm text-gray-600">No orders found.</div>
                    ) : (
                        <div className="mt-4 h-80">
                            <canvas ref={timeCanvasRef} />
                        </div>
                    )}
                </div>
            </Card>

            <Card className="lg:col-span-2">
                <div className="p-6">
                    <div className="text-sm font-semibold text-gray-900">Till date orders & revenue (cumulative line chart)</div>
                    <div className="mt-1 text-xs text-gray-600">
                        Cumulative totals across days (running sum) for the same series.
                    </div>

                    {error ? (
                        <div className="mt-4 text-sm text-gray-600">
                            {error?.data?.error || error?.message || "Failed to load analytics data."}
                        </div>
                    ) : isLoading ? (
                        <div className="mt-4">
                            <Skeleton className="h-80 w-full" />
                        </div>
                    ) : safeOrders.length === 0 ? (
                        <div className="mt-4 text-sm text-gray-600">No orders found.</div>
                    ) : (
                        <div className="mt-4 h-80">
                            <canvas ref={cumulativeCanvasRef} />
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
