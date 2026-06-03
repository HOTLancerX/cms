/**
 * Plugin Store catalog.
 *
 * These entries are NOT connected to the database or the plugin/ folder.
 * They represent the "available in the store" versions.
 *
 * - If a plugin's name matches one in the DB and the version here is HIGHER
 *   than the installed version → show "Update" in the store list.
 * - If versions match → show "Installed".
 * - If not installed at all → show "Install".
 */

/**
 * Canonical origin of the CMS itself.
 *
 * This is the single source of truth for the CMS repository URL.
 * `lib/plugin-runner.mjs` reads this value at build/install time so that:
 *   - On a fresh Vercel deploy (or any CI environment) the runner knows
 *     where to pull the CMS source from, even if the repo was forked.
 *   - When a new version is released, updating this one constant is all
 *     that is needed — the runner picks it up automatically on the next
 *     `npm install` / `npm run build`.
 *
 * If you fork this CMS, replace the URL below with your own fork's URL.
 * Everything else (plugin installs, active-plugin recovery) continues to
 * work without any other changes.
 */
export const CMS_ORIGIN_URL = "https://github.com/HOTLancerX/test-cms.git";
export interface AvailablePlugin {
    nx: string;
    name: string;
    version: string;
    description: string;
    author: string;
    path: string;
    icon: string;     // Iconify icon name
    color: string;    // Tailwind gradient classes
}

export const AVAILABLE_PLUGINS: AvailablePlugin[] = [
    {
        nx: "com.system.blog",
        name: "blog",
        version: "1.1.0", // higher than the codebase 1.0.0 → triggers "Update"
        description: "A robust blog system with post and category support.",
        author: "System",
        icon: "fa7-solid:blog",
        color: "from-violet-500 to-purple-600",
        path: "https://github.com/HOTLancerX/blog.git",
    },
    {
        nx: "com.system.seo",
        name: "seo",
        version: "1.0.1",
        description: "All-in-one SEO tools: meta titles, descriptions, and more.",
        author: "System",
        icon: "solar:chart-bold",
        color: "from-sky-500 to-blue-600",
        path: "https://github.com/HOTLancerX/seo.git",
    },
    {
        nx: "com.system.ecommerce",
        name: "ecommerce",
        version: "2.0.0",
        description: "Full-featured e-commerce plugin with cart and checkout.",
        author: "System",
        icon: "solar:cart-large-bold",
        color: "from-emerald-500 to-teal-600",
        path: "https://github.com/HOTLancerX/ecommerce.git",
    },
    {
        nx: "com.system.seo-meta",
        name: "seo meta",
        version: "1.0.0",
        description: "All-in-one SEO tools: meta titles, descriptions, and more.",
        author: "HeRa",
        icon: "solar:chart-bold",
        color: "from-sky-500 to-blue-600",
        path: "https://github.com/HOTLancerX/seo-meta.git",
    },
    {
        nx: "com.system.users",
        name: "users",
        version: "1.0.0",
        description: "User management plugin — extends user profiles with extra fields",
        author: "System",
        icon: "solar:users-group-rounded-bold",
        color: "from-indigo-500 to-violet-600",
        path: "https://github.com/HOTLancerX/users.git",
    },
    {
        nx: "com.system.product",
        name: "product",
        version: "1.0.0",
        description: "E-commerce product post type with price, SKU, and stock fields.",
        author: "System",
        icon: "solar:cart-large-bold",
        color: "from-emerald-500 to-teal-600",
        path: "https://github.com/HOTLancerX/product.git",
    },
];
