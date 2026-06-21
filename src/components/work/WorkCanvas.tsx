'use client';

/**
 * The /work infinite whiteboard (Direction D). Injects the whiteboard markup and
 * mounts the dedicated createWhiteboard engine (pan/zoom + billboard slat
 * cycle). A clean tap on a real-project panel opens its case study via the
 * view-transition router. data-no-back keeps the canvas exempt from the Nav's
 * left-click-back shortcut, like the other spatial pages.
 */
import { useRef } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { useGSAP } from '@/lib/gsap';
import { createWhiteboard } from '@/lib/whiteboard';
import { useStackedBreakpoint } from '@/lib/use-stacked';
import { whiteboard } from '@/lib/work-content';

export default function WorkCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useTransitionRouter();
  // Rebuild on a live 768px crossing so resize switches board ↔ stack (Phase 3).
  const stacked = useStackedBreakpoint();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const host = root.querySelector<HTMLElement>('.wb-host');
      if (!host) return;
      host.innerHTML = whiteboard();
      const ctrl = createWhiteboard(root, { onRoute: (route) => router.push(`/${route}`) });
      return () => {
        ctrl.destroy();
        host.innerHTML = '';
      };
    },
    { scope: rootRef, dependencies: [stacked], revertOnUpdate: true },
  );

  return (
    <div className="canvas-page" data-no-back ref={rootRef}>
      <div className="wb-host" />
    </div>
  );
}
