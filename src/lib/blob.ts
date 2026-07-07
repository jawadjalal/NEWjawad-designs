/**
 * The blob mascot's body (ART_DIRECTION §6, Stage 3a) — a gooey liquid shape
 * that rides behind the sparkle cursor. This module is motion-only: Cursor.tsx
 * owns the DOM (the #jawad-blob layer it renders) and the single pointermove
 * listener; it calls into this controller with the same target + smoothing the
 * sparkle resolved, so the two bodies always chase the same point and there is
 * exactly one event pipeline for the whole cursor system.
 *
 * Perf contract (see NOTES.md, perf pass): the outer #jawad-blob layer moves by
 * transform only (composited — the goo filter's output never changes, so it is
 * NOT re-rasterized by following the pointer). Only the tiny tail circles ever
 * animate *inside* the filtered 120px SVG, and they freeze concentric during
 * fast sweeps so the filter isn't re-rasterizing exactly when the GPU is busy
 * panning a canvas.
 */
import { gsap } from '@/lib/gsap';

/** Extra smoothing on top of the sparkle's duration — the body visibly trails. */
const LAG = 0.14;
/** How far (px, inside the SVG) the first tail circle drags behind travel. */
const TAIL_MAX = 6;
/** Pointer speed (px/ms) above which the goo freezes concentric (perf). */
const FREEZE_V = 1.6;

export type BlobCtl = {
  /**
   * Chase a viewport point. `baseDur` is the sparkle's current quickTo duration
   * (feel mode or the nav-lock 0.12); the blob adds its own LAG on top.
   */
  move(x: number, y: number, baseDur: number): void;
  destroy(): void;
};

export function createBlob(root: HTMLElement, opts: { reduced: boolean }): BlobCtl {
  const { reduced } = opts;
  const tails = Array.from(root.querySelectorAll<SVGCircleElement>('.jb-tail'));

  // Outer follow — same rebuilt-quickTo pattern as Cursor's ensureQuick, so the
  // two stay in lockstep when the feel mode (or nav lock) changes duration.
  let curDur = -1;
  let xTo!: (v: number) => void;
  let yTo!: (v: number) => void;
  function ensure(base: number) {
    const dur = base + LAG;
    if (dur === curDur) return;
    curDur = dur;
    const d = reduced ? 0.001 : dur;
    xTo = gsap.quickTo(root, 'x', { duration: d, ease: 'power3' });
    yTo = gsap.quickTo(root, 'y', { duration: d, ease: 'power3' });
  }

  // Tail circles get their own (slower, staggered) setters — the drag-behind
  // goo. These are transforms on elements inside the filter, so each write
  // re-rasterizes the (fixed, tiny) 120px region — bounded and cheap.
  const tailTo = tails.map((c, i) => ({
    x: gsap.quickTo(c, 'x', { duration: 0.28 + i * 0.1, ease: 'power2' }),
    y: gsap.quickTo(c, 'y', { duration: 0.28 + i * 0.1, ease: 'power2' }),
  }));

  // Velocity is derived between pointer events (no rAF loop — the blob is
  // fully event-driven, same as the sparkle).
  let px = 0;
  let py = 0;
  let pt = 0;
  let frozen = false;

  function move(tx: number, ty: number, baseDur: number) {
    ensure(baseDur);
    xTo(tx);
    yTo(ty);
    // Reduced motion: the body rides with the sparkle but the goo stays a
    // still, concentric blob — recolour (a static property) is kept, motion isn't.
    if (reduced || !tails.length) return;

    const now = performance.now();
    const dt = Math.max(1, now - pt);
    const vx = (tx - px) / dt;
    const vy = (ty - py) / dt;
    px = tx;
    py = ty;
    pt = now;
    const speed = Math.hypot(vx, vy);

    if (speed > FREEZE_V) {
      // Fast sweep (or a canvas pan under the pointer): park the tails once and
      // stop writing inside the filter until things calm down.
      if (!frozen) {
        frozen = true;
        tailTo.forEach((t) => {
          t.x(0);
          t.y(0);
        });
      }
      return;
    }
    frozen = false;

    // Tails lag opposite the travel direction, further out per tail — the
    // liquid "pulls behind" read. At rest speed→0 so they converge concentric.
    const k = Math.min(1, speed / 0.9);
    const ux = speed ? -vx / speed : 0;
    const uy = speed ? -vy / speed : 0;
    tailTo.forEach((t, i) => {
      const d = TAIL_MAX * k * (1 + i * 0.7);
      t.x(ux * d);
      t.y(uy * d);
    });
  }

  function destroy() {
    gsap.killTweensOf([root, ...tails]);
  }

  return { move, destroy };
}
