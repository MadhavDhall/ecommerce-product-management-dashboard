import supabase from "@/db/connection";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // send the categories from category table
        const categoriesRes = await supabase.from("category").select("*");
        return NextResponse.json({ categories: categoriesRes.data }, { status: 200 });
    } catch (e) {
        console.log(e);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}