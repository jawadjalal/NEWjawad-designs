import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Work',
  description: 'Selected design work by Jawad Jalal (Jawad Design) — landing pages, brand systems and product UI, designed and built end to end.',
  path: '/work',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
