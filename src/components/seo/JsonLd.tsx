import { SITE_URL, SITE_NAME, PERSON_NAME, EMAIL, SOCIALS, DEFAULT_DESCRIPTION } from '@/lib/seo';

/**
 * Structured data (schema.org JSON-LD). This is the strongest lever for ranking
 * a *person/brand* name like "Jawad Jalal" / "Jawad Designs": it tells Google
 * these strings are one real entity, ties the site to the verified social
 * profiles (sameAs), and makes the site eligible for a knowledge-panel / sitelinks.
 *
 * Server component (no 'use client') so it renders straight into the initial
 * HTML — crawlers read it without running JS. One @graph keeps Person + WebSite
 * cross-linked by @id.
 */
export default function JsonLd() {
  const personId = `${SITE_URL}/#jawad`;
  const siteId = `${SITE_URL}/#website`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: PERSON_NAME,
        alternateName: ['Jawad', 'Jawad Design', 'Jawad Designs'],
        url: SITE_URL,
        image: `${SITE_URL}/assets/jawad-portrait.png`,
        jobTitle: 'Designer',
        description: DEFAULT_DESCRIPTION,
        email: `mailto:${EMAIL}`,
        sameAs: SOCIALS,
        knowsAbout: ['Web design', 'Brand design', 'Product design', 'UI/UX design', 'Landing pages'],
        worksFor: { '@id': siteId },
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        name: SITE_NAME,
        alternateName: ['Jawad Jalal', 'Jawad Designs'],
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': personId },
        author: { '@id': personId },
      },
      {
        '@type': 'ProfilePage',
        url: SITE_URL,
        name: `${PERSON_NAME} — Design Portfolio`,
        isPartOf: { '@id': siteId },
        about: { '@id': personId },
        mainEntity: { '@id': personId },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD is trusted, static, first-party data — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
