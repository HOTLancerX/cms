/**
 * lib/session.ts — server-side session helpers.
 *
 * resolveUser() tries two auth strategies in order:
 *
 *  1. NextAuth JWT session cookie (next-auth.session-token)
 *     — works on Vercel, set after signIn("credentials", { userData })
 *
 *  2. Express auth_token cookie forwarded to Express /auth/me
 *     — fallback for users who logged in before NextAuth was introduced,
 *       or when the NextAuth session hasn't been written yet.
 *
 * This dual strategy means zero downtime — existing sessions keep working.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { NextRequest } from "next/server";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY     ?? "";

export interface AuthUser {
    _id:      string;
    name:     string;
    email:    string;
    type:     string;
    slug?:    string;
    phone?:   string;
    image?:   string;
    status:   string;
    address?: string;
    state?:   string;
    city?:    string;
    zipCode?: string;
}

// ── Strategy 1: NextAuth session ──────────────────────────────────────────────

async function fromNextAuth(): Promise<AuthUser | null> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return null;

        const u = session.user as any;
        if (!u._id) return null;

        return {
            _id:      u._id,
            name:     u.name     ?? "",
            email:    u.email    ?? "",
            type:     u.type     ?? "user",
            slug:     u.slug,
            phone:    u.phone,
            image:    u.image,
            status:   u.status   ?? "active",
            address:  u.address,
            state:    u.state,
            city:     u.city,
            zipCode:  u.zipCode,
        };
    } catch {
        return null;
    }
}

// ── Strategy 2: Express auth_token cookie ─────────────────────────────────────

async function fromExpress(req: NextRequest): Promise<AuthUser | null> {
    try {
        const cookieHeader = req.headers.get("cookie") ?? "";
        if (!cookieHeader) return null;

        const res = await fetch(`${EXPRESS_API}/auth/me`, {
            headers: {
                "Content-Type":  "application/json",
                "x-license-key": LICENSE_KEY,
                "cookie":        cookieHeader,
            },
        });

        if (!res.ok) return null;

        const data = await res.json();
        const u    = data.user ?? data;
        if (!u?._id) return null;

        return {
            _id:      String(u._id),
            name:     u.name     ?? "",
            email:    u.email    ?? "",
            type:     u.type     ?? "user",
            slug:     u.slug,
            phone:    u.phone,
            image:    u.image,
            status:   u.status   ?? "active",
            address:  u.address,
            state:    u.state,
            city:     u.city,
            zipCode:  u.zipCode,
        };
    } catch {
        return null;
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Resolves the authenticated user from either NextAuth session or Express cookie.
 * Returns null when unauthenticated.
 */
export async function getAuthSession(req?: NextRequest): Promise<AuthUser | null> {
    // Try NextAuth first (works on Vercel, no outbound fetch)
    const fromSession = await fromNextAuth();
    if (fromSession) return fromSession;

    // Fall back to Express cookie forwarding (works locally + for legacy sessions)
    if (req) return fromExpress(req);

    return null;
}

/**
 * Convenience wrapper — returns { userId, userType } or null.
 * Pass the NextRequest so the Express fallback works.
 */
export async function resolveUser(
    req?: NextRequest
): Promise<{ userId: string; userType: string } | null> {
    const user = await getAuthSession(req);
    if (!user) return null;
    return { userId: user._id, userType: user.type };
}
