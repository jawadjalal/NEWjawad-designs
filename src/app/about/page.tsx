'use client';
import '@/styles/canvas.css';
import '@/styles/about.css';
import SpatialCanvasPage from '@/components/canvas/SpatialCanvasPage';
import { sheetD } from '@/lib/about-content';

// Standalone /about — the "me, in the middle" spatial canvas. Same engine as the
// slug case study: a hero with satellites and wires radiating off it, no
// zoom-into-detail (no openable panels), a slightly larger home scale so the
// portrait reads on landing.
export default function AboutPage() {
  return (
    <SpatialCanvasPage
      sheet={sheetD}
      engineOpts={{ mainHomeScale: 0.7, zoomMin: 0.3, wireSelector: '.sc-panel:not(.sc-hero)', wireClass: '' }}
    />
  );
}
