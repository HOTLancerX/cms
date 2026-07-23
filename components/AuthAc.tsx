"use client";

/**
 * AuthAc.tsx — Authentication action component.
 *
 * Logged OUT → two buttons: "Sign in" and "Sign up"
 *   - Clicking opens a modal overlay with the AuthForm (login or signup)
 *
 * Logged IN → avatar button that opens a popup with user info + actions
 *   - Shows name, email, role badge
 *   - Links: Account Settings, (Admin Panel if admin)
 *   - Sign out button
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useUser } from "@/context/Provider";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
import AuthForm from "@/components/Auth";

type ModalMode = "login" | "signup" | null;
interface AuthAcProps {
    style?: number;
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    admin: { label: "Admin", cls: "bg-violet-100 text-violet-700" },
    editor: { label: "Editor", cls: "bg-blue-100 text-blue-700" },
    reporter: { label: "Reporter", cls: "bg-sky-100 text-sky-700" },
    seller: { label: "Seller", cls: "bg-amber-100 text-amber-700" },
    user: { label: "User", cls: "bg-gray-100 text-gray-600" },
};

export default function AuthAc({ style = 0 }: AuthAcProps) {
    const { user, loading, refresh } = useUser();
    const router = useRouter();
    const [modal, setModal] = useState<ModalMode>(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // Close popup on outside click
    useEffect(() => {
        if (!popupOpen) return;
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setPopupOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [popupOpen]);

    // Close modal on Escape
    useEffect(() => {
        if (!modal) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setModal(null);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [modal]);

    if (loading) {
        return (
            <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={20} />
            </div>
        );
    }

    // ── Logged OUT ────────────────────────────────────────────────────────────
    if (!user) {
        return (
            <>
                {style === 1 ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-inherit tracking-wide opacity-95">
                        <button
                            onClick={() => setModal("login")}
                            className="hover:underline uppercase transition-opacity cursor-pointer"
                        >
                            LOGIN
                        </button>
                        <span className="opacity-50">/</span>
                        <button
                            onClick={() => setModal("signup")}
                            className="hover:underline uppercase transition-opacity cursor-pointer"
                        >
                            SIGN UP
                        </button>
                    </div>
                ) : style === 2 ? (
                    <button
                        onClick={() => setModal("login")}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-indigo-600 transition cursor-pointer"
                        title="Sign in"
                    >
                        <Icon icon="solar:user-bold" width={22} />
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setModal("login")}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Sign in
                        </button>
                        <button
                            onClick={() => setModal("signup")}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer"
                        >
                            Sign up
                        </button>
                    </div>
                )}

                {/* Modal overlay */}
                {modal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setModal(null);
                        }}
                    >
                        <div className="relative w-full max-w-md">
                            {/* Close button */}
                            <button
                                onClick={() => setModal(null)}
                                className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md text-gray-500 hover:text-gray-800 transition cursor-pointer"
                            >
                                <Icon icon="material-symbols:close" width={16} />
                            </button>

                            <AuthForm mode={modal} />

                            {/* Switch mode link inside modal */}
                            <p className="mt-3 text-center text-sm text-white/80">
                                {modal === "login" ? (
                                    <>
                                        No account?{" "}
                                        <button
                                            onClick={() => setModal("signup")}
                                            className="font-semibold text-white underline cursor-pointer"
                                        >
                                            Sign up
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Have an account?{" "}
                                        <button
                                            onClick={() => setModal("login")}
                                            className="font-semibold text-white underline cursor-pointer"
                                        >
                                            Sign in
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ── Logged IN ─────────────────────────────────────────────────────────────
    const badge = ROLE_BADGE[user.type] ?? ROLE_BADGE.user;

    return (
        <div className="relative" ref={popupRef}>
            {/* Avatar trigger */}
            {style === 1 ? (
                <button
                    onClick={() => setPopupOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-inherit tracking-wide uppercase hover:underline transition-opacity cursor-pointer"
                >
                    MY ACCOUNT
                    <Icon
                        icon="solar:alt-arrow-down-bold"
                        width={10}
                        className={`opacity-70 transition-transform ${popupOpen ? "rotate-180" : ""}`}
                    />
                </button>
            ) : style === 2 ? (
                <button
                    onClick={() => setPopupOpen((v) => !v)}
                    className="flex items-center rounded-full hover:ring-2 hover:ring-indigo-300 transition cursor-pointer"
                >
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-150 flex items-center justify-center text-indigo-750 font-bold text-xs">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </button>
            ) : (
                <button
                    onClick={() => setPopupOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 transition cursor-pointer"
                >
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-200"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm ring-2 ring-indigo-200">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-30 truncate">
                        {user.name}
                    </span>
                    <Icon
                        icon="solar:alt-arrow-down-bold"
                        width={14}
                        className={`text-gray-400 transition-transform ${popupOpen ? "rotate-180" : ""}`}
                    />
                </button>
            )}

            {/* Popup */}
            {popupOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-40">
                    {/* User info header */}
                    <div className="px-4 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {user.image ? (
                                <img
                                    src={user.image}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user.name}
                                    <span className={`ml-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${badge.cls}`}>
                                        {badge.label}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                        <Link
                            href="/account"
                            onClick={() => setPopupOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                            <Icon icon="solar:settings-bold" width={16} className="text-gray-400" />
                            My Account
                        </Link>
                        <Link
                            href="/account/settings"
                            onClick={() => setPopupOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                            <Icon icon="solar:settings-bold" width={16} className="text-gray-400" />
                            Account Settings
                        </Link>

                        {user.type === "seller" && (
                            <>
                                <Link
                                    href="/account/post/product"
                                    onClick={() => setPopupOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                    <Icon icon="solar:shield-bold" width={16} className="text-violet-500" />
                                    Seller Product
                                </Link>
                                <Link
                                    href="/account/seller-orders"
                                    onClick={() => setPopupOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                    <Icon icon="solar:shield-bold" width={16} className="text-violet-500" />
                                    Seller Orders
                                </Link>
                            </>
                        )}

                        {user.type === "admin" && (
                            <Link
                                href="/admin"
                                onClick={() => setPopupOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Icon icon="solar:shield-bold" width={16} className="text-violet-500" />
                                Admin Panel
                            </Link>
                        )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-gray-100 py-1">
                        <button
                            onClick={async () => {
                                setPopupOpen(false);
                                // Clear the Express cookie (best-effort)
                                await fetch(`${EXPRESS_API}/auth/logout`, {
                                    method: "POST",
                                    credentials: "include",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "x-license-key": LICENSE_KEY,
                                    },
                                }).catch(() => {});
                                // Sign out of NextAuth — this clears the JWT session cookie
                                await signOut({ redirect: false });
                                router.replace("/");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition cursor-pointer"
                        >
                            <Icon icon="solar:logout-bold" width={16} />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
