import { notFound } from "next/navigation";

/**
 * /admin/category — no category type specified → 404.
 * Users must navigate to /admin/category/[type] (e.g. /admin/category/blog-category).
 */
export default function CategoryIndexPage() {
    notFound();
}
