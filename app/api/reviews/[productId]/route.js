import { NextResponse } from "next/server";
import supabase from "@/db/connection";

export async function GET(req, { params }) {
    try {
        // In this Next.js version, `params` is a Promise.
        const resolvedParams = await params;
        const productId = resolvedParams?.productId;
        const parsedProductId = Number.parseInt(String(productId), 10);
        if (!Number.isFinite(parsedProductId)) {
            return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
        }

        // Compute avg + count in SQL (rating is an enum/string, needs casting).
        // This requires the DB function `review_summary_by_product(product_id bigint)`.
        const summaryRes = await supabase.rpc("review_summary_by_product", {
            product_id: parsedProductId,
        });

        if (summaryRes.error) {
            console.log(summaryRes.error);
            return NextResponse.json(
                {
                    error: "Failed to compute average rating",
                    hint: "Create RPC review_summary_by_product(product_id bigint) using AVG((rating::text)::numeric).",
                },
                { status: 500 }
            );
        }

        const reviewsRes = await supabase
            .from("review")
            // FK join: reviews.customerId -> customer.id
            .select("created_at, customerId, productId, rating, feedback, customer:customerId(name, region)")
            .eq("productId", parsedProductId)
            .order("created_at", { ascending: false });

        if (reviewsRes.error) {
            console.log(reviewsRes.error);
            return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
        }

        const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
        return NextResponse.json(
            {
                reviews: reviewsRes.data,
                ratingCount: summary?.rating_count ?? 0,
                averageRating: summary?.average_rating ?? null,
            },
            { status: 200 }
        );
    } catch (e) {
        console.log(e);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}