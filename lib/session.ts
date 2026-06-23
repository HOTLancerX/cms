/**
 * lib/session.ts — server-side session helpers.
 *
 * getAuthSession() / resolveUser() try three auth strategies in order:
 *
 *  1. NextAuth JWT session cookie (next-auth.session-token)
 *     — fast, no outbound fetch, works on Vercel.
 *
 *  2. Express Bearer token (stored in NextAuth JWT as expressToken)
 *     — calls /auth/me with Authorization: Bearer to get fresh user data,
 *       including up-to-date image and profile fields.
 *
 *  3. Express auth_token cookie forwarded to Express /auth/me
 *     — legacy fallback for sessions created before expressToken was stored.
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

async function fromNextAuth(): Promise<{ user: AuthUser; expressToken?: string } | null> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return null;

        const u = session.user as any;
        if (!u._id) return null;

        return {
            user: {
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
            },
            expressToken: u.expressToken,
        };
    } catch {
        return null;
    }
}

// ── Strategy 2: Express Bearer token (from NextAuth session) ──────────────────

async function fromExpressBearer(token: string): Promise<AuthUser | null> {
    try {
        const res = await fetch(`${EXPRESS_API}/auth/me`, {
            headers: {
                "Content-Type":  "application/json",
                "x-license-key": LICENSE_KEY,
                "Authorization": `Bearer ${token}`,
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

// ── Strategy 3: Express auth_token cookie ─────────────────────────────────────

async function fromExpressCookie(req: NextRequest): Promise<AuthUser | null> {
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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolves the authenticated user using three strategies in priority order:
 *
 *  1. NextAuth JWT session — works everywhere, no outbound fetch.
 *     If the session also carries an expressToken, use it for strategy 2.
 *
 *  2. Express Bearer auth — uses the expressToken stored in the NextAuth JWT
 *     to call /auth/me and get fully-fresh user data (image, name, etc.).
 *     This bridges the gap when the NextAuth session has stale data.
 *
 *  3. Express auth_token cookie — legacy fallback for users who logged in
 *     before the expressToken was stored in the NextAuth JWT.
 *
 * Returns null when unauthenticated.
 */
export async function getAuthSession(req?: NextRequest): Promise<AuthUser | null> {
    // Strategy 1 — NextAuth session (fast, no outbound fetch)
    const sessionResult = await fromNextAuth();
    if (sessionResult) {
        // Strategy 2 — refresh from Express using the stored token
        // This ensures image and other fields are always up to date.
        if (sessionResult.expressToken) {
            const fresh = await fromExpressBearer(sessionResult.expressToken);
            if (fresh) return fresh;
        }
        // NextAuth data is good enough (no expressToken yet)
        return sessionResult.user;
    }

    // Strategy 3 — legacy Express cookie forwarding
    if (req) return fromExpressCookie(req);

    return null;
}

/**
 * Convenience wrapper — returns { userId, userType } or null.
 * Pass the NextRequest so the Express cookie fallback works.
 */
export async function resolveUser(
    req?: NextRequest
): Promise<{ userId: string; userType: string } | null> {
    const user = await getAuthSession(req);
    if (!user) return null;
    return { userId: user._id, userType: user.type };
}
