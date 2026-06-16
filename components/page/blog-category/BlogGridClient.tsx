'use client';

/**
 * BlogGridClient.tsx
 *
 * Client component that renders the post grid for a blog category page.
 * Mirrors ProductGridClient exactly — resolves the active "blog-box"
 * component from the hook registry client-side after useActivePlugins runs.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHooks } from '@/hook';
import { useActivePlugins } from '@/hook/useActivePlugins';

interface Post {
    _id: string;
    title: string;
    slug: string;
    createdAt?: string;
    info: Record<string, string>;
}

interface BlogGridClientProps {
    posts: Post[];
    activeBox: { label: string; pluginNx: string } | null;
    postPrefix: string;
}

function buildUrl(prefix: string, slug: string): string {
    const p = prefix.trim().replace(/^\/+|\/+$/g, '');
    return p ? `/${p}/${slug}` : `/${slug}`;
}

export default function BlogGridClient({ posts, activeBox, postPrefix }: BlogGridClientProps) {
    const activePlugins = useActivePlugins();
    const [BoxComponent, setBoxComponent] = useState<any>(null);

    useEffect(() => {
        if (activePlugins === null) return;

        const boxes = getHooks('root.pages').filter(
            p => p.type === 'blog-box' && p.slug === 'dynamic'
        );

        let match = null;
        if (activeBox) {
            match = boxes.find(
                b => b.label === activeBox.label && b.pluginNx === activeBox.pluginNx
            )?.component ?? null;
        }
        if (!match) {
            match = (boxes.find(b => b.active === true) ?? boxes[0])?.component ?? null;
        }

        setBoxComponent(() => match);
    }, [activePlugins, activeBox]);

    // Loading skeleton
    if (activePlugins === null) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: Math.min(posts.length || 6, 6) }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
                        <div className="aspect-video bg-gray-100 rounded-t-2xl" />
                        <div className="p-4 space-y-2">
                            <div className="h-3.5 bg-gray-100 rounded w-4/5" />
                            <div className="h-3 bg-gray-100 rounded w-3/5" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-lg font-medium">No posts in this category yet.</p>
            </div>
        );
    }

    if (BoxComponent) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {posts.map(post => (
                    <BoxComponent
                        key={post._id}
                        data={post}
                        postUrl={buildUrl(postPrefix, post.slug)}
                    />
                ))}
            </div>
        );
    }

    // Fallback plain grid
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map(post => (
                <Link
                    key={post._id}
                    href={buildUrl(postPrefix, post.slug)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
                >
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{post.title}</p>
                </Link>
            ))}
        </div>
    );
}
