/**
 * Sitemap Index  →  /sitemap.xml
 *
 * Dynamically lists every sub-sitemap URL based on:
 *   - All registered post types  (from plugins via PostType registry)
 *   - All registered cat types   (from plugins via CategoryType registry)
 *   - Actual published document counts per type (from MongoDB)
 *
 * Each sub-sitemap holds up to URLS_PER_PAGE (500) URLs.
 * Example output entries:
 *   <loc>https://example.com/sitemap.xml/blog/1</loc>
 *   <loc>https://example.com/sitemap.xml/blog/2</loc>
 *   <loc>https://example.com/sitemap.xml/blog-category/1</loc>
 */

import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import Cat from "@/models/cat";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";

export const dynamic = "force-dynamic";

const URLS_PER_PAGE = 500;

/** Resolve the canonical base URL from env or a safe fallback. */
function baseUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";
    // VERCEL_URL has no protocol
    return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;
}

/** Build one <sitemap> block. */
function sitemapEntry(loc: string, lastmod?: Date): string {
    const lastmodStr = lastmod
        ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>`
        : "";
    return `  <sitemap>\n    <loc>${loc}</loc>${lastmodStr}\n  </sitemap>`;
}

export async function GET() {
    await connectDB();

    const base = baseUrl();
    const postTypes = getPostTypes();
    const catTypes = getCatTypes();

    // Count published docs per type in parallel
    const [postCounts, catCounts] = await Promise.all([
        Promise.all(
            postTypes.map(async (pt) => ({
                key: pt.key,
                count: await Post.countDocuments({ type: pt.key, status: "published" }),
            }))
        ),
        Promise.all(
            catTypes.map(async (ct) => ({
                key: ct.key,
                count: await Cat.countDocuments({ type: ct.key, status: "published" }),
            }))
        ),
    ]);

    const entries: string[] = [];

    // Post type sub-sitemaps
    for (const { key, count } of postCounts) {
        if (count === 0) continue;
        const pages = Math.ceil(count / URLS_PER_PAGE);
        for (let p = 1; p <= pages; p++) {
            entries.push(sitemapEntry(`${base}/sitemap.xml/${key}/${p}`));
        }
    }

    // Category type sub-sitemaps
    for (const { key, count } of catCounts) {
        if (count === 0) continue;
        const pages = Math.ceil(count / URLS_PER_PAGE);
        for (let p = 1; p <= pages; p++) {
            entries.push(sitemapEntry(`${base}/sitemap.xml/${key}/${p}`));
        }
    }

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries,
        "</sitemapindex>",
    ].join("\n");

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    });
}
