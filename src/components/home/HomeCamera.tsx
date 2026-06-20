'use client';

/**
 * The homepage spatial canvas (Direction E). This component renders only the
 * static shell (stage / viewport / world / detail overlay); the
 * camera engine — panels, loader, inertia scroll, settle, nested canvases — is
 * mounted imperatively by createHomeCamera() inside useGSAP (DOM-measuring +
 * GSAP-driven, so it must be client-side and run after layout).
 *
 * Two wires connect the engine to the rest of the app:
 *  - onNav  → useStore.setScroll, so the persistent bottom-nav curve (Phase 1)
 *             fills against the real camera progress instead of a stub.
 *  - onRoute → the view-transition router, so a route panel (Work / Services /
 *             Process / Pricing) navigates to its page.
 */
import { useRef } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { useGSAP } from '@/lib/gsap';
import { useStore } from '@/lib/store';
import { createHomeCamera } from '@/lib/home-camera';

export default function HomeCamera() {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useTransitionRouter();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      // A nav link clicked on another page parks its target section here; pick
      // it up so we land on that section instead of replaying the brand intro.
      const initialSection = useStore.getState().consumeSection();
      const ctrl = createHomeCamera(root, {
        onNav: ({ frac, idx }) => useStore.getState().setScroll(frac, idx),
        onRoute: (route) => router.push(`/${route}`),
        initialSection,
      });
      // Expose the camera's section-travel to the persistent <Nav/> while mounted.
      useStore.getState().registerCamera(ctrl.gotoSection);
      return () => {
        useStore.getState().registerCamera(null);
        ctrl.destroy();
      };
    },
    { scope: rootRef },
  );

  return (
    <div className="e-home" ref={rootRef}>
      <div className="e-stage">
        <div className="e-progress" />
        <div className="e-viewport">
          <div className="e-track">
            <div className="e-camera">
              <div className="e-world">
                <svg className="e-wires" />
              </div>
            </div>
          </div>
        </div>
        <div className="e-hint">‹ left-click · back &nbsp;·&nbsp; right-click · forward ›</div>
        <div className="e-detail">
          <div className="e-detail-chrome">
            <span className="e-back">← Back to the page</span>
            <span className="e-close">✕</span>
          </div>
          <div className="e-detail-body" />
        </div>
      </div>
    </div>
  );
}
