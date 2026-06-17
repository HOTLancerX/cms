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

// ── blog: full category ancestor chain for the breadcrumb ────────────────────

registerServerDataHook("blog", async (_id, _slug, data) => {
    if (!data?.category) return { categoryAncestors: [] };
    // Walk parent chain to build root → leaf breadcrumb
    const chain: { _id: string; title: string; slug: string }[] = [];
    let current: any = await Cat.findById(data.category).lean();
    while (current) {
        chain.unshift({
            _id:   String(current._id),
            title: current.title ?? '',
            slug:  current.slug  ?? '',
        });
        if (!current.parentId) break;
        current = await Cat.findById(current.parentId).lean();
    }
    return { categoryAncestors: chain };
});
