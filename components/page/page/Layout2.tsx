interface PageProps {
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
 * Page template — Layout 2
 * Full-width dark landing style: gradient hero, wide content area, floating meta strip.
 */
export default function PageLayout2({ data }: PageProps) {
    const updatedAt = data.updatedAt
        ? new Date(data.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;

    const seoTitle = data.info?.seo_meta_title || "";
    const seoDesc = data.info?.seo_meta_description || "";
    const seoKw = data.info?.seo_meta_keyword || "";

    const knownKeys = new Set(["seo_meta_title", "seo_meta_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-[#0c0e14]">
            {/* ── Hero ── */}
            <header className="relative overflow-hidden">
                {/* Background gradient blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-sky-600/20 blur-3xl" />
                    <div className="absolute -bottom-20 right-0 w-[400px] h-[400px] rounded-full bg-blue-700/15 blur-3xl" />
                </div>

                <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
                    <span className={`inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6 ${data.status === "published"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}>
                        {data.status}
                    </span>
                    <h1 className="text-5xl sm:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
                        {data.title}
                    </h1>
                    <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-gray-500">
                        <span className="font-mono text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                            /{data.slug}
                        </span>
                        {updatedAt && (
                            <span className="text-xs">Updated {updatedAt}</span>
                        )}
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="h-px bg-linear-to-r from-transparent via-sky-500/40 to-transparent" />
            </header>

            {/* ── Content ── */}
            <div className="max-w-4xl mx-auto px-6 py-14 space-y-12">
                {/* Body placeholder */}
                <section className="bg-white border border-white/5 rounded-3xl p-10">
                    <p className="text-gray-500 italic text-sm text-center">
                        Page content renders here. Connect your rich-text body field to replace this placeholder.
                    </p>
                </section>

                {/* SEO strip */}
                {(seoTitle || seoDesc || seoKw) && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {seoTitle && (
                            <div className="bg-white border border-white/5 rounded-2xl p-5 hover:border-sky-500/30 transition">
                                <p className="text-xs font-mono text-sky-400 uppercase tracking-wider mb-2">SEO Title</p>
                                <p className="text-sm text-gray-200 font-medium leading-snug">{seoTitle}</p>
                            </div>
                        )}
                        {seoDesc && (
                            <div className="bg-white border border-white/5 rounded-2xl p-5 hover:border-sky-500/30 transition">
                                <p className="text-xs font-mono text-sky-400 uppercase tracking-wider mb-2">Meta Description</p>
                                <p className="text-sm text-gray-300 leading-relaxed">{seoDesc}</p>
                            </div>
                        )}
                        {seoKw && (
                            <div className="bg-white border border-white/5 rounded-2xl p-5 sm:col-span-2 hover:border-sky-500/30 transition">
                                <p className="text-xs font-mono text-sky-400 uppercase tracking-wider mb-3">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {seoKw.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                        <span key={kw} className="text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/20">
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
                                <div key={key} className="bg-white border border-white/5 rounded-xl px-5 py-4 hover:border-sky-500/30 transition">
                                    <p className="text-xs font-mono text-sky-400 uppercase tracking-wide mb-1">
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
