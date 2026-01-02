import { NextResponse } from "next/server";

export function POST() {
    const res = NextResponse.json({ message: "Logout successful" }, { status: 200 });
    res.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
    });
    return res;
}