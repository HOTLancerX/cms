import connectDB from "@/lib/mongodb";
import BuilderModel from "@/models/builder";
import BuilderClient from "./BuilderClient";

/**
 * Server Component — renders builder content with SSR (0ms client loading).
 * Usage: <Builder id="mongodb_id" />
 */

interface Props {
    id: string;
}

export default async function Builder({ id }: Props) {
    await connectDB();
    const doc = await BuilderModel.findById(id).lean();

    if (!doc || !doc.content) return null;

    return <BuilderClient content={doc.content as any[]} />;
}
