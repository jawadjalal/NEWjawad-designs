/**
 * The blob mascot's body (ART_DIRECTION §6) — a gooey liquid shape that rides
 * behind the sparkle cursor. This module is motion-only: Cursor.tsx owns the
 * DOM (the #jawad-blob layer it renders) and the single pointermove listener;
 * it calls into this controller with the same target + smoothing the sparkle
 * resolved, so the two bodies always chase the same point and there is exactly
 * one event pipeline for the whole cursor system.
 *
 * Perf contract (see NOTES.md, perf pass): the outer #jawad-blob layer moves by
 * transform only (composited — the goo filter's output never changes, so it is
 * NOT re-rasterized by following the pointer). Only the tiny tail circles ever
 * animate *inside* the filtered 120px SVG, and they freeze concentric during
 * fast sweeps so the filter isn't re-rasterizing exactly when the GPU is busy
 * panning a canvas.
 */
import { gsap } from '@/lib/gsap';

/**
 * GSAP-native stand-in for the site's --ease-bounce cubic-bezier (GSAP core
 * can't parse CSS bezier strings without the CustomEase plugin): back.out with
 * a matched overshoot gives the same springy settle.
 */
const BOUNCE = 'back.out(2)';

/** Extra smoothing on top of the sparkle's duration — the body visibly trails. */
const LAG = 0.14;
/** How far (px, inside the SVG) the first tail circle drags behind travel. */
const TAIL_MAX = 6;
/** Pointer speed (px/ms) above which the goo freezes concentric (perf). */
const FREEZE_V = 1.6;
/** Stick pull: tighter than any feel mode, so the snap reads magnetic. */
const STICK_BASE = 0.06; // → 0.2s with LAG
/** How far the tails spread along a stuck target's edge (the wrap read). */
const EDGE_SPREAD = 9;

export type BlobCtl = {
  /**
   * Chase a viewport point. `baseDur` is the sparkle's current quickTo duration
   * (feel mode or the nav-lock 0.12); the blob adds its own LAG on top.
   */
  move(x: number, y: number, baseDur: number): void;
  /**
   * Magnetically hug a [data-blob-stick] target: snaps to the point on the
   * element's rim nearest the pointer and wraps the goo along that edge.
   * Call with the rect each move while stuck; call release() on exit.
   */
  stick(rect: DOMRect, x: number, y: number): void;
  /** Let go of a stuck target — tails pop home with a small elastic bounce. */
  release(): void;
  /** Excite mood: swell + tails orbit out while hovering an openable. */
  setExcite(on: boolean): void;
  /** Drag mood: stretch along travel while the user pans a canvas/strip. */
  setDragging(on: boolean): void;
  /** Click mood: squash + rebound, synced with the sparkle press/ink splat. */
  splat(): void;
  destroy(): void;
};

export function createBlob(root: HTMLElement, opts: { reduced: boolean }): BlobCtl {
  const { reduced } = opts;
  const tails = Array.from(root.querySelectorAll<SVGCircleElement>('.jb-tail'));
  const goo = root.querySelector<SVGGElement>('.jb-goo')!;
  const main = root.querySelector<SVGCircleElement>('.jb-main')!;

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
  //
  // Why the setters are rebuildable: a quickTo reuses one internal tween, and
  // an external gsap.to(..., overwrite:'auto') — the stick-release pop — kills
  // that tween, leaving the setter dead. So flowing motion goes through
  // quickTos that are lazily rebuilt after any pop.
  let tailQuick: { x: (v: number) => void; y: (v: number) => void }[] | null = null;
  function tailFlow(i: number, x: number, y: number) {
    if (!tailQuick) {
      tailQuick = tails.map((c, j) => ({
        x: gsap.quickTo(c, 'x', { duration: 0.34 + j * 0.12, ease: 'power2.out' }),
        y: gsap.quickTo(c, 'y', { duration: 0.34 + j * 0.12, ease: 'power2.out' }),
      }));
    }
    tailQuick[i].x(x);
    tailQuick[i].y(y);
  }
  function tailPop(vars: gsap.TweenVars) {
    tailQuick = null; // quickTo tweens are about to be overwritten — rebuild lazily
    tails.forEach((c) => gsap.to(c, { ...vars, overwrite: 'auto' }));
  }

  // Velocity is derived between pointer events (no rAF loop — the blob is
  // fully event-driven, same as the sparkle).
  let px = 0;
  let py = 0;
  let pt = 0;
  let frozen = false;
  let stuck = false;

  /** px/ms speed + unit direction since the previous pointer event. */
  function velocity(tx: number, ty: number) {
    const now = performance.now();
    const dt = Math.max(1, now - pt);
    const vx = (tx - px) / dt;
    const vy = (ty - py) / dt;
    px = tx;
    py = ty;
    pt = now;
    return { vx, vy, speed: Math.hypot(vx, vy) };
  }

  // ---- moods (3c) -------------------------------------------------------
  // Discrete states are plain gsap.to with overwrite:'auto' (a quickTo can't
  // retarget its ease/duration per mood); only the continuous follow above
  // stays quickTo. All moods no-op under reduced motion — one branch here at
  // the API surface, not per-tween.

  // Idle breathing: rests while you move/read, breathes only when *you* rest —
  // the "reacts, doesn't perform" guardrail. Re-armed by every pointer event.
  let breatheTween: gsap.core.Tween | null = null;
  let idleT = 0;
  function startBreathe() {
    breatheTween = gsap.to(main, {
      scale: 1.09,
      transformOrigin: '50% 50%',
      duration: 1.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      overwrite: 'auto',
    });
  }
  function stopBreathe() {
    if (!breatheTween) return;
    breatheTween.kill();
    breatheTween = null;
    gsap.to(main, { scale: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
  }
  /** Any activity: settle the breath and re-arm the 800ms idle timer. */
  function poke() {
    if (reduced) return;
    stopBreathe();
    window.clearTimeout(idleT);
    idleT = window.setTimeout(startBreathe, 800);
  }

  // Excite: swell over an openable, goo tails orbit out — a liquid halo around
  // the sparkle's OPEN bloom instead of a second dead black mass behind it.
  let excited = false;
  function setExcite(on: boolean) {
    if (reduced || on === excited) return;
    excited = on;
    gsap.to(goo, {
      scale: on ? 1.28 : 1,
      transformOrigin: '50% 50%',
      duration: 0.2,
      ease: on ? BOUNCE : 'power2.out',
      overwrite: 'auto',
    });
    if (on) {
      tailQuick = null; // external tweens overwrite the quickTos — rebuild lazily
      tails.forEach((c, i) =>
        gsap.to(c, {
          x: i % 2 ? -8 : 7,
          y: i % 2 ? 6 : -7,
          duration: 0.25,
          ease: BOUNCE,
          overwrite: 'auto',
        }),
      );
    } else {
      tailPop({ x: 0, y: 0, duration: 0.4, ease: BOUNCE });
    }
  }

  // Drag-stretch: while panning a canvas the goo elongates along travel and
  // the tails stay parked (perf: one cheap stretch tween per move, nothing
  // else re-rasterizing the filter during the pan). Release wobbles back.
  let dragging = false;
  function setDragging(on: boolean) {
    if (reduced || on === dragging) return;
    dragging = on;
    if (on) {
      tailPop({ x: 0, y: 0, duration: 0.2, ease: 'power2.out' });
    } else {
      gsap.to(goo, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        transformOrigin: '50% 50%',
        duration: 0.5,
        ease: BOUNCE,
        overwrite: 'auto',
      });
    }
  }

  // Splat: squash + rebound on click, synced with the sparkle's press/spin and
  // the existing ink splat (which is untouched — it lives in its own layer).
  function splat() {
    if (reduced) return;
    poke();
    gsap
      .timeline()
      .to(goo, { scale: 0.7, transformOrigin: '50% 50%', duration: 0.09, ease: 'power2.in', overwrite: 'auto' })
      .to(goo, { scale: excited ? 1.28 : 1, duration: 0.4, ease: BOUNCE });
  }

  function move(tx: number, ty: number, baseDur: number) {
    if (stuck) releaseInner(); // moved off a stick target without an explicit release
    ensure(baseDur);
    xTo(tx);
    yTo(ty);
    // Reduced motion: the body rides with the sparkle but the goo stays a
    // still, concentric blob — recolour (a static property) is kept, motion isn't.
    if (reduced || !tails.length) return;
    poke();

    const { vx, vy, speed } = velocity(tx, ty);

    if (dragging) {
      // stretch along the travel direction; '_short' spins the shorter way
      if (speed > 0.05) {
        const s = Math.min(0.35, speed * 0.45);
        gsap.to(goo, {
          rotation: `${(Math.atan2(vy, vx) * 180) / Math.PI}_short`,
          scaleX: 1 + s,
          scaleY: 1 - s * 0.7,
          transformOrigin: '50% 50%',
          duration: 0.18,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
      return; // tails stay parked during drags (perf contract)
    }
    if (excited) return; // tails are orbiting — don't fight them with trail offsets

    if (speed > FREEZE_V) {
      // Fast sweep (or a canvas pan under the pointer): park the tails once and
      // stop writing inside the filter until things calm down.
      if (!frozen) {
        frozen = true;
        tails.forEach((_, i) => tailFlow(i, 0, 0));
      }
      return;
    }
    frozen = false;

    // Tails lag opposite the travel direction, further out per tail — the
    // liquid "pulls behind" read. At rest speed→0 so they converge concentric.
    const k = Math.min(1, speed / 0.9);
    const ux = speed ? -vx / speed : 0;
    const uy = speed ? -vy / speed : 0;
    tails.forEach((_, i) => {
      const d = TAIL_MAX * k * (1 + i * 0.7);
      tailFlow(i, ux * d, uy * d);
    });
  }

  function stick(rect: DOMRect, tx: number, ty: number) {
    // Reduced motion: no magnetic snap — the blob just keeps riding the pointer.
    if (reduced) {
      move(tx, ty, STICK_BASE);
      return;
    }
    poke();
    stuck = true;
    velocity(tx, ty); // keep the velocity history warm for release

    // Rim-hug: park the blob centre on the point of the element's border
    // nearest the pointer — deliberately NOT over the middle, where the
    // exclusion blend would invert the target's own label.
    const dl = tx - rect.left;
    const dr = rect.right - tx;
    const dt = ty - rect.top;
    const db = rect.bottom - ty;
    const m = Math.min(dl, dr, dt, db);
    let sx = tx;
    let sy = ty;
    let horiz = true; // is the hugged edge horizontal (top/bottom)?
    if (m === dt) sy = rect.top;
    else if (m === db) sy = rect.bottom;
    else {
      horiz = false;
      sx = m === dl ? rect.left : rect.right;
    }

    ensure(STICK_BASE); // tighter pull than any feel mode — reads magnetic
    xTo(sx);
    yTo(sy);

    // Wrap the goo along the hugged edge: tails elongate sideways along it
    // (alternating directions) instead of trailing travel.
    tails.forEach((_, i) => {
      const d = EDGE_SPREAD * (1 + i * 0.6) * (i % 2 ? -1 : 1);
      tailFlow(i, horiz ? d : 0, horiz ? 0 : d);
    });
  }

  function releaseInner() {
    stuck = false;
    if (!reduced) tailPop({ x: 0, y: 0, duration: 0.45, ease: BOUNCE });
  }
  function release() {
    if (stuck) releaseInner();
  }

  function destroy() {
    window.clearTimeout(idleT);
    gsap.killTweensOf([root, goo, main, ...tails]);
  }

  return { move, stick, release, setExcite, setDragging, splat, destroy };
}
