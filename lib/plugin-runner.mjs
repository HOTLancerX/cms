/**
 * Plugin lifecycle runner — executed automatically by npm hooks.
 *
 * Triggered by:
 *   - postinstall  (after `npm install`)
 *   - prebuild     (before `npm run build`)
 *
 * Three-pass strategy:
 *
 *   Pass 0 — CMS origin sync
 *     Reads CMS_ORIGIN_URL from data/plugin.ts (the single source of truth).
 *     On a fresh Vercel deploy or any environment where the working directory
 *     was populated by a fork/clone, this pass writes the canonical origin URL
 *     into the local git remote "origin" so that future pulls always track the
 *     correct upstream.  If the directory is not a git repo (e.g. a zip-based
 *     deploy), this pass is silently skipped.
 *
 *   Pass 1 — Pending actions
 *     Queries for status "install" | "update" | "delete" and runs the
 *     appropriate filesystem action, then updates the DB status.
 *
 *   Pass 2 — Active-but-missing recovery
 *     Queries for status "active" and re-clones any whose plugin folder is
 *     absent on disk. This handles the rebuild/redeploy scenario where the
 *     filesystem is wiped but the DB still holds the previous active state.
 *
 * Written as plain ESM (.mjs) so it runs directly with Node.js without
 * any TypeScript compilation or bundler.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

// ─── Resolve project root ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(PROJECT_ROOT, "plugin");

// ─── Load MONGODB_URI from .env.local ────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(PROJECT_ROOT, ".env.local");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
    }
}

// ─── Load catalog from data/plugin.ts → { nx: repoUrl } map ─────────────────
// Parses the TS file with a regex — no compilation needed.
function loadCatalog() {
    const catalogPath = path.join(PROJECT_ROOT, "data", "plugin.ts");
    const src = fs.readFileSync(catalogPath, "utf-8");

    const catalog = new Map();

    // Match each object block between { ... } inside AVAILABLE_PLUGINS
    const blockRe = /\{[^{}]+\}/gs;
    for (const block of src.matchAll(blockRe)) {
        const text = block[0];
        const nx = text.match(/nx\s*:\s*["']([^"']+)["']/)?.[1];
        const url = text.match(/path\s*:\s*["']([^"']+)["']/)?.[1];
        if (nx && url) catalog.set(nx, url);
    }

    return catalog;
}

// ─── Load CMS_ORIGIN_URL from data/plugin.ts ─────────────────────────────────
// Reads the single exported constant that identifies the canonical CMS repo.
// This is the source of truth — update it there, and everything picks it up.
function loadCmsOriginUrl() {
    const catalogPath = path.join(PROJECT_ROOT, "data", "plugin.ts");
    const src = fs.readFileSync(catalogPath, "utf-8");
    const match = src.match(/export\s+const\s+CMS_ORIGIN_URL\s*=\s*["']([^"']+)["']/);
    if (!match) {
        console.warn("[plugin-runner] CMS_ORIGIN_URL not found in data/plugin.ts — skipping Pass 0.");
        return null;
    }
    return match[1];
}

function folderName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, "-");
}

// ─── Clone or re-clone a repo ─────────────────────────────────────────────────
function cloneRepo(repoUrl, targetDir) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    console.log(`[plugin-runner] Cloning ${repoUrl} → ${targetDir}`);
    execSync(`git clone "${repoUrl}" "${targetDir}"`, {
        stdio: "inherit",
        cwd: PROJECT_ROOT,
    });
}

// ─── Merge plugin deps into main package.json and npm install ─────────────────
function installPluginDependencies(pluginDir) {
    const pluginPkgPath = path.join(pluginDir, "package.json");
    if (!fs.existsSync(pluginPkgPath)) return;

    let pluginPkg;
    try {
        pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, "utf-8"));
    } catch {
        console.warn(`[plugin-runner] Could not parse ${pluginPkgPath}, skipping deps.`);
        return;
    }

    const mainPkgPath = path.join(PROJECT_ROOT, "package.json");
    const mainPkg = JSON.parse(fs.readFileSync(mainPkgPath, "utf-8"));

    let changed = false;
    for (const depKey of ["dependencies", "devDependencies"]) {
        const pluginDeps = pluginPkg[depKey] ?? {};
        if (!Object.keys(pluginDeps).length) continue;
        if (!mainPkg[depKey]) mainPkg[depKey] = {};
        for (const [pkg, version] of Object.entries(pluginDeps)) {
            if (!mainPkg[depKey][pkg]) {
                mainPkg[depKey][pkg] = version;
                changed = true;
                console.log(`[plugin-runner] Adding ${depKey} "${pkg}": "${version}"`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(mainPkgPath, JSON.stringify(mainPkg, null, 2) + "\n", "utf-8");
        console.log("[plugin-runner] Running npm install for new dependencies…");
        execSync("npm install", { stdio: "inherit", cwd: PROJECT_ROOT });
    }
}

// ─── Remove plugin folder ─────────────────────────────────────────────────────
function removePluginFolder(targetDir) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`[plugin-runner] Removed ${targetDir}`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    loadEnv();

    // ── Pass 0: CMS origin sync ───────────────────────────────────────────────
    // Reads CMS_ORIGIN_URL from data/plugin.ts and ensures the local git remote
    // "origin" points to it.  This means:
    //   - A fork deployed to Vercel will always know its canonical upstream.
    //   - When the owner publishes a new version, updating CMS_ORIGIN_URL in
    //     data/plugin.ts is the only change needed — the next deploy picks it up.
    //   - If the deploy environment has no git (zip deploy, Docker COPY, etc.)
    //     this pass is silently skipped — it never blocks the build.
    const cmsOriginUrl = loadCmsOriginUrl();
    if (cmsOriginUrl) {
        const gitDir = path.join(PROJECT_ROOT, ".git");
        if (fs.existsSync(gitDir)) {
            try {
                // Read the current remote URL (may differ if this is a fork)
                let currentRemote = "";
                try {
                    currentRemote = execSync("git remote get-url origin", {
                        cwd: PROJECT_ROOT,
                        stdio: ["pipe", "pipe", "pipe"],
                    }).toString().trim();
                } catch {
                    // No remote named "origin" yet — add it
                }

                if (currentRemote !== cmsOriginUrl) {
                    if (currentRemote) {
                        execSync(`git remote set-url origin "${cmsOriginUrl}"`, {
                            cwd: PROJECT_ROOT,
                            stdio: "inherit",
                        });
                        console.log(`[plugin-runner] Pass 0 — updated git remote origin → ${cmsOriginUrl}`);
                    } else {
                        execSync(`git remote add origin "${cmsOriginUrl}"`, {
                            cwd: PROJECT_ROOT,
                            stdio: "inherit",
                        });
                        console.log(`[plugin-runner] Pass 0 — added git remote origin → ${cmsOriginUrl}`);
                    }
                } else {
                    console.log(`[plugin-runner] Pass 0 — git remote origin already correct (${cmsOriginUrl})`);
                }
            } catch (err) {
                // Never block the build over a git remote issue
                console.warn(`[plugin-runner] Pass 0 — could not update git remote: ${err.message}`);
            }
        } else {
            console.log("[plugin-runner] Pass 0 — no .git directory found (zip/Docker deploy), skipping remote sync.");
        }
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log("[plugin-runner] MONGODB_URI not set — skipping plugin sync.");
        return;
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const col = db.collection("plugins");

        // Ensure plugin/ directory exists
        fs.mkdirSync(PLUGIN_DIR, { recursive: true });

        // Build nx → repoUrl map from data/plugin.ts
        const catalog = loadCatalog();
        console.log(`[plugin-runner] Catalog loaded: ${catalog.size} entries`);

        // ── Pass 1: pending actions (install / update / delete) ──────────────
        const pending = await col
            .find({ status: { $in: ["install", "update", "delete"] } })
            .toArray();

        if (pending.length > 0) {
            console.log(`[plugin-runner] Pass 1 — ${pending.length} pending action(s)…`);

            for (const plugin of pending) {
                const { _id, nx, name, status } = plugin;
                const folder = folderName(name);
                const targetDir = path.join(PLUGIN_DIR, folder);
                const repoUrl = catalog.get(nx);

                if (!repoUrl && (status === "install" || status === "update")) {
                    console.error(`[plugin-runner] No catalog entry for nx="${nx}", skipping.`);
                    continue;
                }

                console.log(`\n[plugin-runner] "${name}" (${nx}) | ${status}`);

                try {
                    if (status === "install" || status === "update") {
                        cloneRepo(repoUrl, targetDir);
                        installPluginDependencies(targetDir);
                        await col.updateOne({ _id }, { $set: { status: "active" } });
                        console.log(`[plugin-runner] "${name}" → active`);
                    } else if (status === "delete") {
                        removePluginFolder(targetDir);
                        await col.deleteOne({ _id });
                        console.log(`[plugin-runner] "${name}" → deleted from DB`);
                    }
                } catch (err) {
                    console.error(`[plugin-runner] Error processing "${name}":`, err.message);
                }
            }
        } else {
            console.log("[plugin-runner] Pass 1 — no pending actions.");
        }

        // ── Pass 2: active-but-missing recovery ───────────────────────────────
        // If a plugin is "active" in the DB but its folder is gone (e.g. after a
        // fresh clone, redeploy, or wiped working directory), re-clone it so the
        // build always has every active plugin present on disk.
        const activePlugins = await col.find({ status: "active" }).toArray();
        const missing = activePlugins.filter((plugin) => {
            const targetDir = path.join(PLUGIN_DIR, folderName(plugin.name));
            return !fs.existsSync(targetDir);
        });

        if (missing.length > 0) {
            console.log(`\n[plugin-runner] Pass 2 — ${missing.length} active plugin(s) missing from disk, restoring…`);

            for (const plugin of missing) {
                const { nx, name } = plugin;
                const folder = folderName(name);
                const targetDir = path.join(PLUGIN_DIR, folder);
                const repoUrl = catalog.get(nx);

                if (!repoUrl) {
                    console.warn(`[plugin-runner] No catalog entry for nx="${nx}" — cannot restore "${name}", skipping.`);
                    continue;
                }

                console.log(`\n[plugin-runner] Restoring "${name}" (${nx})…`);
                try {
                    cloneRepo(repoUrl, targetDir);
                    installPluginDependencies(targetDir);
                    console.log(`[plugin-runner] "${name}" restored successfully.`);
                } catch (err) {
                    console.error(`[plugin-runner] Failed to restore "${name}":`, err.message);
                }
            }
        } else {
            console.log("[plugin-runner] Pass 2 — all active plugins present on disk.");
        }

    } finally {
        await client.close();
    }
}

main().catch((err) => {
    console.error("[plugin-runner] Fatal error:", err.message);
    process.exit(1);
});
