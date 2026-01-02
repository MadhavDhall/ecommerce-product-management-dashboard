import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function PATCH(req, { params }) {
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

    const resolvedParams = await params;
    const targetIdRaw = resolvedParams?.id;
    const targetUserId = Number.parseInt(String(targetIdRaw), 10);
    if (!Number.isFinite(targetUserId)) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (targetUserId === requesterId) {
        return NextResponse.json({ error: "You cannot change your own permissions" }, { status: 400 });
    }

    // DB check: requester must currently have manageUsers=true (do not trust token claim)
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

    const body = await req.json().catch(() => ({}));
    const { manageUsers, manageProducts, manageInventory } = body || {};

    const update = {};
    if (typeof manageUsers === "boolean") update.manageUsers = manageUsers;
    if (typeof manageProducts === "boolean") update.manageProducts = manageProducts;
    if (typeof manageInventory === "boolean") update.manageInventory = manageInventory;

    if (Object.keys(update).length === 0) {
        return NextResponse.json(
            { error: "Provide at least one permission field to update" },
            { status: 400 }
        );
    }

    if (Number.isFinite(ownerId) && targetUserId === ownerId) {
        // Owner must always retain all permissions.
        if (manageUsers === false || manageProducts === false || manageInventory === false) {
            return NextResponse.json(
                { error: "Owner must always keep all permissions" },
                { status: 400 }
            );
        }

        // Even if partial body provided, force all owner permissions to true.
        update.manageUsers = true;
        update.manageProducts = true;
        update.manageInventory = true;
    }

    const updateRes = await supabase
        .from("user")
        .update(update)
        .eq("id", targetUserId)
        .eq("companyId", companyId)
        .select("id, name, email, manageProducts, manageUsers, manageInventory, companyId")
        .maybeSingle();

    if (updateRes.error) {
        console.log(updateRes.error);
        return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    if (!updateRes.data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updateRes.data }, { status: 200 });
}
