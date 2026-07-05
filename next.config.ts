import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ── Optional-plugin alias helper ──────────────────────────────────────────────
// When a plugin folder is absent on disk, every import from that plugin is
// aliased to an empty stub so the build never errors.
// Works for both Turbopack (next.config turbopack.resolveAlias) and webpack
// (config.resolve.alias inside the webpack() callback).

const PLUGIN_DIR = path.join(__dirname, "plugin");
const STUB       = path.join(__dirname, "lib", "optional-plugin-stub.ts");

/**
 * Cross-plugin imports that must be aliased to the stub when the source
 * plugin folder is absent. Add new entries here as new cross-plugin
 * dependencies are introduced.
 */
const OPTIONAL_MODULES: string[] = [
    // flash-sale → used by product plugin boxes and ProductClient
    "@/plugin/flash-sale/lib/useFlashSale",
    "@/plugin/flash-sale/lib/applyFlashSale",

    // seller → used by product/api/returns and seller/api/wallet/process
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",

    // compare → used by product/product/ProductClient
    "@/plugin/compare/ui/Compare",

    // product → used by paypal, stripe, seller, checkout-auto-suggested, upsell-trigger
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",
];

/**
 * Build the alias map: only alias modules whose plugin folder is missing.
 * Returns { '@/plugin/flash-sale/lib/useFlashSale': '/abs/path/to/stub', ... }
 */
function buildAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};
    for (const mod of OPTIONAL_MODULES) {
        const match = mod.match(/^@\/plugin\/([^/]+)/);
        if (!match) continue;
        const pluginFolder = path.join(PLUGIN_DIR, match[1]);
        if (!fs.existsSync(pluginFolder)) {
            // Turbopack resolveAlias uses the bare specifier as key; webpack
            // needs the resolved absolute path — both use the same string key
            // here because Next.js maps @/ → <root>/ in both cases.
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
