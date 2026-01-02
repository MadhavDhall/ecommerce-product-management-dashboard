import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req) {
  const token = req?.cookies?.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Payload comes from login route; keep it small and safe.
    return NextResponse.json(
      {
        user: {
          id: payload?.id,
          name: payload?.name,
          email: payload?.email,
          manageProducts: payload?.manageProducts,
          manageUsers: payload?.manageUsers,
          manageInventory: payload?.manageInventory,
          companyName: payload?.companyName,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.log(e);

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
