import { z } from "zod";

const safeNumberFromString = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return NaN;
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    return Number(trimmed);
};

const safeIntFromString = (value) => {
    if (value == null) return NaN;
    if (typeof value === "number") return value;
    const s = String(value).trim();
    if (!s) return NaN;
    const n = Number(s);
    return n;
};

const parseAttributeValue = (raw) => {
    if (raw == null) return "";
    const s = String(raw).trim();

    if (!s) return "";

    const lower = s.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null") return null;

    // If it looks like a number, store it as number.
    if (/^-?\d+(?:\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n)) return n;
    }

    // If it looks like JSON, allow nested values.
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        try {
            return JSON.parse(s);
        } catch {
            // fall through to string
        }
    }

    return s;
};

const attributesSchema = z
    .unknown()
    .nullable()
    .optional()
    .refine(
        (v) => {
            if (v == null) return true;
            return typeof v === "object" && !Array.isArray(v);
        },
        { message: "attributes must be an object (JSON) or null" }
    );

const AttributePairSchema = z.object({
    name: z.string().optional(),
    value: z.string().optional(),
});

const AttributesPairsSchema = z.array(AttributePairSchema).superRefine((pairs, ctx) => {
    if (!Array.isArray(pairs)) return;

    pairs.forEach((p, idx) => {
        const name = p?.name == null ? "" : String(p.name).trim();
        const value = p?.value == null ? "" : String(p.value).trim();

        // Allow fully blank rows (UI convenience)
        if (!name && !value) return;

        if (!name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [idx, "name"],
                message: "Attribute name is required",
            });
        }
        if (!value) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [idx, "value"],
                message: "Attribute value is required",
            });
        }
    });
});

const ImagesSchema = z
    .any()
    .refine(
        (v) => {
            if (!v) return false;

            // react-hook-form gives a FileList from <input type="file" />
            if (typeof FileList !== "undefined" && v instanceof FileList) {
                return v.length > 0;
            }

            // Fallback for environments/types that aren't FileList.
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === "object" && typeof v.length === "number") return v.length > 0;

            return false;
        },
        { message: "Upload at least one image" }
    );

export const CategoryCreateSchema = z.object({
    name: z.string().trim().min(1, { message: "Category name is required" }),
    parentId: z
        .union([z.number().int().positive(), z.null(), z.undefined()])
        .optional(),
});

export const ProductCreateSchema = z
    .object({
        name: z.string().trim().min(1, { message: "Name is required" }),
        costPrice: z
            .number({ invalid_type_error: "costPrice must be a number" })
            .finite({ message: "costPrice must be a valid number" })
            .min(0, { message: "costPrice must be 0 or more" }),
        sellingPrice: z
            .number({ invalid_type_error: "sellingPrice must be a number" })
            .finite({ message: "sellingPrice must be a valid number" })
            .min(0, { message: "sellingPrice must be 0 or more" }),
        categoryId: z
            .union([
                z.number().int().positive({ message: "categoryId must be a positive integer" }),
                z.null(),
                z.undefined(),
            ])
            .optional(),
        category: CategoryCreateSchema.nullish(),
        description: z
            .string()
            .trim()
            .nullish()
            .transform((v) => {
                if (v == null) return null;
                const s = String(v).trim();
                return s ? s : null;
            }),
        attributes: attributesSchema,
        imageUrls: z
            .array(z.string().min(1, { message: "imageUrls must contain non-empty strings" }))
            .min(1, { message: "imageUrls must be a non-empty array" }),
    })
    .refine((d) => !(d.categoryId != null && d.category != null), {
        path: ["category"],
        message: "Provide either categoryId or category, not both",
    })
    .refine((d) => d.sellingPrice >= d.costPrice, {
        path: ["sellingPrice"],
        message: "Selling price should be ≥ cost price",
    });

export const ProductPatchSchema = z
    .object({
        name: z.string().trim().min(1, { message: "Name is required" }).optional(),
        costPrice: z
            .number({ invalid_type_error: "costPrice must be a number" })
            .finite({ message: "costPrice must be a valid number" })
            .min(0, { message: "costPrice must be 0 or more" })
            .optional(),
        sellingPrice: z
            .number({ invalid_type_error: "sellingPrice must be a number" })
            .finite({ message: "sellingPrice must be a valid number" })
            .min(0, { message: "sellingPrice must be 0 or more" })
            .optional(),
        categoryId: z
            .union([
                z.number().int().positive({ message: "categoryId must be a positive integer" }),
                z.null(),
            ])
            .optional(),
        description: z
            .string()
            .trim()
            .nullish()
            .transform((v) => {
                if (v == null) return null;
                const s = String(v).trim();
                return s ? s : null;
            })
            .optional(),
        attributes: attributesSchema.optional(),
    })
    .strict()
    .refine(
        (d) => {
            if (d.costPrice == null || d.sellingPrice == null) return true;
            return d.sellingPrice >= d.costPrice;
        },
        { path: ["sellingPrice"], message: "Selling price should be ≥ cost price" }
    );

export const ProductFormSchema = z
    .object({
        name: z.string().trim().min(1, { message: "Product name is required" }),
        costPrice: z
            .string()
            .min(1, { message: "Cost price is required" })
            .refine((v) => Number.isFinite(safeNumberFromString(v)), { message: "Enter a valid number" })
            .refine((v) => safeNumberFromString(v) >= 0, { message: "Must be 0 or more" }),
        sellingPrice: z
            .string()
            .min(1, { message: "Selling price is required" })
            .refine((v) => Number.isFinite(safeNumberFromString(v)), { message: "Enter a valid number" })
            .refine((v) => safeNumberFromString(v) >= 0, { message: "Must be 0 or more" }),
        categoryId: z.string().optional(),
        categoryMode: z.enum(["existing", "new"]).default("existing"),
        newCategoryName: z.string().optional(),
        newCategoryParentId: z.string().optional(),
        description: z.string().optional(),
        images: ImagesSchema,
        attributes: AttributesPairsSchema.optional(),
    })
    .refine(
        (d) => {
            if (d.categoryMode !== "new") return true;
            return !!(d.newCategoryName && String(d.newCategoryName).trim());
        },
        { path: ["newCategoryName"], message: "Category name is required" }
    )
    .refine((d) => safeNumberFromString(d.sellingPrice) >= safeNumberFromString(d.costPrice), {
        path: ["sellingPrice"],
        message: "Selling price should be ≥ cost price",
    });

export const productFormToCreatePayload = (values) => {
    const categoryMode = values?.categoryMode || "existing";
    const wantsNewCategory = categoryMode === "new";

    const newCategoryName = values?.newCategoryName ? String(values.newCategoryName).trim() : "";
    const parentIdRaw = values?.newCategoryParentId;
    const parentIdNum = safeIntFromString(parentIdRaw);
    const parentId = Number.isFinite(parentIdNum) ? parentIdNum : null;

    const attributesPairs = Array.isArray(values?.attributes) ? values.attributes : [];
    const attributesObject = attributesPairs.reduce((acc, pair) => {
        const key = pair?.name == null ? "" : String(pair.name).trim();
        const rawValue = pair?.value == null ? "" : String(pair.value).trim();
        if (!key || !rawValue) return acc;
        acc[key] = parseAttributeValue(rawValue);
        return acc;
    }, {});

    const attributes = Object.keys(attributesObject).length > 0 ? attributesObject : null;

    const fd = new FormData();
    fd.append("name", values?.name?.trim?.() ?? "");
    fd.append("costPrice", String(safeNumberFromString(values?.costPrice)));
    fd.append("sellingPrice", String(safeNumberFromString(values?.sellingPrice)));
    fd.append("description", values?.description ? String(values.description).trim() : "");

    if (wantsNewCategory) {
        fd.append(
            "category",
            JSON.stringify({
                name: newCategoryName,
                parentId: parentId || null,
            })
        );
    } else {
        fd.append("categoryId", values?.categoryId ? String(values.categoryId) : "");
    }

    if (attributes) {
        fd.append("attributes", JSON.stringify(attributes));
    }

    const images = values?.images;
    const files =
        images && typeof FileList !== "undefined" && images instanceof FileList
            ? Array.from(images)
            : Array.isArray(images)
                ? images
                : [];

    for (const file of files) {
        if (file) fd.append("images", file);
    }

    return fd;
};
