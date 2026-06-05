/**
 * Core Admin Hook Registrations
 *
 * The single source of truth for built-in nav items and default form fields.
 * Runs on every reregisterHooks() call and is ALWAYS active — bypasses the
 * plugin gate entirely via registerCoreHooks() in hook/index.ts.
 *
 * Add nav items here instead of the old DEFAULT_NAV array in nav.ts.
 * Never import DB models or server-only code here.
 */

import { addHook, addPostType, addCatType } from "@/hook";
import { Text, Textarea, Tags } from "@/components/ui";
import BlogLayout1 from "@/components/page/blog/Layout1";
import BlogLayout2 from "@/components/page/blog/Layout2";
import BlogCategoryLayout1 from "@/components/page/blog-category/Layout1";
import BlogCategoryLayout2 from "@/components/page/blog-category/Layout2";
import PageLayout1 from "@/components/page/page/Layout1";
import PageLayout2 from "@/components/page/page/Layout2";
import Header1 from "@/components/page/header/Header1";
import Header2 from "@/components/page/header/Header2";
import Header3 from "@/components/page/header/Header3";
import Footer1 from "@/components/page/footer/Footer1";
import Footer2 from "@/components/page/footer/Footer2";
import Footer3 from "@/components/page/footer/Footer3";

/** The nx identifier stamped onto every core-registered field. */
export const CORE_NX = "com.system.core";

/**
 * Register all built-in hooks.
 * Called automatically by reregisterHooks() — do not call this directly.
 */
export function register(): void {
    // ─── Admin nav ──────────────────────────────────────────────────────────
    addHook("admin.nav", [
        {
            key: "dashboard",
            label: "Dashboard",
            icon: "solar:home-bold",
            slug: "",
            parent: "",
            position: 0,
        },
        // ── Page ──
        {
            key: "page",
            label: "Page",
            icon: "solar:file-text-bold",
            slug: "posts/page",
            parent: "",
            position: 11,
        },
        {
            key: "page-add",
            label: "Add Page",
            icon: "solar:add-circle-bold",
            slug: "posts/page/new",
            parent: "page",
            position: 2,
        },
        // ── Blog ──
        {
            key: "blog",
            label: "Blog",
            icon: "solar:document-bold",
            slug: "posts/blog",
            parent: "",
            position: 12,
        },
        {
            key: "blog-add",
            label: "Add Blog",
            icon: "solar:add-circle-bold",
            slug: "posts/blog/new",
            parent: "blog",
            position: 2,
        },
        {
            key: "blog-category",
            label: "Categories",
            icon: "solar:folder-with-files-bold",
            slug: "category/blog-category",
            parent: "blog",
            position: 3,
        },
        // ── Users ──
        {
            key: "users",
            label: "Users",
            icon: "solar:users-group-rounded-bold",
            slug: "users",
            parent: "",
            position: 50,
        },
        {
            key: "users-add",
            label: "Add User",
            icon: "solar:user-plus-bold",
            slug: "users/add",
            parent: "users",
            position: 1,
        },
        // ── Plugins ──
        {
            key: "plugin",
            label: "Plugins",
            icon: "solar:widget-bold",
            slug: "plugin",
            parent: "",
            position: 100,
        },
        {
            key: "plugin-list",
            label: "Plugin Store",
            icon: "solar:shop-bold",
            slug: "plugin/list",
            parent: "plugin",
            position: 1,
        },
        // ── Templates ──
        {
            key: "template",
            label: "Templates",
            icon: "solar:layers-bold",
            slug: "template",
            parent: "",
            position: 110,
        },
        // ── Permalinks ──
        {
            key: "permalink",
            label: "Permalinks",
            icon: "solar:link-bold",
            slug: "permalink",
            parent: "",
            position: 120,
        },
        {
            key: "builder",
            label: "Builder",
            icon: "boxicons:layout",
            slug: "builder",
            parent: "",
            position: 120,
        },
        {
            key: "builder-add",
            label: "Add new",
            icon: "boxicons:layout",
            slug: "builder/add",
            parent: "builder",
            position: 120,
        },
        {
            key: "builder-section",
            label: "Section",
            icon: "boxicons:layout",
            slug: "builder/section",
            parent: "builder",
            position: 120,
        },
    ], CORE_NX);

    // ─── Core post types ────────────────────────────────────────────────────
    addPostType([
        {
            key: "blog",
            label: "Blog",
            icon: "solar:document-bold",
            color: "from-violet-500 to-purple-600",
            position: 10,
            hasCategory: true,
        },
        {
            key: "page",
            label: "Page",
            icon: "solar:file-text-bold",
            color: "from-sky-500 to-blue-600",
            position: 20,
            hasCategory: false,  // pages don't use categories
        },
    ], CORE_NX);

    // ─── Core category types ─────────────────────────────────────────────────
    addCatType([
        {
            key: "blog-category",
            label: "Blog Category",
            postType: "blog",
            icon: "solar:folder-with-files-bold",
            color: "from-violet-500 to-purple-600",
            position: 10,
        },
    ], CORE_NX);

    // ─── Post form fields ───────────────────────────────────────────────────
    addHook("post.form", [
        {
            key: "seo_meta_title",
            label: "SEO Title",
            type: "",
            style: "left",
            position: 9991,
            component: Text,
        },
        {
            key: "seo_meta_description",
            label: "SEO Description",
            type: "",
            style: "left",
            position: 9992,
            component: Textarea,
        },
        {
            key: "seo_meta_keyword",
            label: "SEO Keyword",
            type: "",
            style: "left",
            position: 9993,
            component: Tags,
        },
    ], CORE_NX);

    // ─── Cat form fields ────────────────────────────────────────────────────
    addHook("cat.form", [
        {
            key: "seo_meta_title",
            label: "SEO Title",
            type: "",
            style: "left",
            position: 9991,
            component: Text,
        },
        {
            key: "seo_meta_description",
            label: "SEO Description",
            type: "",
            style: "left",
            position: 9992,
            component: Textarea,
        },
        {
            key: "seo_meta_keyword",
            label: "SEO Keyword",
            type: "",
            style: "left",
            position: 9993,
            component: Tags,
        },
    ], CORE_NX);

    // ─── Blog post page templates ────────────────────────────────────────────
    // Registered as core so they are always available in the Template manager
    // regardless of which plugins are activated.
    addHook("root.pages", [
        {
            key: "blog",
            label: "Blog Layout 1",
            type: "blog",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: BlogLayout1,
        },
        {
            key: "blog",
            label: "Blog Layout 2",
            type: "blog",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: BlogLayout2,
        },
    ], CORE_NX);

    // ─── Blog category page templates ────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "blog-category",
            label: "Blog Category Layout 1",
            type: "blog-category",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: BlogCategoryLayout1,
        },
        {
            key: "blog-category",
            label: "Blog Category Layout 2",
            type: "blog-category",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: BlogCategoryLayout2,
        },
    ], CORE_NX);

    // ─── Page post templates ─────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "page",
            label: "Page Layout 1",
            type: "page",
            slug: "dynamic",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: PageLayout1,
        },
        {
            key: "page",
            label: "Page Layout 2",
            type: "page",
            slug: "dynamic",
            style: "left",
            position: 20,
            active: false,
            component: PageLayout2,
        },
    ], CORE_NX);

    // ─── Site header templates ────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "header",
            label: "Header Layout 1",
            type: "header",
            slug: "layout",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: Header1,
        },
        {
            key: "header",
            label: "Header Layout 2",
            type: "header",
            slug: "layout",
            style: "left",
            position: 20,
            active: false,
            component: Header2,
        },
        {
            key: "header",
            label: "Header Layout 3",
            type: "header",
            slug: "layout",
            style: "left",
            position: 30,
            active: false,
            component: Header3,
        },
    ], CORE_NX);

    // ─── Site footer templates ────────────────────────────────────────────────
    addHook("root.pages", [
        {
            key: "footer",
            label: "Footer Layout 1",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 10,
            active: true,           // first-boot default
            component: Footer1,
        },
        {
            key: "footer",
            label: "Footer Layout 2",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 20,
            active: false,
            component: Footer2,
        },
        {
            key: "footer",
            label: "Footer Layout 3",
            type: "footer",
            slug: "layout",
            style: "left",
            position: 30,
            active: false,
            component: Footer3,
        },
    ], CORE_NX);
}