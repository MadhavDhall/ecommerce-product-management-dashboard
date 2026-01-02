import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function GET(req) {
    const token = req?.cookies?.get("token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterId = Number.parseInt(String(payload?.id), 10);
    const companyId = Number.parseInt(String(payload?.companyId), 10);
    if (!Number.isFinite(requesterId) || !Number.isFinite(companyId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DB check (not token claim): requester must have manageUsers=true
    const meRes = await supabase
        .from("user")
        .select("id, manageUsers")
        .eq("id", requesterId)
        .eq("companyId", companyId)
        .maybeSingle();

    if (meRes.error) {
        console.log(meRes.error);
        return NextResponse.json({ error: "Failed to authorize" }, { status: 500 });
    }

    if (!meRes.data || meRes.data.manageUsers !== true) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyRes = await supabase
        .from("company")
        .select("owner")
        .eq("id", companyId)
        .maybeSingle();

    if (companyRes.error) {
        console.log(companyRes.error);
        return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
    }

    const ownerId = Number.parseInt(String(companyRes.data?.owner), 10);
    if (Number.isFinite(ownerId)) {
        const fixOwnerRes = await supabase
            .from("user")
            .update({ manageUsers: true, manageProducts: true, manageInventory: true })
            .eq("id", ownerId)
            .eq("companyId", companyId);

        if (fixOwnerRes.error) {
            console.log(fixOwnerRes.error);
            return NextResponse.json({ error: "Failed to enforce owner permissions" }, { status: 500 });
        }
    }

    const usersRes = await supabase
        .from("user")
        .select("id, name, email, manageProducts, manageUsers, manageInventory, companyId")
        .eq("companyId", companyId)
        .order("id", { ascending: true });

    if (usersRes.error) {
        console.log(usersRes.error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    return NextResponse.json(
        {
            users: users.map((u) => ({
                ...u,
                isOwner: Number.isFinite(ownerId) ? u.id === ownerId : false,
            })),
        },
        { status: 200 }
    );
}
