import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req) {
    try {
        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch ALL orders for products that belong to this company.
        // Scope in the same query via an inner join: order.productId -> product.id
        const ordersRes = await supabase
            .from("order")
            .select(
                "created_at, customerId, productId, delivered, inInventory, customer:customerId(region), product:productId!inner(companyId)"
            )
            .eq("product.companyId", payload.companyId)
            .order("created_at", { ascending: false });

        if (ordersRes.error) {
            console.log(ordersRes.error);
            return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
        }

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        return NextResponse.json(
            {
                orders: orders.map((o) => ({
                    created_at: o.created_at,
                    customerId: o.customerId,
                    productId: o.productId,
                    delivered: o.delivered,
                    inInventory: o.inInventory,
                    customer: o.customer ?? null,
                })),
            },
            { status: 200 }
        );
    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

