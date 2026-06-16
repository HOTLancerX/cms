'use client';

/**
 * Blog Box 1 — Clean card style.
 *
 * Reusable blog post card for category/listing pages.
 * Registered as type "blog-box" in the Template manager.
 *
 * Props:
 *   data    — post + info map (same shape as the full blog page layout)
 *   postUrl — full URL to the post page (built from permalink prefix)
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

export default function BlogBox1({ data, postUrl }: BlogBoxProps) {
    const image     = data.info?.images
        ? (() => { try { const a = JSON.parse(data.info.images); return Array.isArray(a) ? a[0] : ''; } catch { return ''; } })()
        : '';
    const shortDesc = data.info?.shortDescription ?? '';
    const publishedAt = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })
        : null;

    return (
        <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {/* Image */}
            <Link href={postUrl} className="block aspect-video overflow-hidden bg-gray-50">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={image}
                        alt={data.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Icon icon="solar:document-bold" width="48" height="48" />
                    </div>
                )}
            </Link>

            {/* Body */}
            <div className="flex flex-col flex-1 p-4 gap-2">
                {publishedAt && (
                    <time className="text-xs text-gray-400 flex items-center gap-1">
                        <Icon icon="solar:calendar-bold" width="12" height="12" />
                        {publishedAt}
                    </time>
                )}

                <Link href={postUrl}
                    className="text-sm font-semibold text-gray-900 hover:text-main transition-colors line-clamp-2 leading-snug">
                    {data.title}
                </Link>

                {shortDesc && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1"
                        dangerouslySetInnerHTML={{ __html: shortDesc }} />
                )}

                <Link href={postUrl}
                    className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-main hover:gap-2 transition-all">
                    Read more
                    <Icon icon="mdi:arrow-right" width="13" height="13" />
                </Link>
            </div>
        </article>
    );
}
