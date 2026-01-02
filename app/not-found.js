import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-svh bg-linear-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xl">
                <Card className="p-8">
                    <div className="flex flex-col items-center text-center">
                        <img src="/logo.svg" alt="Dhall Ecom" className="h-12 w-12" />
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            Error 404
                        </div>

                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                            Page not found
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            The page you’re looking for doesn’t exist or was moved. Use the options below to get back on track.
                        </p>

                        <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
                            <Link href="/" className="w-full">
                                <Button variant="outline" className="w-full">Go Home</Button>
                            </Link>
                            <Link href="/dashboard" className="w-full">
                                <Button className="w-full">Open Dashboard</Button>
                            </Link>
                            <Link href="/register" className="w-full">
                                <Button variant="subtle" className="w-full">Get Started</Button>
                            </Link>
                        </div>

                        <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
                            <div className="text-xs font-medium text-gray-500">Tip</div>
                            <div className="mt-1 text-sm text-gray-700">
                                If you typed the URL manually, double-check the spelling. Otherwise, head back to the dashboard and navigate from the sidebar.
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="mt-4 text-center text-xs text-gray-500">
                    © {new Date().getFullYear()} Dhall Ecom
                </div>
            </div>
        </div>
    );
}
