"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

import { useUser } from "@/components/context/UserContext";
import { UserCreateSchema, userCreateDefaultValues } from "@/form-schema/user";
import Skeleton from "@/components/ui/Skeleton";

export default function NewUserPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const canManageUsers = !!user?.manageUsers;

    const [values, setValues] = useState(userCreateDefaultValues);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!canManageUsers) {
            router.replace("/dashboard/users");
        }
    }, [loading, canManageUsers, router]);

    if (loading || !canManageUsers) {
        return (
            <div className="text-sm text-gray-600">
                {loading ? <Skeleton className="h-4 w-24" /> : "Redirecting…"}
            </div>
        );
    }

    const update = (key, value) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const parsed = UserCreateSchema.safeParse(values);
        if (!parsed.success) {
            const msg = parsed.error.issues?.[0]?.message || "Invalid details";
            setError(msg);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/users/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed.data),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(json?.error || "Failed to create user");
                return;
            }

            router.push("/dashboard/users");
        } catch (err) {
            setError(err?.message || "Failed to create user");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs text-gray-500">Users</div>
                    <h1 className="mt-1 text-lg font-semibold text-gray-900">New User</h1>
                    <div className="mt-1 text-xs text-gray-600">Create a user and assign permissions.</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            router.push("/dashboard/users");
                        }}
                    >
                        Back
                    </Button>
                </div>
            </div>

            <Card className="mt-4 p-6">
                {error ? (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <form onSubmit={onSubmit} className="space-y-4">
                    <fieldset disabled={isSubmitting} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="e.g. Rahul Sharma"
                                className="mt-1"
                                value={values.name}
                                onChange={(e) => update("name", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="e.g. user@company.com"
                                className="mt-1"
                                value={values.email}
                                onChange={(e) => update("email", e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="m-0">Password</Label>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-pressed={showPassword}
                                    className={
                                        isSubmitting
                                            ? "text-xs font-medium text-gray-400 cursor-not-allowed"
                                            : "text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="mt-1"
                                value={values.password}
                                onChange={(e) => update("password", e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-900">Permissions</div>
                            <div className="mt-2 flex flex-wrap items-center gap-4">
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!values.manageUsers}
                                        onChange={(e) => update("manageUsers", e.target.checked)}
                                    />
                                    Manage Users
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!values.manageProducts}
                                        onChange={(e) => update("manageProducts", e.target.checked)}
                                    />
                                    Manage Products
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!values.manageInventory}
                                        onChange={(e) => update("manageInventory", e.target.checked)}
                                    />
                                    Manage Inventory
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating…" : "Create User"}
                            </Button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => router.push("/dashboard/users")}
                                className={
                                    isSubmitting
                                        ? "text-sm font-medium text-gray-400 cursor-not-allowed"
                                        : "text-sm font-medium text-gray-600 hover:text-gray-800"
                                }
                            >
                                Cancel
                            </button>
                        </div>
                    </fieldset>
                </form>
            </Card>
        </>
    );
}
