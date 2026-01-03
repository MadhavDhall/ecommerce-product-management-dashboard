"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

export default function DeleteProductDialog({
    open,
    productId,
    productName,
    onClose,
    onDeleted,
}) {
    const [confirmName, setConfirmName] = useState("");
    const [error, setError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const name = useMemo(() => String(productName ?? ""), [productName]);
    const confirmMatches = confirmName.trim() === name;

    useEffect(() => {
        if (!open) return;
        setConfirmName("");
        setError("");
        setIsDeleting(false);
    }, [open, name]);

    const close = () => {
        if (isDeleting) return;
        onClose?.();
    };

    const doDelete = async () => {
        if (!open || isDeleting) return;
        if (!productId || !confirmMatches) return;

        setIsDeleting(true);
        setError("");
        try {
            const res = await fetch(`/api/products/${encodeURIComponent(String(productId))}`, {
                method: "DELETE",
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(json?.error || "Failed to delete product.");
                return;
            }

            await onDeleted?.();
            onClose?.();
        } catch (e) {
            setError(e?.message || "Failed to delete product.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Delete product confirmation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <Card className="w-full max-w-lg p-6">
                <div className="text-base font-semibold text-gray-900">Delete product</div>
                <div className="mt-1 text-sm text-gray-600">
                    This action can’t be undone. Type <span className="font-semibold text-gray-900">{name}</span> to confirm.
                </div>

                <div className="mt-4">
                    <Label htmlFor="deleteConfirm">Product name</Label>
                    <Input
                        id="deleteConfirm"
                        className="mt-1"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={name}
                        autoFocus
                        disabled={isDeleting}
                    />
                </div>

                {error ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={close} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className={
                            confirmMatches
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                        }
                        onClick={doDelete}
                        disabled={!confirmMatches || isDeleting}
                    >
                        {isDeleting ? "Deleting…" : "Delete"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
