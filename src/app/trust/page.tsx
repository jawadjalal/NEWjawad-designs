'use client';
import '@/styles/canvas.css';
import '@/styles/trust.css';
import SpatialCanvasPage from '@/components/canvas/SpatialCanvasPage';
import { sheetD } from '@/lib/trust-content';

// Standalone /trust — the proof behind the pull-quote, as a spatial canvas
// (pull-quote hero + testimonial / who-Joel-is / result satellites). Same
// engine + options shape as /about and the slug.
export default function TrustPage() {
  return (
    <SpatialCanvasPage
      sheet={sheetD}
      engineOpts={{ mainHomeScale: 0.7, zoomMin: 0.3, wireSelector: '.sc-panel:not(.sc-hero)', wireClass: '' }}
    />
  );
}
