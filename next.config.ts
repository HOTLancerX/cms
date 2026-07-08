import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Optional-plugin stub system
//
// When a user installs only some plugins, missing cross-plugin imports must
// not break the build. This file aliases every absent module to an empty stub.
//
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
// For every entry in OPTIONAL_MODULES we check whether the actual file exists
// on disk. If it does NOT, we add TWO alias entries:
//
//   1. "@/plugin/foo/bar"        ← webpack resolves this via tsconfig @/ map
//   2. "<root>/plugin/foo/bar"   ← Turbopack resolves this (it sees the
//                                   expanded absolute path after tsconfig
//                                   paths are applied)
//
// Both point to lib/optional-plugin-stub.ts which exports `undefined` as
// both default and named exports so null-guards in consuming code work.
//
// For entire-plugin entries (when a plugin directory is fully absent) we also
// alias the directory itself so that dynamic import() and require() calls
// resolve cleanly.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = __dirname;
const STUB = path.join(ROOT, "lib", "optional-plugin-stub.ts");

// ── File-level optional cross-plugin imports ──────────────────────────────────
// Each entry is an @/ specifier. If the resolved file does not exist on disk,
// BOTH the @/ specifier and the absolute path are aliased to the stub.
const OPTIONAL_MODULES: string[] = [
    // seller → product/api/wallet (still used in seller/api routes)
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",

    // product → paypal, stripe, seller, checkout-auto-suggested, upsell-trigger
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",
];

// ── npm-package-level optionals ───────────────────────────────────────────────
// These are node_modules packages that are only needed when a specific plugin
// is installed. When that plugin folder is absent the package import is dead
// code, but the bundler still resolves it. We alias to stub when the plugin
// folder that owns them is absent.
//
// Format: [pluginFolder, packageName]
const OPTIONAL_NPM_PACKAGES: [string, string][] = [
    // embla-carousel-* only needed by daraz plugin slider
    ["daraz", "embla-carousel-react"],
    ["daraz", "embla-carousel-autoplay"],
];

// ── Extensions to try when checking file existence ────────────────────────────
const EXTS = ["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs"];

function fileExists(base: string): boolean {
    // Exact path first (for directory index files)
    if (fs.existsSync(base)) return true;
    return EXTS.some((ext) => fs.existsSync(`${base}.${ext}`));
}

function pluginExists(pluginName: string): boolean {
    return fs.existsSync(path.join(ROOT, "plugin", pluginName));
}

// ─────────────────────────────────────────────────────────────────────────────

function buildAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};

    // ── File-level ────────────────────────────────────────────────────────────
    for (const mod of OPTIONAL_MODULES) {
        const rel  = mod.replace(/^@\//, "");          // "plugin/foo/bar"
        const base = path.join(ROOT, rel);             // "<root>/plugin/foo/bar"

        if (!fileExists(base)) {
            // Webpack key  (@/ specifier — resolved via tsconfig paths)
            aliases[mod] = STUB;
            // Turbopack key (absolute path — what Turbopack sees after tsconfig
            // @/ → <root>/ expansion)
            aliases[base] = STUB;
        }
    }

    // ── npm packages ──────────────────────────────────────────────────────────
    for (const [plugin, pkg] of OPTIONAL_NPM_PACKAGES) {
        if (!pluginExists(plugin)) {
            // Both bundlers use the bare package name as the key for npm pkgs
            aliases[pkg] = STUB;
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

    // ── Turbopack (Next.js 15+ / 16 default bundler) ─────────────────────────
    turbopack: {
        resolveAlias: optionalAliases,
    },

    // ── Webpack (--webpack flag or Next.js < 15) ──────────────────────────────
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
