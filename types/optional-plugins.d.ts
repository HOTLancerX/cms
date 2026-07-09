/**
 * types/optional-plugins.d.ts
 *
 * Ambient declarations for plugin modules that DO NOT exist on disk at
 * build time. The plugin/ directory is gitignored — only active plugins
 * are restored by plugin-runner.mjs from their GitHub repos.
 *
 * IMPORTANT: Only declare modules from INACTIVE/ABSENT plugins here.
 * Declaring a module that DOES exist will shadow the real file and break
 * named exports (e.g. import { foo } from '...').
 *
 * Active plugins (restored by plugin-runner): alo, daraz, product, seo-meta.
 * Do NOT add their modules here.
 */

declare module "@/plugin/compare/ui/Compare" {
    const Compare: React.ComponentType<any>;
    export default Compare;
}

declare module "@/plugin/seller/models/Transaction" {
    const Transaction: any;
    export default Transaction;
}

declare module "@/plugin/seller/models/Wallet" {
    const Wallet: any;
    export default Wallet;
}
