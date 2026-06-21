import type { MetadataRoute } from 'next';
import { SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo';

/**
 * Web app manifest (served at /manifest.webmanifest). Gives the site a proper
 * installable identity + the memoji app icons; colors match the paper/ink brand
 * tokens so the splash/chrome blends in. Referenced automatically by Next.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Jawad Jalal`,
    short_name: 'Jawad Design',
    description: DEFAULT_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f3f0',
    theme_color: '#f4f3f0',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
