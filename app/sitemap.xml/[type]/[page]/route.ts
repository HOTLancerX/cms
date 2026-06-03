/**
 * Sub-sitemap  →  /sitemap.xml/[type]/[page]
 *
 * Handles both post types and category types dynamically.
 * Applies the correct permalink prefix from the DB so every <loc>
 * exactly mirrors what the [...slug] router resolves.
 *
 * Examples:
 *   /sitemap.xml/blog/1          → posts of type "blog",  items 1-500
 *   /sitemap.xml/blog/2          → posts of type "blog",  items 501-1000
 *   /sitemap.xml/blog-category/1 → cats  of type "blog-category", items 1-500
 *
 * URL format (mirrors app/(root)/[...slug]/page.tsx):
 *   prefix ""         → /{slug}
 *   prefix "blog"     → /blog/{slug}
 *   prefix "news/cat" → /news/cat/{slug}
 */

import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import Cat from "@/models/cat";
import Permalink from "@/models/permalink";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";

export const dynamic = "force-dynamic";

const URLS_PER_PAGE = 500;

interface RouteParams {
    params: Promise<{ type: string; page: string }>;
}

/** Resolve the canonical base URL from env or a safe fallback. */
function baseUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";
    return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;
}

/**
 * Build the public URL for a content item.
 * Mirrors the matchPrefix logic in app/(root)/[...slug]/page.tsx exactly.
 *
 *   prefix ""         → /slug
 *   prefix "blog"     → /blog/slug
 *   prefix "news/cat" → /news/cat/slug
 */
function buildUrl(base: string, prefix: string, slug: string): string {
    const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
    return trimmed ? `${base}/${trimmed}/${slug}` : `${base}/${slug}`;
}

/** One <url> block. */
function urlEntry(loc: string, lastmod: Date, changefreq: string, priority: string): string {
    return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod.toISOString()}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
    ].join("\n");
}

export async function GET(_req: Request, { params }: RouteParams) {
    const { type, page: pageStr } = await params;

    const page = parseInt(pageStr, 10);
    if (isNaN(page) || page < 1) return notFound();

    await connectDB();

    const postTypes = getPostTypes();
    const catTypes = getCatTypes();

    // Determine whether this type key belongs to posts or categories
    const isPostType = postTypes.some((pt) => pt.key === type);
    const isCatType = !isPostType && catTypes.some((ct) => ct.key === type);

    if (!isPostType && !isCatType) return notFound();

    // Load the permalink prefix for this content type
    const permalinkDoc = await Permalink.findOne({ contentType: type }).lean() as any;
    const prefix: string = permalinkDoc?.prefix ?? type; // fall back to type key

    const skip = (page - 1) * URLS_PER_PAGE;
    const base = baseUrl();
    const entries: string[] = [];

    if (isPostType) {
        const posts = await Post.find(
            { type, status: "published" },
            { slug: 1, updatedAt: 1 }
        )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(URLS_PER_PAGE)
            .lean() as Array<{ slug: string; updatedAt: Date }>;

        // Page beyond available data → 404
        if (posts.length === 0 && page > 1) return notFound();

        for (const post of posts) {
            entries.push(
                urlEntry(
                    buildUrl(base, prefix, post.slug),
                    post.updatedAt,
                    "weekly",
                    "0.8"
                )
            );
        }
    } else {
        // Category type
        const cats = await Cat.find(
            { type, status: "published" },
            { slug: 1, updatedAt: 1 }
        )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(URLS_PER_PAGE)
            .lean() as Array<{ slug: string; updatedAt: Date }>;

        // Page beyond available data → 404
        if (cats.length === 0 && page > 1) return notFound();

        for (const cat of cats) {
            entries.push(
                urlEntry(
                    buildUrl(base, prefix, cat.slug),
                    cat.updatedAt,
                    "weekly",
                    "0.6"
                )
            );
        }
    }

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries,
        "</urlset>",
    ].join("\n");

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    });
}