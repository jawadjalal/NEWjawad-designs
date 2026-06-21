import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

// Passthrough server layout — adds a unique title/description/canonical for this
// route without touching the client page (client components can't export metadata).
export const metadata: Metadata = pageMeta({
  title: 'Contact',
  description: 'Start a design project with Jawad Jalal. Email hi@jawadj.design — landing pages, brand systems and product UI.',
  path: '/contact',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
