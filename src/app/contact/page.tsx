'use client';
import '@/styles/canvas.css';
import '@/styles/contact.css';
import SpatialCanvasPage from '@/components/canvas/SpatialCanvasPage';
import { sheetD, detailFor, TIER_NAMES } from '@/lib/contact-content';

/**
 * Wires the in-form tier label, ported from contact-render.js's setTier:
 * the segmented control (and a ?tier= query, the "pre-filled from /pricing"
 * link) updates the tier name + the pressed button + the is-set border.
 * Scoped to the canvas root (the prototype used document.body; we keep it
 * local so it doesn't bleed across route changes). "Send it" has no success
 * markup in Direction D, exactly as the prototype, so it stays inert.
 */
function wireForm(root: HTMLElement) {
  const setTier = (raw: string | undefined) => {
    const k = raw && TIER_NAMES[raw] ? raw : 'none';
    root.querySelectorAll('[data-tier-name]').forEach((el) => (el.textContent = TIER_NAMES[k]));
    root.querySelectorAll<HTMLElement>('.cf-tierseg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tier === k)));
    root.querySelectorAll('.cf-tier').forEach((t) => t.classList.toggle('is-set', k !== 'none'));
  };
  const onClick = (e: MouseEvent) => {
    const seg = (e.target as Element).closest<HTMLElement>('.cf-tierseg button');
    if (seg) {
      e.preventDefault();
      setTier(seg.dataset.tier);
    }
  };
  root.addEventListener('click', onClick);
  setTier(new URLSearchParams(window.location.search).get('tier') || 'none');
  return () => root.removeEventListener('click', onClick);
}

export default function ContactPage() {
  // Higher home scale than the default 0.46 — the form is the focal panel and
  // should feel closer when you land from nav (ORDER →).
  return (
    <SpatialCanvasPage
      sheet={sheetD}
      detailFor={detailFor}
      engineOpts={{ mainHomeScale: 0.68 }}
      onMount={wireForm}
    />
  );
}
