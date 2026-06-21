import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Process',
  description: 'How Jawad Jalal works — a clear, collaborative design process that takes a project from brief to shipped, polished product.',
  path: '/process',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
