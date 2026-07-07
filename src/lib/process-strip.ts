/**
 * /process main view — the horizontal step-strip, a faithful port of
 * `initProcess` from process-render.js: vertical wheel → horizontal travel,
 * drag-to-scroll, an active-card highlight, a progress bar, and a clean click
 * on a step opening its detail canvas.
 *
 * The strip itself uses native scroll (the prototype writes scrollLeft + relies
 * on CSS scroll-behavior) — no transform animation, so nothing to hand to GSAP
 * here. The per-step detail is the same nested sc-* canvas as everywhere else,
 * so it reuses createSpatialCanvas (which is GSAP-driven) for pan/zoom + wires.
 */
import { createSpatialCanvas, type SpatialCanvasController } from '@/lib/spatial-canvas';
import { prefersStackedCanvas } from '@/lib/motion';

export type ProcessStripOpts = { detailFor: (id: string) => string };
export type ProcessStripController = { destroy: () => void };

export function createProcessStrip(root: HTMLElement, opts: ProcessStripOpts): ProcessStripController {
  const cleanups: Array<() => void> = [];
  let detailCtrl: SpatialCanvasController | null = null;
  // Phase 5b: on touch / narrow viewports the strip stacks vertically and uses
  // native scroll (CSS), so the wheel→horizontal-scroll + drag + active-card
  // machinery is skipped. Tapping a step still opens its detail.
  const stacked = prefersStackedCanvas();
  const on = (el: HTMLElement, type: string, fn: EventListener, o?: AddEventListenerOptions) => {
    el.addEventListener(type, fn, o);
    cleanups.push(() => el.removeEventListener(type, fn, o));
  };

  function openDetail(detail: HTMLElement, card: HTMLElement) {
    const body = detail.querySelector<HTMLElement>('.detail-body');
    const id = card.dataset.open;
    if (!body || !id) return;
    body.innerHTML = opts.detailFor(id);
    const screen = detail.closest<HTMLElement>('.svc-screen');
    if (!screen) return;
    const sr = screen.getBoundingClientRect(),
      pr = card.getBoundingClientRect();
    detail.style.transformOrigin = `${pr.left + pr.width / 2 - sr.left}px ${pr.top + pr.height / 2 - sr.top}px`;
    detail.classList.add('open');
    // wire the freshly-injected nested canvas (pan/zoom + wires)
    detailCtrl?.destroy();
    detailCtrl = createSpatialCanvas(detail, { detailFor: () => '' });
  }
  function closeDetail(detail: HTMLElement) {
    detail.classList.remove('open');
    detailCtrl?.destroy();
    detailCtrl = null;
  }

  root.querySelectorAll<HTMLElement>('.proc-stage').forEach((stage) => {
    const scroller = stage.querySelector<HTMLElement>('.proc-scroller');
    const prog = stage.querySelector<HTMLElement>('.proc-progress>i');
    const detail = stage.querySelector<HTMLElement>('.sc-detail');
    const steps = [...stage.querySelectorAll<HTMLElement>('.proc-step')];
    if (!scroller) return;

    // moved: a drag on the desktop strip suppresses the click-to-open. On
    // mobile there is no drag handler, so it stays false and taps always open.
    let moved = false;

    if (!stacked) {
      // vertical wheel → horizontal travel
      on(
        scroller,
        'wheel',
        (e) => {
          const we = e as WheelEvent;
          const dom = Math.abs(we.deltaY) >= Math.abs(we.deltaX) ? we.deltaY : we.deltaX;
          if (!dom) return;
          we.preventDefault();
          scroller.scrollLeft += dom;
        },
        { passive: false },
      );

      // drag to scroll sideways
      let drag = false,
        sx = 0,
        sl = 0;
      on(scroller, 'pointerdown', (e) => {
        const pe = e as PointerEvent;
        if ((pe.target as Element).closest('.btn')) return;
        drag = true;
        moved = false;
        sx = pe.clientX;
        sl = scroller.scrollLeft;
        scroller.classList.add('grabbing');
        try {
          scroller.setPointerCapture(pe.pointerId);
        } catch {
          /* ignore */
        }
      });
      on(scroller, 'pointermove', (e) => {
        const pe = e as PointerEvent;
        if (!drag) return;
        const dx = pe.clientX - sx;
        if (Math.abs(dx) > 4) moved = true;
        scroller.scrollLeft = sl - dx;
      });
      const endDrag = () => {
        drag = false;
        scroller.classList.remove('grabbing');
      };
      on(scroller, 'pointerup', endDrag);
      on(scroller, 'pointercancel', endDrag);

      // Perf: while the strip is travelling, `.strip-moving` switches the step
      // cards' live backdrop-blur off (see process.css) — same trick as the
      // homepage panels. Back on ~160ms after the last scroll event.
      let moveT = 0;
      const markMoving = () => {
        stage.classList.add('strip-moving');
        window.clearTimeout(moveT);
        moveT = window.setTimeout(() => stage.classList.remove('strip-moving'), 160);
      };
      on(scroller, 'scroll', markMoving);

      // active-card highlight + progress bar
      const update = () => {
        const max = scroller.scrollWidth - scroller.clientWidth;
        if (prog) prog.style.width = (max > 0 ? (scroller.scrollLeft / max) * 100 : 0) + '%';
        const mid = scroller.scrollLeft + scroller.clientWidth / 2;
        let best = 0,
          bd = 1e9;
        steps.forEach((c, i) => {
          const cc = c.offsetLeft + c.offsetWidth / 2,
            d = Math.abs(cc - mid);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        steps.forEach((c, i) => c.classList.toggle('active', i === best));
      };
      on(scroller, 'scroll', update);
      const t = setTimeout(update, 60);
      cleanups.push(() => clearTimeout(t));
    }

    // click a step (not a drag) → open its detail
    steps.forEach((card) =>
      on(card, 'click', () => {
        if (moved) return;
        if (detail) openDetail(detail, card);
      }),
    );

    // detail back / close (+ Esc for keyboard parity, roadmap §9)
    if (detail) {
      const back = detail.querySelector<HTMLElement>('.back-pill');
      const close = detail.querySelector<HTMLElement>('.close-x');
      if (back) on(back, 'click', () => closeDetail(detail));
      if (close) on(close, 'click', () => closeDetail(detail));
      const onKey = (e: Event) => {
        if ((e as KeyboardEvent).key === 'Escape' && detail.classList.contains('open')) closeDetail(detail);
      };
      window.addEventListener('keydown', onKey);
      cleanups.push(() => window.removeEventListener('keydown', onKey));
    }
  });

  return {
    destroy() {
      detailCtrl?.destroy();
      detailCtrl = null;
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
