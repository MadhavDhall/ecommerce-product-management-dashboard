"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReviewListItem from "@/components/reviews/ReviewListItem";
import Skeleton from "@/components/ui/Skeleton";

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

export default function ReviewsPage() {
  const router = useRouter();

  const { data, error, isLoading } = useSWR("/api/reviews", fetcher);

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
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`review-skel-${i}`} className="rounded-lg border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <div className="mt-2">
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <div className="mt-3">
                  <Skeleton className="h-3 w-full" />
                  <div className="mt-2">
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
              </div>
            ))}
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
