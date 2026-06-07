"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import PostForm from "@/components/admin/PostForm";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { getAllPostTypes } from "@/hook";

export default function PostAddEditPage() {
    const { type, id } = useParams<{ type: string; id: string }>();
    const router = useRouter();

    const activePlugins = useActivePlugins();

    // "new" is the sentinel for add mode — anything else is treated as a MongoDB _id
    const isNew = id === "new";
    const postId = isNew ? undefined : id;

    // Resolve post type label from the client-side registry
    // (populated after reregisterHooks runs inside useActivePlugins)
    const postTypes = getAllPostTypes();
    const postType = postTypes.find((t) => t.key === type);
    const typeLabel = postType?.label ?? type.charAt(0).toUpperCase() + type.slice(1);

    if (activePlugins === null) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>
        );
    }

    // If the post type is not registered at all, show 404-style message.
    // Note: postTypes may be empty on first render before hooks are armed —
    // we only hard-block if hooks are armed (activePlugins !== null) AND
    // the type is still not found.
    if (activePlugins !== null && postTypes.length > 0 && !postType) {
        return (
            <div className="text-center py-24 text-gray-400">
                <Icon icon="solar:file-corrupted-bold" width={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">Post type &quot;{type}&quot; not found.</p>
                <Link href="/admin" className="mt-4 inline-block text-indigo-500 hover:underline text-sm">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb + header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/posts/${type}`}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                    >
                        <Icon icon="solar:arrow-left-bold" width={16} />
                        {typeLabel}
                    </Link>
                    <span className="text-gray-300">/</span>
                    <h1 className="text-2xl font-bold">
                        {isNew ? `Add ${typeLabel}` : `Edit ${typeLabel}`}
                    </h1>
                </div>

                {!isNew && (
                    <Link
                        href={`/admin/posts/${type}/new`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                    >
                        <Icon icon="solar:add-circle-bold" width={16} />
                        Add New
                    </Link>
                )}
            </div>

            <>
                <PostForm
                    type={type}
                    activePlugins={activePlugins}
                    postId={postId}
                    onSuccess={(savedId) => {
                        // After creating a new post, redirect to its edit page
                        if (isNew) {
                            router.replace(`/admin/posts/${type}/${savedId}`);
                        }
                    }}
                />
            </>
        </div>
    );
}
