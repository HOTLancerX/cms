"use client";

/**
 * Auth.tsx — shared form for login and signup.
 *
 * LOGIN  → single smart field (email / phone / slug auto-detected)
 * SIGNUP → tab switcher: Email tab or Phone tab
 *
 * All requests go directly to Express. No NextAuth.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useUser } from "@/context/Provider";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

const authHeaders = {
    "Content-Type": "application/json",
    "x-license-key": LICENSE_KEY,
};

// ─── Detect what the user typed ───────────────────────────────────────────────
type LoginType = "email" | "phone" | "slug";

function detectLoginType(value: string): LoginType {
    const v = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
    if (/^[+\d][\d\s\-().]{6,}$/.test(v)) return "phone";
    return "slug";
}

type SignupTab = "email" | "phone";

interface AuthFormProps {
    mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter();
    const { refresh } = useUser();
    const isLogin = mode === "login";

    // ── Shared state ──────────────────────────────────────────────────────────
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    // ── Login-specific ────────────────────────────────────────────────────────
    const [loginValue, setLoginValue] = useState("");

    // ── Signup-specific ───────────────────────────────────────────────────────
    const [signupTab, setSignupTab] = useState<SignupTab>("email");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const inputCls =
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10";

    // ── Google OAuth ──────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError("");
        // Redirect to Express Google OAuth endpoint
        window.location.href = `${EXPRESS_API}/auth/google`;
    };

    // ── Login ─────────────────────────────────────────────────────────────────
    const handleLogin = async (loginVal: string, pass: string): Promise<boolean> => {
        const res = await fetch(`${EXPRESS_API}/auth/login`, {
            method: "POST",
            credentials: "include",
            headers: authHeaders,
            body: JSON.stringify({ login: loginVal.trim(), password: pass }),
        });

        const data = await res.json() as { error?: string; message?: string };

        if (!res.ok) {
            setError(data.message ?? data.error ?? "No account found or password incorrect.");
            return false;
        }

        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const ok = await handleLogin(loginValue, password);
                if (ok) {
                    refresh();
                    router.replace("/");
                }
            } else {
                // ── Sign up ───────────────────────────────────────────────────
                const res = await fetch(`${EXPRESS_API}/auth/signup`, {
                    method: "POST",
                    credentials: "include",
                    headers: authHeaders,
                    body: JSON.stringify({
                        name,
                        email: signupTab === "email" ? email : undefined,
                        phone: signupTab === "phone" ? phone : undefined,
                        password,
                    }),
                });

                const data = await res.json() as { error?: string; message?: string };

                if (!res.ok) {
                    setError(data.error ?? data.message ?? "Signup failed.");
                    return;
                }

                // Auto sign-in after signup
                const loginField = signupTab === "email" ? email : phone;
                const ok = await handleLogin(loginField, password);
                if (ok) {
                    refresh();
                    router.replace("/");
                }
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Detected type hint for login field ────────────────────────────────────
    const loginHint = loginValue.trim() ? detectLoginType(loginValue) : null;

    const hintIcon: Record<LoginType, string> = {
        email: "solar:letter-bold",
        phone: "solar:phone-bold",
        slug: "solar:user-bold",
    };
    const hintLabel: Record<LoginType, string> = {
        email: "Email",
        phone: "Phone",
        slug: "Username",
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">

                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isLogin ? "Welcome back" : "Create account"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isLogin
                            ? "Sign in to continue"
                            : "Fill in the details below to get started"}
                    </p>
                </div>

                {/* Google */}
                <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 mb-6"
                >
                    {googleLoading
                        ? <Icon icon="svg-spinners:ring-resize" width={18} />
                        : <Icon icon="flat-color-icons:google" width={18} />
                    }
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Signup tab switcher (email / phone) */}
                {!isLogin && (
                    <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                        {(["email", "phone"] as SignupTab[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => { setSignupTab(t); setError(""); }}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${signupTab === t
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Icon
                                    icon={t === "email" ? "solar:letter-bold" : "solar:phone-bold"}
                                    width={15}
                                />
                                {t === "email" ? "Email" : "Phone"}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {/* ── LOGIN: single smart field ── */}
                    {isLogin && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-700">
                                Email, phone or username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={loginValue}
                                    onChange={(e) => { setLoginValue(e.target.value); setError(""); }}
                                    className={`${inputCls} ${loginHint ? "pr-28" : ""}`}
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="username"
                                    autoFocus
                                />
                                {/* Auto-detected type badge */}
                                {loginHint && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full pointer-events-none">
                                        <Icon icon={hintIcon[loginHint]} width={12} />
                                        {hintLabel[loginHint]}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── SIGNUP: name + email or phone ── */}
                    {!isLogin && (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-700">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputCls}
                                    placeholder="John Doe"
                                    required
                                    autoComplete="name"
                                />
                            </div>

                            {signupTab === "email" ? (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-700">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputCls}
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-700">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={inputCls}
                                        placeholder="+1 555 000 0000"
                                        required
                                        autoComplete="tel"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${inputCls} pr-11`}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                autoComplete={isLogin ? "current-password" : "new-password"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                tabIndex={-1}
                            >
                                <Icon
                                    icon={showPassword ? "solar:eye-closed-bold" : "solar:eye-bold"}
                                    width={18}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Icon icon="svg-spinners:ring-resize" width={16} />
                                {isLogin ? "Signing in…" : "Creating account…"}
                            </span>
                        ) : isLogin ? "Sign in" : "Create account"}
                    </button>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-gray-500">
                    {isLogin ? (
                        <>
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
                                Sign up
                            </Link>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
                                Sign in
                            </Link>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
