/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth v4 — Credentials provider backed by Express.
 *
 * Flow:
 *   1. Browser POSTs credentials to Express /auth/login (with x-license-key).
 *      Express validates the license, authenticates the user, and returns
 *      { user: { _id, name, email, type, ... } }.
 *   2. NextAuth stores the user object in a signed, encrypted JWT cookie
 *      (httpOnly, SameSite=lax).  Works on Vercel — no cross-domain cookie needed.
 *   3. All Next.js API routes call getServerSession() to resolve the caller —
 *      no outbound fetch to Express required.
 *
 * Express is still used for:
 *   - The actual credential validation (password check, license check)
 *   - Google OAuth redirect (unchanged)
 *   - Any Express-only endpoints (admin panel data, etc.)
 */

import NextAuth, { type AuthOptions, type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const EXPRESS_API  = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY  = process.env.NEXT_PUBLIC_LICENSE_KEY     ?? "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET          ?? process.env.JWT_SECRET ?? "";

export const authOptions: AuthOptions = {
    secret: NEXTAUTH_SECRET,

    session: {
        strategy: "jwt",
        maxAge:   60 * 60 * 24 * 30, // 30 days
    },

    pages: {
        signIn: "/login",
        error:  "/login",
    },

    providers: [
        CredentialsProvider({
            name: "Express",
            credentials: {
                login:    { label: "Email / Phone / Username", type: "text" },
                password: { label: "Password",                 type: "password" },
            },

            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) return null;

                try {
                    const res = await fetch(`${EXPRESS_API}/auth/login`, {
                        method:  "POST",
                        headers: {
                            "Content-Type":  "application/json",
                            "x-license-key": LICENSE_KEY,
                        },
                        body: JSON.stringify({
                            login:    credentials.login,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) return null;

                    const data = await res.json() as {
                        user?: {
                            _id:    string;
                            name:   string;
                            email?: string;
                            phone?: string;
                            type:   string;
                            image?: string;
                            slug?:  string;
                            status: string;
                            address?: string;
                            state?:   string;
                            city?:    string;
                            zipCode?: string;
                        };
                    };

                    const u = data.user;
                    if (!u?._id) return null;

                    // NextAuth User shape — id is required
                    return {
                        id:       u._id,
                        name:     u.name,
                        email:    u.email ?? u.phone ?? "",
                        image:    u.image,
                        // extra fields carried in the JWT
                        _id:      u._id,
                        type:     u.type,
                        slug:     u.slug,
                        phone:    u.phone,
                        status:   u.status,
                        address:  u.address,
                        state:    u.state,
                        city:     u.city,
                        zipCode:  u.zipCode,
                    } as User & Record<string, unknown>;
                } catch {
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        // Persist all custom fields from authorize() into the JWT
        async jwt({ token, user }) {
            if (user) {
                token._id     = (user as any)._id     ?? user.id;
                token.type    = (user as any).type;
                token.slug    = (user as any).slug;
                token.phone   = (user as any).phone;
                token.status  = (user as any).status;
                token.address = (user as any).address;
                token.state   = (user as any).state;
                token.city    = (user as any).city;
                token.zipCode = (user as any).zipCode;
            }
            return token;
        },

        // Expose custom fields to useSession() / getServerSession()
        async session({ session, token }) {
            if (session.user) {
                (session.user as any)._id     = token._id     as string;
                (session.user as any).type    = token.type    as string;
                (session.user as any).slug    = token.slug    as string;
                (session.user as any).phone   = token.phone   as string;
                (session.user as any).status  = token.status  as string;
                (session.user as any).address = token.address as string;
                (session.user as any).state   = token.state   as string;
                (session.user as any).city    = token.city    as string;
                (session.user as any).zipCode = token.zipCode as string;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
