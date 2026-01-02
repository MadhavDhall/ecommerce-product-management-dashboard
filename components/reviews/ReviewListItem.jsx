"use client";

import RatingStars from "@/components/reviews/RatingStars";

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

export default function ReviewListItem({ review, showProduct = false }) {
    const r = review || {};

    return (
        <div className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {r?.customer?.name || "Customer"}
                        {r?.customer?.region ? (
                            <span className="text-xs font-normal text-gray-500">{` • ${r.customer.region}`}</span>
                        ) : null}
                    </div>

                    {showProduct ? (
                        <div className="mt-0.5 text-xs text-gray-600">
                            {r?.product?.name ? (
                                <>
                                    on <span className="font-medium text-gray-900">{r.product.name}</span>
                                </>
                            ) : (
                                ""
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <RatingStars value={r?.rating} />
                    </div>
                </div>
            </div>

            {r?.feedback ? (
                <div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{r.feedback}</div>
            ) : null}

            <div className="mt-2 text-xs text-gray-500">{formatDateTime(r?.created_at)}</div>
        </div>
    );
}
