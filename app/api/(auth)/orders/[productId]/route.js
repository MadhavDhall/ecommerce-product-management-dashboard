import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req, { params }) {
    try {
        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // get the product id from the params and convert to integer
        // (In current Next.js, `params` is a Promise)
        const resolvedParams = await params;
        const id = resolvedParams?.productId;
        const parsedId = Number.parseInt(String(id), 10);
        if (!Number.isFinite(parsedId)) {
            return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
        }

        // Fetch orders for this product.
        // Scope by company in the same query via an inner join: order.productId -> product.id
        const ordersRes = await supabase
            .from("order")
            .select(
                "created_at, customerId, productId, deliveryLocation, delivered, inInventory, customer:customerId(region), product:productId!inner(companyId)"
            )
            .eq("productId", parsedId)
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
                    deliveryLocation: o.deliveryLocation,
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