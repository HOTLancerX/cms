"use client";

/**
 * (auth) layout — login and signup pages.
 * Redirects already-authenticated users to the home page.
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [status, router]);

    if (status === "loading" || status === "authenticated") {
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
