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
 * Page template — Layout 1
 * Clean document style: centred content column, subtle header, SEO sidebar card.
 */
export default function PageLayout1({ data }: PageProps) {
    const publishedAt = data.updatedAt
        ? new Date(data.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : null;

    const seoTitle = data.info?.seo_meta_title || "";
    const seoDesc = data.info?.seo_meta_description || "";
    const seoKw = data.info?.seo_meta_keyword || "";

    const knownKeys = new Set(["seo_meta_title", "seo_meta_description", "seo_meta_keyword"]);
    const extraInfo = Object.entries(data.info || {}).filter(([k]) => !knownKeys.has(k));

    return (
        <main className="min-h-screen bg-white">
            {/* ── Top breadcrumb bar ── */}
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
                <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-gray-400">
                    <span>Home</span>
                    <span>/</span>
                    <span className="text-gray-700 font-medium capitalize">{data.title}</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
                {/* ── Main column ── */}
                <article className="space-y-10">
                    {/* Title */}
                    <header className="space-y-3 pb-8 border-b border-gray-100">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                            {data.title}
                        </h1>
                        <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                            {publishedAt && <span>Updated {publishedAt}</span>}
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                /{data.slug}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${data.status === "published"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-amber-50 text-amber-600"
                                }`}>
                                {data.status}
                            </span>
                        </div>
                    </header>

                    {/* Content body */}
                    <section className="prose prose-lg max-w-none text-gray-700">
                        <div className="bg-gray-50 rounded-2xl p-10 border border-dashed border-gray-200 text-center text-gray-400 italic text-sm">
                            Page content renders here. Connect your rich-text body field to replace this placeholder.
                        </div>
                    </section>

                    {/* Extra plugin fields */}
                    {extraInfo.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-4 rounded-full bg-sky-500 inline-block" />
                                Additional Fields
                            </h2>
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                                {extraInfo.map(([key, value]) => (
                                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3.5 bg-white hover:bg-gray-50 transition">
                                        <dt className="text-xs font-mono font-semibold text-sky-500 uppercase tracking-wide min-w-[180px]">
                                            {key.replace(/_/g, " ")}
                                        </dt>
                                        <dd className="text-sm text-gray-700 break-all">{value}</dd>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </article>

                {/* ── Sidebar ── */}
                <aside className="space-y-5">
                    {/* SEO card */}
                    {(seoTitle || seoDesc || seoKw) && (
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6 space-y-4">
                            <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                                SEO
                            </h3>
                            {seoTitle && (
                                <div>
                                    <p className="text-xs text-sky-400 font-semibold mb-1">Title</p>
                                    <p className="text-sm text-sky-900 font-medium leading-snug">{seoTitle}</p>
                                </div>
                            )}
                            {seoDesc && (
                                <div>
                                    <p className="text-xs text-sky-400 font-semibold mb-1">Description</p>
                                    <p className="text-sm text-sky-800 leading-relaxed">{seoDesc}</p>
                                </div>
                            )}
                            {seoKw && (
                                <div>
                                    <p className="text-xs text-sky-400 font-semibold mb-2">Keywords</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {seoKw.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                                            <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Page meta */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Page Info</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Status</dt>
                                <dd className="font-semibold text-gray-800 capitalize">{data.status}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-gray-400 shrink-0">Slug</dt>
                                <dd className="font-mono text-xs text-gray-600 truncate">{data.slug}</dd>
                            </div>
                            {publishedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-400">Updated</dt>
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
