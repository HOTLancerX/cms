/**
 * lib/session.ts — server-side session helpers.
 *
 * Use getAuthSession() in any Next.js API route or server component to
 * resolve the current user from the NextAuth JWT — no outbound fetch needed.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { NextRequest } from "next/server";

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

/**
 * Resolves the authenticated user from the NextAuth session.
 * Works in both App Router route handlers and Server Components.
 *
 * Returns null when the request is unauthenticated.
 */
export async function getAuthSession(): Promise<AuthUser | null> {
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

/**
 * Convenience: resolves user and returns { userId, userType } —
 * the shape expected by all plugin API route handlers.
 */
export async function resolveUser(
    _req?: NextRequest
): Promise<{ userId: string; userType: string } | null> {
    const user = await getAuthSession();
    if (!user) return null;
    return { userId: user._id, userType: user.type };
}
