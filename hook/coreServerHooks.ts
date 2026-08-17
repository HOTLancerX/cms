/**
 * hook/coreServerHooks.ts — Core server-only data hook registrations.
 *
 * Auto-discovered by hook/serverDataHooks.ts (imported via a direct import
 * at the end of that file). Registers data providers for core content types
 * (blog, blog-category) so they work without any plugin being active.
 *
 * THIS FILE IS SERVER-ONLY.
 */

import { registerServerDataHook } from "./serverDataHooks";
import mongoose from "mongoose";
import Post     from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat      from "@/models/cat";
import Template from "@/models/template";
import User     from "@/models/Users";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDescendantCatIds(catId: string): Promise<mongoose.Types.ObjectId[]> {
    const result: mongoose.Types.ObjectId[] = [new mongoose.Types.ObjectId(catId)];
    const queue = [catId];
    while (queue.length > 0) {
        const pid = queue.shift()!;
        const children = await Cat
            .find({ parentId: new mongoose.Types.ObjectId(pid) })
            .select("_id").lean() as any[];
        for (const c of children) {
            result.push(c._id);
            queue.push(String(c._id));
        }
    }
    return result;
}

async function buildAncestorChain(catId: string) {
    const chain: { _id: string; title: string; slug: string }[] = [];
    let current: any = await Cat.findById(catId).lean();
    while (current) {
        chain.unshift({ _id: String(current._id), title: current.title ?? '', slug: current.slug ?? '' });
        if (!current.parentId) break;
        current = await Cat.findById(current.parentId).lean();
    }
    return chain;
}

async function getActiveBoxTemplate(type: string) {
    const doc = await Template.findOne({ type, isDefault: true }).lean() as any;
    if (!doc) return null;
    return { label: doc.label as string, pluginNx: doc.pluginNx as string };
}

// ── blog-category: posts + subCats + ancestors + activeBox ───────────────────

registerServerDataHook("blog-category", async (catId) => {
    const allCatIds = await getDescendantCatIds(catId);

    const rawPosts = await Post.find({
        category: { $in: allCatIds },
        type:     "blog",
        status:   "published",
    }).lean() as any[];

    const infoRecords = rawPosts.length > 0
        ? await PostInfo.find({ postId: { $in: rawPosts.map((p: any) => p._id) } }).lean() as any[]
        : [];

    const infoByPost: Record<string, Record<string, string>> = {};
    for (const r of infoRecords) {
        const key = String(r.postId);
        if (!infoByPost[key]) infoByPost[key] = {};
        infoByPost[key][r.name] = r.value;
    }

    const posts = rawPosts.map((p: any) => ({
        _id:       String(p._id),
        title:     p.title     ?? "",
        slug:      p.slug      ?? "",
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
        info:      infoByPost[String(p._id)] ?? {},
    }));

    const rawSubCats = await Cat.find({
        parentId: new mongoose.Types.ObjectId(catId),
        type:     "blog-category",
        status:   "published",
    }).lean() as any[];

    const subCats = rawSubCats.map((c: any) => ({
        _id: String(c._id), title: c.title ?? "", slug: c.slug ?? "",
    }));

    const [ancestors, activeBox] = await Promise.all([
        buildAncestorChain(catId),
        getActiveBoxTemplate("blog-box"),
    ]);

    return { posts, subCats, ancestors, activeBox };
});

// ── blog: category ancestors, related category posts, & posting user author info ───

registerServerDataHook("blog", async (_id, _slug, data) => {
    let categoryAncestors: { _id: string; title: string; slug: string }[] = [];
    let relatedPosts: any[] = [];
    let author: { _id?: string; name?: string; image?: string; slug?: string; type?: string } | null = null;

    if (data?.category) {
        // Walk parent chain to build root → leaf breadcrumb
        let current: any = await Cat.findById(data.category).lean();
        while (current) {
            categoryAncestors.unshift({
                _id:   String(current._id),
                title: current.title ?? '',
                slug:  current.slug  ?? '',
            });
            if (!current.parentId) break;
            current = await Cat.findById(current.parentId).lean();
        }

        // Fetch related posts in the same category (excluding current post)
        const rawRelated = await Post.find({
            category: data.category,
            _id: { $ne: _id },
            status: "published",
        })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();

        if (rawRelated.length > 0) {
            const postIds = rawRelated.map((p) => p._id);
            const postInfos = await PostInfo.find({ postId: { $in: postIds } }).lean();
            const infoMapByPost: Record<string, Record<string, string>> = {};
            postInfos.forEach((info) => {
                const pid = String(info.postId);
                if (!infoMapByPost[pid]) infoMapByPost[pid] = {};
                infoMapByPost[pid][info.name] = String(info.value ?? '');
            });

            relatedPosts = rawRelated.map((p) => ({
                _id: String(p._id),
                title: String(p.title ?? ''),
                slug: String(p.slug ?? ''),
                status: String(p.status ?? ''),
                createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ''),
                info: infoMapByPost[String(p._id)] ?? {},
            }));
        }
    }

    // Fetch author (name & image) of posting user
    const targetUserId = data?.userId || data?.info?.userId || data?.info?.authorId || data?.info?.reporterId;
    if (targetUserId) {
        try {
            let userDoc: any = null;
            if (mongoose.Types.ObjectId.isValid(targetUserId)) {
                userDoc = await User.findById(targetUserId).lean();
            }
            if (!userDoc) {
                userDoc = await User.findOne({
                    $or: [{ slug: targetUserId }, { email: targetUserId }],
                }).lean();
            }

            if (userDoc) {
                author = {
                    _id: String(userDoc._id),
                    name: String(userDoc.name ?? ''),
                    image: String(userDoc.image ?? ''),
                    slug: String(userDoc.slug ?? ''),
                    type: String(userDoc.type ?? ''),
                };
            }
        } catch {
            /* skip invalid userId */
        }
    }

    if (!author && (data?.info?.author || data?.info?.userName || data?.info?.reporter || data?.info?.authorName)) {
        author = {
            name: String(data?.info?.author || data?.info?.userName || data?.info?.reporter || data?.info?.authorName),
            image: String(data?.info?.authorImage || data?.info?.userImage || ''),
            type: 'reporter',
        };
    }

    // Fetch latest & popular posts for sidebar widgets
    const [latestDocs, popularDocs, activeBoxRelated, activeBoxDefault] = await Promise.all([
        Post.find({ status: "published" }).sort({ createdAt: -1 }).limit(15).lean(),
        Post.find({ status: "published" }).sort({ createdAt: -1 }).limit(15).lean(),
        getActiveBoxTemplate("blog-related"),
        getActiveBoxTemplate("blog-box"),
    ]);

    const latestPosts = latestDocs.map((p: any) => ({
        _id: String(p._id),
        title: String(p.title ?? ''),
        slug: String(p.slug ?? ''),
    }));

    const popularPosts = popularDocs.map((p: any) => ({
        _id: String(p._id),
        title: String(p.title ?? ''),
        slug: String(p.slug ?? ''),
    }));

    const activeBox = activeBoxRelated || activeBoxDefault || null;

    return { categoryAncestors, relatedPosts, author, latestPosts, popularPosts, activeBox };
});

