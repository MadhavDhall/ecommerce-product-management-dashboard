"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReviewListItem from "@/components/reviews/ReviewListItem";

export default function ReviewsPage() {
  const router = useRouter();

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

  const { data, error, isLoading } = useSWR("/api/reviews", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (error?.status === 401) router.push("/login");
  }, [error, router]);

  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">Reviews</h1>
        {!isLoading && !error ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs text-gray-700 backdrop-blur-sm">
            <span className="font-semibold text-gray-900">{reviews.length}</span>
            <span>review{reviews.length === 1 ? "" : "s"}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900">Loading reviews…</div>
            <div className="mt-1 text-xs text-gray-600">This usually takes a moment.</div>
          </div>
        ) : error ? (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900">Couldn’t load reviews</div>
            <div className="mt-1 text-xs text-gray-600">
              {error?.data?.error || error?.message || "Failed to load reviews."}
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900">No reviews yet</div>
            <div className="mt-1 text-xs text-gray-600">Once customers review products, they’ll show up here.</div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((r, idx) => (
              <ReviewListItem
                key={r?.id ?? `${r?.customerId ?? "c"}-${r?.productId ?? "p"}-${r?.created_at ?? "t"}-${idx}`}
                review={r}
                showProduct
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
