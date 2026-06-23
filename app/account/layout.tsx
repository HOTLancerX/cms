"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { DEFAULT_USER_NAV, type UserNavItem } from "./usernav";
import { getAllUserNavItems } from "@/hook";
import { reregisterHooks } from "@/hook/PluginList";
import { xFetch } from "@/lib/express";

const ROLE_CONFIG: Record<string, { label: string; linear: string; icon: string }> = {
    admin:    { label: "Admin",    linear: "from-violet-500 to-purple-600", icon: "solar:shield-bold"            },
    editor:   { label: "Editor",   linear: "from-blue-500 to-cyan-500",     icon: "solar:pen-bold"               },
    reporter: { label: "Reporter", linear: "from-sky-500 to-blue-500",      icon: "solar:document-bold"          },
    seller:   { label: "Seller",   linear: "from-amber-500 to-orange-500",  icon: "solar:shop-bold"              },
    user:     { label: "Member",   linear: "from-indigo-500 to-blue-600",   icon: "solar:user-bold"              },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();

    const { data: session, status } = useSession();
    const user = session?.user as any ?? null;

    const [sidebarOpen,  setSidebarOpen]  = useState(false);
    const [pluginsReady, setPluginsReady] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        xFetch("/plugin/installed", { cache: "no-store" })
            .then((r) => r.json())
            .then((data: { plugins: { nx: string; status: string }[] }) => {
                const ids = (data.plugins ?? [])
                    .filter((p) => p.status === "active")
                    .map((p) => p.nx);
                reregisterHooks(ids);
            })
            .catch(() => { reregisterHooks([]); })
            .finally(() => setPluginsReady(true));
    }, []);

    if (status === "loading" || status === "unauthenticated") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Icon icon="svg-spinners:ring-resize" width={22} className="text-white" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Loading your account…</p>
                </div>
            </div>
        );
    }

    const isAdmin    = user?.type === "admin";
    const isSeller   = user?.type === "seller";
    const isReporter = user?.type === "reporter";
    const roleConf   = ROLE_CONFIG[user?.type ?? "user"] ?? ROLE_CONFIG.user;
    const initials = user?.name?.charAt(0).toUpperCase() ?? "?";

    // Build nav list from defaults + plugin-registered items
    const pluginNav: UserNavItem[] = (pluginsReady ? getAllUserNavItems() : [])
        .filter(n => !(n.sellerOnly   && !isSeller))
        .filter(n => !(n.reporterOnly && !isReporter))
        .map(n => ({
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

    const handleLogOut = async () => {
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000"}/auth/logout`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "x-license-key": process.env.NEXT_PUBLIC_LICENSE_KEY ?? "",
                    },
                }
            );
        } catch { /* ignore */ }
        await signOut({ redirect: false });
        router.replace("/");
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Sidebar — single source of truth for both desktop and mobile drawer
    // ─────────────────────────────────────────────────────────────────────────
    const SidebarContent = (
        <aside className="flex flex-col gap-3 h-full">

            {/* ── Site link ── */}
            <div className="flex items-center justify-between">
                <Link href="/"
                    className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition group">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition shrink-0">
                        <Icon icon="solar:home-2-bold" width={14} className="text-gray-500" />
                    </span>
                    Back to site
                </Link>
                {/* Close button — mobile only */}
                <button onClick={() => setSidebarOpen(false)}
                    className="md:hidden p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                    <Icon icon="solar:close-bold" width={15} />
                </button>
            </div>

            {/* ── Profile card ── */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
                {/* Gradient banner */}
                <div className={`h-12 bg-linear-to-r ${roleConf.linear}`} />

                <div className="px-4 pb-4">
                    {/* Avatar row */}
                    <div className="flex items-end justify-between -mt-6 mb-2.5">
                        <div className="relative shrink-0">
                            {user?.image ? (
                                <img src={user.image} alt={user.name}
                                    className="w-12 h-12 rounded-xl object-cover ring-4 ring-white shadow-md" />
                            ) : (
                                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${roleConf.linear} flex items-center justify-center text-white font-bold text-lg ring-4 ring-white shadow-md`}>
                                    {initials}
                                </div>
                            )}
                            {/* Online dot */}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                        </div>

                        {/* Role badge */}
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-linear-to-r ${roleConf.linear}`}>
                            <Icon icon={roleConf.icon} width={9} />
                            {roleConf.label}
                        </span>
                    </div>

                    <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email ?? user?.phone ?? ""}</p>
                    {(user?.city || user?.state) && (
                        <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                            <Icon icon="solar:map-point-bold" width={10} />
                            {[user.city, user.state].filter(Boolean).join(", ")}
                        </p>
                    )}

                    {/* Admin panel shortcut — inside card, only for admins */}
                    {isAdmin && (
                        <Link href="/admin" onClick={() => setSidebarOpen(false)}
                            className="mt-3 flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-100 transition">
                            <span className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                                <Icon icon="solar:shield-bold" width={13} className="text-white" />
                            </span>
                            <span className="text-xs font-bold text-violet-700 flex-1">Admin Panel</span>
                            <Icon icon="solar:arrow-right-bold" width={12} className="text-violet-400" />
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    My Account
                </p>
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.key} href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 mx-2 mb-0.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                                ${active
                                    ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                                <Icon icon={item.icon} width={15} />
                            </span>
                            <span className="flex-1 truncate">{item.label}</span>
                            {active && <Icon icon="solar:arrow-right-bold" width={12} className="text-white/60 shrink-0" />}
                        </Link>
                    );
                })}
                <div className="h-2" />
            </nav>

            {/* ── Seller quick card ── */}
            {isSeller && (
                <div className="rounded-2xl p-4 bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/40">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon icon="solar:shop-bold" width={15} />
                        <span className="text-sm font-bold">Seller Store</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { label: "Products", href: "/account/post/product",     icon: "solar:box-bold"           },
                            { label: "Orders",   href: "/account/seller-orders",    icon: "solar:bag-5-bold"         },
                            { label: "Wallet",   href: "/account/seller-wallet",    icon: "solar:wallet-bold"        },
                            { label: "Add new",  href: "/account/post/product/new", icon: "solar:add-circle-bold"    },
                        ].map(l => (
                            <Link key={l.href} href={l.href} onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition">
                                <Icon icon={l.icon} width={12} />
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Reporter quick card ── */}
            {isReporter && (
                <div className="rounded-2xl p-4 bg-linear-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-200/40">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon icon="solar:document-bold" width={15} />
                        <span className="text-sm font-bold">Reporter</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { label: "My Posts", href: "/account/post/blog",     icon: "solar:document-bold"    },
                            { label: "Write",    href: "/account/post/blog/new", icon: "solar:add-circle-bold"  },
                        ].map(l => (
                            <Link key={l.href} href={l.href} onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition">
                                <Icon icon={l.icon} width={12} />
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Sign Out — pushed to bottom on desktop ── */}
            <div className="mt-auto">
                <button onClick={handleLogOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-500 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 transition-all">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 shrink-0">
                        <Icon icon="solar:logout-bold" width={14} className="text-red-400" />
                    </span>
                    Sign Out
                </button>
            </div>
        </aside>
    );

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ═══════════════════════════════════════════════════════════
                Mobile-only top bar  (hamburger to open sidebar drawer)
                Hidden on md+ because the sidebar is always visible there.
            ═══════════════════════════════════════════════════════════ */}
            <div className="md:hidden sticky top-0 z-30 flex items-center justify-between
                            bg-white border-b border-gray-200 px-4 h-14 gap-3">

                {/* Left: back to site */}
                <Link href="/"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                    <Icon icon="solar:home-2-bold" width={16} />
                    <span className="sr-only">Home</span>
                </Link>

                {/* Center: page label */}
                <span className="text-sm font-bold text-gray-800 truncate">My Account</span>

                {/* Right: avatar + open-drawer button */}
                <button onClick={() => setSidebarOpen(v => !v)}
                    className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
                    aria-label="Open menu">
                    {user?.image ? (
                        <img src={user.image} alt={user.name} className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                        <div className={`w-7 h-7 rounded-lg bg-linear-to-br ${roleConf.linear} flex items-center justify-center text-white font-bold text-xs`}>
                            {initials}
                        </div>
                    )}
                    <Icon icon={sidebarOpen ? "solar:close-bold" : "solar:hamburger-menu-bold"} width={16} className="text-gray-600" />
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                Mobile drawer backdrop + slide-in panel
            ═══════════════════════════════════════════════════════════ */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)} />
            )}
            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 md:hidden
                             overflow-y-auto p-4 shadow-2xl
                             transition-transform duration-300
                             ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {SidebarContent}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                Desktop layout  — sidebar + content side-by-side
            ═══════════════════════════════════════════════════════════ */}
            <div className="container mx-auto px-4 py-6 md:py-8">
                <div className="flex gap-6 items-start">

                    {/* Sidebar — sticky, full height feel */}
                    <div className="hidden md:flex flex-col w-64 shrink-0 sticky top-6"
                         style={{ maxHeight: "calc(100vh - 3rem)" }}>
                        {SidebarContent}
                    </div>

                    {/* Main content */}
                    <main className="flex-1 min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
