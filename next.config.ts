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
// TURBOPACK / VERCEL COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────
// Turbopack on Vercel rejects absolute path keys in resolveAlias with:
//   "server relative imports are not implemented yet"
// The alias key MUST be the bare @/ specifier (e.g. "@/plugin/foo/bar"),
// NOT an absolute path. Turbopack resolves @/ via tsconfig.json paths itself.
//
// For webpack we keep the @/ key — it also resolves via tsconfig paths.
// The absolute-path second key is removed because it causes the Vercel error.
//
// STUB VALUE
// ─────────────────────────────────────────────────────────────────────────────
// The stub value must also be an @/ path, not an absolute path, for the same
// Turbopack compatibility reason.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = __dirname;

// Stub as @/ alias — works on both webpack and Turbopack/Vercel
const STUB = "@/lib/optional-plugin-stub";

// ── Optional cross-plugin file imports ───────────────────────────────────────
// Add an @/ specifier here whenever a file imports from another plugin that
// may not be installed. If the target file doesn't exist on disk, the import
// is aliased to the stub (exports undefined for everything).
const OPTIONAL_MODULES: string[] = [
    // seller models — used in seller/api routes when seller plugin present
    "@/plugin/seller/models/Transaction",
    "@/plugin/seller/models/Wallet",

    // product models — used by paypal, stripe, checkout plugins
    "@/plugin/product/models/Order",
    "@/plugin/product/lib/cart",

    // compare UI — dynamic import in ProductClient.tsx (client component)
    // when compare plugin is not installed the stub is returned
    "@/plugin/compare/ui/Compare",
];

// ── Extensions to try when checking file existence ────────────────────────────
const EXTS = ["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs"];

function fileExists(base: string): boolean {
    if (fs.existsSync(base)) return true;
    return EXTS.some((ext) => fs.existsSync(`${base}.${ext}`));
}

function buildAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};

    for (const mod of OPTIONAL_MODULES) {
        const rel  = mod.replace(/^@\//, "");   // "plugin/foo/bar"
        const base = path.join(ROOT, rel);      // "<root>/plugin/foo/bar"

        if (!fileExists(base)) {
            // @/ key only — Turbopack on Vercel rejects absolute path keys
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

    // ── Turbopack ─────────────────────────────────────────────────────────────
    // Keys must be @/ specifiers or bare package names — NOT absolute paths.
    turbopack: {
        resolveAlias: optionalAliases,
    },

    // ── Webpack ───────────────────────────────────────────────────────────────
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
