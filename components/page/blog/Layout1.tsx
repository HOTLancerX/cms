interface BlogPostProps {
    data: {
        _id: string;
        title: string;
        slug: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        info: Record<string, string>;
    };
}

/**
 * Blog post template — Layout 1
 * Clean editorial style: large hero title, meta bar, content body, info sidebar.
 */
export default function BlogLayout1({ data }: BlogPostProps) {
    const publishedAt = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null;

    const seoTitle = data.info?.seo_meta_title || data.info?.seo_title || "";
    const seoDesc = data.info?.seo_meta_description || data.info?.seo_description || "";
    const seoKeywords = data.info?.seo_meta_keyword || "";

    // Collect remaining info fields (exclude known SEO keys shown separately)
    const knownKeys = new Set(["seo_meta_title", "seo_title", "seo_meta_description", "seo_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-white">
            {/* ── Hero ── */}
            <header className="bg-linear-to-br from-violet-600 to-indigo-700 px-6 py-20 text-center">
                <div className="max-w-3xl mx-auto">
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-200 mb-4 px-3 py-1 rounded-full bg-white/10">
                        Blog
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
                        {data.title}
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-sm text-violet-200 flex-wrap">
                        {publishedAt && (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {publishedAt}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="capitalize">{data.status}</span>
                        </span>
                        <span className="font-mono text-violet-300 text-xs">{data.slug}</span>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main content */}
                <article className="lg:col-span-2 space-y-8">
                    <div className="prose prose-lg max-w-none text-gray-700 bg-gray-50 rounded-2xl p-8 border border-gray-100">
                        <p className="text-gray-400 italic text-sm">
                            Post content renders here. Connect your rich-text body field to replace this placeholder.
                        </p>
                    </div>

                    {/* Extra plugin fields */}
                    {extraInfo.length > 0 && (
                        <section>
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-5 rounded-full bg-violet-500 inline-block" />
                                Additional Information
                            </h2>
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                                {extraInfo.map(([key, value]) => (
                                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3.5 bg-white hover:bg-gray-50 transition">
                                        <dt className="text-xs font-mono font-semibold text-violet-500 uppercase tracking-wide min-w-[180px]">
                                            {key.replace(/_/g, " ")}
                                        </dt>
                                        <dd className="text-sm text-gray-700 break-all">{value}</dd>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </article>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {/* SEO card */}
                    {(seoTitle || seoDesc || seoKeywords) && (
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
                            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                                SEO
                            </h3>
                            {seoTitle && (
                                <div>
                                    <p className="text-xs text-indigo-400 font-semibold mb-1">Title</p>
                                    <p className="text-sm text-indigo-900 font-medium">{seoTitle}</p>
                                </div>
                            )}
                            {seoDesc && (
                                <div>
                                    <p className="text-xs text-indigo-400 font-semibold mb-1">Description</p>
                                    <p className="text-sm text-indigo-800 leading-relaxed">{seoDesc}</p>
                                </div>
                            )}
                            {seoKeywords && (
                                <div>
                                    <p className="text-xs text-indigo-400 font-semibold mb-1">Keywords</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                            <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Post meta card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Post Details</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Status</dt>
                                <dd className="font-semibold text-gray-800 capitalize">{data.status}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Slug</dt>
                                <dd className="font-mono text-xs text-gray-600 truncate max-w-[140px]">{data.slug}</dd>
                            </div>
                            {publishedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-400">Published</dt>
                                    <dd className="text-gray-700">{publishedAt}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </aside>
            </div>
        </main>
    );
}
