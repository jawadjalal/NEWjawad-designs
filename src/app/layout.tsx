import type { Metadata, Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { fontVars } from '@/lib/fonts';
import Nav from '@/components/shell/Nav';
import Cursor from '@/components/shell/Cursor';
import SmoothScroll from '@/components/shell/SmoothScroll';
import JsonLd from '@/components/seo/JsonLd';
import {
  SITE_URL,
  SITE_NAME,
  PERSON_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  KEYWORDS,
  TWITTER_HANDLE,
} from '@/lib/seo';
import './globals.css';

/**
 * Phase 5c → SEO/GEO pass. Viewport stays explicit (device-width) so the mobile
 * fallback engages; themeColor matches the paper surface. Metadata centralised
 * in lib/seo.ts so name/URL/socials stay consistent across every page, the
 * sitemap, robots and the JSON-LD (consistency is what makes a name like
 * "Jawad Jalal" rank as one entity). Title template lets each route set a leaf
 * title; the shared OG/Twitter image comes from app/opengraph-image.png.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f3f0',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s · ${PERSON_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: PERSON_NAME, url: SITE_URL }],
  creator: PERSON_NAME,
  publisher: PERSON_NAME,
  keywords: KEYWORDS,
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

/**
 * Root layout = the persistent shell. Nav + Cursor + SmoothScroll live here so
 * they NEVER remount between routes — that's what keeps the nav fill, the
 * cursor, and (later) the camera continuous as you move around. <ViewTransitions>
 * enables the cross-route morph transitions (see NOTES.md for why routes won).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en" className={fontVars}>
        <body>
          {/* schema.org Person + WebSite — the entity signal for name search */}
          <JsonLd />
          <SmoothScroll />
          {/* <main> landmark for screen-reader navigation (roadmap §9). Layout-
              neutral: every page root is position:fixed (out of flow), so the
              wrapper adds the landmark without changing a pixel. */}
          <main>{children}</main>
          <Nav />
          <Cursor />
        </body>
      </html>
    </ViewTransitions>
  );
}
