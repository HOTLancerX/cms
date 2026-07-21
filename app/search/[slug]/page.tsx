import { Metadata } from 'next';
import SearchResults from './SearchResults';
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";
import Template from "@/models/template";
import Permalink from "@/models/permalink";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";
import { serializeDocs } from "@/lib/mongodb";
import { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}

function slugToQuery(slug: string): string {
  return slug.replace(/-/g, ' ');
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function scoreItem(title: string, query: string, queryWords: string[]): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;

  if (t === q) score += 1000;
  else if (t.startsWith(q)) score += 600;
  else if (t.includes(q)) score += 400;

  queryWords.forEach(word => {
    if (t.includes(word)) score += 80;
    else {
      const titleWords = t.split(/\s+/);
      const threshold = Math.floor(word.length / 4);
      if (titleWords.some(tw => levenshtein(tw, word) <= threshold)) score += 30;
    }
  });

  score -= t.length * 0.05;
  return score;
}

async function searchDatabase(query: string, type: string = 'all', limit: number = 60) {
  try {
    await connectDB();

    const postTypes = getPostTypes();
    const catTypes = getCatTypes();

    if (!query.trim()) return { results: {}, categories: {}, total: 0, query };

    const q = query.toLowerCase().trim();
    const queryWords = q.split(/\s+/).filter(w => w.length > 0);

    // Broad fuzzy regex net
    const regexList = queryWords.map(w => new RegExp(w, 'i'));
    const orFilter = regexList.map(r => ({ title: r }));

    const results: Record<string, any[]> = {};
    let total = 0;

    // Search posts of active post types
    for (const pt of postTypes) {
      if (type !== 'all' && type !== pt.key) continue;

      const raw = await Post.find({ type: pt.key, status: 'published', $or: orFilter })
        .limit(type === 'all' ? 20 : limit)
        .lean();

      if (raw.length > 0) {
        const postIds = raw.map(p => p._id);
        const infoRecords = await PostInfo.find({ postId: { $in: postIds } }).lean();
        
        const infoByPost = infoRecords.reduce((acc, r) => {
          const k = String(r.postId);
          if (!acc[k]) acc[k] = {};
          acc[k][r.name] = r.value;
          return acc;
        }, {} as Record<string, Record<string, string>>);

        const enriched = raw.map((post: any) => {
          const p: any = {
            ...post,
            _id: String(post._id),
            category: post.category ? String(post.category) : null,
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : '',
            updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : '',
            info: infoByPost[String(post._id)] ?? {}
          };
          p._score = scoreItem(post.title, q, queryWords);
          return p;
        });

        const sorted = serializeDocs(
          enriched.filter(p => p._score > 0).sort((a, b) => b._score - a._score)
        );
        if (sorted.length > 0) {
          results[pt.key] = sorted;
          total += sorted.length;
        }
      }
    }

    // Search related categories for each active category type
    const categories: Record<string, any[]> = {};
    for (const ct of catTypes) {
      const rawCats = await Cat.find({ type: ct.key, status: 'published', $or: orFilter })
        .limit(6)
        .lean();

      if (rawCats.length > 0) {
        const catIds = rawCats.map(c => c._id);
        const infoRecords = await CatInfo.find({ catId: { $in: catIds } }).lean();
        
        const infoByCat = infoRecords.reduce((acc, r) => {
          const k = String(r.catId);
          if (!acc[k]) acc[k] = {};
          acc[k][r.name] = r.value;
          return acc;
        }, {} as Record<string, Record<string, string>>);

        const enrichedCats = rawCats.map((c: any) => {
          const info = infoByCat[String(c._id)] ?? {};
          const rawImage = info.cat_image || info.brand_logo || info.images || info.image || '';
          let image = '';
          if (rawImage) {
            try {
              const parsed = JSON.parse(rawImage);
              image = Array.isArray(parsed) ? (parsed[0] || '') : String(parsed);
            } catch {
              image = String(rawImage);
            }
          }
          return {
            _id: String(c._id),
            title: c.title,
            slug: c.slug,
            type: c.type,
            image,
            info
          };
        });

        categories[ct.key] = serializeDocs(enrichedCats);
      }
    }

    return {
      results,
      categories,
      total,
      query
    };
  } catch (error) {
    console.error('Search error:', error);
    return { results: {}, categories: {}, total: 0, query };
  }
}

function getPostImage(post: any): string {
  const rawImages = post.info?.images || post.info?.image || '';
  if (!rawImages) return '';
  try {
    const parsed = JSON.parse(rawImages);
    return Array.isArray(parsed) ? (parsed[0] || '') : String(parsed);
  } catch {
    return String(rawImages);
  }
}

function getProductPrice(post: any): number | null {
  try {
    const variate = JSON.parse(post.info?._variate || '{}');
    return parseFloat(variate.sellingprice) || parseFloat(variate.regularprice) || null;
  } catch {
    return null;
  }
}

function getUrl(slug: string, contentType: string, permalinkMap: Record<string, string>): string {
  const prefix = permalinkMap[contentType] ?? contentType;
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/${slug}` : `/${slug}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { type = 'all' } = await searchParams;
  const query = slugToQuery(slug);

  const formattedQuery = query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const title = `${formattedQuery} - Search Results`;
  const description = `Browse search results for ${formattedQuery}.`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl}/search/${slug}${type !== 'all' ? `?type=${type}` : ''}`;

  return {
    title,
    description,
    keywords: `${query}, ${query} search`,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, type: 'website', url: canonicalUrl },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { type = 'all' } = await searchParams;
  const query = slugToQuery(slug);

  const [searchData, settings] = await Promise.all([
    searchDatabase(query, type),
    Settings(),
  ]);

  const postTypes = getPostTypes();
  const catTypes = getCatTypes();

  // Load permalinks
  const permalinkDocs = await Permalink.find({}).lean();
  const permalinkMap: Record<string, string> = {};
  permalinkDocs.forEach((d: any) => {
    permalinkMap[d.contentType] = d.prefix ?? "";
  });

  // Load default box templates
  const defaultTemplates = await Template.find({
    type: { $regex: /-box$/ },
    isDefault: true
  }).lean();

  const activeBoxTemplates: Record<string, { label: string; pluginNx: string }> = {};
  defaultTemplates.forEach((t: any) => {
    activeBoxTemplates[t.type] = {
      label: t.label,
      pluginNx: t.pluginNx
    };
  });

  const formattedQuery = query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Flatten results for JSON-LD
  const allResults: any[] = [];
  Object.entries(searchData.results).forEach(([ptKey, items]) => {
    items.forEach(item => {
      allResults.push({ ...item, postType: ptKey });
    });
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: formattedQuery,
    description: `Browse ${formattedQuery}. Found ${searchData.total} results.`,
    url: `${baseUrl}/search/${slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: searchData.total,
      itemListElement: allResults.map((item: any, i: number) => {
        const image = getPostImage(item);
        const itemUrl = getUrl(item.slug, item.postType, permalinkMap);
        if (item.postType === 'product') {
          const price = getProductPrice(item);
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: item.title,
              url: `${baseUrl}${itemUrl}`,
              image: image || '',
              description: item.info?.shortDescription || item.title,
              ...(price !== null && {
                offers: {
                  '@type': 'Offer',
                  price,
                  priceCurrency: settings.product_currency || 'USD',
                  availability: parseInt(item.info?._variate ? JSON.parse(item.info._variate).stock : '0') > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                },
              })
            }
          };
        } else {
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Article',
              headline: item.title,
              url: `${baseUrl}${itemUrl}`,
              image: image || '',
              description: item.info?.shortDescription || item.title
            }
          };
        }
      })
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container py-8">
        <SearchResults
          initialData={searchData}
          query={query}
          type={type}
          currencySymbol={settings.product_currency_symbol || '$'}
          activeBoxTemplates={activeBoxTemplates}
          postTypes={postTypes.map(p => ({ key: p.key, label: p.label, icon: p.icon, color: p.color }))}
          catTypes={catTypes.map(c => ({ key: c.key, label: c.label, icon: c.icon, color: c.color }))}
          permalinkMap={permalinkMap}
        />
      </div>
    </>
  );
}
