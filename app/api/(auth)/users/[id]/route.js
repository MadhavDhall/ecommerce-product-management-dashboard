import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function PATCH(req, { params }) {
    try {
        const token = req?.cookies?.get("token")?.value;

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // get the user id from the params and convert to integer
        // (In current Next.js, `params` is a Promise)
        const resolvedParams = await params;
        const id = resolvedParams?.id;
        const parsedId = Number.parseInt(String(id), 10);
        if (!Number.isFinite(parsedId)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const loggedInUserId = Number.parseInt(String(payload?.id), 10);
        if (loggedInUserId !== parsedId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Update the user row for this user, scoped to the user's company.
        const updateRes = await supabase
            .from("user")
            .update({
                name: name.trim(),
            })
            .eq("id", parsedId);

        if (updateRes.error) {
            return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
        }

        const tokenPayload = {
            id: payload?.id,
            name: name.trim(),
            email: payload?.email,
            manageProducts: payload?.manageProducts,
            manageUsers: payload?.manageUsers,
            manageInventory: payload?.manageInventory,
            companyId: payload?.companyId,
            companyName: payload?.companyName,
        };

        const nowSec = Math.floor(Date.now() / 1000);
        const expSec = Number(payload?.exp);
        const remainingSec = Number.isFinite(expSec) ? Math.max(expSec - nowSec, 1) : null;
        const maxAge = remainingSec ?? 30 * 24 * 60 * 60;

        const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: remainingSec ?? "30d",
        });

        const res = NextResponse.json({ message: "User updated successfully" }, { status: 200 });
        res.cookies.set("token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge,
            path: "/",
        });
        return res;
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
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

    // (In current Next.js, `params` is a Promise)
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const targetUserId = Number.parseInt(String(id), 10);
    if (!Number.isFinite(targetUserId)) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (targetUserId === requesterId) {
        return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    // DB check (not token claim): requester must have manageUsers=true
    const meRes = await supabase
        .from("user")
        .select("id, manageUsers")
        .eq("id", requesterId)
        .eq("companyId", companyId)
        .maybeSingle();

    if (meRes.error) {
        console.error("[users/delete] requester lookup error:", meRes.error);
        return NextResponse.json({ error: "Failed to authorize" }, { status: 500 });
    }

    if (!meRes.data || meRes.data.manageUsers !== true) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyRes = await supabase
        .from("company")
        .select("owner")
        .eq("id", companyId)
        .maybeSingle();

    if (companyRes.error) {
        console.error("[users/delete] company lookup error:", companyRes.error);
        return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
    }

    const ownerId = Number.parseInt(String(companyRes.data?.owner), 10);
    if (Number.isFinite(ownerId) && targetUserId === ownerId) {
        return NextResponse.json({ error: "Owner cannot be deleted" }, { status: 409 });
    }

    // Ensure target belongs to this company.
    const targetRes = await supabase
        .from("user")
        .select("id")
        .eq("id", targetUserId)
        .eq("companyId", companyId)
        .maybeSingle();

    if (targetRes.error) {
        console.error("[users/delete] target lookup error:", targetRes.error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    if (!targetRes.data) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deleteRes = await supabase
        .from("user")
        .delete()
        .eq("id", targetUserId)
        .eq("companyId", companyId)
        .select("id")
        .maybeSingle();

    if (deleteRes.error) {
        console.error("[users/delete] delete error:", deleteRes.error);
        return NextResponse.json({ error: deleteRes.error.message || "Failed to delete user" }, { status: 400 });
    }

    return NextResponse.json({ deleted: deleteRes.data }, { status: 200 });
}