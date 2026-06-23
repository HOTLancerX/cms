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
                    const parsed = JSON.parse(credentials.userData) as {
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
                        // Express JWT token — stored alongside user data on login
                        expressToken?: string;
                    };

                    if (!parsed?._id) return null;

                    return {
                        id:           parsed._id,
                        name:         parsed.name,
                        email:        parsed.email ?? parsed.phone ?? "",
                        image:        parsed.image,
                        _id:          parsed._id,
                        type:         parsed.type,
                        slug:         parsed.slug,
                        phone:        parsed.phone,
                        status:       parsed.status,
                        address:      parsed.address,
                        state:        parsed.state,
                        city:         parsed.city,
                        zipCode:      parsed.zipCode,
                        expressToken: parsed.expressToken,
                    } as User & Record<string, unknown>;
                } catch {
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session: sessionData }) {
            // Initial sign-in — copy all fields from Express user object
            if (user) {
                token.image        = (user as any).image        ?? "";
                token.picture      = (user as any).image        ?? "";
                token._id          = (user as any)._id          ?? user.id;
                token.type         = (user as any).type;
                token.slug         = (user as any).slug;
                token.phone        = (user as any).phone;
                token.status       = (user as any).status;
                token.address      = (user as any).address;
                token.state        = (user as any).state;
                token.city         = (user as any).city;
                token.zipCode      = (user as any).zipCode;
                // Store Express JWT for server-side Bearer auth
                if ((user as any).expressToken) {
                    token.expressToken = (user as any).expressToken;
                }
            }
            // Session update triggered by refresh() — merge fresh user data
            if (trigger === "update" && sessionData) {
                const u = sessionData as Record<string, unknown>;
                if (u._id)      token._id      = u._id;
                if (u.name)     token.name     = u.name     as string;
                if (u.email)    token.email    = u.email    as string;
                if (u.image !== undefined) {
                    token.image   = u.image as string;
                    token.picture = u.image as string;
                }
                if (u.type)     token.type     = u.type     as string;
                if (u.slug)     token.slug     = u.slug     as string;
                if (u.phone     !== undefined)  token.phone     = u.phone     as string;
                if (u.status)   token.status   = u.status   as string;
                if (u.address   !== undefined)  token.address   = u.address   as string;
                if (u.state     !== undefined)  token.state     = u.state     as string;
                if (u.city      !== undefined)  token.city      = u.city      as string;
                if (u.zipCode   !== undefined)  token.zipCode   = u.zipCode   as string;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                // image: NextAuth stores it as token.picture internally — read both
                session.user.image    = (token.image as string) || (token.picture as string) || "";
                (session.user as any)._id     = token._id     as string;
                (session.user as any).type    = token.type    as string;
                (session.user as any).slug    = token.slug    as string;
                (session.user as any).phone   = token.phone   as string ?? "";
                (session.user as any).status  = token.status  as string;
                (session.user as any).address = token.address as string ?? "";
                (session.user as any).state   = token.state   as string ?? "";
                (session.user as any).city    = token.city    as string ?? "";
                (session.user as any).zipCode = token.zipCode as string ?? "";
                if (token.name)         session.user.name  = token.name  as string;
                if (token.email)        session.user.email = token.email as string;
                // Expose Express JWT for server-side Bearer calls
                if (token.expressToken) {
                    (session.user as any).expressToken = token.expressToken as string;
                }
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
