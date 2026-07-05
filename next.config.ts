import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ── Optional-plugin alias helper ──────────────────────────────────────────────
// When a plugin folder is absent on disk every import that references a file
// inside that plugin is aliased to an empty stub so the build never errors.
// The stub exports `undefined` for both default and named imports, and any
// call-site that guards with a null/undefined check works correctly.

const PLUGIN_DIR  = path.join(__dirname, "plugin");
const STUB        = path.join(__dirname, "lib", "optional-plugin-stub.ts");

/**
 * Returns a webpack `resolve.alias` map that redirects every listed module
 * path to the stub when its plugin folder is missing from disk.
 *
 * Add new cross-plugin paths to OPTIONAL_MODULES below as needed.
 */
const OPTIONAL_MODULES: string[] = [
    // flash-sale → used by product plugin boxes and product client
    "@/plugin/flash-sale/lib/useFlashSale",
    "@/plugin/flash-sale/lib/applyFlashSale",

    // seller → used by product/api/returns
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",

    // compare → used by product/product/ProductClient
    "@/plugin/compare/ui/Compare",

    // product → used by paypal, stripe, seller, checkout-auto-suggested, upsell-trigger
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",
];

function buildOptionalAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};

    for (const mod of OPTIONAL_MODULES) {
        // Derive the plugin folder name: @/plugin/<name>/... → <name>
        const match = mod.match(/^@\/plugin\/([^/]+)/);
        if (!match) continue;

        const pluginFolder = path.join(PLUGIN_DIR, match[1]);
        if (!fs.existsSync(pluginFolder)) {
            aliases[mod] = STUB;
        }
    }

    return aliases;
}

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

    webpack(config) {
        const optionalAliases = buildOptionalAliases();

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
