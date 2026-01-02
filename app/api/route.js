import db from "@/db/connection";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    try {
        const { data, error } = await db
            .from("Users")
            .select("*");

        if (error) {
            console.error("Supabase query error", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: data || [] }, { status: 200 });
    } catch (err) {
        console.error("Error executing query", err);
        return NextResponse.json({ error: "Database query error" }, { status: 500 });
    }
}