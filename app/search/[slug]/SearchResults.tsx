'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useActivePlugins } from '@/hook/useActivePlugins';
import { getHooks } from '@/hook';

interface SearchResultsProps {
  initialData: {
    results: Record<string, any[]>;
    categories: Record<string, any[]>;
    total: number;
    query: string;
  };
  query: string;
  type: string;
  currencySymbol?: string;
  activeBoxTemplates: Record<string, { label: string; pluginNx: string }>;
  postTypes: { key: string; label: string; icon?: string; color?: string }[];
  catTypes: { key: string; label: string; icon?: string; color?: string }[];
  permalinkMap: Record<string, string>;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const cleanQuery = query.toLowerCase().trim();
  const idx = text.toLowerCase().indexOf(cleanQuery);
  if (!cleanQuery || idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + cleanQuery.length)}
      </mark>
      {text.slice(idx + cleanQuery.length)}
    </>
  );
}

function getUrl(slug: string, contentType: string, permalinkMap: Record<string, string>): string {
  const prefix = permalinkMap[contentType] ?? contentType;
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/${slug}` : `/${slug}`;
}

function DynamicPostBox({
  post,
  postUrl,
  currencySymbol = '$',
  activeBoxTemplates
}: {
  post: any;
  postUrl: string;
  currencySymbol?: string;
  activeBoxTemplates: Record<string, { label: string; pluginNx: string }>;
}) {
  const activePlugins = useActivePlugins();
  const [BoxComponent, setBoxComponent] = useState<any>(null);

  useEffect(() => {
    if (activePlugins === null) return;

    const boxType = `${post.type}-box`;
    const boxes = getHooks('root.pages').filter(
      (p) => p.type === boxType && p.slug === 'dynamic'
    );

    let match = null;
    const activeBox = activeBoxTemplates[boxType];
    if (activeBox) {
      match = boxes.find(
        (b) => b.label === activeBox.label && b.pluginNx === activeBox.pluginNx
      )?.component ?? null;
    }
    if (!match) {
      match = (boxes.find((b) => b.active === true) ?? boxes[0])?.component ?? null;
    }

    setBoxComponent(() => match);
  }, [activePlugins, post.type, activeBoxTemplates]);

  if (!BoxComponent) {
    // Default fallback simple card if no box component registered for this post type
    const image = post.info?.images
      ? (() => {
          try {
            const a = JSON.parse(post.info.images);
            return Array.isArray(a) ? a[0] : '';
          } catch {
            return '';
          }
        })()
      : '';
    const shortDesc = post.info?.shortDescription ?? '';
    const publishedAt = post.createdAt
      ? new Date(post.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

    return (
      <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
        {/* Image */}
        <Link href={postUrl} className="block aspect-video overflow-hidden bg-gray-50 relative">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={post.title}
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

          <Link href={postUrl} className="text-sm font-semibold text-gray-900 hover:text-main transition-colors line-clamp-2 leading-snug">
            {post.title}
          </Link>

          {shortDesc && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: shortDesc }} />
          )}

          <Link href={postUrl} className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-main hover:gap-2 transition-all">
            Read more
            <Icon icon="mdi:arrow-right" width="13" height="13" />
          </Link>
        </div>
      </article>
    );
  }

  // Render the resolved box component with standard parameters
  return (
    <BoxComponent
      data={post}
      postUrl={postUrl}
      productUrl={postUrl}
      currencySymbol={currencySymbol}
    />
  );
}

export default function SearchResults({
  initialData,
  query,
  type,
  currencySymbol = '$',
  activeBoxTemplates,
  postTypes,
  catTypes,
  permalinkMap
}: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<string>(type);
  const { results, categories, total } = initialData;

  // Filter postTypes to only those that have search results
  const matchedPostTypes = postTypes.filter(pt => results[pt.key]?.length > 0);

  const tabs = [
    { key: 'all', label: 'All', count: total },
    ...matchedPostTypes.map(pt => ({
      key: pt.key,
      label: pt.label,
      count: results[pt.key]?.length || 0
    }))
  ];

  const showTabs = type === 'all' && matchedPostTypes.length > 1;

  return (
    <div className="space-y-8">
      {/* Search Result Header with modern Glassmorphism aesthetics */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-50 via-white to-purple-50 p-6 md:p-8 border border-indigo-100 shadow-xs">
        <div className="absolute right-0 top-0 w-64 h-64 bg-linear-to-br from-purple-200/20 to-indigo-200/20 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Search Results</span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mt-1">
              &ldquo;{query}&rdquo;
            </h1>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-indigo-100 px-4 py-2 rounded-2xl shadow-xs shrink-0 self-start sm:self-center">
            <span className="text-sm font-bold text-gray-800">{total}</span>
            <span className="text-xs text-gray-500 ml-1">result{total !== 1 ? 's' : ''} found</span>
          </div>
        </div>
      </div>

      {/* Related Categories / Brands (all category types dynamically) */}
      {Object.entries(categories).some(([_, list]) => list.length > 0) && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Icon icon="solar:folder-with-files-bold" className="w-4 h-4 text-indigo-400" />
            Related Content
          </h2>
          <div className="space-y-4">
            {Object.entries(categories).map(([catTypeKey, cats]) => {
              if (!cats.length) return null;
              const catType = catTypes.find(c => c.key === catTypeKey);
              return (
                <div key={catTypeKey} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-gray-500 capitalize">{catType?.label || catTypeKey}</span>
                  <div className="flex flex-wrap gap-2">
                    {cats.map((cat) => (
                      <Link
                        key={cat._id}
                        href={getUrl(cat.slug, catTypeKey, permalinkMap)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50/45 hover:bg-indigo-50 border border-indigo-100/60 hover:border-indigo-200 text-indigo-700 rounded-full text-xs font-semibold transition-all hover:scale-102 hover:shadow-xs"
                      >
                        {catType?.icon ? (
                          <Icon icon={catType.icon} className="w-3.5 h-3.5" />
                        ) : (
                          <Icon icon="solar:folder-bold" className="w-3.5 h-3.5" />
                        )}
                        <Highlight text={cat.title} query={query} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl w-fit">
          {tabs.map(tab => {
            const pt = postTypes.find(p => p.key === tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {pt?.icon && <Icon icon={pt.icon} className="w-3.5 h-3.5 opacity-70" />}
                {tab.label}
                <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-indigo-500/10 text-indigo-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty Search State */}
      {total === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs max-w-xl mx-auto px-6">
          <div className="w-20 h-20 bg-linear-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-50">
            <Icon icon="solar:minimalistic-magnifying-glass-broken" className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No results for &ldquo;{query}&rdquo;</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm">We couldn't find any content matching your search query. Try checking your spelling or using different keywords.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-102">
            <Icon icon="solar:home-2-bold" className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      )}

      {/* Results Content Grid */}
      {total > 0 && (
        <div className="space-y-8">
          {activeTab === 'all' ? (
            matchedPostTypes.map(pt => {
              const items = results[pt.key] || [];
              if (!items.length) return null;
              return (
                <div key={pt.key} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      {pt.icon && <Icon icon={pt.icon} className="w-5 h-5 text-indigo-400" />}
                      {pt.label}
                    </h2>
                    {items.length > 6 && (
                      <button
                        onClick={() => setActiveTab(pt.key)}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        View all {items.length}
                        <Icon icon="solar:arrow-right-bold" className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {items.slice(0, 6).map((post, idx) => (
                      <DynamicPostBox
                        key={post._id || post.id || `search-post-all-${pt.key}-${idx}`}
                        post={post}
                        postUrl={getUrl(post.slug, pt.key, permalinkMap)}
                        currencySymbol={currencySymbol}
                        activeBoxTemplates={activeBoxTemplates}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {postTypes.find(p => p.key === activeTab)?.label}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(results[activeTab] || []).map((post, idx) => (
                  <DynamicPostBox
                    key={post._id || post.id || `search-post-tab-${activeTab}-${idx}`}
                    post={post}
                    postUrl={getUrl(post.slug, activeTab, permalinkMap)}
                    currencySymbol={currencySymbol}
                    activeBoxTemplates={activeBoxTemplates}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
