"use client";

import { useUser } from "@/context/Provider";
import { Icon } from "@iconify/react";
import Link from "next/link";

const ROLE_CONFIG: Record<string, {
    label: string; linear: string; lightBg: string;
    textColor: string; icon: string; description: string;
}> = {
    admin:    { label: "Admin",    linear: "from-violet-500 to-purple-600",  lightBg: "bg-violet-50",  textColor: "text-violet-600",  icon: "solar:shield-bold",       description: "Full system access"     },
    editor:   { label: "Editor",   linear: "from-blue-500 to-cyan-500",      lightBg: "bg-blue-50",    textColor: "text-blue-600",    icon: "solar:pen-bold",           description: "Content management"     },
    reporter: { label: "Reporter", linear: "from-sky-500 to-blue-500",       lightBg: "bg-sky-50",     textColor: "text-sky-600",     icon: "solar:document-bold",      description: "Publishing & reporting" },
    seller:   { label: "Seller",   linear: "from-amber-500 to-orange-500",   lightBg: "bg-amber-50",   textColor: "text-amber-600",   icon: "solar:shop-bold",          description: "Seller storefront"      },
    user:     { label: "Member",   linear: "from-indigo-500 to-blue-600",    lightBg: "bg-indigo-50",  textColor: "text-indigo-600",  icon: "solar:user-circle-bold",   description: "Valued customer"        },
};

// ── Admin quick access ────────────────────────────────────────────────────────
const ADMIN_SHORTCUTS = [
    { label: "Dashboard",    href: "/admin",                  icon: "solar:home-2-bold",              bg: "bg-violet-50",  color: "text-violet-600"  },
    { label: "Posts",        href: "/admin/posts",            icon: "solar:document-bold",            bg: "bg-blue-50",    color: "text-blue-600"    },
    { label: "Products",     href: "/admin/posts/product",    icon: "solar:cart-large-bold",          bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "Orders",       href: "/admin/orders",           icon: "solar:receipt-bold",             bg: "bg-amber-50",   color: "text-amber-600"   },
    { label: "Users",        href: "/admin/users",            icon: "solar:users-group-rounded-bold", bg: "bg-sky-50",     color: "text-sky-600"     },
    { label: "Seller",       href: "/admin/seller",           icon: "solar:shop-bold",                bg: "bg-orange-50",  color: "text-orange-600"  },
    { label: "Plugins",      href: "/admin/plugin",           icon: "solar:widget-bold",              bg: "bg-pink-50",    color: "text-pink-600"    },
    { label: "Settings",     href: "/admin/settings",         icon: "solar:settings-bold",            bg: "bg-gray-100",   color: "text-gray-600"    },
];

// ── Seller stat cards ─────────────────────────────────────────────────────────
const SELLER_STATS = [
    { label: "My Products",   icon: "solar:box-bold",           linear: "from-amber-500 to-orange-500",  href: "/account/post/product"   },
    { label: "Seller Orders", icon: "solar:bag-5-bold",         linear: "from-indigo-500 to-blue-600",   href: "/account/seller-orders"  },
    { label: "Revenue",       icon: "solar:wallet-money-bold",  linear: "from-emerald-500 to-teal-500",  href: "/account/seller-wallet"  },
    { label: "Rating",        icon: "solar:star-bold",          linear: "from-amber-400 to-yellow-500",  href: "/account"                },
];

const USER_STATS = [
    { label: "Total Orders",   icon: "solar:bag-5-bold",         linear: "from-indigo-500 to-blue-600",   href: "/account/orders"    },
    { label: "Wishlist",       icon: "solar:heart-bold",         linear: "from-pink-500 to-rose-500",     href: "/account/wishlist"  },
    { label: "Addresses",      icon: "solar:map-point-bold",     linear: "from-teal-500 to-emerald-500",  href: "/account/settings"  },
    { label: "Rewards",        icon: "solar:medal-ribbons-bold", linear: "from-amber-500 to-yellow-500",  href: "/account"           },
];

// ── Quick actions ─────────────────────────────────────────────────────────────
const SELLER_ACTIONS = [
    { label: "My Products",      desc: "Manage your product listings",         icon: "solar:box-bold",            iconBg: "bg-amber-50",   iconColor: "text-amber-600",   href: "/account/post/product"      },
    { label: "Seller Orders",    desc: "View and process incoming orders",     icon: "solar:clipboard-list-bold", iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  href: "/account/seller-orders"     },
    { label: "My Wallet",        desc: "Check earnings and request payouts",   icon: "solar:wallet-bold",         iconBg: "bg-emerald-50", iconColor: "text-emerald-600", href: "/account/seller-wallet"     },
    { label: "Account Settings", desc: "Update your profile and store info",   icon: "solar:settings-bold",       iconBg: "bg-gray-100",   iconColor: "text-gray-600",    href: "/account/settings"          },
];

const USER_ACTIONS = [
    { label: "My Orders",        desc: "Track deliveries and order history",   icon: "solar:bag-5-bold",          iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  href: "/account/orders"   },
    { label: "Account Settings", desc: "Update profile, address and password", icon: "solar:settings-bold",       iconBg: "bg-gray-100",   iconColor: "text-gray-600",    href: "/account/settings" },
    { label: "Wishlist",         desc: "Products you saved for later",         icon: "solar:heart-bold",          iconBg: "bg-pink-50",    iconColor: "text-pink-500",    href: "/account/wishlist" },
];

export default function AccountPage() {
    const { user } = useUser();
    if (!user) return null;

    const isAdmin    = user.type === "admin";
    const isSeller   = user.type === "seller";
    const roleConf   = ROLE_CONFIG[user.type] ?? ROLE_CONFIG.user;
    const stats      = isSeller ? SELLER_STATS  : USER_STATS;
    const actions    = isSeller ? SELLER_ACTIONS : USER_ACTIONS;
    const firstName  = user.name.split(" ")[0];
    const initials   = user.name.charAt(0).toUpperCase();
    const hasAddress = user.address || user.city || user.state;
    const hour       = new Date().getHours();
    const greeting   = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
        <div className="space-y-5">

            {/* ── Hero banner ── */}
            <div className={`relative overflow-hidden rounded-2xl bg-linear-to-r ${roleConf.linear} p-5 md:p-7 text-white shadow-lg`}>
                {/* Decorative circles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-10 -left-4 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute top-1/2 right-20 w-10 h-10 rounded-full bg-white/10" />
                </div>

                <div className="relative flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {user.image ? (
                            <img src={user.image} alt={user.name}
                                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl" />
                        ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-3xl ring-4 ring-white/20 shadow-xl">
                                {initials}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-sm font-medium">{greeting},</p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mt-0.5 truncate">{firstName}!</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
                                <Icon icon={roleConf.icon} width={11} />
                                {roleConf.label}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium bg-white/10 text-white/80 px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                Active
                            </span>
                        </div>
                    </div>

                    <Link href="/account/settings"
                        className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl transition shrink-0">
                        <Icon icon="solar:settings-bold" width={14} />
                        Edit profile
                    </Link>
                </div>

                {/* Contact info strip */}
                <div className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1">
                    {user.email && (
                        <span className="flex items-center gap-1.5 text-xs text-white/65">
                            <Icon icon="solar:letter-bold" width={12} />{user.email}
                        </span>
                    )}
                    {user.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-white/65">
                            <Icon icon="solar:phone-bold" width={12} />{user.phone}
                        </span>
                    )}
                    {hasAddress && (
                        <span className="flex items-center gap-1.5 text-xs text-white/65">
                            <Icon icon="solar:map-point-bold" width={12} />
                            {[user.address, user.city, user.state, user.zipCode].filter(Boolean).join(", ")}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Admin control center ── */}
            {isAdmin && (
                <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-linear-to-r from-violet-600 to-purple-700 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                                <Icon icon="solar:shield-bold" width={14} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Admin Control Center</p>
                                <p className="text-[10px] text-white/70">Full platform management</p>
                            </div>
                        </div>
                        <Link href="/admin"
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition">
                            Open Panel
                            <Icon icon="solar:arrow-right-bold" width={11} />
                        </Link>
                    </div>
                    <div className="p-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {ADMIN_SHORTCUTS.map(s => (
                            <Link key={s.href} href={s.href}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 transition group text-center">
                                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <Icon icon={s.icon} width={18} className={s.color} />
                                </div>
                                <span className="text-[10px] font-semibold text-gray-600 group-hover:text-gray-900 leading-tight">{s.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map(stat => (
                    <Link key={stat.label} href={stat.href}
                        className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${stat.linear} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.linear} flex items-center justify-center shadow-sm mb-3`}>
                            <Icon icon={stat.icon} width={18} className="text-white" />
                        </div>
                        <p className="text-2xl font-black text-gray-900">—</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</p>
                    </Link>
                ))}
            </div>

            {/* ── Quick actions ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800">Quick Actions</h2>
                    <span className="text-xs text-gray-400">{actions.length} shortcuts</span>
                </div>
                <div className="divide-y divide-gray-50">
                    {actions.map(action => (
                        <Link key={action.label} href={action.href}
                            className="group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors">
                            <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                                <Icon icon={action.icon} width={19} className={action.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{action.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
                            </div>
                            <Icon icon="solar:arrow-right-bold" width={15}
                                className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Seller CTA ── */}
            {isSeller && (
                <div className="rounded-2xl overflow-hidden bg-linear-to-r from-amber-50 to-orange-50 border border-amber-100 p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
                        <Icon icon="solar:chart-bold" width={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">Ready to grow your store?</p>
                        <p className="text-xs text-amber-600/80 mt-0.5">Add products and fulfill pending orders to boost sales.</p>
                    </div>
                    <Link href="/account/post/product/new"
                        className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-amber-500 to-orange-500 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all">
                        Add product
                    </Link>
                </div>
            )}

            {/* ── Profile completion nudge ── */}
            {!hasAddress && (
                <div className="rounded-2xl bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <Icon icon="solar:info-circle-bold" width={18} className="text-indigo-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-indigo-800">Complete your profile</p>
                        <p className="text-xs text-indigo-600/80 mt-0.5">Add your shipping address for faster checkout.</p>
                    </div>
                    <Link href="/account/settings"
                        className="shrink-0 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-colors">
                        Update
                    </Link>
                </div>
            )}

            {/* ── Account info summary ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800">Account Information</h2>
                    <Link href="/account/settings"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
                        <Icon icon="solar:pen-bold" width={12} />
                        Edit
                    </Link>
                </div>
                <div className="divide-y divide-gray-50">
                    {[
                        { label: "Full Name",    value: user.name,                                                      icon: "solar:user-bold"      },
                        { label: "Email",        value: user.email,                                                     icon: "solar:letter-bold"    },
                        { label: "Phone",        value: user.phone || "—",                                              icon: "solar:phone-bold"     },
                        { label: "Address",      value: user.address || "—",                                            icon: "solar:home-bold"      },
                        { label: "City / State", value: [user.city, user.state].filter(Boolean).join(", ") || "—",     icon: "solar:map-point-bold" },
                        { label: "Zip Code",     value: user.zipCode || "—",                                           icon: "solar:map-bold"       },
                    ].map(row => (
                        <div key={row.label} className="flex items-center gap-3 px-5 py-3">
                            <span className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <Icon icon={row.icon} width={13} className="text-gray-400" />
                            </span>
                            <span className="text-xs font-semibold text-gray-400 w-24 shrink-0">{row.label}</span>
                            <span className="text-sm text-gray-700 truncate">{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
