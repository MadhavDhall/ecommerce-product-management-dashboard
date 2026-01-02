"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Card from "@/components/ui/Card";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { UserCreateSchema, userCreateDefaultValues } from "@/form-schema/user";

export default function UserForm({
    onSubmit,
    submitLabel = "Create User",
    defaultValues,
}) {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
        reset,
    } = useForm({
        resolver: zodResolver(UserCreateSchema),
        defaultValues: {
            ...userCreateDefaultValues,
            ...(defaultValues || {}),
        },
    });

    const submit = handleSubmit(async (data) => {
        clearErrors("root");
        try {
            await onSubmit?.(data);
            reset({
                ...userCreateDefaultValues,
                ...(defaultValues || {}),
            });
        } catch (error) {
            const msg = error?.message || "Failed to create user.";
            setError("root", { type: "server", message: msg });
        }
    });

    return (
        <Card className="mt-4 p-6">
            {errors.root?.message ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errors.root.message}
                </div>
            ) : null}

            <form onSubmit={submit} className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2">
                <div>
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <div className="relative mt-1">
                        <Input
                            id="name"
                            autoComplete="name"
                            placeholder="Jane Doe"
                            className="pl-9"
                            {...register("name")}
                            aria-invalid={!!errors.name || undefined}
                        />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </span>
                    </div>
                    {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
                </div>

                <div>
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <div className="relative mt-1">
                        <Input
                            id="email"
                            autoComplete="email"
                            type="email"
                            placeholder="jane@company.com"
                            className="pl-9"
                            {...register("email")}
                            aria-invalid={!!errors.email || undefined}
                        />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M4 4h16v16H4z" fill="none" />
                                <path d="M22 6l-10 7L2 6" />
                            </svg>
                        </span>
                    </div>
                    {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
                </div>

                <div className="min-[800px]:col-span-2">
                    <div className="text-xs font-medium text-gray-500">Permissions</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 min-[800px]:grid-cols-3">
                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                            <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register("manageProducts")} />
                            Manage products
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                            <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register("manageInventory")} />
                            Manage inventory
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                            <input type="checkbox" className="h-4 w-4 accent-indigo-600" {...register("manageUsers")} />
                            Manage users
                        </label>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-pressed={showPassword}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                    <div className="relative mt-1">
                        <Input
                            id="password"
                            autoComplete="new-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9"
                            {...register("password")}
                            aria-invalid={!!errors.password || undefined}
                        />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M5 12a7 7 0 0 1 14 0" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </span>
                    </div>
                    {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
                </div>

                <div className="min-[800px]:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => reset()}>Reset</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating…" : submitLabel}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
