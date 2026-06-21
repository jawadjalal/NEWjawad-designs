import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'About',
  description: 'About Jawad Jalal — a designer and AI power user crafting hand-drawn, liquid-glass interfaces that feel alive.',
  path: '/about',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
