import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import supabase from "@/db/connection";

const RegisterSchema = z.object({
    companyName: z.string().min(2, "Company name is required"),
    ownerName: z.string().min(2, "Owner name is required"),
    ownerEmail: z.string().email("Enter a valid email"),
    ownerPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const runtime = "nodejs";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = RegisterSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error.issues?.[0]?.message || "Invalid request";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const companyName = parsed.data.companyName.trim();
        const ownerName = parsed.data.ownerName.trim();
        const ownerEmail = parsed.data.ownerEmail.trim().toLowerCase();
        const ownerPassword = parsed.data.ownerPassword;

        if (!process.env.JWT_SECRET) {
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        // Reject duplicate email early for clearer UX.
        const existingRes = await supabase
            .from("user")
            .select("id")
            .eq("email", ownerEmail)
            .maybeSingle();

        if (existingRes.error) {
            console.error("[register] user lookup error:", existingRes.error);
            return NextResponse.json({ error: "Internal Server Error. Please try again later." }, { status: 500 });
        }

        if (existingRes.data?.id) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }

        // Hash in API, then let the DB function perform the atomic inserts.
        const passwordHash = await bcrypt.hash(ownerPassword, 10);

        // IMPORTANT: your schema has a circular FK (company.owner <-> user.companyId).
        // This requires a transaction with DEFERRABLE constraints. Implemented via RPC.
        const rpcRes = await supabase.rpc("register_company_owner", {
            company_name: companyName,
            owner_name: ownerName,
            owner_email: ownerEmail,
            owner_password_hash: passwordHash,
        });

        if (rpcRes.error) {
            const msg = rpcRes.error.message || "Failed to register";
            console.error("[register] rpc error:", rpcRes.error);

            const isDuplicateEmail = /duplicate key value|user_email_key/i.test(msg);
            const isMissingFunction = /function\s+register_company_owner\b|could not find the function/i.test(msg);
            const isNotDeferrable = /not deferrable|SET CONSTRAINTS/i.test(msg);

            if (isDuplicateEmail) {
                return NextResponse.json({ error: "Email already exists" }, { status: 409 });
            }

            if (isMissingFunction || isNotDeferrable) {
                return NextResponse.json(
                    {
                        error:
                            "DB is not ready for registration. Create the RPC `public.register_company_owner` and make the circular FK constraints DEFERRABLE (see db/sql/register_company_owner.sql).",
                    },
                    { status: 500 }
                );
            }

            return NextResponse.json({ error: "Failed to register" }, { status: 500 });
        }

        const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
        const companyId = Number.parseInt(String(row?.company_id), 10);
        const ownerId = Number.parseInt(String(row?.owner_id), 10);

        if (!Number.isFinite(companyId) || !Number.isFinite(ownerId)) {
            return NextResponse.json({ error: "Failed to register" }, { status: 500 });
        }

        // 4) Issue JWT like login
        const tokenPayload = {
            id: ownerId,
            name: ownerName,
            email: ownerEmail,
            manageProducts: true,
            manageUsers: true,
            manageInventory: true,
            companyId,
            companyName: companyName,
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30d" });

        const res = NextResponse.json(
            {
                message: "Registration successful",
                company: { id: companyId, name: companyName },
                user: { id: ownerId, name: ownerName, email: ownerEmail },
            },
            { status: 201 }
        );

        res.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60,
            path: "/",
        });

        return res;
    } catch (err) {
        console.error("[register] unexpected error:", err);
        return NextResponse.json({ error: "Internal Server Error. Please try again later." }, { status: 500 });
    }
}