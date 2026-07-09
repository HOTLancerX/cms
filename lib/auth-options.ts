/**
 * lib/auth-options.ts — NextAuth configuration.
 *
 * Shared between:
 *   - app/api/auth/[...nextauth]/route.ts (route handler)
 *   - lib/session.ts (getServerSession calls)
 */

import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "";

export const authOptions: AuthOptions = {
    secret: NEXTAUTH_SECRET,

    session: {
        strategy: "jwt",
        maxAge:   60 * 60 * 24 * 30,
    },

    pages: {
        signIn: "/login",
        error:  "/login",
    },

    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
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
                    } as any;
                } catch {
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger, session: sessionData }) {
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
                if ((user as any).expressToken) {
                    token.expressToken = (user as any).expressToken;
                }
            }
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
                if (token.expressToken) {
                    (session.user as any).expressToken = token.expressToken as string;
                }
            }
            return session;
        },
    },
};
