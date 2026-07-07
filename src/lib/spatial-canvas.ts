/**
 * Spatial canvas engine — the reusable pan / zoom / wire / zoom-into-detail
 * mechanism behind the Services page (Direction D), and (Phase 4) the Work
 * whiteboard.
 *
 * This is a faithful 1:1 port of the prototype's `ensureCanvas` / `drawWires`
 * / `openDetail` / `closeDetail` / `ensureAll` from `services-render.js`. It is
 * framework-agnostic: hand it a root element that already contains the canvas
 * markup (a `.scase` with a `.sc-canvas`, optionally a sibling `.sc-detail`),
 * plus a `detailFor(id)` that returns the HTML for a panel's detail canvas, and
 * it wires up every behaviour.
 *
 * GSAP, per hard rule #3, owns the one continuously-animated channel — the
 * canvas transform — via `gsap.set` (identical result to the prototype's raw
 * `style.transform` writes, no inertia added because the prototype's pan has
 * none). The zoom-into-detail uses the prototype's own CSS transition verbatim
 * (it is a discrete state change, not a per-frame animation), so its 0.42s
 * easing is guaranteed identical; reduced-motion neutralises it in CSS.
 */
import { gsap } from '@/lib/gsap';
import { prefersStackedCanvas } from '@/lib/motion';
import { useStore } from '@/lib/store';

export type SpatialCanvasOpts = {
  /** Returns the HTML for a panel's nested detail canvas, keyed by data-open. */
  detailFor: (id: string) => string;
  /** Optional: a panel carrying data-route navigates instead of opening detail. */
  onRoute?: (route: string) => void;
  /** Home (rest) scale for the main canvas. Default 0.46; the slug uses 0.78. */
  mainHomeScale?: number;
  /** Minimum zoom-out scale. Default 0.28; the slug uses 0.3. */
  zoomMin?: number;
  /** Which panels get a wire from the hero. Default services/pricing topology. */
  wireSelector?: string;
  /** CSS class on the wire polylines. Default 'w-main' (''=base stroke, the slug). */
  wireClass?: string;
};

export type SpatialCanvasController = {
  destroy: () => void;
};

type CanvasState = { s: number; px: number; py: number; home: number; apply: () => void };

export function createSpatialCanvas(root: HTMLElement, opts: SpatialCanvasOpts): SpatialCanvasController {
  const mainHome = opts.mainHomeScale ?? 0.46;
  const zoomMin = opts.zoomMin ?? 0.28;
  const wireSelector = opts.wireSelector ?? '.sc-clushead, .sc-offerpanel';
  const wireClass = opts.wireClass ?? 'w-main';
  // Phase 5b: on touch / narrow viewports the canvas reflows to a plain vertical
  // scroll (CSS), so the pan/zoom/wheel machinery — which fights native touch
  // scrolling — is never wired. We only keep tap-to-open-detail + back/close.
  const stacked = prefersStackedCanvas();
  // Per-canvas transform state + a flag for "wires already drawn", keyed off
  // the DOM node (the prototype stashed these on the element itself).
  const states = new WeakMap<HTMLElement, CanvasState>();
  const wired = new WeakSet<HTMLElement>();

  // Tracked listeners so destroy() can remove every one.
  const cleanups: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    optsArg?: AddEventListenerOptions,
  ) => {
    el.addEventListener(type, fn as EventListener, optsArg);
    cleanups.push(() => el.removeEventListener(type, fn as EventListener, optsArg));
  };

  /* ---------- connector wires (anchor → panels) ---------- */
  function drawWires(sc: HTMLElement, cv: HTMLElement) {
    const svg = sc.querySelector<SVGSVGElement>('.sc-wires');
    const hero = cv.querySelector<HTMLElement>('.sc-hero');
    if (!svg || !hero) return;
    // Measure with the canvas un-transformed, then restore — geometry must be
    // in the canvas's own coordinate space, independent of pan/zoom.
    const prev = cv.style.transform;
    cv.style.transform = 'none';
    const c = cv.getBoundingClientRect();
    const ctr = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
    };
    svg.setAttribute('viewBox', `0 0 ${c.width} ${c.height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const h = ctr(hero);
    let lines = '';
    // Each wire is a little open chevron at its midpoint, angled along the line.
    const line = (a: { x: number; y: number }, b: { x: number; y: number }, cls?: string) => {
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2,
        ang = Math.atan2(b.y - a.y, b.x - a.x),
        S = 14,
        SP = 0.6;
      const x1 = mx - S * Math.cos(ang - SP),
        y1 = my - S * Math.sin(ang - SP),
        x2 = mx - S * Math.cos(ang + SP),
        y2 = my - S * Math.sin(ang + SP);
      return `<polyline points="${x1.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"${cls ? ` class="${cls}"` : ''}/>`;
    };
    // anchor/hero -> each wired panel (the slug wires hero to every panel)
    cv.querySelectorAll(wireSelector).forEach((p) => {
      lines += line(h, ctr(p), wireClass);
    });
    // each world head -> its example satellites (light wires)
    cv.querySelectorAll<HTMLElement>('.sc-clushead').forEach((head) => {
      const cl = head.dataset.cluster;
      if (!cl) return;
      cv.querySelectorAll(`.sc-sat[data-cluster="${cl}"]`).forEach((s) => {
        lines += line(ctr(head), ctr(s), 'w-sat');
      });
    });
    svg.innerHTML = lines;
    cv.style.transform = prev;
  }

  /* ---------- zoom-into-detail (canvas-in-a-canvas) ---------- */
  function openDetail(detail: HTMLElement, panel: HTMLElement) {
    const body = detail.querySelector<HTMLElement>('.detail-body');
    const id = panel.dataset.open;
    if (!body || !id) return;
    body.innerHTML = opts.detailFor(id);
    const screen = detail.closest<HTMLElement>('.svc-screen');
    if (!screen) return;
    const sr = screen.getBoundingClientRect(),
      pr = panel.getBoundingClientRect();
    // Grow from the clicked panel's centre so it reads as "this panel expands".
    detail.style.transformOrigin = `${pr.left + pr.width / 2 - sr.left}px ${pr.top + pr.height / 2 - sr.top}px`;
    detail.classList.add('open');
    requestAnimationFrame(() => ensureAll(detail));
  }
  function closeDetail(detail: HTMLElement) {
    detail.classList.remove('open');
  }

  /* ---------- per-canvas: pan + zoom + (main) tap-to-open ---------- */
  function ensureCanvas(sc: HTMLElement) {
    const cv = sc.querySelector<HTMLElement>('.sc-canvas');
    if (!cv) return;

    if (stacked) {
      // Stacked (mobile) wiring — once per canvas. No pan/zoom; the panels are
      // laid out as a vertical scroll by CSS. A tap on an openable panel still
      // zoom-grows its detail (which is itself a scrollable stack on mobile).
      if (wired.has(sc)) return;
      wired.add(sc);
      if (!sc.classList.contains('worlds')) return; // nested detail canvas: CSS only
      on(sc, 'click', (e) => {
        const panel = (e.target as Element).closest<HTMLElement>('.sc-panel[data-open]');
        if (!panel) return;
        const detail = sc.closest('.svc-screen')?.querySelector<HTMLElement>('.sc-detail');
        if (detail) openDetail(detail, panel);
      });
      const detail = sc.closest('.svc-screen')?.querySelector<HTMLElement>('.sc-detail');
      if (detail && !detail.dataset.wired) {
        detail.dataset.wired = '1';
        const back = detail.querySelector<HTMLElement>('.back-pill');
        const close = detail.querySelector<HTMLElement>('.close-x');
        if (back) on(back, 'click', () => closeDetail(detail));
        if (close) on(close, 'click', () => closeDetail(detail));
      }
      return;
    }

    if (!states.has(sc)) {
      const isMobile = !!sc.closest('.frame.mobile');
      const nested = !!sc.closest('.sc-detail');
      // nested detail canvases always open at the prototype's 0.74; the main
      // canvas uses the page's home scale (0.46 default, 0.78 for the slug).
      const home = nested ? (isMobile ? 0.5 : 0.74) : mainHome;
      // Perf: while the canvas is panning/zooming, `.sc-moving` switches the
      // glass panels' live backdrop-blur off (see canvas.css) — re-blurring
      // every panel per drag frame is what made panning feel heavy. The class
      // drops ~160ms after the last transform write, so the blur is back the
      // moment the canvas comes to rest; in motion its absence is invisible.
      let moveT = 0;
      const markMoving = () => {
        sc.classList.add('sc-moving');
        window.clearTimeout(moveT);
        moveT = window.setTimeout(() => sc.classList.remove('sc-moving'), 160);
      };
      const st: CanvasState = {
        s: home,
        px: 0,
        py: 0,
        home,
        // GSAP writes the transform (translate + scale about centre) — same
        // visual result as the prototype's `translate(px,py) scale(s)`.
        apply: () => {
          markMoving();
          gsap.set(cv, { x: st.px, y: st.py, scale: st.s });
        },
      };
      states.set(sc, st);
      st.apply();

      const isMain = sc.classList.contains('worlds');
      let drag = false,
        sx = 0,
        sy = 0,
        ox = 0,
        oy = 0,
        moved = false,
        downPanel: HTMLElement | null = null;

      on(sc, 'pointerdown', (e) => {
        // Don't start a pan when the pointer lands on a control or a form field
        // (the Contact canvas embeds a real, focusable form in its hero panel).
        if ((e.target as Element).closest('.sc-ctrls, .btn, input, textarea, label, .cf-tierseg, .cf-form')) return;
        drag = true;
        moved = false;
        sc.classList.add('grabbing');
        // cursor + blob read this per move — the shared "hands on the canvas" signal
        useStore.getState().setDragging(true, 'PAN');
        sx = e.clientX;
        sy = e.clientY;
        ox = st.px;
        oy = st.py;
        downPanel = isMain ? (e.target as Element).closest<HTMLElement>('.sc-panel[data-open]') : null;
        try {
          sc.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      });
      on(sc, 'pointermove', (e) => {
        if (!drag) return;
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 5) moved = true;
        st.px = ox + (e.clientX - sx);
        st.py = oy + (e.clientY - sy);
        st.apply();
      });
      const end = () => {
        // A clean tap (no pan) on an openable panel zooms into its detail.
        if (drag && isMain && downPanel && !moved) {
          const detail = sc.closest('.svc-screen')?.querySelector<HTMLElement>('.sc-detail');
          if (detail) openDetail(detail, downPanel);
        }
        drag = false;
        downPanel = null;
        sc.classList.remove('grabbing');
        useStore.getState().setDragging(false);
      };
      on(sc, 'pointerup', end);
      on(sc, 'pointercancel', () => {
        drag = false;
        sc.classList.remove('grabbing');
        useStore.getState().setDragging(false);
      });
      on(
        sc,
        'wheel',
        (e) => {
          e.preventDefault();
          st.s = Math.min(1.5, Math.max(zoomMin, st.s - e.deltaY * 0.0012));
          st.apply();
        },
        { passive: false },
      );
      const ctrls = sc.querySelector<HTMLElement>('.sc-ctrls');
      if (ctrls)
        on(ctrls, 'click', (e) => {
          const z = (e.target as HTMLElement).dataset.z;
          if (!z) return;
          if (z === 'in') st.s = Math.min(1.5, st.s + 0.14);
          if (z === 'out') st.s = Math.max(zoomMin, st.s - 0.14);
          if (z === 'home') {
            st.s = st.home;
            st.px = 0;
            st.py = 0;
          }
          st.apply();
        });

      // Wire the detail overlay's back / close once per main canvas.
      if (isMain) {
        const detail = sc.closest('.svc-screen')?.querySelector<HTMLElement>('.sc-detail');
        if (detail && !detail.dataset.wired) {
          detail.dataset.wired = '1';
          const back = detail.querySelector<HTMLElement>('.back-pill');
          const close = detail.querySelector<HTMLElement>('.close-x');
          if (back) on(back, 'click', () => closeDetail(detail));
          if (close) on(close, 'click', () => closeDetail(detail));
        }
      }
    }
    // Draw wires once the canvas is actually laid out (visible + measurable).
    if (sc.offsetParent !== null && cv.getBoundingClientRect().width > 0 && !wired.has(sc)) {
      drawWires(sc, cv);
      wired.add(sc);
      states.get(sc)?.apply();
    }
  }

  function ensureAll(scope?: HTMLElement) {
    (scope || root).querySelectorAll<HTMLElement>('.scase').forEach(ensureCanvas);
  }

  ensureAll();
  // Fonts change panel sizes → wire endpoints move; redraw when they land and
  // on resize (DrawWires needs settled layout, same habit as the prototype).
  let resizeRaf = 0;
  const onResize = () => {
    if (stacked) return; // stacked layout has no wires to re-measure
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      // Force a re-measure: clear the wired flag for every canvas, redraw.
      root.querySelectorAll<HTMLElement>('.scase').forEach((sc) => {
        wired.delete(sc);
        ensureCanvas(sc);
      });
    });
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => onResize());
  }

  // Esc closes an open detail canvas — keyboard parity with the back/close
  // buttons (roadmap §9). The buttons remain the visible path.
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const open = root.querySelector<HTMLElement>('.sc-detail.open');
    if (open) closeDetail(open);
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  return {
    destroy() {
      cancelAnimationFrame(resizeRaf);
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
