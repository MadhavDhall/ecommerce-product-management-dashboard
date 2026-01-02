import { NextResponse } from "next/server";
import supabase from "@/db/connection";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        // Fetch user from Supabase `user` table by email
        const { data, error } = await supabase
            .from("user")
            .select("id,name, email, passwordHash, manageProducts, manageUsers, manageInventory, companyId, company:companyId(name)")
            .eq("email", email)
            .limit(1);

        if (error) {
            console.error("[login] Supabase error:", error);
            return NextResponse.json({ error: "Internal Server Error. Please try again later." }, { status: 500 });
        }

        const user = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // check if password matches
        const hashed = user.passwordHash;
        if (!hashed) {
            // No stored hash to verify against
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, hashed);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const { id, name, manageProducts, manageUsers, manageInventory, companyId } = user;
        const companyName = user?.company?.name ?? null;

        const tokenPayload = { id, name, email, manageProducts, manageUsers, manageInventory, companyId, companyName };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30d" });

        const res = NextResponse.json(
            {
                message: "Login successful"
            },
            { status: 200 }
        );
        res.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60,
            path: "/",
        });
        return res;
    }
    catch (err) {
        console.log(err);
        // Standardize 500 response message
        return NextResponse.json({ error: "Internal Server Error. Please try again later." }, { status: 500 });
    }

}