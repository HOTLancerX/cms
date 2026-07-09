/**
 * types/optional-plugins.d.ts
 *
 * Ambient declarations for plugin modules that may or may not exist on disk
 * at build time. The plugin/ directory is gitignored — plugins are restored
 * at build time by plugin-runner.mjs from their GitHub repos.
 *
 * When a plugin IS present, the real .tsx file shadows this declaration.
 * When it is NOT present, this declaration satisfies the TypeScript checker.
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

declare module "@/plugin/product/models/Order" {
    const Order: any;
    export default Order;
}

declare module "@/plugin/product/lib/cart" {
    const cart: any;
    export default cart;
}
