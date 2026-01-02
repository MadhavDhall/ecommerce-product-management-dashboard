import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import supabase from "@/db/connection";
import { ProductCreateSchema } from "@/form-schema/product";
import { ensureCloudinaryConfigured, uploadImagesToCloudinary } from "@/lib/cloudinary";

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

        // Confirm user exists and has manageProducts permission.
        const userRes = await supabase
            .from("user")
            .select("id, companyId, manageProducts")
            .eq("id", userId)
            .limit(1);

        if (userRes.error) {
            console.error("[products/new] user lookup error:", userRes.error);
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

        // Support both JSON and multipart/form-data (for image uploads).
        let candidate = null;
        if (contentType.includes("multipart/form-data")) {
            const cfg = ensureCloudinaryConfigured();
            if (!cfg.ok) {
                return NextResponse.json({ error: cfg.error }, { status: 500 });
            }

            const form = await req.formData();
            const name = form.get("name");
            const costPriceRaw = form.get("costPrice");
            const sellingPriceRaw = form.get("sellingPrice");
            const descriptionRaw = form.get("description");
            const categoryIdRaw = form.get("categoryId");
            const categoryRaw = form.get("category");
            const attributesRaw = form.get("attributes");

            const files = (form.getAll("images") || []).filter(
                (f) => f && typeof f === "object" && typeof f.arrayBuffer === "function"
            );

            if (files.length === 0) {
                return NextResponse.json({ error: "Upload at least one image" }, { status: 400 });
            }

            const imageUrls = await uploadImagesToCloudinary(files, { folder: "products" });

            let category = null;
            if (typeof categoryRaw === "string" && categoryRaw.trim()) {
                try {
                    category = JSON.parse(categoryRaw);
                } catch {
                    return NextResponse.json({ error: "Invalid category JSON" }, { status: 400 });
                }
            }

            let attributes = null;
            if (typeof attributesRaw === "string" && attributesRaw.trim()) {
                try {
                    attributes = JSON.parse(attributesRaw);
                } catch {
                    return NextResponse.json({ error: "Invalid attributes JSON" }, { status: 400 });
                }
            }

            const categoryIdNum = categoryIdRaw != null && String(categoryIdRaw).trim() ? Number(categoryIdRaw) : null;

            candidate = {
                name: name == null ? "" : String(name),
                costPrice: Number(costPriceRaw),
                sellingPrice: Number(sellingPriceRaw),
                categoryId: category ? null : (Number.isFinite(categoryIdNum) ? categoryIdNum : null),
                category: category ? category : null,
                description: descriptionRaw != null && String(descriptionRaw).trim() ? String(descriptionRaw).trim() : null,
                attributes: attributes ?? null,
                imageUrls,
            };
        } else {
            candidate = await req.json().catch(() => null);
        }

        const parsed = ProductCreateSchema.safeParse(candidate);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || "Invalid request body";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const { name, costPrice, sellingPrice, categoryId, attributes, description, imageUrls } = parsed.data;

        // If client requested creating a new category, do it transactionally via RPC.
        if (parsed.data.category) {
            const category = parsed.data.category;

            const rpcRes = await supabase.rpc("create_product_with_category", {
                p_company_id: companyId,
                p_created_by_user_id: userId,
                p_name: name,
                p_cost_price: costPrice,
                p_selling_price: sellingPrice,
                p_description: description ?? null,
                p_attributes: attributes ?? null,
                p_image_urls: imageUrls,
                p_category_name: category.name,
                p_parent_category_id: category.parentId ?? null,
            });

            if (rpcRes.error) {
                console.error("[products/new] rpc error:", rpcRes.error);
                return NextResponse.json(
                    {
                        error:
                            rpcRes.error.message ||
                            "Failed to create category + product. Ensure RPC create_product_with_category exists.",
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json({ product: rpcRes.data }, { status: 201 });
        }

        const insertRes = await supabase
            .from("product")
            .insert({
                name,
                costPrice,
                sellingPrice,
                categoryId: categoryId ?? null,
                attributes: attributes ?? null,
                description: description ?? null,
                imageUrls: imageUrls,
                companyId,
                createdByUserId: userId,
            })
            .select("*")
            .single();

        if (insertRes.error) {
            console.error("[products/new] insert error:", insertRes.error);
            // Treat most insert errors as a bad request (FK constraint, etc.)
            return NextResponse.json({ error: insertRes.error.message || "Failed to create product" }, { status: 400 });
        }

        return NextResponse.json({ product: insertRes.data }, { status: 201 });
    } catch (e) {
        console.error("[products/new] unexpected error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}