/**
 * lib/optional-plugin-stub.ts
 *
 * Empty stub used by next.config.ts webpack aliases.
 * When an optional plugin folder is absent on disk, every import from that
 * plugin resolves to this file — which exports nothing — so the build
 * succeeds and call-sites that guard with null-checks work correctly.
 */

// Default export — hooks / components that do `import X from '...'`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default undefined as any;

// Named catch-all — covers `import { foo } from '...'`
// Returns undefined for every named export requested.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const __esModule = true as any;
