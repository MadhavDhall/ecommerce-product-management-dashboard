import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import supabase from "@/db/connection";
import { UserCreateSchema } from "@/form-schema/user";

export async function POST(req) {
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

    const body = await req.json().catch(() => null);
    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) {
        const msg = parsed.error.issues?.[0]?.message || "Invalid request";
        return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, password, manageUsers, manageProducts, manageInventory } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRes = await supabase
        .from("user")
        .insert({
            name,
            email: email.toLowerCase(),
            passwordHash,
            manageUsers,
            manageProducts,
            manageInventory,
            companyId,
        })
        .select("id, name, email, manageUsers, manageProducts, manageInventory, companyId")
        .maybeSingle();

    if (insertRes.error) {
        const message = insertRes.error.message || "Failed to create user";
        const isDuplicateEmail = /duplicate key value|user_email_key/i.test(message);
        return NextResponse.json(
            { error: isDuplicateEmail ? "Email already exists" : message },
            { status: isDuplicateEmail ? 409 : 500 }
        );
    }

    return NextResponse.json({ user: insertRes.data }, { status: 201 });
}

