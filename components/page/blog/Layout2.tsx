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
 * Blog post template — Layout 2
 * Dark magazine style: full-width dark header, two-tone body, tag-style meta.
 */
export default function BlogLayout2({ data }: BlogPostProps) {
    const publishedAt = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;

    const seoTitle = data.info?.seo_meta_title || data.info?.seo_title || "";
    const seoDesc = data.info?.seo_meta_description || data.info?.seo_description || "";
    const seoKeywords = data.info?.seo_meta_keyword || "";

    const knownKeys = new Set(["seo_meta_title", "seo_title", "seo_meta_description", "seo_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-[#0f1117]">
            {/* ── Top bar ── */}
            <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between max-w-6xl mx-auto">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Blog</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${data.status === "published"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}>
                    {data.status}
                </span>
            </div>

            {/* ── Hero ── */}
            <header className="max-w-4xl mx-auto px-6 pt-16 pb-12">
                <h1 className="text-4xl sm:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
                    {data.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                    {publishedAt && (
                        <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                            {publishedAt}
                        </span>
                    )}
                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                        /{data.slug}
                    </span>
                </div>
            </header>

            {/* ── Divider ── */}
            <div className="max-w-4xl mx-auto px-6">
                <div className="h-px bg-linear-to-r from-violet-500 via-indigo-500 to-transparent" />
            </div>

            {/* ── Body ── */}
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
                {/* Content placeholder */}
                <section className="bg-white border border-white/5 rounded-2xl p-8">
                    <p className="text-gray-500 italic text-sm text-center">
                        Post content renders here. Connect your rich-text body field to replace this placeholder.
                    </p>
                </section>

                {/* SEO block */}
                {(seoTitle || seoDesc || seoKeywords) && (
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {seoTitle && (
                            <div className="bg-white border border-white/5 rounded-xl p-5">
                                <p className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-2">SEO Title</p>
                                <p className="text-sm text-gray-200 font-medium leading-snug">{seoTitle}</p>
                            </div>
                        )}
                        {seoDesc && (
                            <div className="bg-white border border-white/5 rounded-xl p-5 sm:col-span-2">
                                <p className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-2">Meta Description</p>
                                <p className="text-sm text-gray-300 leading-relaxed">{seoDesc}</p>
                            </div>
                        )}
                        {seoKeywords && (
                            <div className="bg-white border border-white/5 rounded-xl p-5 sm:col-span-3">
                                <p className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-3">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {seoKeywords.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                        <span key={kw} className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">
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
                    <section>
                        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
                            Plugin Fields
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {extraInfo.map(([key, value]) => (
                                <div key={key} className="bg-white border border-white/5 rounded-xl px-5 py-4 hover:border-violet-500/30 transition">
                                    <p className="text-xs font-mono text-violet-400 uppercase tracking-wide mb-1">
                                        {key.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-sm text-gray-200 break-all">{value}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
