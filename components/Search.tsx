'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Image from 'next/image';

interface ProductSuggestion {
  title: string;
  slug: string;
  image: string | null;
  sellingPrice: number | null;
  regularPrice: number | null;
  categoryInfo: { title: string; slug: string } | null;
  brandInfo: { title: string; slug: string } | null;
  url?: string;
}

interface SuggestionData {
  keywords: string[];
  products: ProductSuggestion[];
  categories: { title: string; slug: string; url?: string }[];
  brands: { title: string; slug: string; url?: string }[];
}

interface SearchProps {
  type?: string;
  initialQuery?: string;
  className?: string;
  currencySymbol?: string;
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-blue-600">{text.slice(idx, idx + query.trim().length)}</span>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export default function Search({ type = 'all', initialQuery = '', currencySymbol = '', className = '' }: SearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<SuggestionData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setData(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&type=${type}`);
      if (res.ok) {
        const json: SuggestionData = await res.json();
        const hasResults = json.keywords.length || json.products.length || json.categories.length || json.brands.length;
        setData(json);
        setOpen(!!hasResults);
      }
    } catch { }
    finally { setLoading(false); }
  }, [type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 220);
  };

  const toSlug = (text: string) =>
    text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const go = (q: string) => {
    setOpen(false);
    setQuery(q);
    router.push(`/search/${toSlug(q)}?type=${type}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) go(query.trim());
  };

  const fmt = (price: number | null) => {
    if (price === null || price === undefined) return null;
    return `${currencySymbol}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`.trim();
  };

  const hasData = data && (data.keywords.length || data.products.length || data.categories.length || data.brands.length);

  return (
    <div ref={ref} className={`${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white rounded-full overflow-hidden shadow-sm border border-gray-200 focus-within:border-blue-400 transition-colors">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (hasData) setOpen(true); }}
            placeholder={`Search for ${type === 'all' ? 'products and posts' : type}...`}
            className="px-4 py-2 w-full outline-none border-0 text-black text-sm bg-transparent"
            autoComplete="off"
          />
          {loading && (
            <Icon icon="mdi:loading" className="w-4 h-4 text-gray-400 animate-spin mr-2 shrink-0" />
          )}
          <button type="submit" className="bg-main text-white rounded-full p-2 mr-1 flex items-center justify-center shrink-0">
            <Icon icon="mdi:magnify" className="h-4 w-4" />
          </button>
        </div>
      </form>

      {open && hasData && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">

          {/* Keywords */}
          {data!.keywords.length > 0 && (
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {data!.keywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => go(kw)}
                    className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Icon icon="mdi:magnify" className="w-3 h-3 opacity-60" />
                    {highlight(kw, query)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {data!.products.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">Products</p>
              <div className="space-y-1">
                {data!.products.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setOpen(false); router.push(p.url || `/product/${p.slug}`); }}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    {/* Image */}
                    <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {p.image
                        ? <Image src={p.image} alt={p.title} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:image-outline" className="w-5 h-5 text-gray-300" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {highlight(p.title, query)}
                      </p>
                      {(p.categoryInfo || p.brandInfo) && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {[p.categoryInfo?.title, p.brandInfo?.title].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      {p.sellingPrice !== null && (
                        <p className="text-sm font-bold text-main">{fmt(p.sellingPrice)}</p>
                      )}
                      {p.regularPrice !== null && p.sellingPrice !== null && p.regularPrice > p.sellingPrice && (
                        <p className="text-xs text-gray-400 line-through">{fmt(p.regularPrice)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories + Brands */}
          {(data!.categories.length > 0 || data!.brands.length > 0) && (
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {data!.categories.map((c, i) => (
                  <button
                    key={`cat-${i}`}
                    onClick={() => { setOpen(false); router.push(c.url || `/category-products/${c.slug}`); }}
                    className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Icon icon="mdi:folder-outline" className="w-3 h-3" />
                    {c.title}
                  </button>
                ))}
                {data!.brands.map((b, i) => (
                  <button
                    key={`brand-${i}`}
                    onClick={() => { setOpen(false); router.push(b.url || `/brands/${b.slug}`); }}
                    className="flex items-center gap-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Icon icon="mdi:tag-outline" className="w-3 h-3" />
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View all */}
          <button
            onClick={() => go(query)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition-colors font-medium"
          >
            <Icon icon="mdi:magnify" className="w-4 h-4" />
            See all results for "{query}"
          </button>
        </div>
      )}
    </div>
  );
}
