import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, type = 'all' } = await searchParams;
  
  // If no query, redirect to home
  if (!q) {
    redirect('/');
  }

  // Convert query to slug and redirect
  const slug = q
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  redirect(`/search/${slug}?type=${type}`);
}
