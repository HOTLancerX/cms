/**
 * components/builder/elements/index.ts
 *
 * Registers all CORE builder elements into the permanent hook registry.
 * Imported once by hook/PluginList.ts so elements are always available
 * before any plugin register() calls run.
 *
 * Also auto-discovers plugin elements via require.context, scanning every
 * plugin/x/elements/index.(ts|tsx) file as a side-effect. Each such file
 * calls addBuilderElement(...) for its own elements — no manual imports needed.
 *
 * Plugins register their own elements inside plugin/x/elements/index.ts:
 *
 *   import { addBuilderElement } from "@/hook";
 *   import myElement from "./my-element";
 *   addBuilderElement(myElement, "com.system.myplugin");
 */

import { addBuilderElement } from "@/hook";
import headingElement from "./heading";
import columnElement from "./column";
import rowElement from "./row";
import carouselElement from "./carousel";
import contactUsElement from "./ContactUs";

// Core elements are registered with no pluginNx — they are always visible.
addBuilderElement(headingElement);
addBuilderElement(columnElement);
addBuilderElement(rowElement);
addBuilderElement(carouselElement);
addBuilderElement(contactUsElement);
