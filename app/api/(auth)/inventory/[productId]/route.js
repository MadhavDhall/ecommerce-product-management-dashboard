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

        // Get the inventory row for this product, scoped to the user's company.
        // inventory -> product (FK: inventory.productId -> product.id)
        const inventoryRes = await supabase
            .from("inventory")
            // Use an inner join so the row only returns when the product belongs to this company.
            .select("inStock, created_at, updated_at, product:productId!inner(companyId)")
            .eq("productId", parsedId)
            .eq("product.companyId", payload.companyId)
            .maybeSingle();

        if (inventoryRes.error) {
            console.log(inventoryRes.error);
            return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
        }

        const row = inventoryRes.data;
        const { inStock, created_at, updated_at } = row || {};
        return NextResponse.json(
            {
                inventory: row
                    ? {
                        inStock,
                        created_at,
                        updated_at,
                    }
                    : null,
            },
            { status: 200 }
        );

    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}