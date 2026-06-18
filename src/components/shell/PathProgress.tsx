'use client';

/**
 * The curved SVG nav path threaded through the labels, and its black "fill"
 * that tracks progress. Ported from buildNavCurve / applyNavProgress in
 * Jawad Prototype v2.html.
 *
 * Two fill modes, exactly like the prototype:
 *  - On a route page (Work, Services, …) the fill SNAPS to that link's node
 *    (the old setActiveNav behavior).
 *  - On the homepage the fill tracks store.scrollFrac continuously (the old
 *    setNavScroll behavior, fed by the home camera — in Phase 1 the home stub
 *    feeds it from window scroll so the behavior is demonstrable).
 *
 * It measures the live <a> rects, so it rebuilds on mount, on fonts.ready, and
 * on resize — the same lifecycle the prototype used.
 */
import { useEffect, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

const NS = 'http://www.w3.org/2000/svg';
// per-node vertical offsets (curve shape) × amplitude (curviness) — prototype defaults
const NAV_OFF = [-5, -3, 4, 6, -5, -4, 3];
const NAV_AMP = 1;

/** Which nav link (index in the 7-node curve) the current route highlights, or -1 on home. */
function linkIdxForPath(path: string): number {
  if (path === '/work' || path.startsWith('/work/')) return 0;
  if (path.startsWith('/services')) return 1;
  if (path.startsWith('/process')) return 2;
  if (path.startsWith('/pricing')) return 5;
  if (path.startsWith('/contact')) return 6;
  return -1; // home → continuous mode
}

/** Binary-search the path length whose point sits at x (prototype's lenAtX). */
function lenAtX(path: SVGGeometryElement, total: number, x: number): number {
  let lo = 0,
    hi = total;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export default function PathProgress({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const pathname = usePathname();

  useEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const svg = wrap.querySelector('.nav-curve') as SVGSVGElement | null;
    if (!svg) return;
    const links = Array.from(wrap.querySelectorAll(':scope > a')) as HTMLAnchorElement[];
    if (!links.length) return;

    let navLens: number[] = [];
    let navTotal = 0;
    let navNodes: { x: number; y: number }[] = [];

    function build() {
      if (!wrap || !svg) return;
      const H = wrap.clientHeight,
        cy = H / 2,
        wr = wrap.getBoundingClientRect();
      const OFF = NAV_OFF.map((v) => v * NAV_AMP);
      navNodes = links.map((a, i) => {
        const r = a.getBoundingClientRect();
        return { x: r.left - wr.left + r.width / 2, y: cy + (OFF[i] != null ? OFF[i] : i % 2 ? 3 : -3) };
      });
      const N = navNodes,
        ext = 16;
      // Catmull-Rom → cubic Bézier through the node centers
      let d = 'M' + (N[0].x - ext).toFixed(1) + ' ' + (N[0].y + 1).toFixed(1) + ' L' + N[0].x.toFixed(1) + ' ' + N[0].y.toFixed(1);
      for (let i = 0; i < N.length - 1; i++) {
        const p0 = N[i - 1] || N[i],
          p1 = N[i],
          p2 = N[i + 1],
          p3 = N[i + 2] || N[i + 1];
        const c1x = p1.x + (p2.x - p0.x) / 6,
          c1y = p1.y + (p2.y - p0.y) / 6,
          c2x = p2.x - (p3.x - p1.x) / 6,
          c2y = p2.y - (p3.y - p1.y) / 6;
        d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      d += ' L' + (N[N.length - 1].x + ext).toFixed(1) + ' ' + (N[N.length - 1].y + 1).toFixed(1);

      svg.innerHTML = '';
      const base = document.createElementNS(NS, 'path');
      base.setAttribute('class', 'nc-line');
      base.setAttribute('d', d);
      svg.appendChild(base);
      const trav = document.createElementNS(NS, 'path');
      trav.setAttribute('class', 'nc-trav');
      trav.setAttribute('d', d);
      svg.appendChild(trav);
      navTotal = (base as unknown as SVGGeometryElement).getTotalLength();
      trav.style.strokeDasharray = String(navTotal);
      navLens = N.map((p) => lenAtX(base as unknown as SVGGeometryElement, navTotal, p.x));
      N.forEach((p, i) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'nc-dot');
        c.setAttribute('data-i', String(i));
        c.setAttribute('cx', p.x.toFixed(1));
        c.setAttribute('cy', p.y.toFixed(1));
        c.setAttribute('r', '3.6');
        svg.appendChild(c);
        const lbl = links[i].querySelector('.lbl') as HTMLElement | null;
        if (lbl) {
          const L = navLens[i],
            a0 = (base as unknown as SVGGeometryElement).getPointAtLength(Math.max(0, L - 6)),
            a1 = (base as unknown as SVGGeometryElement).getPointAtLength(Math.min(navTotal, L + 6));
          let ang = (Math.atan2(a1.y - a0.y, a1.x - a0.x) * 180) / Math.PI;
          ang = Math.max(-7, Math.min(7, ang));
          if (p.y < cy) {
            lbl.style.top = 'auto';
            lbl.style.bottom = H - p.y + 9 + 'px';
          } else {
            lbl.style.bottom = 'auto';
            lbl.style.top = p.y + 9 + 'px';
          }
          lbl.style.transform = 'translateX(-50%) rotate(' + ang.toFixed(1) + 'deg)';
        }
      });
      const tri = document.createElementNS(NS, 'path');
      tri.setAttribute('class', 'nc-tri');
      svg.appendChild(tri);
    }

    function apply(progLen: number, idx: number, instant: boolean) {
      if (!svg || !navNodes.length) return;
      const base = svg.querySelector('.nc-line') as SVGGeometryElement | null;
      const trav = svg.querySelector('.nc-trav') as SVGPathElement | null;
      const tri = svg.querySelector('.nc-tri') as SVGPathElement | null;
      if (trav) {
        trav.style.transitionDuration = instant ? '0s' : '';
        trav.style.strokeDashoffset = (navTotal - progLen).toFixed(1);
      }
      svg.querySelectorAll('.nc-dot').forEach((c, i) => {
        c.classList.toggle('done', idx >= 0 && i < idx);
        (c as SVGElement & { style: CSSStyleDeclaration }).style.opacity = idx >= 0 && i === idx ? '0' : '1';
      });
      links.forEach((a, i) => a.classList.toggle('on', i === idx));
      if (tri) {
        let p: { x: number; y: number } | null = null;
        // Snap to the active node so the red triangle replaces the dot (not beside it).
        if (idx >= 0 && navNodes[idx]) {
          p = navNodes[idx];
        } else if (base && progLen > 0) {
          try {
            p = base.getPointAtLength(Math.max(0, Math.min(progLen, navTotal)));
          } catch {
            /* not laid out */
          }
        }
        if ((idx >= 0 || progLen > 0) && p) {
          const s = 5.4;
          tri.setAttribute(
            'd',
            'M' + (p.x - s * 0.8).toFixed(1) + ' ' + (p.y - s).toFixed(1) + ' L' + (p.x + s).toFixed(1) + ' ' + p.y.toFixed(1) + ' L' + (p.x - s * 0.8).toFixed(1) + ' ' + (p.y + s).toFixed(1) + ' Z',
          );
          tri.classList.add('show');
        } else tri.classList.remove('show');
      }
    }

    function refresh(instant = true) {
      const ai = linkIdxForPath(pathname);
      if (ai >= 0 && navLens[ai] != null) {
        // discrete page nav → snap fill to the node
        apply(navLens[ai], ai, instant);
      } else {
        // home → continuous fill; idx comes from the camera (store.sectionIndex)
        const { scrollFrac, sectionIndex } = useStore.getState();
        const progLen = scrollFrac * navTotal;
        const idx = scrollFrac > 0 ? sectionIndex : -1;
        apply(progLen, idx, true);
      }
    }

    build();
    refresh(true);

    // continuous fill: react to scroll fraction updates (home camera / scroll)
    const unsub = useStore.subscribe(() => refresh(true));

    let resizeT: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        build();
        refresh(true);
      }, 120);
    };
    window.addEventListener('resize', onResize);

    // labels lay out / fonts settle → remeasure
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        build();
        refresh(true);
      });
    }
    const t = setTimeout(() => {
      build();
      refresh(true);
    }, 120);

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeT);
      clearTimeout(t);
    };
  }, [pathname, containerRef]);

  return null;
}
