'use client';

/**
 * Custom cursor — a faithful React port of extracted/cursor.js.
 *
 * A 4-point sparkle flanked by two chevrons. Over an openable target it blooms
 * into a filled "OPEN" mark; over a draggable it reads GRAB/DRAG. Clicks leave
 * an ink splat. It inverts to paper-white over the dark CTA, shows a tooltip
 * bubble from [data-cursor-say], and locks/rotates along the nav curve when
 * hovering [data-cursor-path].
 *
 * Port notes vs. the original:
 *  - Movement uses gsap.quickTo() instead of the hand-rolled rAF lerp (per the
 *    migration brief). The per-frame lerp constants map to quickTo durations
 *    (snappy 0.5 → ~0.18s, smooth 0.16 → ~0.5s, magnetic 0.30 → ~0.32s; the
 *    nav-path lock's faster kk≈0.45 → ~0.12s). Targets are static between
 *    pointer moves in the original loop too, so quickTo reproduces the feel.
 *  - The CSS lives in globals.css under the same #jawad-cursor selectors.
 */
import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/motion';

const STAR = 'M0,-8 Q1.6,-1.6 8,0 Q1.6,1.6 0,8 Q-1.6,1.6 -8,0 Q-1.6,-1.6 0,-8 Z';
const OPEN_SEL = '.openable,[data-open],.wb-panel.wb-weld,.e-panel';

/** Movement smoothing per feel mode, expressed as quickTo durations (seconds). */
function feelDur(feel: string | undefined): number {
  return feel === 'smooth' ? 0.5 : feel === 'magnetic' ? 0.32 : 0.18; // default: snappy
}

/** Nearest point + clamped tangent angle on an SVG path, in viewport px. */
function nearestOnPath(pe: SVGGeometryElement, cx: number, cy: number) {
  let total = 0;
  try {
    total = pe.getTotalLength();
  } catch {
    /* not laid out yet */
  }
  if (!total) return null;
  const svg = pe.ownerSVGElement || (pe.closest && (pe.closest('svg') as SVGSVGElement | null));
  if (!svg) return null;
  const sr = svg.getBoundingClientRect();
  let best = 0,
    bd = Infinity;
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const l = (total * i) / N,
      p = pe.getPointAtLength(l),
      dx = sr.left + p.x - cx,
      dy = sr.top + p.y - cy,
      dd = dx * dx + dy * dy;
    if (dd < bd) {
      bd = dd;
      best = l;
    }
  }
  for (let s = total / N; s > 0.5; s /= 2) {
    for (const dl of [-s, s]) {
      const l = Math.max(0, Math.min(total, best + dl)),
        p = pe.getPointAtLength(l),
        dx = sr.left + p.x - cx,
        dy = sr.top + p.y - cy,
        dd = dx * dx + dy * dy;
      if (dd < bd) {
        bd = dd;
        best = l;
      }
    }
  }
  const p = pe.getPointAtLength(best);
  const a = pe.getPointAtLength(Math.max(0, best - 2)),
    b = pe.getPointAtLength(Math.min(total, best + 2));
  let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  ang = Math.max(-30, Math.min(30, ang));
  return { x: sr.left + p.x, y: sr.top + p.y, ang };
}

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const lblRef = useRef<HTMLSpanElement>(null);
  const sayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Enable the custom cursor whenever a precise pointer is *available*
    // (`any-pointer: fine`), not only when it's the *primary* one — so
    // touchscreen laptops / 2-in-1s (trackpad + touch, touch often primary)
    // still get the desktop cursor. The `jawad-hidecursor` class is only added
    // below, so touch-only devices are untouched.
    if (!window.matchMedia || !window.matchMedia('(any-pointer: fine)').matches) return;
    const el = ref.current!;
    const lbl = lblRef.current!;
    const sayBubble = sayRef.current!;
    const reduced = prefersReducedMotion();

    // seed feel mode from localStorage if not already set on the window global
    try {
      const w = window as unknown as { __jawadCursorFeel?: string };
      if (w.__jawadCursorFeel == null) {
        const v = localStorage.getItem('jawad-cursor-feel');
        if (v) w.__jawadCursorFeel = v;
      }
    } catch {
      /* private mode */
    }

    document.documentElement.classList.add('jawad-hidecursor');
    gsap.set(el, { left: 0, top: 0, xPercent: -50, yPercent: -50, x: -80, y: -80, rotation: 0 });

    // quickTo setters; rebuilt when the smoothing duration changes (feel / lock)
    let curDur = -1;
    let xTo!: (v: number) => void;
    let yTo!: (v: number) => void;
    const rotTo = gsap.quickTo(el, 'rotation', { duration: reduced ? 0.001 : 0.2, ease: 'power3' });
    function ensureQuick(dur: number) {
      if (dur === curDur) return;
      curDur = dur;
      const d = reduced ? 0.001 : dur;
      xTo = gsap.quickTo(el, 'x', { duration: d, ease: 'power3' });
      yTo = gsap.quickTo(el, 'y', { duration: d, ease: 'power3' });
    }
    ensureQuick(feelDur(undefined));

    const feel = () => (window as unknown as { __jawadCursorFeel?: string }).__jawadCursorFeel;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const tx = e.clientX,
        ty = e.clientY;
      el.classList.add('on');
      el.classList.remove('dim');
      const t = e.target as Element;
      const w = window as unknown as { __jawadDragging?: boolean; __jawadDragLabel?: string };

      // dragging (playground / canvas) takes over everything
      if (w.__jawadDragging) {
        el.classList.remove('open');
        el.classList.add('grab');
        lbl.textContent = w.__jawadDragLabel || 'DRAG';
        ensureQuick(feelDur(feel()));
        xTo(tx);
        yTo(ty);
        rotTo(0);
        return;
      }

      const open = t.closest && t.closest(OPEN_SEL);
      const grab = t.closest && t.closest('.jawad-pg-grab');
      el.classList.remove('grab', 'open');
      el.classList.toggle('inv', !!(t.closest && t.closest('.cta,.e-slab,[data-cursor-invert]')));

      const sayEl = t.closest && (t.closest('[data-cursor-say]') as HTMLElement | null);
      if (sayEl) {
        sayBubble.textContent = sayEl.getAttribute('data-cursor-say');
        el.classList.add('say');
      } else el.classList.remove('say');

      // lock onto + rotate along the nav path while hovering it
      const pz = t.closest && (t.closest('[data-cursor-path]') as HTMLElement | null);
      let lock: { x: number; y: number; ang: number } | null = null;
      if (pz) {
        const pe = (pz.querySelector('.nc-line') ||
          pz.querySelector('.nc-trav') ||
          pz.querySelector('path')) as SVGGeometryElement | null;
        lock = pe ? nearestOnPath(pe, e.clientX, e.clientY) : null;
      }

      let magnet: { x: number; y: number } | null = null;
      if (open) {
        el.classList.add('open');
        lbl.textContent = '';
        if (feel() === 'magnetic') {
          const r = open.getBoundingClientRect();
          magnet = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      } else if (grab) {
        el.classList.add('grab');
        lbl.textContent = 'Grab';
      } else {
        lbl.textContent = '';
      }

      // resolve the (static-between-moves) target the original rAF loop converged to
      if (lock) {
        ensureQuick(0.12); // kk≈0.45 — faster ride along the path
        xTo(lock.x);
        yTo(lock.y);
        rotTo(lock.ang);
      } else {
        ensureQuick(feelDur(feel()));
        if (feel() === 'magnetic' && magnet) {
          xTo(tx + (magnet.x - tx) * 0.34);
          yTo(ty + (magnet.y - ty) * 0.34);
        } else {
          xTo(tx);
          yTo(ty);
        }
        rotTo(0);
      }
    };

    const dirT = { id: 0 as number | ReturnType<typeof setTimeout> };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      el.classList.add('press');
      if (!reduced) {
        el.classList.remove('spin');
        void el.offsetWidth; // restart the spin keyframe
        el.classList.add('spin');
      }
      // right-click = forward (bold right chevron), left-click = back (bold left)
      const dir = e.button === 2 ? 'fwd' : 'bwd';
      el.classList.add(dir);
      clearTimeout(dirT.id as ReturnType<typeof setTimeout>);
      dirT.id = setTimeout(() => el.classList.remove('fwd', 'bwd'), 320);
      // ink splat: filled going forward, hollow ring going back
      inkSplat(e.clientX, e.clientY, e.button !== 2);
    };
    const onUp = () => el.classList.remove('press');
    const onLeave = () => el.classList.add('dim');

    window.addEventListener('pointermove', onMove, { passive: true, capture: true });
    window.addEventListener('pointerdown', onDown, { passive: true, capture: true });
    window.addEventListener('pointerup', onUp, { passive: true, capture: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true } as EventListenerOptions);
      window.removeEventListener('pointerdown', onDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('pointerup', onUp, { capture: true } as EventListenerOptions);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.documentElement.classList.remove('jawad-hidecursor');
    };
  }, []);

  return (
    <div id="jawad-cursor" ref={ref} aria-hidden="true">
      <svg className="jc-star" viewBox="-12 -12 24 24" aria-hidden="true">
        <path d={STAR} />
      </svg>
      <svg className="jc-arrow jc-left" viewBox="-6 -8 12 16" aria-hidden="true">
        <path d="M2.5,-5 L-2.5,0 L2.5,5" />
      </svg>
      <svg className="jc-arrow jc-right" viewBox="-6 -8 12 16" aria-hidden="true">
        <path d="M-2.5,-5 L2.5,0 L-2.5,5" />
      </svg>
      <span className="jc-lbl" ref={lblRef} />
      <span className="jc-say" ref={sayRef} />
    </div>
  );
}

/** Click ink splat (marker feel). Filled blob + scattered drops, or a hollow ring. */
function inkSplat(cx: number, cy: number, back: boolean) {
  const ink = document.createElement('div');
  ink.className = 'jc-ink' + (back ? ' back' : '');
  ink.style.left = cx + 'px';
  ink.style.top = cy + 'px';
  ink.innerHTML = '<span class="blob"></span>';
  document.body.appendChild(ink);
  const drops: HTMLElement[] = [];
  if (!back) {
    const n = 3 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'jc-drop';
      const a = Math.random() * Math.PI * 2,
        dist = 13 + Math.random() * 16,
        sz = 3 + Math.random() * 4;
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      d.style.width = sz + 'px';
      d.style.height = sz + 'px';
      d.style.setProperty('--dx', (Math.cos(a) * dist).toFixed(0) + 'px');
      d.style.setProperty('--dy', (Math.sin(a) * dist).toFixed(0) + 'px');
      document.body.appendChild(d);
      drops.push(d);
    }
  }
  setTimeout(() => {
    ink.classList.add('go');
    drops.forEach((d) => d.classList.add('go'));
  }, 16);
  setTimeout(() => {
    ink.remove();
    drops.forEach((d) => d.remove());
  }, 580);
}
