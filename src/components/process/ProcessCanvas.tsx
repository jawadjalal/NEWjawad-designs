'use client';

/**
 * The /process step-strip (Direction D). Injects the strip markup and mounts
 * createProcessStrip (horizontal scroll + active card + progress + step→detail).
 * data-no-back keeps left-click free for the strip/cards.
 */
import { useRef } from 'react';
import { useGSAP } from '@/lib/gsap';
import { createProcessStrip } from '@/lib/process-strip';
import { useStackedBreakpoint } from '@/lib/use-stacked';
import { sheetD, detailFor } from '@/lib/process-content';

export default function ProcessCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  // Rebuild on a live 768px crossing so resize switches strip ↔ stack (Phase 3).
  const stacked = useStackedBreakpoint();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const screen = root.querySelector<HTMLElement>('.svc-screen');
      if (!screen) return;
      screen.innerHTML = sheetD();
      const ctrl = createProcessStrip(root, { detailFor });
      return () => {
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
