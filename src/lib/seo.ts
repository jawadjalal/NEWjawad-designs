import type { Metadata } from 'next';

/**
 * Central SEO config (one source of truth). Page metadata, the sitemap, robots,
 * the web manifest, and the JSON-LD all read from here so the brand name, URL,
 * and social profiles never drift apart — entity-search ranking depends on those
 * being *consistent* everywhere they appear.
 *
 * SITE_URL is the canonical production origin. Update it the moment the custom
 * domain goes live; canonical tags / sitemap / OG URLs all derive from it.
 */
export const SITE_URL = 'https://jawadj.design';
export const SITE_NAME = 'Jawad Design';
export const PERSON_NAME = 'Jawad Jalal';
export const EMAIL = 'hi@jawadj.design';

// Profiles that prove "Jawad Jalal" is one real entity (Person.sameAs). The more
// of these Google can corroborate, the stronger the name-search ranking.
export const SOCIALS = [
  'https://x.com/jawadmakes',
  'https://www.tiktok.com/@jawadmakes',
  'https://www.youtube.com/@jawadmakes',
  'https://www.linkedin.com/in/jawad-jalal-designs',
  'https://www.instagram.com/j.awadjalal',
];
export const TWITTER_HANDLE = '@jawadmakes';

export const DEFAULT_TITLE = 'Jawad Jalal — Designer & Design Portfolio';
export const DEFAULT_DESCRIPTION =
  'Jawad Jalal (Jawad Design) is a designer crafting hand-drawn, liquid-glass websites — landing pages, brand systems and product UI, designed, built and shipped end to end.';

// Target search terms, woven into keywords + copy. The name variants are the
// ones people actually type ("jawad designs", "jawad jalal designs").
export const KEYWORDS = [
  'Jawad Jalal',
  'Jawad Design',
  'Jawad Designs',
  'Jawad Jalal designs',
  'Jawad designer',
  'design portfolio',
  'web design',
  'landing page design',
  'brand design',
  'product UI design',
];

/**
 * Build per-route metadata from a leaf title + description + path. The root
 * layout sets the title template (`%s · Jawad Jalal`) and the shared OG/Twitter
 * image (via the app/opengraph-image file convention), so here we only set what
 * differs per page — including the canonical URL, which every page needs.
 */
export function pageMeta(opts: { title: string; description: string; path: string }): Metadata {
  const { title, description, path } = opts;
  const ogTitle = `${title} · ${PERSON_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: ogTitle, description, url: path },
    twitter: { title: ogTitle, description },
  };
}
