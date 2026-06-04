"use client";

/**
 * (auth) layout — login and signup pages.
 * Redirects already-authenticated users to the home page.
 */

import { useUser } from "@/context/Provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.replace("/");
        }
    }, [loading, user, router]);

    if (loading || user) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            {children}
        </main>
    );
}
