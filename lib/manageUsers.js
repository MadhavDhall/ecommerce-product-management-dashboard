import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

export async function listCompanyUsersIfManageUsers(req) {
    const token = req?.cookies?.get("token")?.value;
    if (!token) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const requesterId = Number.parseInt(String(payload?.id), 10);
    const companyId = Number.parseInt(String(payload?.companyId), 10);
    if (!Number.isFinite(requesterId) || !Number.isFinite(companyId)) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const meRes = await supabase
        .from("user")
        .select("id, manageUsers")
        .eq("id", requesterId)
        .eq("companyId", companyId)
        .maybeSingle();

    if (meRes.error) {
        console.log(meRes.error);
        return { ok: false, status: 500, error: "Failed to authorize" };
    }

    if (!meRes.data || meRes.data.manageUsers !== true) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const usersRes = await supabase
        .from("user")
        .select("id, name, email, manageProducts, manageUsers, manageInventory, companyId")
        .eq("companyId", companyId)
        .order("id", { ascending: true });

    if (usersRes.error) {
        console.log(usersRes.error);
        return { ok: false, status: 500, error: "Failed to fetch users" };
    }

    return { ok: true, status: 200, users: usersRes.data || [] };
}
