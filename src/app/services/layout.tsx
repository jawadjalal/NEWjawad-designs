import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Services',
  description: 'Design services from Jawad Jalal: landing pages, brand identity and product UI — I design it, build it, and ship it.',
  path: '/services',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
