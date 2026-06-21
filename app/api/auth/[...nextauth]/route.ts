/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth v4 — Credentials provider backed by Express.
 *
 * Flow:
 *   1. Auth.tsx calls Express /auth/login directly to validate credentials
 *      and get the user object back.
 *   2. Auth.tsx then calls signIn("credentials", { userData: JSON.stringify(user) })
 *      passing the already-validated user as a JSON string.
 *   3. authorize() here just parses and returns that user — no second Express call.
 *   4. NextAuth writes a signed JWT cookie (httpOnly, SameSite=lax).
 *      Works on Vercel — no cross-domain cookie needed.
 *   5. All API routes call getServerSession() to resolve the caller.
 *
 * Express is still used for:
 *   - The actual credential validation (password + license check) in step 1
 *   - Google OAuth redirect
 *   - Admin-panel Express-only endpoints
 */

import NextAuth, { type AuthOptions, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "";

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
            name: "Credentials",
            credentials: {
                // The entire user object (already validated by Express) as JSON
                userData: { label: "User Data", type: "text" },
            },

            async authorize(credentials) {
                if (!credentials?.userData) return null;

                try {
                    const u = JSON.parse(credentials.userData) as {
                        _id:      string;
                        name:     string;
                        email?:   string;
                        phone?:   string;
                        type:     string;
                        image?:   string;
                        slug?:    string;
                        status:   string;
                        address?: string;
                        state?:   string;
                        city?:    string;
                        zipCode?: string;
                    };

                    if (!u?._id) return null;

                    return {
                        id:       u._id,
                        name:     u.name,
                        email:    u.email ?? u.phone ?? "",
                        image:    u.image,
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
