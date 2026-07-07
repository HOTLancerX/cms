import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ── Optional-plugin alias helper ──────────────────────────────────────────────
// When a plugin folder is absent on disk, every import from that plugin is
// aliased to an empty stub so the build never errors.
// Works for both Turbopack (next.config turbopack.resolveAlias) and webpack
// (config.resolve.alias inside the webpack() callback).

const STUB = path.join(__dirname, "lib", "optional-plugin-stub.ts");

/**
 * Cross-plugin imports that must be aliased to the stub when the specific
 * module file is absent on disk. Add new entries here as new cross-plugin
 * dependencies are introduced.
 *
 * The check is intentionally against the FULL RESOLVED FILE PATH (with
 * common extensions tried), not just the plugin root folder — a plugin
 * folder can exist without containing the specific file being imported.
 */
const OPTIONAL_MODULES: string[] = [
    // flash-sale → used by product plugin boxes and ProductClient
    "@/plugin/flash-sale/lib/useFlashSale",
    "@/plugin/flash-sale/lib/applyFlashSale",

    // seller → used by product/api/returns and seller/api/wallet/process
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",

    // compare → used by product/product/ProductClient via dynamic import
    "@/plugin/compare/ui/Compare",

    // seller-membership → used by product/api/orders/[orderNumber]/route.ts
    // via runtime require() — still needs a build-time alias when absent
    "@/plugin/seller-membership/models/MembershipPackage",
    "@/plugin/seller-membership/models/SellerMembership",

    // product → used by paypal, stripe, seller, checkout-auto-suggested, upsell-trigger
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",
];

/**
 * Build the alias map.
 *
 * For each optional module, resolve the @/ prefix to the project root and
 * try common TypeScript/JavaScript extensions. If NO matching file is found
 * on disk, alias the specifier to the stub so the build never errors.
 *
 * This handles the case where the plugin FOLDER exists but the specific
 * file inside it does not (e.g. flash-sale plugin exists but applyFlashSale
 * hasn't been created yet).
 */
function buildAliases(): Record<string, string> {
    const root    = __dirname;
    const aliases: Record<string, string> = {};
    const EXTS    = ["ts", "tsx", "js", "jsx", "mts", "mjs"];

    for (const mod of OPTIONAL_MODULES) {
        // Convert @/plugin/foo/bar  →  <root>/plugin/foo/bar
        const rel  = mod.replace(/^@\//, "");
        const base = path.join(root, rel);

        // Try every extension — the module is "present" if any file matches
        const exists = EXTS.some((ext) => fs.existsSync(`${base}.${ext}`));

        if (!exists) {
            aliases[mod] = STUB;
        }
    }
    return aliases;
}

const optionalAliases = buildAliases();

// ─────────────────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "**" },
            { protocol: "http",  hostname: "**" },
        ],
        minimumCacheTTL: 31536000,
    },
    logging: {
        fetches: {
            fullUrl:      false,
            hmrRefreshes: false,
        },
    },
    serverExternalPackages: ["mongoose", "mongodb"],
    compiler: {
        removeConsole:
            process.env.NODE_ENV === "production"
                ? { exclude: ["error", "warn"] }
                : false,
    },
    devIndicators: false,

    // ── Turbopack alias (Next.js 15+ / 16 default bundler) ───────────────────
    turbopack: {
        resolveAlias: optionalAliases,
    },

    // ── Webpack alias (used when --webpack flag is passed or Next.js < 15) ───
    webpack(config) {
        if (Object.keys(optionalAliases).length > 0) {
            config.resolve.alias = {
                ...(config.resolve.alias ?? {}),
                ...optionalAliases,
            };
        }
        return config;
    },
};

export default nextConfig;
