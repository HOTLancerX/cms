import { NextRequest, NextResponse } from 'next/server';
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import { serializeDocs } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Levenshtein distance for fuzzy matching
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

// Score a title against a query
function scoreTitle(title: string, query: string, queryWords: string[]): number {
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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query.trim()) {
      return NextResponse.json({ products: [], posts: [], total: 0, query });
    }

    const lowerQuery = query.toLowerCase().trim();
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
    const regexList = queryWords.map(w => new RegExp(w, 'i'));
    const orFilter = regexList.map(r => ({ title: r }));

    let products: any[] = [];
    let posts: any[] = [];

    // --- Search Products (post type "product") ---
    if (type === 'all' || type === 'products' || type === 'product') {
      const rawProducts = await Post.find({
        type: 'product',
        status: 'published',
        $or: orFilter
      }).limit(type === 'all' ? 10 : limit).lean();

      if (rawProducts.length > 0) {
        const productIds = rawProducts.map(p => p._id);
        const infoDocs = await PostInfo.find({ postId: { $in: productIds } }).lean();
        const infoByPost = infoDocs.reduce((acc, r) => {
          const k = String(r.postId);
          if (!acc[k]) acc[k] = {};
          acc[k][r.name] = r.value;
          return acc;
        }, {} as Record<string, Record<string, string>>);

        const enrichedProducts = await Promise.all(rawProducts.map(async (product) => {
          const info = infoByPost[String(product._id)] ?? {};
          const enriched: any = {
            ...product,
            _id: String(product._id),
            category: product.category ? String(product.category) : null,
            info
          };

          // Populate category info
          if (product.category) {
            try {
              const category = await Cat.findOne({ _id: product.category, type: 'product-category' });
              enriched.categoryInfo = category ? { title: category.title, slug: category.slug } : null;
            } catch {
              enriched.categoryInfo = null;
            }
          }

          // Populate brand info
          const brandVal = (product as any).brands || info.brands || info.brand;
          if (brandVal && typeof brandVal === 'string' && brandVal.length === 24) {
            try {
              const brand = await Cat.findOne({ _id: brandVal, type: 'brands' });
              enriched.brandInfo = brand ? { title: brand.title, slug: brand.slug } : null;
            } catch {
              enriched.brandInfo = null;
            }
          }

          enriched._score = scoreTitle(product.title, lowerQuery, queryWords);
          return enriched;
        }));

        products = serializeDocs(
          enrichedProducts.filter(p => p._score > 0).sort((a, b) => b._score - a._score)
        );
      }
    }

    // --- Search Blog Posts (post type "blog") ---
    if (type === 'all' || type === 'posts' || type === 'blog') {
      const rawPosts = await Post.find({
        type: 'blog',
        status: 'published',
        $or: orFilter
      }).limit(type === 'all' ? 10 : limit).lean();

      if (rawPosts.length > 0) {
        const postIds = rawPosts.map(p => p._id);
        const infoDocs = await PostInfo.find({ postId: { $in: postIds } }).lean();
        const infoByPost = infoDocs.reduce((acc, r) => {
          const k = String(r.postId);
          if (!acc[k]) acc[k] = {};
          acc[k][r.name] = r.value;
          return acc;
        }, {} as Record<string, Record<string, string>>);

        const enrichedPosts = await Promise.all(rawPosts.map(async (post) => {
          const info = infoByPost[String(post._id)] ?? {};
          const enriched: any = {
            ...post,
            _id: String(post._id),
            category: post.category ? String(post.category) : null,
            info
          };

          // Populate category info
          if (post.category) {
            try {
              const category = await Cat.findOne({ _id: post.category, type: 'blog-category' });
              enriched.categoryInfo = category ? [{ title: category.title, slug: category.slug }] : [];
            } catch {
              enriched.categoryInfo = [];
            }
          }

          enriched._score = scoreTitle(post.title, lowerQuery, queryWords);
          return enriched;
        }));

        posts = serializeDocs(
          enrichedPosts.filter(p => p._score > 0).sort((a, b) => b._score - a._score)
        );
      }
    }

    return NextResponse.json({
      products,
      posts,
      total: products.length + posts.length,
      query
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
