import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req) {
    const token = req?.cookies?.get("token")?.value;
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Total products for this company
        const productsCountRes = await supabase
            .from("product")
            .select("id", { count: "exact", head: true })
            .eq("companyId", payload.companyId);

        if (productsCountRes.error) {
            console.log(productsCountRes.error);
            return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
        }

        // Total orders for this company (scoped via inner join to product)
        const ordersCountRes = await supabase
            .from("order")
            .select("id, product:productId!inner(companyId)", { count: "exact", head: true })
            .eq("product.companyId", payload.companyId);

        if (ordersCountRes.error) {
            console.log(ordersCountRes.error);
            return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
        }

        return NextResponse.json(
            {
                totals: {
                    products: productsCountRes.count ?? 0,
                    orders: ordersCountRes.count ?? 0,
                },
            },
            { status: 200 }
        );
    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
