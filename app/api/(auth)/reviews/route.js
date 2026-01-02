import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req) {
    try {
        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch ALL reviews for products that belong to this company.
        // Scope in the same query via an inner join: review.productId -> product.id
        const reviewsRes = await supabase
            .from("review")
            .select(
                "created_at, customerId, productId, rating, feedback, customer:customerId(name, region), product:productId!inner(companyId, name, imageUrls)"
            )
            .eq("product.companyId", payload.companyId)
            .order("created_at", { ascending: false })
            .order("productId", { ascending: false })
            .order("customerId", { ascending: false });

        if (reviewsRes.error) {
            console.log(reviewsRes.error);
            return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
        }

        const rows = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
        return NextResponse.json(
            {
                reviews: rows.map((r) => ({
                    created_at: r.created_at,
                    customerId: r.customerId,
                    productId: r.productId,
                    rating: r.rating,
                    feedback: r.feedback,
                    customer: r.customer ?? null,
                    product: r.product
                        ? {
                            name: r.product.name,
                            imageUrls: r.product.imageUrls ?? null,
                        }
                        : null,
                })),
            },
            { status: 200 }
        );
    } catch (e) {
        console.log(e);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
