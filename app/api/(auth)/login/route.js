import { NextResponse } from "next/server";
import connectDB from "@/db/connection";
import User from "@/db/models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

async function generateToken(user) {
    try {

    } catch (error) {

    }
}

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        await connectDB();
        //check if email and password are correct


        // save the data to the database
        // For demonstration, we assume any email/password is valid
        // await User.create({ email, passwordHash: password, role: 'admin' });
        // return NextResponse.json({ message: "Login successful" }, { status: 200 });


        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        const res = NextResponse.json({ message: "Login successful" }, { status: 200 });
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