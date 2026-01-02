import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";

const MAX_BULK_UPDATES = 500;

export async function GET(req) {
    try {
        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Return inventory data for ALL products of this company, along with product name + images.
        // Use product as the base table so products without an inventory row still show up.
        const productsRes = await supabase
            .from("product")
            .select("id, name, imageUrls, inventory:inventory(inStock, created_at, updated_at)")
            .eq("companyId", payload.companyId)
            .order("id", { ascending: true });

        // Reserved = orders that are not currently in inventory.
        // Scope to company via inner join: order.productId -> product.id
        const reservedOrdersRes = await supabase
            .from("order")
            .select("productId, product:productId!inner(companyId)")
            .eq("inInventory", false)
            .eq("product.companyId", payload.companyId);

        if (productsRes.error) {
            console.log(productsRes.error);
            return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
        }

        if (reservedOrdersRes.error) {
            console.log(reservedOrdersRes.error);
            return NextResponse.json({ error: "Failed to fetch reserved orders" }, { status: 500 });
        }

        const reservedCountByProductId = new Map();
        for (const row of reservedOrdersRes.data || []) {
            const pid = row?.productId;
            if (pid == null) continue;
            reservedCountByProductId.set(pid, (reservedCountByProductId.get(pid) || 0) + 1);
        }

        const items = (productsRes.data || []).map((p) => {
            const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
            const reservedCount = reservedCountByProductId.get(p.id) || 0;
            return {
                product: {
                    id: p.id,
                    name: p.name,
                    imageUrls: p.imageUrls,
                },
                inventory: inv
                    ? {
                        inStock: inv.inStock,
                        created_at: inv.created_at,
                        updated_at: inv.updated_at,
                    }
                    : null,
                reservedCount,
            };
        });

        return NextResponse.json({ items }, { status: 200 });

    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function POST(req) {
    try {
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

        const userId = payload?.id;
        const companyId = payload?.companyId;
        if (userId == null || companyId == null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Confirm user exists, belongs to company, and has manageInventory permission.
        const userRes = await supabase
            .from("user")
            .select("id, companyId, manageInventory")
            .eq("id", userId)
            .limit(1);

        if (userRes.error) {
            console.error("[inventory/bulk] user lookup error:", userRes.error);
            const msg = String(userRes.error.message || "");
            if (msg.toLowerCase().includes("manageinventory") && msg.toLowerCase().includes("does not exist")) {
                return NextResponse.json(
                    { error: "Permission column manageInventory is not configured in DB" },
                    { status: 500 }
                );
            }
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const user = Array.isArray(userRes.data) && userRes.data.length > 0 ? userRes.data[0] : null;
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (String(user.companyId) !== String(companyId)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!user.manageInventory) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        const rawUpdates = Array.isArray(body) ? body : body?.updates;
        if (!Array.isArray(rawUpdates)) {
            return NextResponse.json(
                { error: "Invalid request body. Expected { updates: [{ productId, inStock }, ...] }" },
                { status: 400 }
            );
        }

        if (rawUpdates.length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        if (rawUpdates.length > MAX_BULK_UPDATES) {
            return NextResponse.json(
                { error: `Too many updates. Max is ${MAX_BULK_UPDATES}` },
                { status: 413 }
            );
        }

        // Normalize + validate; last update wins for duplicate productId.
        const byProductId = new Map();
        for (const row of rawUpdates) {
            const pid = Number.parseInt(String(row?.productId), 10);
            const inStock = Number.parseInt(String(row?.inStock), 10);
            if (!Number.isFinite(pid)) {
                return NextResponse.json({ error: "Invalid productId in updates" }, { status: 400 });
            }
            if (!Number.isFinite(inStock) || inStock < 0) {
                return NextResponse.json({ error: "inStock must be a non-negative integer" }, { status: 400 });
            }
            byProductId.set(pid, inStock);
        }

        const productIds = Array.from(byProductId.keys());

        // Ensure all products belong to this company.
        const productsRes = await supabase
            .from("product")
            .select("id")
            .eq("companyId", companyId)
            .in("id", productIds);

        if (productsRes.error) {
            console.error("[inventory/bulk] product lookup error:", productsRes.error);
            return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
        }

        const allowedIds = new Set((productsRes.data || []).map((p) => p.id));
        const invalidIds = productIds.filter((id) => !allowedIds.has(id));
        if (invalidIds.length > 0) {
            return NextResponse.json(
                { error: "Some products were not found", invalidProductIds: invalidIds },
                { status: 404 }
            );
        }

        const rowsToUpsert = productIds.map((productId) => ({
            productId,
            inStock: byProductId.get(productId),
        }));

        // Enforce reserved constraint server-side: inStock must be >= reservedCount.
        // Reserved orders are those not yet in inventory (inInventory=false).
        const reservedOrdersRes = await supabase
            .from("order")
            .select("productId")
            .in("productId", productIds)
            .eq("inInventory", false);

        if (reservedOrdersRes.error) {
            console.error("[inventory/bulk] reserved orders lookup error:", reservedOrdersRes.error);
            return NextResponse.json({ error: "Failed to validate reserved orders" }, { status: 500 });
        }

        const reservedCountByProductId = new Map();
        for (const row of reservedOrdersRes.data || []) {
            const pid = row?.productId;
            if (pid == null) continue;
            reservedCountByProductId.set(pid, (reservedCountByProductId.get(pid) || 0) + 1);
        }

        const invalidByReserved = [];
        for (const r of rowsToUpsert) {
            const reservedCount = reservedCountByProductId.get(r.productId) || 0;
            if (r.inStock < reservedCount) {
                invalidByReserved.push({
                    productId: r.productId,
                    inStock: r.inStock,
                    reservedCount,
                });
            }
        }

        if (invalidByReserved.length > 0) {
            return NextResponse.json(
                {
                    error: "inStock cannot be less than reservedCount",
                    invalid: invalidByReserved,
                },
                { status: 400 }
            );
        }

        // NOTE: We cannot rely on `upsert(..., { onConflict: "productId" })` unless the DB has a
        // unique/exclusion constraint on inventory.productId. If it doesn't, Postgres throws:
        // "there is no unique or exclusion constraint matching the ON CONFLICT specification".
        // So we do: insert missing rows + update existing rows.

        const existingRes = await supabase
            .from("inventory")
            .select("productId")
            .in("productId", productIds);

        if (existingRes.error) {
            console.error("[inventory/bulk] inventory lookup error:", existingRes.error);
            return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
        }

        const existingIds = new Set((existingRes.data || []).map((r) => r.productId));
        const toInsert = rowsToUpsert.filter((r) => !existingIds.has(r.productId));
        const toUpdate = rowsToUpsert.filter((r) => existingIds.has(r.productId));

        let inserted = [];
        if (toInsert.length > 0) {
            const insertRes = await supabase
                .from("inventory")
                .insert(toInsert)
                .select("productId, inStock, created_at, updated_at");

            if (insertRes.error) {
                console.error("[inventory/bulk] insert error:", insertRes.error);
                return NextResponse.json(
                    { error: insertRes.error.message || "Failed to insert inventory" },
                    { status: 400 }
                );
            }
            inserted = insertRes.data || [];
        }

        // Supabase doesn't support updating many rows with different values in a single `update()` call.
        // We keep it within a single API request, but execute per-row updates server-side.
        const updated = [];
        for (const row of toUpdate) {
            const updateRes = await supabase
                .from("inventory")
                .update({ inStock: row.inStock })
                .eq("productId", row.productId)
                .select("productId, inStock, created_at, updated_at")
                .maybeSingle();

            if (updateRes.error) {
                console.error("[inventory/bulk] update error:", updateRes.error);
                return NextResponse.json(
                    { error: updateRes.error.message || "Failed to update inventory" },
                    { status: 400 }
                );
            }
            if (updateRes.data) updated.push(updateRes.data);
        }

        const all = [...updated, ...inserted];
        return NextResponse.json(
            {
                updated: all,
                count: all.length,
            },
            { status: 200 }
        );

    } catch (e) {
        console.error("[inventory/bulk] unexpected error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}