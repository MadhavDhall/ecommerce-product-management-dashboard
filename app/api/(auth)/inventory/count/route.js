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

        // NOTE: PostgREST aggregates are disabled in this project (PGRST123).
        // So we fetch scoped rows and sum in the API.
        const inventoryRes = await supabase
            .from("inventory")
            .select("inStock, product:productId!inner(companyId)")
            .eq("product.companyId", payload.companyId);

        if (inventoryRes.error) {
            console.log(inventoryRes.error);
            return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
        }

        let totalInStock = 0;
        for (const row of inventoryRes.data || []) {
            const n = Number(row?.inStock ?? 0);
            if (!Number.isFinite(n)) continue;
            totalInStock += n;
        }

        return NextResponse.json({ totalInStock }, { status: 200 });
    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
