"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { ProductFormSchema } from "@/form-schema/product";

export default function ProductForm({
    initialValues = {},
    categories = [],
    onSubmit,
    submitLabel = "Submit",
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const defaultValues = useMemo(
        () => ({
            name: initialValues.name ?? "",
            costPrice: initialValues.costPrice ?? "",
            sellingPrice: initialValues.sellingPrice ?? "",
            categoryId: initialValues.categoryId ?? "",
            description: initialValues.description ?? "",
            attributes: [],
            images: undefined,
        }),
        [initialValues]
    );

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty },
    } = useForm({
        resolver: zodResolver(ProductFormSchema),
        defaultValues,
    });

    const [attributes, setAttributes] = useState([{ name: "", value: "" }]);

    // Watch images from RHF so we can render thumbnails
    const watchedImages = watch("images");

    // Convert watchedImages (FileList or array) to an array of {file, url}
    const imagePreviews = useMemo(() => {
        if (!watchedImages) return [];
        const arr = Array.isArray(watchedImages)
            ? watchedImages
            : Array.from(watchedImages);
        return arr.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));
    }, [watchedImages]);

    const removeImage = (index) => {
        if (!watchedImages) return;
        const arr = Array.isArray(watchedImages)
            ? watchedImages
            : Array.from(watchedImages);
        const next = arr.filter((_, i) => i !== index);
        setValue("images", next, { shouldDirty: true, shouldValidate: true });
    };

    const onFormSubmit = async (data) => {
        try {
            setIsSubmitting(true);
            setSubmitError("");

            const fd = new FormData();
            fd.set("name", data.name);
            fd.set("costPrice", String(data.costPrice));
            fd.set("sellingPrice", String(data.sellingPrice));
            fd.set("categoryId", data.categoryId || "");
            fd.set("description", data.description || "");

            // Build attributes object from pairs
            const attrsObj = {};
            for (const pair of attributes) {
                if (pair.name?.trim()) {
                    attrsObj[pair.name.trim()] = pair.value?.trim() || "";
                }
            }
            fd.set("attributes", JSON.stringify(attrsObj));

            // Append images
            const imgs = data.images
                ? Array.isArray(data.images)
                    ? data.images
                    : Array.from(data.images)
                : [];
            for (const file of imgs) {
                fd.append("images", file);
            }

            await onSubmit(fd);
        } catch (err) {
            setSubmitError(err?.message || "Failed to submit");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDisabled = isSubmitting;
    const baseInput =
        "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-0 focus:border-indigo-500 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60";
    const baseTextarea = baseInput;

    return (
        <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                {submitError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {submitError}
                    </div>
                ) : null}

                {/* Basic Info */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="text-base font-semibold text-gray-900">Basic Info</h2>
                    <div className="mt-4 space-y-4">
                        <div>
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
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
                                    className="mt-1"
                                    disabled={isDisabled}
                                    {...register("sellingPrice")}
                                />
                                {errors.sellingPrice ? (
                                    <p className="mt-1 text-xs text-red-600">
                                        {errors.sellingPrice.message}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="categoryId">Category</Label>
                            <select
                                id="categoryId"
                                className={baseInput + " mt-1"}
                                disabled={isDisabled}
                                {...register("categoryId")}
                            >
                                <option value="">No category</option>
                                {categories.map((c) => (
                                    <option key={c?.id ?? c?.name} value={c?.id ?? ""}>
                                        {c?.name || `#${c?.id}`}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId ? (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.categoryId.message}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                rows={4}
                                className={baseTextarea + " mt-1"}
                                disabled={isDisabled}
                                {...register("description")}
                            />
                            {errors.description ? (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.description.message}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Media & Attributes */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="text-base font-semibold text-gray-900">
                        Media & Attributes
                    </h2>

                    <div className="mt-4 space-y-4">
                        <div>
                            <Label htmlFor="images">Images</Label>
                            <input
                                id="images"
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={isDisabled}
                                className={baseTextarea + " mt-1"}
                                {...register("images")}
                                onChange={(e) => {
                                    // Let RHF handle it, but also force validation
                                    register("images").onChange(e);
                                }}
                            />
                            {errors.images ? (
                                <p className="mt-1 text-xs text-red-600">{errors.images.message}</p>
                            ) : null}

                            {/* Thumbnails */}
                            {imagePreviews.length > 0 ? (
                                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {imagePreviews.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.file?.name || "Preview"}
                                                className="h-20 w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => removeImage(idx)}
                                                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-sm leading-none text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                aria-label="Remove image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <div className="text-xs text-gray-500">Attributes</div>
                            <div className="mt-2 space-y-2">
                                {attributes.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border border-gray-100 bg-white p-4"
                                    >
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                            <div className="sm:col-span-2">
                                                <Label htmlFor={`attr-name-${idx}`}>Name</Label>
                                                <Input
                                                    id={`attr-name-${idx}`}
                                                    className="mt-1"
                                                    disabled={isDisabled}
                                                    value={row.name}
                                                    onChange={(e) =>
                                                        setAttributes((prev) =>
                                                            prev.map((p, i) =>
                                                                i === idx ? { ...p, name: e.target.value } : p
                                                            )
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label htmlFor={`attr-value-${idx}`}>Value</Label>
                                                    <button
                                                        type="button"
                                                        disabled={isDisabled}
                                                        onClick={() =>
                                                            setAttributes((prev) =>
                                                                prev.length <= 1
                                                                    ? [{ name: "", value: "" }]
                                                                    : prev.filter((_, i) => i !== idx)
                                                            )
                                                        }
                                                        className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <Input
                                                    id={`attr-value-${idx}`}
                                                    className="mt-1"
                                                    disabled={isDisabled}
                                                    value={row.value}
                                                    onChange={(e) =>
                                                        setAttributes((prev) =>
                                                            prev.map((p, i) =>
                                                                i === idx ? { ...p, value: e.target.value } : p
                                                            )
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() =>
                                        setAttributes((prev) => [...prev, { name: "", value: "" }])
                                    }
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    + Add attribute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isDisabled}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isDisabled || !isDirty}>
                        {isSubmitting ? "Submitting…" : submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
}

