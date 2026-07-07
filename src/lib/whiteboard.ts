/**
 * Work whiteboard engine — a faithful 1:1 port of the prototype's
 * `initWhiteboards` (pan + wheel/button zoom) and `initBillboards` (the
 * venetian-blind slat animation that cycles the real projects every 4.2s) from
 * `work.js`.
 *
 * This is a separate engine from createSpatialCanvas: the prototype's `.wb`
 * canvas has its own constants (home 0.9, zoom 0.35–1.6, ±0.15 steps), no wires
 * and no zoom-into-detail. GSAP writes the pan/zoom transform (gsap.set); the
 * slat fold keeps the prototype's inline CSS transitions verbatim, so its timing
 * is identical. Under reduced motion the auto-cycle is skipped (the billboard
 * sits static) — hard rule #5.
 *
 * Migration touch: a clean tap (no drag) on a panel opens its work — an
 * in-site case study (data-slug → /work/[slug] via onRoute) or, for a shipped
 * live page like bidframe, the real site in a new tab (data-href).
 */
import { gsap } from '@/lib/gsap';
import { prefersReducedMotion, prefersStackedCanvas } from '@/lib/motion';

export type WhiteboardOpts = { onRoute?: (route: string) => void };
export type WhiteboardController = { destroy: () => void };

// Panels are "openable" if they route in-site (data-slug) or link out (data-href).
const OPENABLE = '.wb-panel[data-slug],.wb-panel[data-href]';
function openPanel(panel: HTMLElement, opts: WhiteboardOpts) {
  const href = panel.dataset.href;
  if (href) {
    // noopener/noreferrer: never hand the new tab a live window.opener handle.
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }
  const slug = panel.dataset.slug;
  if (slug) opts.onRoute?.(`work/${slug}`);
}

export function createWhiteboard(root: HTMLElement, opts: WhiteboardOpts = {}): WhiteboardController {
  const cleanups: Array<() => void> = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const T = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const on = (el: HTMLElement, type: string, fn: EventListener, o?: AddEventListenerOptions) => {
    el.addEventListener(type, fn, o);
    cleanups.push(() => el.removeEventListener(type, fn, o));
  };

  // Phase 5b: on touch / narrow viewports the whiteboard reflows to a vertical
  // scroll (CSS) — no pan/zoom (it fights native scroll). A tap on a project
  // panel still opens its case study; the billboard keeps cycling below.
  const stacked = prefersStackedCanvas();

  /* ---------- pan + zoom (desktop) / tap-to-open (mobile) ---------- */
  root.querySelectorAll<HTMLElement>('.wb').forEach((wb) => {
    const cv = wb.querySelector<HTMLElement>('.wb-canvas');
    if (!cv) return;

    if (stacked) {
      on(wb, 'click', (e) => {
        const panel = (e.target as Element).closest<HTMLElement>(OPENABLE);
        if (panel) openPanel(panel, opts);
      });
      return;
    }

    const isMobile = !!wb.closest('.frame.mobile');
    const home = isMobile ? 0.5 : 0.9;
    let s = home,
      px = 0,
      py = 0;
    const apply = () => gsap.set(cv, { x: px, y: py, scale: s });
    apply();
    let drag = false,
      pend = false,
      sx = 0,
      sy = 0,
      ox = 0,
      oy = 0,
      downPanel: HTMLElement | null = null;
    const PAN_TH = 5;
    on(wb, 'pointerdown', (e) => {
      const pe = e as PointerEvent;
      if ((pe.target as Element).closest('.wb-ctrls') || (pe.target as Element).closest('.btn')) return;
      pend = true;
      drag = false;
      sx = pe.clientX;
      sy = pe.clientY;
      ox = px;
      oy = py;
      downPanel = (pe.target as Element).closest<HTMLElement>(OPENABLE);
    });
    on(wb, 'pointermove', (e) => {
      const pe = e as PointerEvent;
      if (!pend) return;
      if (!drag) {
        if (Math.abs(pe.clientX - sx) + Math.abs(pe.clientY - sy) < PAN_TH) return;
        drag = true;
        wb.classList.add('grabbing');
        try {
          wb.setPointerCapture(pe.pointerId);
        } catch {
          /* ignore */
        }
      }
      px = ox + (pe.clientX - sx);
      py = oy + (pe.clientY - sy);
      apply();
    });
    const end = () => {
      // a clean tap on a real-project panel opens its work (case study or live site)
      if (pend && !drag && downPanel) openPanel(downPanel, opts);
      pend = false;
      drag = false;
      downPanel = null;
      wb.classList.remove('grabbing');
    };
    on(wb, 'pointerup', end);
    on(wb, 'pointercancel', end);
    on(
      wb,
      'wheel',
      (e) => {
        const we = e as WheelEvent;
        we.preventDefault();
        s = Math.min(1.6, Math.max(0.35, s - we.deltaY * 0.0012));
        apply();
      },
      { passive: false },
    );
    const ctrls = wb.querySelector<HTMLElement>('.wb-ctrls');
    if (ctrls)
      on(ctrls, 'click', (e) => {
        const z = (e.target as HTMLElement).dataset.z;
        if (!z) return;
        if (z === 'in') s = Math.min(1.6, s + 0.15);
        if (z === 'out') s = Math.max(0.35, s - 0.15);
        if (z === 'home') {
          s = home;
          px = 0;
          py = 0;
        }
        apply();
      });
  });

  /* ---------- billboard venetian-blind slat animation ---------- */
  const reduced = prefersReducedMotion();
  root.querySelectorAll<HTMLElement>('[data-bb]').forEach((panel) => {
    let projs: { id: string; src: string; name: string; cat: string; pos: string }[];
    try {
      projs = JSON.parse(panel.dataset.bb || '');
    } catch {
      return;
    }
    if (!projs || projs.length < 2) return;
    const slats = [...panel.querySelectorAll<HTMLElement>('.bb-slat')];
    const nameEl = panel.querySelector<HTMLElement>('.bb-name');
    const catEl = panel.querySelector<HTMLElement>('.bb-cat');
    const pips = [...panel.querySelectorAll<HTMLElement>('.bb-pips span')];
    const N = slats.length;
    if (!N) return;
    let cur = 0,
      busy = false;

    const slatH = () => panel.querySelector<HTMLElement>('.bb-wrap')?.offsetHeight || 164;
    const setSlat = (slat: HTMLElement, proj: (typeof projs)[number], idx: number) => {
      const img = slat.querySelector('img');
      if (!img) return;
      const h = slatH();
      const sh = h / N;
      img.src = proj.src;
      img.alt = proj.name;
      img.style.objectPosition = proj.pos || '50% 5%';
      img.style.height = h + 'px';
      img.style.top = -(idx * sh) + 'px';
    };
    const applyPx = () => {
      const h = slatH();
      const sh = h / N;
      slats.forEach((sl, i) => {
        const img = sl.querySelector('img');
        if (!img) return;
        img.style.height = h + 'px';
        img.style.top = -(i * sh) + 'px';
      });
    };
    requestAnimationFrame(() => applyPx());
    if (reduced) return; // calm branch: no auto-cycling motion

    const flip = () => {
      if (busy) return;
      busy = true;
      const next = (cur + 1) % projs.length;
      const nextP = projs[next];
      const STAGGER = 38,
        HALF = 220;
      slats.forEach((slat, i) => {
        T(() => {
          slat.style.transformOrigin = '50% 50%';
          slat.style.transition = `transform ${HALF}ms cubic-bezier(0.55,0,0.45,1)`;
          slat.style.transform = 'scaleY(0)';
          T(() => {
            setSlat(slat, nextP, i);
            slat.style.transition = 'none';
            slat.style.transform = 'scaleY(0)';
            void slat.offsetHeight;
            slat.style.transition = `transform ${HALF}ms cubic-bezier(0.45,0,0.55,1)`;
            slat.style.transform = 'scaleY(1)';
          }, HALF + 8);
        }, i * STAGGER);
      });
      const done = (N - 1) * STAGGER + HALF * 2 + 80;
      T(() => {
        if (nameEl) nameEl.textContent = nextP.name;
        if (catEl) catEl.textContent = nextP.cat;
        pips.forEach((p, i) => p.classList.toggle('on', i === next));
        const metaName = panel.querySelector<HTMLElement>('.wb-bb-meta-name');
        const metaCat = panel.querySelector<HTMLElement>('.wb-bb-meta-cat');
        if (metaName) metaName.textContent = nextP.name;
        if (metaCat) metaCat.textContent = nextP.cat;
        // keep the routable slug in sync with the shown project (migration touch)
        if (nextP.id) panel.dataset.slug = nextP.id;
        cur = next;
        busy = false;
      }, done);
    };
    const iv = setInterval(flip, 4200);
    cleanups.push(() => clearInterval(iv));
  });

  return {
    destroy() {
      timers.forEach(clearTimeout);
      timers.length = 0;
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
