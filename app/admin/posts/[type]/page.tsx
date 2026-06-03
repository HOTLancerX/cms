import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import Permalink from "@/models/permalink";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { getPostTypes } from "@/hook/PostType";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    draft: { label: "Draft", cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300" },
    trash: { label: "Trash", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

interface PostsListPageProps {
    params: Promise<{ type: string }>;
}

export default async function PostsListPage({ params }: PostsListPageProps) {
    const { type } = await params;

    const postTypes = getPostTypes();
    const postType = postTypes.find((t) => t.key === type);
    if (!postType) notFound();

    await connectDB();

    const [posts, permalinkDoc] = await Promise.all([
        Post.find({ type }).sort({ createdAt: -1 }).lean(),
        Permalink.findOne({ contentType: type }).lean() as Promise<{ prefix?: string } | null>,
    ]);

    // Build the URL prefix: "" → "/", "blog" → "/blog/", "news/blog" → "/news/blog/"
    const prefix = permalinkDoc?.prefix?.trim().replace(/^\/+|\/+$/g, "") ?? type;
    const viewBase = prefix ? `/${prefix}/` : "/";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{postType.label}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{posts.length} total</p>
                </div>
                <Link
                    href={`/admin/posts/${type}/new`}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                >
                    <Icon icon="solar:add-circle-bold" width={18} />
                    Add {postType.label}
                </Link>
            </div>

            {/* Table */}
            {posts.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon={postType.icon ?? "solar:document-bold"} width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No {postType.label.toLowerCase()} posts yet.</p>
                    <Link
                        href={`/admin/posts/${type}/new`}
                        className="mt-4 inline-flex items-center gap-1.5 text-indigo-500 hover:underline text-sm"
                    >
                        <Icon icon="solar:add-circle-bold" width={14} />
                        Create the first one
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Title</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Slug</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Created</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {posts.map((post: any) => {
                                const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
                                const viewHref = `${viewBase}${post.slug}`;
                                return (
                                    <tr key={post._id.toString()} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-3 font-medium text-gray-800">
                                            {post.title}
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                                            {post.slug}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* View — only meaningful for published posts */}
                                                <Link
                                                    href={viewHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={`View ${post.title}`}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${post.status === "published"
                                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <Icon icon="solar:eye-bold" width={13} />
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/admin/posts/${type}/${post._id.toString()}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    <Icon icon="solar:pen-bold" width={13} />
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
