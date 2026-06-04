"use client";

/**
 * Account layout — any authenticated user type can access.
 *
 * On mount, calls Express GET /auth/me with x-license-key to:
 *  1. Verify the domain license (resolveTenant middleware)
 *  2. Confirm the user is authenticated (requireAuth middleware)
 *
 * Outcomes:
 *  • 200  — user is valid, render children
 *  • 401 license error — show the human-readable license message from Express
 *  • 401 auth error    — redirect to /login
 *  • network error     — show a generic error banner
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

// Messages that come from resolveTenant (domain/license errors)
const LICENSE_KEYWORDS = ["license", "expired", "disabled", "not active", "not started"];

function isLicenseError(message: string): boolean {
    const lower = message.toLowerCase();
    return LICENSE_KEYWORDS.some((kw) => lower.includes(kw));
}

type VerifyState = "loading" | "ok" | "license_error" | "auth_error" | "network_error";

export default function AccountLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();
    const [state, setState] = useState<VerifyState>("loading");
    const [licenseMessage, setLicenseMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        fetch(`${EXPRESS_API}/auth/me`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "x-license-key": LICENSE_KEY,
            },
        })
            .then(async (res) => {
                if (cancelled) return;

                if (res.ok) {
                    setState("ok");
                    return;
                }

                // Parse the error body Express always returns as { message: "..." }
                let message = "";
                try {
                    const body = await res.json() as { message?: string };
                    message = body.message ?? "";
                } catch {
                    // ignore parse errors
                }

                if (res.status === 401 && isLicenseError(message)) {
                    setLicenseMessage(message);
                    setState("license_error");
                } else {
                    // Not authenticated — redirect to login
                    setState("auth_error");
                }
            })
            .catch(() => {
                if (!cancelled) setState("network_error");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Redirect unauthenticated users
    useEffect(() => {
        if (state === "auth_error") {
            router.replace("/login");
        }
    }, [state, router]);

    if (state === "loading" || state === "auth_error") {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    if (state === "license_error") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                        <Icon icon="solar:shield-warning-bold" width={24} className="text-red-500" />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900">Access Unavailable</h1>
                    <p className="text-sm text-gray-500 leading-relaxed">{licenseMessage}</p>
                </div>
            </div>
        );
    }

    if (state === "network_error") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-yellow-100 shadow-sm p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                        <Icon icon="solar:wifi-problem-bold" width={24} className="text-yellow-500" />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900">Cannot Reach Server</h1>
                    <p className="text-sm text-gray-500">
                        Unable to connect to the authentication server. Please try again shortly.
                    </p>
                </div>
            </div>
        );
    }

    // state === "ok"
    return (
        <main className="bg-gray-100 min-h-screen">
            <div className="container mx-auto p-2 md:p-4">
                {children}
            </div>
        </main>
    );
}
