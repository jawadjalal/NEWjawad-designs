'use client';

/**
 * Generic mount for a Direction-D spatial-canvas page (Pricing, the case-study
 * slug, and — with an extra hook — Contact). Injects the page's prebuilt sheet
 * HTML once and wires the shared createSpatialCanvas engine (pan / zoom / wires
 * / zoom-into-detail). Same imperative pattern as the Services canvas; kept
 * generic so each page is just `sheet` + `detailFor`.
 *
 * `data-no-back`: on a canvas, left-click means pan / open-a-panel, so the page
 * is exempt from the Nav's power-user "left-click = back" shortcut (Phase 1).
 *
 * `screenClass` matches the wrapper the engine looks for when growing a detail
 * from a panel's centre (`detail.closest('.svc-screen')`), so every page keeps
 * `.svc-screen` even where the prototype used a page-specific name.
 */
import { useRef } from 'react';
import { useGSAP } from '@/lib/gsap';
import { createSpatialCanvas, type SpatialCanvasOpts } from '@/lib/spatial-canvas';
import { useStackedBreakpoint } from '@/lib/use-stacked';

type Props = {
  /** Builds the full canvas markup (`.scase` + optional `.sc-detail`). */
  sheet: () => string;
  /** Returns the HTML for a panel's detail canvas, keyed by data-open. */
  detailFor?: (id: string) => string;
  /** Engine overrides (home scale, zoom floor, wire topology — see the slug). */
  engineOpts?: Partial<SpatialCanvasOpts>;
  /** Extra wiring run after mount (e.g. the contact form); returns a cleanup. */
  onMount?: (root: HTMLElement) => void | (() => void);
};

export default function SpatialCanvasPage({ sheet, detailFor, engineOpts, onMount }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Rebuild the engine when the viewport crosses 768px so a live resize switches
  // cleanly between the pan/zoom canvas and the stacked scroll (Phase 3).
  const stacked = useStackedBreakpoint();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const screen = root.querySelector<HTMLElement>('.svc-screen');
      if (!screen) return;
      screen.innerHTML = sheet();
      // detailFor is optional: pages with no openable panels (the slug) never
      // call it, so a no-op keeps the engine signature happy.
      const ctrl = createSpatialCanvas(root, { detailFor: detailFor ?? (() => ''), ...engineOpts });
      const cleanupExtra = onMount?.(root);
      return () => {
        cleanupExtra?.();
        ctrl.destroy();
        screen.innerHTML = '';
      };
    },
    { scope: rootRef, dependencies: [stacked], revertOnUpdate: true },
  );

  return (
    <div className="canvas-page" data-no-back ref={rootRef}>
      <div className="svc-screen no-scroll" />
    </div>
  );
}
