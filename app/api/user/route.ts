import connectDB from "@/lib/mongodb";
import User, { type IUser } from "@/models/Users";
import UserInfo from "@/models/Users_info";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

// ─── GET  /api/user ───
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (id) {
            const user = await User.findById(id).lean();
            if (!user) {
                return Response.json({ error: "User not found" }, { status: 404 });
            }
            const info = await UserInfo.find({ userId: id }).lean();
            return Response.json({ user, info });
        }

        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 })
            .lean();
        return Response.json({ users });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── POST  /api/user  (create) ───
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { name, slug, email, phone, password, type, image, status, address, state, city, zipCode, info } = body as {
            name: string;
            slug: string;
            email: string;
            phone?: string;
            password: string;
            type?: string;
            image?: string;
            status?: string;
            address?: string;
            state?: string;
            city?: string;
            zipCode?: string;
            info?: Record<string, string>;
        };

        if (!name || !email || !password) {
            return Response.json(
                { error: "name, email and password are required" },
                { status: 400 }
            );
        }

        const hashed = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            email,
            phone,
            password: hashed,
            ...(type && { type: type as IUser["type"] }),
            ...(status && { status: status as IUser["status"] }),
            image,
            address,
            state,
            city,
            zipCode,
        });

        // Upsert plugin info fields
        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([infoName, value]) => ({
                updateOne: {
                    filter: { userId: user._id, name: infoName },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await UserInfo.bulkWrite(ops);
        }

        return Response.json({ user }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── PUT  /api/user  (update) ───
export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { id, info, ...fields } = body as {
            id: string;
            info?: Record<string, string>;
            [key: string]: unknown;
        };

        if (!id) {
            return Response.json({ error: "id is required" }, { status: 400 });
        }

        // Hash password if being updated
        const updateData: Partial<IUser> & Record<string, unknown> = { ...fields };
        if (updateData.password && typeof updateData.password === "string") {
            updateData.password = await bcrypt.hash(updateData.password as string, 12);
        } else {
            delete updateData.password;
        }
        // Cast enum fields coming in as plain strings
        if (updateData.type) updateData.type = updateData.type as IUser["type"];
        if (updateData.status) updateData.status = updateData.status as IUser["status"];

        const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
        if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        // Upsert plugin info fields
        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([infoName, value]) => ({
                updateOne: {
                    filter: { userId: user._id, name: infoName },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await UserInfo.bulkWrite(ops);
        }

        return Response.json({ user });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── DELETE  /api/user?id=xxx ───
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (!id) {
            return Response.json({ error: "id is required" }, { status: 400 });
        }

        await User.findByIdAndDelete(id);
        await UserInfo.deleteMany({ userId: id });

        return Response.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}
