"use client";

/**
 * useActivePlugins
 *
 * Thin re-export of useActivePluginsCtx so all existing import sites
 * continue to work unchanged.
 *
 * The actual fetch happens ONCE in ActivePluginsProvider (mounted by the
 * admin layout). Every call to useActivePlugins() reads from context —
 * no additional network request is made.
 */

export { useActivePluginsCtx as useActivePlugins } from "@/context/ActivePluginsContext";
