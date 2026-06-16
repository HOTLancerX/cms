'use client';

/**
 * Blog Box 2 — Minimal overlay card style.
 *
 * Image fills the card. Title + date overlay at bottom on hover.
 * Registered as type "blog-box" in the Template manager.
 */

import Link from 'next/link';
import { Icon } from '@iconify/react';

interface BlogBoxProps {
    data: {
        _id: string;
        title: string;
        slug: string;
        status: string;
        createdAt?: string;
        info: Record<string, string>;
    };
    postUrl: string;
}

export default function BlogBox2({ data, postUrl }: BlogBoxProps) {
    const image = data.info?.images
        ? (() => { try { const a = JSON.parse(data.info.images); return Array.isArray(a) ? a[0] : ''; } catch { return ''; } })()
        : '';
    const publishedAt = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })
        : null;

    return (
        <article className="group relative rounded-2xl overflow-hidden aspect-video bg-gray-900 cursor-pointer shadow-sm hover:shadow-xl transition-shadow">
            {/* Background image */}
            {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={image}
                    alt={data.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                    <Icon icon="solar:document-bold" width="48" height="48" />
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Content */}
            <Link href={postUrl} className="absolute inset-0 flex flex-col justify-end p-4 gap-1">
                {publishedAt && (
                    <time className="text-xs text-white/60">{publishedAt}</time>
                )}
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug
                    translate-y-1 group-hover:translate-y-0 transition-transform">
                    {data.title}
                </h3>
                <span className="text-xs text-white/70 flex items-center gap-1
                    opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more
                    <Icon icon="mdi:arrow-right" width="12" height="12" />
                </span>
            </Link>
        </article>
    );
}
