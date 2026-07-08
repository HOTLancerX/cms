import { notFound } from "next/navigation";
import { getAdminPages } from "@/hook/adminPages";
import { resolveLazyComponent } from "@/hook/pluginHooks";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: AdminPageProps): Promise<Metadata> {
  const { slug } = await params;

  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

  const pages = getAdminPages();

  const pageDef = pages
    .filter((p) => p.key === slugPath || slugPath.startsWith(p.key))
    .sort((a, b) => b.key.length - a.key.length)[0];

  if (!pageDef) {
    return {
      title: "Not Found",
      description: "Page not found",
    };
  }

  return {
    title: pageDef.label,
    description: "Advanced page builder built with Next.js and TypeScript",
  };
}

export default async function AdminDynamicPage({
  params,
}: AdminPageProps) {
  const { slug } = await params;

  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

  const pages = getAdminPages();

  const pageDef = pages
    .filter((p) => p.key === slugPath || slugPath.startsWith(p.key))
    .sort((a, b) => b.key.length - a.key.length)[0];

  if (!pageDef || (!pageDef.path && !pageDef.lazyPath)) {
    notFound();
  }

  // Resolve the component — either directly from `path` (static import)
  // or lazily from `lazyPath` (dynamic import via pluginHooks registry).
  let DynamicComponent = pageDef.path;
  if (!DynamicComponent && pageDef.lazyPath) {
    const lazy = await resolveLazyComponent(pageDef.lazyPath);
    if (!lazy) notFound();
    DynamicComponent = lazy;
  }

  return (
    <main>
      <DynamicComponent params={{ slug }} />
    </main>
  );
}