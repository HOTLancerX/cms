import connectDB from "@/lib/mongodb";
import User from "@/models/Users";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/signup
 * Creates a new user account.
 * Accepts: { name, email?, phone?, password }
 * Either email or phone is required.
 */
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { name, email, phone, password } = body as {
            name: string;
            email?: string;
            phone?: string;
            password: string;
        };

        if (!name || !password) {
            return Response.json(
                { error: "name and password are required" },
                { status: 400 }
            );
        }

        if (!email && !phone) {
            return Response.json(
                { error: "email or phone is required" },
                { status: 400 }
            );
        }

        // Check for existing user
        if (email) {
            const exists = await User.findOne({ email: email.toLowerCase() }).lean();
            if (exists) {
                return Response.json({ error: "Email already registered" }, { status: 409 });
            }
        }

        if (phone) {
            const exists = await User.findOne({ phone }).lean();
            if (exists) {
                return Response.json({ error: "Phone already registered" }, { status: 409 });
            }
        }

        // Generate unique slug
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        let slug = baseSlug;
        let attempt = 0;
        while (await User.findOne({ slug }).lean()) {
            attempt++;
            slug = `${baseSlug}-${attempt}`;
        }

        const hashed = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            slug,
            email: email?.toLowerCase() ?? "",
            phone: phone ?? "",
            password: hashed,
            type: "user",
            status: "active",
        });

        return Response.json(
            { success: true, userId: user._id.toString() },
            { status: 201 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}
