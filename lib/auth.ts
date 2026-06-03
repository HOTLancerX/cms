import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/Users";

/**
 * Shared NextAuth configuration.
 * Imported by app/api/auth/[...nextauth]/route.ts and any server code
 * that needs getServerSession(authOptions).
 */
export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,

    session: { strategy: "jwt" },

    pages: {
        signIn: "/login",
        error: "/login",
    },

    providers: [
        // ── Google OAuth ──────────────────────────────────────────────────────
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),

        // ── Email + Password ──────────────────────────────────────────────────
        CredentialsProvider({
            id: "email-password",
            name: "Email",
            credentials: {
                login: { label: "Email or Phone", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) return null;

                await connectDB();

                const login = credentials.login.trim().toLowerCase();

                // Match by email OR phone
                const user = await User.findOne({
                    $or: [{ email: login }, { phone: login }, { slug: login }],
                }).lean();

                if (!user) return null;
                if (user.status !== "active") return null;

                const valid = await bcrypt.compare(credentials.password, user.password);
                if (!valid) return null;

                return {
                    id: (user._id as any).toString(),
                    name: user.name,
                    email: user.email,
                    image: user.image ?? null,
                    // custom fields passed through JWT
                    type: user.type,
                    slug: user.slug,
                    status: user.status,
                };
            },
        }),

    ],

    callbacks: {
        // ── Persist extra fields into the JWT ─────────────────────────────────
        async jwt({ token, user, account }) {
            if (user) {
                // First sign-in — user object is populated
                token.id = user.id;
                token.type = (user as any).type;
                token.slug = (user as any).slug;
                token.status = (user as any).status;
            }

            // Google OAuth — upsert user in DB on first login
            if (account?.provider === "google" && token.email) {
                await connectDB();

                let dbUser = await User.findOne({ email: token.email }).lean();

                if (!dbUser) {
                    const slug = (token.name ?? token.email)
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");

                    // Generate a unique slug
                    const uniqueSlug = `${slug}-${Date.now()}`;

                    dbUser = await User.create({
                        name: token.name ?? "Google User",
                        slug: uniqueSlug,
                        email: token.email,
                        password: await bcrypt.hash(Math.random().toString(36), 10),
                        image: token.picture ?? "",
                        type: "user",
                        status: "active",
                    });
                }

                token.id = (dbUser._id as any).toString();
                token.type = dbUser.type;
                token.slug = dbUser.slug;
                token.status = dbUser.status;
            }

            return token;
        },

        // ── Expose extra fields on the client session ─────────────────────────
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).type = token.type;
                (session.user as any).slug = token.slug;
                (session.user as any).status = token.status;
            }
            return session;
        },
    },
};
