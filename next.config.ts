import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Optional-plugin stub system
//
// When only some plugins are installed, cross-plugin imports for absent plugins
// must not break the build. Each absent module is aliased to a stub that
// exports `undefined` for every import.
//
// TURBOPACK INCOMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────
// Turbopack on Vercel rejects @/ alias values with:
//   "server relative imports are not implemented yet"
// and cannot resolve require.context (used by PluginList, pluginApiRoutes,
// serverDataHooks). The Vercel build therefore uses `next build --webpack`
// via vercel.json buildCommand. This webpack config is only used by that
// build path — local `next dev` (Turbopack) does not need aliases because
// all plugins are present on disk.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = __dirname;

const STUB = "@/lib/optional-plugin-stub";

const OPTIONAL_MODULES: string[] = [
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",
    "@/plugin/compare/ui/Compare",
];

const EXTS = ["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs"];

function fileExists(base: string): boolean {
    if (fs.existsSync(base)) return true;
    return EXTS.some((ext) => fs.existsSync(`${base}.${ext}`));
}

function buildAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};

    for (const mod of OPTIONAL_MODULES) {
        const rel  = mod.replace(/^@\//, "");
        const base = path.join(ROOT, rel);

        if (!fileExists(base)) {
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

    // Webpack alias config — used by `next build --webpack` on Vercel
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
