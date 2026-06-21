"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";
import { DEFAULT_USER_NAV, type UserNavItem } from "./usernav";
import { getAllUserNavItems } from "@/hook";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();

    // ── Auth via NextAuth — no Express fetch ──────────────────────────────────
    const { data: session, status } = useSession();
    const user = session?.user as any ?? null;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Redirect to login when unauthenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    // ── Loading / redirecting ─────────────────────────────────────────────────
    if (status === "loading" || status === "unauthenticated") {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-300">
                <Icon icon="svg-spinners:ring-resize" width={36} />
            </div>
        );
    }

    // ── Nav items — defaults merged with plugin-registered items ──────────────
    const pluginNav: UserNavItem[] = getAllUserNavItems().map(n => ({
        key:      n.key,
        label:    n.label,
        icon:     n.icon,
        href:     `/account/${n.slug}`,
        position: n.position,
    }));

    const seen = new Set<string>();
    const navItems: UserNavItem[] = [...DEFAULT_USER_NAV, ...pluginNav]
        .sort((a, b) => a.position - b.position)
        .filter(item => {
            if (seen.has(item.href)) return false;
            seen.add(item.href);
            return true;
        });

    const isActive = (href: string) =>
        href === "/account"
            ? pathname === "/account"
            : pathname?.startsWith(href) ?? false;

    // ── Sidebar ───────────────────────────────────────────────────────────────
    const Sidebar = (
        <aside className="flex flex-col gap-6">
            {/* User card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center gap-3">
                {user?.image ? (
                    <img src={user.image} alt={user.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-main/20" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-main/10 flex items-center justify-center text-main font-bold text-2xl">
                        {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                )}
                <div>
                    <p className="text-sm font-bold text-gray-900">{user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5 break-all">
                        {user?.email ?? user?.phone ?? ""}
                    </p>
                    {user?.type && (
                        <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 capitalize">
                            {user.type}
                        </span>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {navItems.map((item, i) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors
                                ${i > 0 ? "border-t border-gray-50" : ""}
                                ${active
                                    ? "bg-main/5 text-main"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <Icon icon={item.icon} width={18}
                                className={active ? "text-main" : "text-gray-400"} />
                            {item.label}
                            {active && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-main" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile top bar */}
            <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    {user?.image ? (
                        <img src={user.image} alt={user.name}
                            className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-main/10 flex items-center justify-center text-main font-bold text-sm">
                            {user?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                    )}
                    <span className="text-sm font-semibold text-gray-800">
                        {user?.name ?? "Account"}
                    </span>
                </div>
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500"
                    aria-label="Toggle menu"
                >
                    <Icon icon={sidebarOpen ? "mdi:close" : "mdi:menu"} width={22} />
                </button>
            </div>

            {/* Mobile drawer */}
            {sidebarOpen && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40 md:hidden"
                        onClick={() => setSidebarOpen(false)} />
                    <div className="fixed left-0 top-0 h-full w-72 bg-gray-50 z-50 md:hidden overflow-y-auto p-4 space-y-4 shadow-xl">
                        {Sidebar}
                    </div>
                </>
            )}

            {/* Desktop layout */}
            <div className="container mx-auto px-4 py-6 md:py-8">
                <div className="flex gap-6 items-start">
                    <div className="hidden md:block w-64 shrink-0 sticky top-8">
                        {Sidebar}
                    </div>
                    <main className="flex-1 min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
