/**
 * Blog Category Layout 1 — Clean editorial style.
 *
 * Receives `data`, `settings`, `permalinkMap`, and `pageData` from
 * the slug page. All DB work done server-side via serverDataHooks.
 * The post grid is rendered by BlogGridClient (client component)
 * which resolves the active blog-box template from the hook registry.
 */

import Link from 'next/link';
import BlogGridClient from './BlogGridClient';

interface BlogCatProps {
    data: {
        _id: string;
        title: string;
        slug: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        info: Record<string, string>;
    };
    settings?: Record<string, any>;
    permalinkMap?: Record<string, string>;
    pageData?: {
        posts: any[];
        subCats: { _id: string; title: string; slug: string }[];
        ancestors: { _id: string; title: string; slug: string }[];
        activeBox: { label: string; pluginNx: string } | null;
    };
}

function buildUrl(prefix: string, slug: string): string {
    const p = prefix.trim().replace(/^\/+|\/+$/g, '');
    return p ? `/${p}/${slug}` : `/${slug}`;
}

export default function BlogCategoryLayout1({
    data,
    settings = {},
    permalinkMap = {},
    pageData,
}: BlogCatProps) {
    const postPrefix = (permalinkMap['blog'] ?? 'blog')
        .trim().replace(/^\/+|\/+$/g, '') || 'blog';
    const catPrefix = (permalinkMap['blog-category'] ?? 'blog/category')
        .trim().replace(/^\/+|\/+$/g, '');

    const posts     = pageData?.posts     ?? [];
    const subCats   = pageData?.subCats   ?? [];
    const ancestors = pageData?.ancestors ?? [];
    const activeBox = pageData?.activeBox ?? null;

    // Breadcrumb: all ancestors except the last (which is the current cat)
    const breadcrumbLinks = ancestors.slice(0, -1);

    return (
        <main className="min-h-screen bg-gray-50">
            {/* ── Banner ── */}
            <header className="bg-linear-to-r from-violet-600 to-purple-700 py-14 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-sm text-white/70 mb-4 flex-wrap"
                        aria-label="breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        {breadcrumbLinks.map(ancestor => (
                            <span key={ancestor._id} className="flex items-center gap-1.5">
                                <span className="text-white/40">›</span>
                                <Link href={buildUrl(catPrefix, ancestor.slug)}
                                    className="hover:text-white transition-colors">
                                    {ancestor.title}
                                </Link>
                            </span>
                        ))}
                        <span className="text-white/40">›</span>
                        <span className="text-white font-medium">{data.title}</span>
                    </nav>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white capitalize leading-tight">
                        {data.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className="text-white/70 text-sm">
                            {posts.length} post{posts.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                            data.status === 'published' ? 'bg-white text-violet-700' : 'bg-white/20 text-white'
                        }`}>
                            {data.status}
                        </span>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* Sub-category chips */}
                {subCats.length > 0 && (
                    <nav className="flex flex-wrap gap-2" aria-label="Sub-categories">
                        {subCats.map(sub => (
                            <Link key={sub._id} href={buildUrl(catPrefix, sub.slug)}
                                className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-violet-400 hover:text-violet-700 transition-colors shadow-sm">
                                {sub.title}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Post grid */}
                <BlogGridClient
                    posts={posts}
                    activeBox={activeBox}
                    postPrefix={postPrefix}
                />
            </div>
        </main>
    );
}
