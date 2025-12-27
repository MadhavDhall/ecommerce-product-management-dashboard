"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import axios from "axios";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);

    const schema = z.object({
        email: z.string().email({ message: "Enter a valid email" }),
        password: z.string(),
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = handleSubmit(async (data) => {
        clearErrors("root");
        try {
            const res = await axios.post("/api/login", data);
            // Success: optionally redirect
            // router.push("/dashboard");
        } catch (error) {
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.error || error?.message;
            const msg =
                status === 400 || status === 401
                    ? (serverMsg || "Invalid email or password")
                    : status >= 500
                        ? "Internal Server Error. Please try again later."
                        : (serverMsg || "Something went wrong.");
            setError("root", { type: "server", message: msg });
        }
    });

    return (
        <div className="min-h-svh bg-linear-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <Card className="p-8">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-linear-to-br from-indigo-600 to-violet-600" />
                            <span className="text-xl font-semibold tracking-tight text-gray-900">Dhall Ecom Admin</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">Sign in to manage your products and orders</p>
                    </div>

                    {errors.root?.message && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {errors.root.message}
                        </div>
                    )}
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="you@company.com"
                                aria-invalid={!!errors.email || undefined}
                                className="mt-1"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="m-0">Password</Label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-pressed={showPassword}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                aria-invalid={!!errors.password || undefined}
                                className="mt-1"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:outline-none" />
                                Remember me
                            </label>
                            <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Forgot password?</a>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                            {isSubmitting ? "Signing in…" : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">By signing in, you agree to the Terms and Privacy.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}