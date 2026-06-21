import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * XML sitemap (served at /sitemap.xml). Lists every indexable route so Google
 * discovers them on the first crawl. The homepage is the entity hub, so it gets
 * top priority; /work is the only dynamic branch and the prototype ships a
 * single case study (weld), so it's listed explicitly.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1.0, freq: 'monthly' },
    { path: '/work', priority: 0.9, freq: 'monthly' },
    { path: '/work/weld', priority: 0.8, freq: 'monthly' },
    { path: '/services', priority: 0.8, freq: 'monthly' },
    { path: '/process', priority: 0.7, freq: 'monthly' },
    { path: '/about', priority: 0.7, freq: 'monthly' },
    { path: '/trust', priority: 0.6, freq: 'monthly' },
    { path: '/pricing', priority: 0.7, freq: 'monthly' },
    { path: '/contact', priority: 0.6, freq: 'monthly' },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
