import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/Users";

/**
 * GET /api/user/me
 * Returns the full DB record for the currently authenticated user.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !(session.user as any).id) {
            return Response.json({ user: null }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById((session.user as any).id)
            .select("-password")
            .lean();

        if (!user) {
            return Response.json({ user: null }, { status: 401 });
        }

        return Response.json({ user });
    } catch {
        return Response.json({ user: null }, { status: 500 });
    }
}
