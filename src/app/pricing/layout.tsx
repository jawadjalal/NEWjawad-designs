import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Pricing',
  description: 'Design pricing and packages from Jawad Jalal — transparent tiers for landing pages, brand systems and product work.',
  path: '/pricing',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
