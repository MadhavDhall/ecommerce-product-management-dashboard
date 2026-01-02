"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { ProductFormSchema, productFormToCreatePayload } from "@/form-schema/product";

const baseTextarea =
    "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md disabled:opacity-60 disabled:cursor-not-allowed";

export default function ProductForm({
    categories = [],
    onSubmit,
    submitLabel = "Create Product",
    defaultValues,
}) {
    const [note, setNote] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [lightboxUrl, setLightboxUrl] = useState("");
    const fileInputRef = useRef(null);

    const categoryOptions = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
        setError,
    } = useForm({
        resolver: zodResolver(ProductFormSchema),
        defaultValues: {
            name: "",
            costPrice: "",
            sellingPrice: "",
            categoryId: "",
            categoryMode: "existing",
            newCategoryName: "",
            newCategoryParentId: "",
            description: "",
            images: undefined,
            attributes: [{ name: "", value: "" }],
            ...(defaultValues || {}),
        },
    });

    // Cleanup object URLs to avoid memory leaks.
    useEffect(() => {
        return () => {
            selectedImages.forEach((img) => {
                if (img?.url) URL.revokeObjectURL(img.url);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const {
        fields: attributeFields,
        append: appendAttribute,
        remove: removeAttribute,
    } = useFieldArray({
        control,
        name: "attributes",
    });

    const isDisabled = isSubmitting;
    const categoryMode = watch("categoryMode");

    const toFileKey = (f) => {
        if (!f) return "";
        return `${f.name}::${f.size}::${f.lastModified}`;
    };

    const syncImagesToForm = (next) => {
        const files = next.map((x) => x.file).filter(Boolean);
        setValue("images", files, { shouldDirty: true, shouldValidate: true });
    };

    const onImagesPicked = (e) => {
        const picked = Array.from(e?.target?.files || []).filter(Boolean);
        if (picked.length === 0) return;

        setSelectedImages((prev) => {
            const prevKeys = new Set(prev.map((x) => toFileKey(x.file)));
            const added = picked
                .filter((f) => !prevKeys.has(toFileKey(f)))
                .map((file) => ({
                    id: toFileKey(file),
                    file,
                    url: URL.createObjectURL(file),
                }));

            const next = [...prev, ...added];
            syncImagesToForm(next);
            return next;
        });

        // Allow selecting the same file again later.
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeSelectedImage = (id) => {
        setSelectedImages((prev) => {
            const next = prev.filter((x) => x.id !== id);
            const removed = prev.find((x) => x.id === id);
            if (removed?.url) URL.revokeObjectURL(removed.url);

            // Close lightbox if we removed the open image.
            if (removed?.url && removed.url === lightboxUrl) {
                setLightboxUrl("");
            }

            syncImagesToForm(next);
            return next;
        });
    };

    const submit = handleSubmit(async (values) => {
        setNote("");
        try {
            const payload = productFormToCreatePayload(values);

            await onSubmit?.(payload);
        } catch (e) {
            const msg = e?.message || "Something went wrong";
            setNote(msg);
            setError("root", { type: "server", message: msg });
        }
    });

    return (
        <>
            {lightboxUrl ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setLightboxUrl("")}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative w-full max-w-3xl">
                        <button
                            type="button"
                            onClick={() => setLightboxUrl("")}
                            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-gray-800 shadow-sm hover:bg-gray-50"
                            aria-label="Close preview"
                        >
                            ×
                        </button>

                        <div
                            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={lightboxUrl}
                                alt="Preview"
                                className="max-h-[75vh] w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
                <Card>
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <div className="text-sm font-semibold text-gray-900">Details</div>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <Label htmlFor="name">Product Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Wireless Headphones"
                                            className="mt-1"
                                            disabled={isDisabled}
                                            {...register("name")}
                                        />
                                        {errors.name ? (
                                            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="costPrice">Cost Price</Label>
                                            <Input
                                                id="costPrice"
                                                inputMode="decimal"
                                                placeholder="0"
                                                className="mt-1"
                                                disabled={isDisabled}
                                                {...register("costPrice")}
                                            />
                                            {errors.costPrice ? (
                                                <p className="mt-1 text-xs text-red-600">{errors.costPrice.message}</p>
                                            ) : null}
                                        </div>

                                        <div>
                                            <Label htmlFor="sellingPrice">Selling Price</Label>
                                            <Input
                                                id="sellingPrice"
                                                inputMode="decimal"
                                                placeholder="0"
                                                className="mt-1"
                                                disabled={isDisabled}
                                                {...register("sellingPrice")}
                                            />
                                            {errors.sellingPrice ? (
                                                <p className="mt-1 text-xs text-red-600">{errors.sellingPrice.message}</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="categoryId">Category</Label>
                                        <input type="hidden" {...register("categoryMode")} />

                                        {categoryMode !== "new" ? (
                                            <>
                                                <select
                                                    id="categoryId"
                                                    className={baseTextarea + " mt-1"}
                                                    defaultValue={""}
                                                    disabled={isDisabled}
                                                    {...register("categoryId")}
                                                >
                                                    <option value="">No category</option>
                                                    {categoryOptions.map((c) => (
                                                        <option key={c?.id ?? c?.name} value={c?.id ?? ""}>
                                                            {c?.name || `#${c?.id}`}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="mt-2">
                                                    <button
                                                        type="button"
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            setValue("categoryMode", "new", { shouldDirty: true });
                                                            setValue("categoryId", "", { shouldDirty: true });
                                                        }}
                                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        + Add new category
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs font-semibold text-gray-900">New category</div>
                                                    <button
                                                        type="button"
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            setValue("categoryMode", "existing", { shouldDirty: true });
                                                            setValue("newCategoryName", "", { shouldDirty: true });
                                                            setValue("newCategoryParentId", "", { shouldDirty: true });
                                                        }}
                                                        className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="sm:col-span-2">
                                                        <Label htmlFor="newCategoryName">Category Name</Label>
                                                        <Input
                                                            id="newCategoryName"
                                                            placeholder="e.g. Audio"
                                                            className="mt-1"
                                                            disabled={isDisabled}
                                                            {...register("newCategoryName")}
                                                        />
                                                        {errors.newCategoryName ? (
                                                            <p className="mt-1 text-xs text-red-600">{errors.newCategoryName.message}</p>
                                                        ) : null}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <Label htmlFor="newCategoryParentId">Parent Category (optional)</Label>
                                                        <select
                                                            id="newCategoryParentId"
                                                            className={baseTextarea + " mt-1"}
                                                            defaultValue={""}
                                                            disabled={isDisabled}
                                                            {...register("newCategoryParentId")}
                                                        >
                                                            <option value="">No parent</option>
                                                            {categoryOptions.map((c) => (
                                                                <option key={`parent-${c?.id ?? c?.name}`} value={c?.id ?? ""}>
                                                                    {c?.name || `#${c?.id}`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <textarea
                                            id="description"
                                            rows={4}
                                            className={baseTextarea + " mt-1"}
                                            placeholder="Short description about the product"
                                            disabled={isDisabled}
                                            {...register("description")}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-semibold text-gray-900">Media & Attributes</div>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <Label htmlFor="images">Images</Label>
                                        <input
                                            ref={(el) => {
                                                fileInputRef.current = el;
                                            }}
                                            id="images"
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            disabled={isDisabled}
                                            className={baseTextarea + " mt-1"}
                                            {...register("images", { onChange: onImagesPicked })}
                                        />
                                        {errors.images ? (
                                            <p className="mt-1 text-xs text-red-600">{errors.images.message}</p>
                                        ) : null}

                                        {selectedImages.length > 0 ? (
                                            <div className="mt-3">
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                    {selectedImages.map((img) => (
                                                        <div
                                                            key={img.id}
                                                            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
                                                        >
                                                            <button
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => setLightboxUrl(img.url)}
                                                                className="block w-full"
                                                                aria-label="Preview image"
                                                            >
                                                                <img
                                                                    src={img.url}
                                                                    alt={img.file?.name || "Selected image"}
                                                                    className="h-20 w-full object-cover"
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => removeSelectedImage(img.id)}
                                                                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-sm leading-none text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                aria-label="Remove image"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div>
                                        <Label>Attributes</Label>
                                        <div className="mt-1 space-y-2">
                                            {attributeFields.map((field, idx) => (
                                                <div
                                                    key={field.id}
                                                    className="rounded-lg border border-gray-200 bg-white p-3"
                                                >
                                                    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-5">
                                                        <div className="sm:col-span-2">
                                                            <Label htmlFor={`attributes.${idx}.name`}>Name</Label>
                                                            <Input
                                                                id={`attributes.${idx}.name`}
                                                                placeholder="e.g. Color"
                                                                className="mt-1"
                                                                disabled={isDisabled}
                                                                {...register(`attributes.${idx}.name`)}
                                                            />
                                                            {errors.attributes?.[idx]?.name ? (
                                                                <p className="mt-1 text-xs text-red-600">
                                                                    {errors.attributes[idx].name.message}
                                                                </p>
                                                            ) : null}
                                                        </div>

                                                        <div className="sm:col-span-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Label htmlFor={`attributes.${idx}.value`}>Value</Label>
                                                                <button
                                                                    type="button"
                                                                    disabled={isDisabled}
                                                                    onClick={() => removeAttribute(idx)}
                                                                    className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                            <Input
                                                                id={`attributes.${idx}.value`}
                                                                placeholder="e.g. Black"
                                                                className="mt-1"
                                                                disabled={isDisabled}
                                                                {...register(`attributes.${idx}.value`)}
                                                            />
                                                            {errors.attributes?.[idx]?.value ? (
                                                                <p className="mt-1 text-xs text-red-600">
                                                                    {errors.attributes[idx].value.message}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => appendAttribute({ name: "", value: "" })}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                + Add attribute
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {errors.root?.message || note ? (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errors.root?.message || note}
                            </div>
                        ) : null}

                        <div className="mt-6 flex items-center justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating…" : submitLabel}
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>
        </>
    );
}

