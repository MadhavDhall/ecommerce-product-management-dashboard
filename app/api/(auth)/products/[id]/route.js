import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";
import { ProductCreateSchema, ProductPatchSchema } from "@/form-schema/product";
import { ensureCloudinaryConfigured, uploadImagesToCloudinary } from "@/lib/cloudinary";

export async function GET(req, { params }) {
    try {
        // check if user logged in is a genuine user through the token in cookie

        const token = req?.cookies?.get("token")?.value;
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // get the product id from the params and convert to integer
        // (In current Next.js, `params` is a Promise)
        const resolvedParams = await params;
        const id = resolvedParams?.id;
        const parsedId = Number.parseInt(String(id), 10);
        if (!Number.isFinite(parsedId)) {
            return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
        }

        // once the user is verified, return the product (and its category) from the database
        const productsRes = await supabase
            .from("product")
            .select("*, category:categoryId(id, name)")
            .eq("id", parsedId)
            .eq("companyId", payload.companyId)
            .maybeSingle();

        if (productsRes.error) {
            console.log(productsRes.error);
            return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
        }

        if (!productsRes.data) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ product: productsRes.data }, { status: 200 });
    } catch (e) {
        console.log(e);

        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function PATCH(req, { params }) {
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

        // (In current Next.js, `params` is a Promise)
        const resolvedParams = await params;
        const id = resolvedParams?.id;
        const parsedId = Number.parseInt(String(id), 10);
        if (!Number.isFinite(parsedId)) {
            return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
        }

        // Confirm user exists, belongs to company, and has manageProducts permission.
        const userRes = await supabase
            .from("user")
            .select("id, companyId, manageProducts")
            .eq("id", userId)
            .limit(1);

        if (userRes.error) {
            console.error("[products/patch] user lookup error:", userRes.error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const user = Array.isArray(userRes.data) && userRes.data.length > 0 ? userRes.data[0] : null;
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (String(user.companyId) !== String(companyId)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!user.manageProducts) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const contentType = req?.headers?.get("content-type") || "";

        let patch = null;
        let incomingImageUrls = undefined;

        if (contentType.includes("multipart/form-data")) {
            const cfg = ensureCloudinaryConfigured();
            if (!cfg.ok) {
                return NextResponse.json({ error: cfg.error }, { status: 500 });
            }

            const form = await req.formData();

            const buildPatch = {};
            if (form.has("name")) buildPatch.name = String(form.get("name") ?? "");
            if (form.has("costPrice")) buildPatch.costPrice = Number(form.get("costPrice"));
            if (form.has("sellingPrice")) buildPatch.sellingPrice = Number(form.get("sellingPrice"));
            if (form.has("description")) {
                const raw = String(form.get("description") ?? "");
                buildPatch.description = raw.trim() ? raw : null;
            }
            if (form.has("categoryId")) {
                const raw = String(form.get("categoryId") ?? "").trim();
                buildPatch.categoryId = raw ? Number(raw) : null;
            }
            if (form.has("attributes")) {
                const raw = String(form.get("attributes") ?? "").trim();
                if (!raw) {
                    buildPatch.attributes = null;
                } else {
                    try {
                        buildPatch.attributes = JSON.parse(raw);
                    } catch {
                        return NextResponse.json({ error: "Invalid attributes JSON" }, { status: 400 });
                    }
                }
            }

            // Images: client sends keepImageUrls (existing urls to keep) + new image files.
            const keepRaw = String(form.get("keepImageUrls") ?? "").trim();
            const keep = keepRaw
                ? (() => {
                    try {
                        const parsed = JSON.parse(keepRaw);
                        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
                    } catch {
                        return null;
                    }
                })()
                : undefined;

            if (keep === null) {
                return NextResponse.json({ error: "Invalid keepImageUrls JSON" }, { status: 400 });
            }

            const files = (form.getAll("images") || []).filter(
                (f) => f && typeof f === "object" && typeof f.arrayBuffer === "function"
            );

            if (keep !== undefined || files.length > 0) {
                const uploadedUrls = files.length > 0
                    ? await uploadImagesToCloudinary(files, { folder: "products" })
                    : [];
                const nextUrls = [...(keep || []), ...uploadedUrls];
                incomingImageUrls = nextUrls;
            }

            patch = buildPatch;
        } else {
            patch = await req.json().catch(() => null);
        }

        const parsedPatch = ProductPatchSchema.safeParse(patch);
        if (!parsedPatch.success) {
            const msg = parsedPatch.error?.issues?.[0]?.message || "Invalid request body";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        patch = parsedPatch.data;
        if (!patch || Object.keys(patch).length === 0) {
            // Images-only updates come through incomingImageUrls.
            if (incomingImageUrls === undefined) {
                return NextResponse.json({ error: "No fields to update" }, { status: 400 });
            }
        }

        const existingRes = await supabase
            .from("product")
            .select("*")
            .eq("id", parsedId)
            .eq("companyId", companyId)
            .maybeSingle();

        if (existingRes.error) {
            console.error("[products/patch] fetch product error:", existingRes.error);
            return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
        }

        if (!existingRes.data) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const existing = existingRes.data;

        const normalizeDbImageUrls = (raw) => {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw.filter(Boolean);
            if (typeof raw === "string") {
                const t = raw.trim();
                if (t.startsWith("[") && t.endsWith("]")) {
                    try {
                        const parsed = JSON.parse(t);
                        if (Array.isArray(parsed)) return parsed.filter(Boolean);
                    } catch {
                        // fall through
                    }
                }
                return t ? [t] : [];
            }
            return [];
        };

        // Validate invariants by merging into a full product candidate.
        const mergedCandidate = {
            name: patch.name ?? existing.name,
            costPrice: patch.costPrice ?? existing.costPrice,
            sellingPrice: patch.sellingPrice ?? existing.sellingPrice,
            categoryId: patch.categoryId !== undefined ? patch.categoryId : (existing.categoryId ?? null),
            category: null,
            description: patch.description !== undefined ? patch.description : (existing.description ?? null),
            attributes: patch.attributes !== undefined ? patch.attributes : (existing.attributes ?? null),
            imageUrls: incomingImageUrls !== undefined
                ? incomingImageUrls
                : normalizeDbImageUrls(existing.imageUrls),
        };

        const fullCheck = ProductCreateSchema.safeParse(mergedCandidate);
        if (!fullCheck.success) {
            const msg = fullCheck.error?.issues?.[0]?.message || "Invalid update";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const updatePayload = {};
        if (patch.name !== undefined) updatePayload.name = fullCheck.data.name;
        if (patch.costPrice !== undefined) updatePayload.costPrice = fullCheck.data.costPrice;
        if (patch.sellingPrice !== undefined) updatePayload.sellingPrice = fullCheck.data.sellingPrice;
        if (patch.categoryId !== undefined) updatePayload.categoryId = fullCheck.data.categoryId ?? null;
        if (patch.description !== undefined) updatePayload.description = fullCheck.data.description ?? null;
        if (patch.attributes !== undefined) updatePayload.attributes = fullCheck.data.attributes ?? null;
        if (incomingImageUrls !== undefined) updatePayload.imageUrls = fullCheck.data.imageUrls;

        const updateRes = await supabase
            .from("product")
            .update(updatePayload)
            .eq("id", parsedId)
            .eq("companyId", companyId)
            .select("*, category:categoryId(id, name)")
            .maybeSingle();

        if (updateRes.error) {
            console.error("[products/patch] update error:", updateRes.error);
            return NextResponse.json({ error: updateRes.error.message || "Failed to update product" }, { status: 400 });
        }

        return NextResponse.json({ product: updateRes.data }, { status: 200 });
    } catch (e) {
        console.error("[products/patch] unexpected error:", e);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function DELETE(req, { params }) {
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

        // (In current Next.js, `params` is a Promise)
        const resolvedParams = await params;
        const id = resolvedParams?.id;
        const parsedId = Number.parseInt(String(id), 10);
        if (!Number.isFinite(parsedId)) {
            return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
        }

        // Confirm user exists, belongs to company, and has manageProducts permission.
        const userRes = await supabase
            .from("user")
            .select("id, companyId, manageProducts")
            .eq("id", userId)
            .limit(1);

        if (userRes.error) {
            console.error("[products/delete] user lookup error:", userRes.error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const user = Array.isArray(userRes.data) && userRes.data.length > 0 ? userRes.data[0] : null;
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (String(user.companyId) !== String(companyId)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!user.manageProducts) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Ensure product belongs to this company.
        const productRes = await supabase
            .from("product")
            .select("id, name")
            .eq("id", parsedId)
            .eq("companyId", companyId)
            .maybeSingle();

        if (productRes.error) {
            console.error("[products/delete] fetch product error:", productRes.error);
            return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
        }

        if (!productRes.data) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Prevent deleting products that already have orders (to avoid breaking history / FK constraints).
        const ordersCountRes = await supabase
            .from("order")
            .select("productId", { count: "exact", head: true })
            .eq("productId", parsedId);

        if (ordersCountRes.error) {
            console.error("[products/delete] orders count error:", ordersCountRes.error);
            return NextResponse.json({ error: "Failed to verify product dependencies" }, { status: 500 });
        }

        const ordersCount = ordersCountRes.count ?? 0;
        if (ordersCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete product with existing orders." },
                { status: 409 }
            );
        }

        // Best-effort cleanup of dependent rows (if your DB allows it).
        const invDel = await supabase.from("inventory").delete().eq("productId", parsedId);
        if (invDel.error) {
            console.error("[products/delete] inventory delete error:", invDel.error);
        }

        const revDel = await supabase.from("review").delete().eq("productId", parsedId);
        if (revDel.error) {
            console.error("[products/delete] review delete error:", revDel.error);
        }

        const deleteRes = await supabase
            .from("product")
            .delete()
            .eq("id", parsedId)
            .eq("companyId", companyId)
            .select("id, name")
            .maybeSingle();

        if (deleteRes.error) {
            console.error("[products/delete] delete error:", deleteRes.error);
            const msg = deleteRes.error.message || "Failed to delete product";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        return NextResponse.json({ deleted: deleteRes.data }, { status: 200 });
    } catch (e) {
        console.error("[products/delete] unexpected error:", e);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}