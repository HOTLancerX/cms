<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Seriously, work efficiently as a senior developer. It's a complete WordPress-like plugin system. Webpack features.

---

# CMS Architecture Guide for AI Agents

This project is a **WordPress-style plugin CMS** built on Next.js + MongoDB. Before writing any code, read this document in full. Every system described here has strict conventions — deviating from them will break things silently.

---

## 1. The Plugin System

### What a plugin is

A plugin is a folder under `plugin/` with an `index.ts` (or `.tsx`) that exports exactly two things:

```ts
export const PLUGINS: PluginMeta = { ... };  // metadata
export function register(): void { ... }      // hook registrations
```

`register()` is **never called automatically at import time**. It is called by `reregisterHooks()` on the client after the active-plugin gate is armed. Do not call `register()` yourself anywhere except inside `reregisterHooks`.

### Plugin metadata shape (`PluginMeta`)

```ts
{
  nx: "com.vendor.name",        // canonical unique ID — used everywhere as the key
  name: "my-plugin",            // display name, lowercase
  version: "1.0.0",
  description: "...",
  author: "...",
  path: "https://github.com/...",
  icon: "solar:some-icon-bold", // Iconify icon name
  color: "from-sky-500 to-blue-600", // Tailwind gradient classes
}
```

`nx` is the **only** identifier that matters. Never key anything by `name` — names can change, `nx` cannot.

### Plugin discovery (Webpack `require.context`)

`hook/PluginList.ts` uses Webpack's `require.context` to auto-discover every `plugin/*/index.(ts|tsx|js|jsx)` at **build time**. You never need to register a plugin manually. Just create the file and it will be found.

```
plugin/
  blog/index.ts      ← discovered automatically
  seo/index.ts       ← discovered automatically
  users/index.ts     ← discovered automatically
  my-new/index.ts    ← will be discovered automatically
```

**Server-side**: `hook/PluginListServer.ts` reads plugin metadata from the DB (not from `require.context`) to avoid pulling JSX into the server bundle. Never import `hook/PluginList.ts` from a Server Component or API route.

---

## 2. The Hook System (`hook/index.ts`)

### Core concept

Hooks are named injection points. A plugin calls `addHook(hookName, fields, pluginNx)` inside its `register()` function to inject fields, pages, or nav items into the application.

### `addHook(hookName, fields, pluginNx)`

- `hookName` — a dot-separated string identifying the injection point (e.g. `"post.form"`, `"cat.form"`, `"User.form"`, `"admin.nav"`, `"admin.pages"`, `"root.pages"`)
- `fields` — array of `FormHookField` or `NavHookField` objects
- `pluginNx` — the plugin's `nx` string; automatically stamped onto every field as `pluginNx`

The gate check happens inside `addHook`. If the plugin's `nx` is not in the active set, the fields are silently dropped.

### `getHooks(hookName, type?)`

Retrieves registered fields for a hook point, sorted by `position` ascending.

- If `type` is provided: returns fields where `field.type === type` **or** `field.type` is empty/undefined (universal fields).
- If `type` is omitted: returns all fields.

```ts
getHooks("post.form", "post")  // fields for post type only + universal fields
getHooks("User.form")          // all User.form fields (no type filtering needed)
```

### The active-plugin gate

```
null  → gate not armed (open) — all addHook calls succeed
Set   → gate armed — only nx values in the Set may register
```

On the **client**, the gate is armed by calling `reregisterHooks(activeNxIds)` which:
1. Calls `clearHooks()` — wipes the mutable hook registry
2. Calls `setActivePlugins(activeNxIds)` — arms the gate
3. Calls `register()` on every discovered plugin module

This means hook state is **ephemeral on the client** — it is rebuilt on every page that needs it. Always call `reregisterHooks` before calling `getHooks` in a `useEffect`.

### Special hook registries (permanent, never cleared)

| Hook name | Storage | Cleared by `clearHooks`? | Gate enforced? |
|---|---|---|---|
| `admin.nav` | `_navItems` array | No | No (always registered) |
| `root.pages` | `_rootPages` array | No | No (always registered) |
| everything else | `hooks` object | Yes | Yes |

`admin.nav` and `root.pages` are written to permanent stores so server components can always read them regardless of client gate state.

### Known hook names

| Hook name | Field type | Purpose |
|---|---|---|
| `post.form` | `FormHookField` | Extra fields on the post create/edit form |
| `cat.form` | `FormHookField` | Extra fields on the category create/edit form |
| `User.form` | `FormHookField` | Extra fields on the user create/edit form |
| `admin.pages` | `FormHookField` (uses `path`) | Custom pages under `/admin/[slug]` |
| `admin.nav` | `NavHookField` | Items in the admin sidebar navigation |
| `root.pages` | `FormHookField` (uses `component`) | Front-end page templates (post/cat layouts) |

---

## 3. The Form Pattern

Every content form (post, cat, user) follows the same pattern:

### Page component (`app/*/page.tsx`)

1. Fetches active plugin nx IDs from `/api/plugin`
2. Passes them as `activePlugins: string[]` to the Form component
3. Renders nothing (`return null`) until plugins are loaded to avoid hydration mismatch

```tsx
// Pattern — same for post, cat, user
const [activePlugins, setActivePlugins] = useState<string[] | null>(null);

useEffect(() => {
  fetch("/api/plugin", { cache: "no-store" })
    .then(r => r.json())
    .then((data: { nx: string; status: string }[]) => {
      setActivePlugins(data.filter(p => p.status === "active").map(p => p.nx));
    })
    .catch(() => setActivePlugins([]));
}, []);

if (activePlugins === null) return null;
```

### Form component

1. Starts with `fields = []` (empty) to match SSR output
2. In `useEffect`, calls `reregisterHooks(activePlugins)` then `getHooks(hookName, type)`
3. Splits fields into `leftFields` (style="left") and `rightFields` (style="right")
4. Renders a two-column layout: left = main content, right = sidebar/meta
5. Stores plugin field values in `info: Record<string, string>` state
6. Submits `{ ...coreFields, info }` to the API

```tsx
useEffect(() => {
  reregisterHooks(activePlugins);
  setFields(getHooks("post.form", type));
}, [type, activePlugins]);
```

### Rendering plugin fields

```tsx
const renderFields = (fieldList: FormHooks) =>
  fieldList.map((field) => {
    const Component = field.component;
    return (
      <Component
        key={`${field.key}-${field.position}`}
        name={field.key}
        label={field.label}
        value={info[field.key] || ""}
        onChange={(v: string) => handleInfoChange(field.key, v)}
        options={field.options}
      />
    );
  });
```

---

## 4. The Data Model Pattern

Every content type has two Mongoose models:

### Primary model (e.g. `models/post.ts`)

Stores core fields: `title`, `slug`, `type`, `status`, `createdAt`, `updatedAt`.

### Info model (e.g. `models/post_info.ts`)

Stores plugin-injected extra fields as key-value pairs:

```ts
{
  postId: ObjectId,  // ref to primary model
  name: string,      // field key (e.g. "seo_title", "featured")
  value: string,     // always stored as string
}
// Compound unique index: { postId: 1, name: 1 }
```

This pattern exists for: `post` / `post_info`, `cat` / `cat_info`, `User` / `Users_info`.

### API upsert pattern for info fields

```ts
const ops = Object.entries(info).map(([name, value]) => ({
  updateOne: {
    filter: { postId: post._id, name },
    update: { $set: { value } },
    upsert: true,
  },
}));
if (ops.length) await PostInfo.bulkWrite(ops);
```

Always use `bulkWrite` with `upsert: true` — never delete-and-reinsert.

---

## 5. UI Components (`components/ui/`)

All UI components implement `FieldProps`:

```ts
interface FieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
}
```

Available components (all exported from `components/ui/index.ts`):

| Component | Use case |
|---|---|
| `Text` | Single-line text input |
| `Textarea` | Multi-line text |
| `Select` | Dropdown (requires `options`) |
| `Radio` | Radio group (requires `options`) |
| `Checkbox` | Checkbox group (requires `options`) |
| `Switch` | Boolean toggle — stores `"true"` / `"false"` as string |
| `Tags` | Comma-separated tag input |

All values are **strings**. `Switch` stores `"true"` or `"false"`. Parse at read time if you need a boolean.

---

## 6. Creating a New Plugin

Follow this exact structure:

```ts
// plugin/my-plugin/index.ts
import { addHook, type PluginMeta } from "@/hook";
import { Text, Textarea } from "@/components/ui";

export const PLUGINS: PluginMeta = {
  nx: "com.vendor.my-plugin",   // must be globally unique
  name: "my-plugin",
  version: "1.0.0",
  description: "...",
  author: "...",
  path: "",
  icon: "solar:some-icon-bold",
  color: "from-emerald-500 to-teal-600",
};

export function register() {
  // Inject fields into an existing form
  addHook("post.form", [
    {
      key: "my_field",
      label: "My Field",
      type: "",          // "" = universal (all post types); or "post", "cat", etc.
      style: "left",     // "left" or "right" column
      position: 50,      // higher = lower in the list
      component: Text,
    },
  ], PLUGINS.nx);

  // Add admin nav items
  addHook("admin.nav", [
    {
      key: "my-section",
      label: "My Section",
      icon: "solar:some-icon-bold",
      slug: "my-section",
      parent: "",        // "" = top-level; or key of parent item
      position: 60,
    },
  ], PLUGINS.nx);
}
```

**Rules:**
- `nx` must be unique across all plugins — use reverse-domain notation
- `key` within a hook must be unique within that plugin's registrations for that hook
- `position` controls render order — lower numbers appear first
- `type: ""` means the field appears on all content types for that hook
- Never import server-only code (DB models, `connectDB`) into a plugin index file

---

## 7. Adding a New Hook Point

To create a new injectable form (like `User.form`):

1. The form component calls `getHooks("my.form")` after `reregisterHooks`
2. Plugins call `addHook("my.form", [...], nx)` in their `register()`
3. No changes needed to `hook/index.ts` — hook names are arbitrary strings

---

## 8. Auth & Session (`context/Provider.tsx`)

`UserProvider` wraps the entire app in `app/layout.tsx`. It fetches `/api/user/me` on mount and exposes the session via `useUser()`.

```ts
const { user, loading, refresh } = useUser();
// user: SessionUser | null
// loading: boolean
// refresh(): re-fetches /api/user/me
```

`/api/user/me` reads a `userId` cookie. Wire up your real auth (NextAuth, JWT, etc.) there — the cookie approach is a stub.

### Layout guards

| Layout | Guard |
|---|---|
| `app/admin/layout.tsx` | `user.type === "admin"` — redirects to `/` otherwise |
| `app/account/layout.tsx` | Any authenticated user — redirects to `/` if not logged in |

---

## 9. Admin Users (`components/admin/UserForm.tsx`)

`UserForm` is a dual-purpose component:

| Prop | Effect |
|---|---|
| `mode="add"` | Creates a new user via `POST /api/user` |
| `mode="edit"` | Updates existing user via `PUT /api/user` |
| `showAdminFields` | Shows Role, Status, and Slug fields (admin-only) |

Used in:
- `app/admin/users/add/page.tsx` — `mode="add"` (showAdminFields implicit via mode)
- `app/admin/users/[id]/page.tsx` — `mode="edit" showAdminFields`
- `app/account/settings/page.tsx` — `mode="edit"` (no showAdminFields — user can't change their own role)

Plugin fields for user forms are registered via `addHook("User.form", [...], nx)` and stored in `Users_info`.

---

## 10. File Conventions

```
plugin/<name>/index.ts          ← plugin entry (PLUGINS + register)
models/<Name>.ts                ← primary Mongoose model
models/<Name>_info.ts           ← key-value info model for plugin fields
app/api/<resource>/route.ts     ← REST API (GET, POST, PUT, DELETE)
app/api/<resource>/me/route.ts  ← current-user variant
app/admin/<section>/page.tsx    ← admin list/dashboard (Server Component where possible)
app/admin/<section>/add/page.tsx ← admin create form (Client Component)
app/admin/<section>/[id]/page.tsx ← admin edit form (Client Component)
app/account/<section>/page.tsx  ← user-facing account pages (Client Component)
components/admin/<Name>Form.tsx ← reusable form component (used in add + edit)
```

---

## 11. Common Mistakes to Avoid

- **Never import `hook/PluginList.ts` from a Server Component or API route.** It uses `require.context` which pulls in JSX and breaks the server bundle. Use `hook/PluginListServer.ts` instead.
- **Never call `register()` directly.** Only `reregisterHooks()` should call it.
- **Never key plugin records by `name`.** Always use `nx`.
- **Never store non-string values in `*_info` tables.** Everything is a string. Booleans become `"true"`/`"false"`.
- **Never skip `reregisterHooks` before `getHooks` on the client.** The hook registry is empty until armed.
- **Never add plugin-specific fields to the primary model.** They go in the `*_info` table.
- **Always use `bulkWrite` with `upsert: true`** for info field saves — never delete-and-reinsert.
