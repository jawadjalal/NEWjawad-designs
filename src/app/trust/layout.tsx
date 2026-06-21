import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Trust & Testimonials',
  description:
    'Proof behind the work: testimonials and results for design by Jawad Jalal — great skill, great design, great speed.',
  path: '/trust',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
