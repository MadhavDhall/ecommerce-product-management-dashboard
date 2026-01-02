import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req) {
    try {
        // check if user logged in is a genuine user through the token in cookie

        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // once the user is verified, return the products of the company of the user from the database- product table
        // also correspondingly give the corresponding category of the product from category table

        const productsRes = await supabase
            .from("product")
            // Join category via FK (product.categoryId -> category.id)
            .select("*, category:categoryId(id, name)")
            .eq("companyId", payload.companyId);

        if (productsRes.error) {
            return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
        }
        return NextResponse.json({ products: productsRes.data }, { status: 200 });
    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}