'use client';

/**
 * The /services spatial canvas (Direction D). Like the homepage camera, the
 * markup is built imperatively — sheetD() returns the exact prototype HTML for
 * the six-panel canvas plus its zoom-into-detail overlay — and injected once on
 * mount, after which createSpatialCanvas() wires pan / zoom / wires / tap-to-
 * open. Doing the build client-side (rather than as JSX) keeps it byte-for-byte
 * identical to the prototype and matches how the engine measures the DOM.
 *
 * The persistent shell (Nav, Cursor) lives in the root layout and stays put; the
 * `.sc-panel.openable` panels light up the cursor's OPEN bloom for free.
 */
import { useRef } from 'react';
import { useGSAP } from '@/lib/gsap';
import { createSpatialCanvas } from '@/lib/spatial-canvas';
import { useStackedBreakpoint } from '@/lib/use-stacked';
import { sheetD, detailFor } from '@/lib/services-content';

export default function ServicesCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  // Rebuild on a live 768px crossing so resize switches canvas ↔ stack (Phase 3).
  const stacked = useStackedBreakpoint();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const screen = root.querySelector<HTMLElement>('.svc-screen');
      if (!screen) return;
      screen.innerHTML = sheetD();
      const ctrl = createSpatialCanvas(root, { detailFor });
      return () => {
        ctrl.destroy();
        screen.innerHTML = '';
      };
    },
    { scope: rootRef, dependencies: [stacked], revertOnUpdate: true },
  );

  return (
    // data-no-back: on the canvas, left-click means pan / open-a-panel, so it
    // must be exempt from the Nav's power-user "left-click = back" shortcut
    // (Phase 1). Home dodged this only by being route index 0 (back is a no-op
    // there); a real interior route like /services needs the guard.
    <div className="canvas-page" data-no-back ref={rootRef}>
      {/* sheetD() is injected here on mount (see useGSAP above) */}
      <div className="svc-screen no-scroll" />
    </div>
  );
}
