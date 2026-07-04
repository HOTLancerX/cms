/**
 * components/builder/elements/index.ts
 *
 * Registers all CORE builder elements into the permanent hook registry.
 * Imported once by hook/PluginList.ts so elements are always available
 * before any plugin register() calls run.
 *
 * Plugins register their own elements inside their register() function:
 *
 *   import { addBuilderElement } from "@/hook";
 *   import myElement from "./elements/my-element";
 *   export function register() {
 *     addBuilderElement(myElement, PLUGINS.nx);
 *   }
 */

import { addBuilderElement } from "@/hook";
import headingElement from "./heading";
import columnElement from "./column";
import rowElement from "./row";

// Core elements are registered with no pluginNx — they are always visible.
addBuilderElement(headingElement);
addBuilderElement(columnElement);
addBuilderElement(rowElement);
