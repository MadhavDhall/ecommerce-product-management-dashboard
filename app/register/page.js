"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import axios from "axios";
import { preload } from "swr";

const schema = z.object({
    companyName: z.string().min(2, { message: "Company name is required" }),
    ownerName: z.string().min(2, { message: "Owner name is required" }),
    ownerEmail: z.string().email({ message: "Enter a valid email" }),
    ownerPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const fetcher = async (url) => {
    const res = await fetch(url, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json?.error || "Request failed");
        err.status = res.status;
        err.data = json;
        throw err;
    }
    return json;
};

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            companyName: "",
            ownerName: "",
            ownerEmail: "",
            ownerPassword: "",
        },
    });

    const preloadUrls = [
        "/api/products/count",
        "/api/inventory/count",
        "/api/orders/count",
        "/api/products",
        "/api/orders",
        "/api/inventory",
    ];

    const preloadDashboardData = async () => {
        try {
            await Promise.allSettled(
                preloadUrls.map((url) =>
                    preload(url, fetcher)
                )
            );
        } catch (error) {
            console.error("Preload failed:", error);
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        setSubmitted(false);
        clearErrors("root");
        try {
            await axios.post("/api/register", {
                companyName: data.companyName,
                ownerName: data.ownerName,
                ownerEmail: data.ownerEmail,
                ownerPassword: data.ownerPassword,
            });
            setSubmitted(true);

            // Success: redirect to dashboard
            // now preload all the necessry apis for dashboard overview
            await preloadDashboardData();

            router.push("/dashboard");
        } catch (error) {
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.error || error?.message;
            const msg =
                status === 400 || status === 401 || status === 409
                    ? (serverMsg || "Please check your details")
                    : status >= 500
                        ? "Internal Server Error. Please try again later."
                        : (serverMsg || "Something went wrong.");
            setError("root", { type: "server", message: msg });
        }
    });

    return (
        <div className="min-h-svh bg-linear-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl">
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <span aria-hidden="true">←</span>
                        Back to Home
                    </Link>
                </div>
                <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                    <div className="lg:pt-8">
                        <div className="inline-flex items-center gap-2">
                            <img src="/logo.svg" alt="Dhall Ecom" className="h-10 w-10" />
                            <div>
                                <div className="text-xl font-semibold tracking-tight text-gray-900">Dhall Ecom</div>
                                <div className="text-sm text-gray-500">Company dashboard for operations & analytics</div>
                            </div>
                        </div>

                        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
                            Create your company workspace
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Set up your company dashboard, add your team, manage products & inventory, and track analytics — all in one place.
                        </p>

                        <div className="mt-6 space-y-3">
                            {["Company-based dashboards", "Role-based users & permissions", "Product + Inventory management", "Analytics & charts"].map((t) => (
                                <div key={t} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 backdrop-blur-sm">
                                    <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-50 text-green-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                                            <path fillRule="evenodd" d="M20.03 6.72a.75.75 0 0 1 0 1.06l-10.5 10.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.97 3.97 9.97-9.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    <div className="text-sm text-gray-700">{t}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 text-sm text-gray-600">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Sign in</Link>
                        </div>
                    </div>

                    <Card className="p-8">
                        <div className="mb-6">
                            <div className="text-lg font-semibold tracking-tight text-gray-900">Get started</div>
                            <div className="mt-1 text-sm text-gray-600">Enter your company and owner details to create a workspace.</div>
                        </div>

                        {errors.root?.message && (
                            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errors.root.message}
                            </div>
                        )}

                        {submitted && (
                            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                                Company created. Redirecting to dashboard…
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-4">
                            <fieldset disabled={isSubmitting} className="space-y-4">
                                <div>
                                    <Label htmlFor="companyName">Company name</Label>
                                    <Input
                                        id="companyName"
                                        type="text"
                                        placeholder="e.g. Acme Pvt Ltd"
                                        aria-invalid={!!errors.companyName || undefined}
                                        className="mt-1"
                                        {...register("companyName")}
                                    />
                                    {errors.companyName && (
                                        <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="ownerName">Owner name</Label>
                                    <Input
                                        id="ownerName"
                                        type="text"
                                        placeholder="e.g. Rahul Sharma"
                                        aria-invalid={!!errors.ownerName || undefined}
                                        className="mt-1"
                                        {...register("ownerName")}
                                    />
                                    {errors.ownerName && (
                                        <p className="mt-1 text-xs text-red-600">{errors.ownerName.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="ownerEmail">Owner email</Label>
                                    <Input
                                        id="ownerEmail"
                                        type="text"
                                        placeholder="e.g. owner@acme.com"
                                        aria-invalid={!!errors.ownerEmail || undefined}
                                        className="mt-1"
                                        {...register("ownerEmail")}
                                    />
                                    {errors.ownerEmail && (
                                        <p className="mt-1 text-xs text-red-600">{errors.ownerEmail.message}</p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="ownerPassword" className="m-0">Password</Label>
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
                                        id="ownerPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        aria-invalid={!!errors.ownerPassword || undefined}
                                        className="mt-1"
                                        {...register("ownerPassword")}
                                    />
                                    {errors.ownerPassword && (
                                        <p className="mt-1 text-xs text-red-600">{errors.ownerPassword.message}</p>
                                    )}
                                </div>

                                <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                                    {isSubmitting ? "Creating…" : "Create Company"}
                                </Button>

                                <p className="text-center text-xs text-gray-500">
                                    By continuing, you agree to the Terms and Privacy.
                                </p>
                            </fieldset>
                        </form>
                    </Card>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">© {new Date().getFullYear()} Dhall Ecom</div>
            </div>
        </div>
    );
}
