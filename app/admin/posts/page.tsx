import { notFound } from "next/navigation";

/**
 * /admin/posts — no post type specified → 404.
 * Users must navigate to /admin/posts/[type] (e.g. /admin/posts/blog).
 */
export default function PostsIndexPage() {
    notFound();
}
