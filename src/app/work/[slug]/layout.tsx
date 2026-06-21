import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Per-case-study metadata. Overrides the /work parent title with the project's
// own. The prototype ships a single case study (weld); other slugs slot into the
// same shape, so we humanise whatever slug is requested.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.replace(/-/g, ' ');
  const pretty = name.charAt(0).toUpperCase() + name.slice(1);
  return pageMeta({
    title: `${pretty} — Case Study`,
    description: `${pretty}: a design case study by Jawad Jalal (Jawad Design) — the brief, the design decisions, and the shipped result.`,
    path: `/work/${slug}`,
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
