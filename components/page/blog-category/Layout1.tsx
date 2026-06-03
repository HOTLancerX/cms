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
}

/**
 * Blog category template — Layout 1
 * Light card style: banner header, description, SEO meta panel, info grid.
 */
export default function BlogCategoryLayout1({ data }: BlogCatProps) {
    const seoTitle = data.info?.seo_meta_title || data.info?.seo_title || "";
    const seoDesc = data.info?.seo_meta_description || data.info?.seo_description || "";
    const seoKeywords = data.info?.seo_meta_keyword || "";

    const knownKeys = new Set(["seo_meta_title", "seo_title", "seo_meta_description", "seo_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-gray-50">
            {/* ── Banner ── */}
            <header className="bg-linear-to-r from-violet-600 to-purple-700 py-16 px-6">
                <div className="max-w-4xl mx-auto flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-3">
                            Blog Category
                        </p>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white capitalize leading-tight">
                            {data.title}
                        </h1>
                        <p className="text-violet-200 mt-3 text-sm font-mono">/{data.slug}</p>
                    </div>
                    <span className={`text-sm font-semibold px-4 py-1.5 rounded-full capitalize ${data.status === "published"
                            ? "bg-white text-violet-700"
                            : "bg-white/20 text-white"
                        }`}>
                        {data.status}
                    </span>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
                {/* Posts placeholder */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <span className="w-1.5 h-5 rounded-full bg-violet-500 inline-block" />
                        Posts in this category
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm animate-pulse">
                                <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-gray-100 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-4 italic">
                        Connect your post query to populate this grid.
                    </p>
                </section>

                {/* SEO + meta */}
                {(seoTitle || seoDesc || seoKeywords) && (
                    <section className="bg-white rounded-2xl border border-gray-200 p-7 space-y-5">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                            SEO Meta
                        </h2>
                        {seoTitle && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold mb-1">Title</p>
                                <p className="text-sm text-gray-800 font-medium">{seoTitle}</p>
                            </div>
                        )}
                        {seoDesc && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold mb-1">Description</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{seoDesc}</p>
                            </div>
                        )}
                        {seoKeywords && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold mb-2">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                        <span key={kw} className="text-xs px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-medium">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Extra plugin fields */}
                {extraInfo.length > 0 && (
                    <section className="bg-white rounded-2xl border border-gray-200 p-7">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5">
                            Plugin Fields
                        </h2>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {extraInfo.map(([key, value]) => (
                                <div key={key} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                    <dt className="text-xs font-mono text-violet-500 uppercase tracking-wide mb-1">
                                        {key.replace(/_/g, " ")}
                                    </dt>
                                    <dd className="text-sm text-gray-700 break-all">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
            </div>
        </main>
    );
}
