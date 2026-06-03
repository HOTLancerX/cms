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
 * Blog category template — Layout 2
 * Dark sidebar style: sticky category info panel on the left, post grid on the right.
 */
export default function BlogCategoryLayout2({ data }: BlogCatProps) {
    const seoTitle = data.info?.seo_meta_title || data.info?.seo_title || "";
    const seoDesc = data.info?.seo_meta_description || data.info?.seo_description || "";
    const seoKeywords = data.info?.seo_meta_keyword || "";

    const knownKeys = new Set(["seo_meta_title", "seo_title", "seo_meta_description", "seo_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-[#0f1117] text-gray-100">
            <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">

                {/* ── Sidebar ── */}
                <aside className="space-y-6">
                    {/* Category identity */}
                    <div className="bg-linear-to-br from-violet-600 to-purple-700 rounded-3xl p-7 text-center shadow-xl shadow-violet-900/30">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-5 text-3xl">
                            📂
                        </div>
                        <h1 className="text-2xl font-extrabold text-white capitalize leading-tight mb-2">
                            {data.title}
                        </h1>
                        <p className="text-violet-200 text-xs font-mono mb-4">/{data.slug}</p>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${data.status === "published"
                                ? "bg-white/20 text-white"
                                : "bg-amber-400/20 text-amber-300"
                            }`}>
                            {data.status}
                        </span>
                    </div>

                    {/* SEO panel */}
                    {(seoTitle || seoDesc || seoKeywords) && (
                        <div className="bg-white border border-white/5 rounded-2xl p-6 space-y-4">
                            <h3 className="text-xs font-mono text-violet-400 uppercase tracking-widest">SEO</h3>
                            {seoTitle && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Title</p>
                                    <p className="text-sm text-gray-200 font-medium leading-snug">{seoTitle}</p>
                                </div>
                            )}
                            {seoDesc && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Description</p>
                                    <p className="text-sm text-gray-400 leading-relaxed">{seoDesc}</p>
                                </div>
                            )}
                            {seoKeywords && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Keywords</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                            <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Extra plugin fields */}
                    {extraInfo.length > 0 && (
                        <div className="bg-white border border-white/5 rounded-2xl p-6 space-y-3">
                            <h3 className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-3">
                                Plugin Fields
                            </h3>
                            {extraInfo.map(([key, value]) => (
                                <div key={key} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-0.5">
                                        {key.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-sm text-gray-300 break-all">{value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* ── Main: post grid ── */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            Posts in <span className="text-violet-400 capitalize">{data.title}</span>
                        </h2>
                        <span className="text-xs text-gray-500 font-mono">Layout 2</span>
                    </div>

                    {/* Placeholder post cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white border border-white/5 rounded-2xl p-6 hover:border-violet-500/30 transition group">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm shrink-0">
                                        {i}
                                    </div>
                                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                                        Post
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-white/5 rounded-lg w-4/5 group-hover:bg-white/10 transition" />
                                    <div className="h-3 bg-white/5 rounded-lg w-3/5 group-hover:bg-white/10 transition" />
                                    <div className="h-3 bg-white/5 rounded-lg w-2/5 group-hover:bg-white/10 transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-600 text-center italic">
                        Connect your post query to populate this grid.
                    </p>
                </section>
            </div>
        </main>
    );
}
