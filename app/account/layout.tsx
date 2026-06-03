"use client";

import { useUser } from "@/context/Provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";

/**
 * Account layout — any authenticated user type can access.
 * Redirects to / if not logged in. app\account\settings\page.tsx
 */
export default function AccountLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/");
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    if (!user) return null; // redirect in progress

    return (
        <main className="bg-gray-100 min-h-screen">
            <div className="container mx-auto p-2 md:p-4">
                {children}
            </div>
        </main>
    );
}
