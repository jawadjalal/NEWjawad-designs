'use client';

import { useEffect, useState } from 'react';
import { STACK_MQ, prefersStackedCanvas } from '@/lib/motion';

/**
 * Re-renders the caller whenever the viewport crosses the stacked/spatial
 * breakpoint (STACK_MQ, 768px).
 *
 * Why this exists (Responsive Phase 3): the spatial-canvas engines
 * (createSpatialCanvas / createWhiteboard / createProcessStrip) read
 * `prefersStackedCanvas()` ONCE at init to decide whether to wire the
 * pan/zoom/wheel machinery. They have no internal media-change listener, so a
 * *live* resize across 768px — dragging a desktop window narrow, snapping it to
 * half-screen on a small laptop, opening devtools, rotating a tablet — would
 * leave the engine running in the wrong mode (pan/zoom fighting the CSS stacked
 * scroll, or a desktop canvas with no interactivity). Feeding the returned
 * boolean into useGSAP's `dependencies` makes the engine fully tear down and
 * rebuild in the correct mode when the breakpoint flips. (The home camera has
 * its own equivalent media-change relayout in home-camera.ts, so it isn't wired
 * through this hook.)
 *
 * SSR-safe: prefersStackedCanvas() returns false on the server, and the value
 * only drives an effect (it's never rendered into the DOM), so there's no
 * hydration mismatch. The effect re-syncs immediately in case the viewport
 * differed between first render and mount.
 */
export function useStackedBreakpoint(): boolean {
  const [stacked, setStacked] = useState(prefersStackedCanvas);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(STACK_MQ);
    const onChange = () => setStacked(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return stacked;
}
