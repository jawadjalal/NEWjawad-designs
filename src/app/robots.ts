import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt (served at /robots.txt). Allow everything (a portfolio wants to be
 * fully indexed) and point crawlers at the sitemap. The host hint helps Google
 * pick the canonical domain.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
