/* ============================================================
   Home camera engine — Direction E ("scrollable canvas").

   A faithful 1:1 port of extracted/homepage-e-v2.js (the `HOMEE`
   engine). A scroll-driven camera travels a fixed path through the
   seven home sections (Work → Services → Process → About → Trust →
   Pricing → Contact); About / Trust / Contact open nested pan-zoom
   canvases. The brand loader (orbiting tool logos + JAWAD→DESIGN
   word-swap) and the controls preloader play once on entry.

   What changed from the source (mechanical only — nothing visual):
   - It's a framework-agnostic factory `createHomeCamera(root, opts)`
     that operates on a root element instead of building itself into
     the prototype's tab/explorer shell. No tab system, no annotation
     bar, no A/B/C/D directions.
   - All the runtime <style> injection is gone; that CSS now lives,
     verbatim, in src/styles/home.css.
   - The continuous per-frame loops (inertia integrator, idle breath,
     panel/portrait tilt, idle orbit) are driven off gsap.ticker
     instead of bare requestAnimationFrame, so GSAP owns the clock
     (per the project's "GSAP is the motion engine" rule). The
     integrator MATH is untouched — same SMOOTH/lerp constants, same
     durations, same easings — so the feel is identical (the ticker
     fires at the same rAF cadence the original used). The discrete
     tweens (settle / glide / hero word-swap / settle-pose) keep their
     performance.now()-based easing, also stepped by the ticker.
   - The live-iframe page previews (the FS_CSS injection that screenshot
     other prototype HTML files) are NOT ported — that's the export
     scaffolding the migration explicitly drops. The greybox preview
     still blooms on settle; the About/Trust/Contact detail previews
     (pure scaled DOM, no iframe) are kept.
   - Section nav + scroll progress are pushed to the Zustand store via
     opts.onNav so the persistent bottom-nav curve fills against the
     real camera (replacing the prototype's shell-navbar subscription).
   - Route panels (Work/Services/Process/Pricing) navigate via
     opts.onRoute (the prototype left this to the shell).

   The `why` of the tricky bits is commented inline, as before.
   ============================================================ */
import { gsap } from '@/lib/gsap';

/* logo set for the hero orbit + rails — inlined from extracted/brand-logos.js,
   with asset paths rebased to /assets (Next serves public/ at the root). */
const LOGO_FILES: Record<string, string> = {
  figma: '/assets/logos/figma.webp',
  claude: '/assets/logos/claude.svg',
  claudecode: '/assets/logos/claudecode.svg',
  codex: '/assets/logos/codex.svg',
  chatgpt: '/assets/logos/chatgpt.svg',
  cursor: '/assets/logos/cursor.svg',
  blender: '/assets/logos/blender.svg',
  excalidraw: '/assets/logos/excalidraw.svg',
  framer: '/assets/logos/framer.svg',
  spline: '/assets/logos/spline.webp',
};
const LOGO_NAMES: Record<string, string> = {
  figma: 'Figma', claude: 'Claude', claudecode: 'Claude Code', codex: 'Codex',
  chatgpt: 'ChatGPT', cursor: 'Cursor', blender: 'Blender', excalidraw: 'Excalidraw',
  framer: 'Framer', spline: 'Spline',
};
const LOGOS: Record<string, string> = {};
Object.keys(LOGO_FILES).forEach((k) => {
  LOGOS[k] = `<img src="${LOGO_FILES[k]}" alt="${LOGO_NAMES[k]}" draggable="false">`;
});
const HERO_LOGOS = {
  left: ['figma', 'claude', 'claudecode', 'codex', 'chatgpt'],
  right: ['cursor', 'blender', 'excalidraw', 'framer', 'spline'],
};

type Pt = { x: number; y: number };
type Fx = HTMLElement & Record<string, any>; // panels carry __base/__rx/__ry/__dwellT/etc.
type Section = Record<string, any>;

export type HomeCameraOpts = {
  /** Continuous camera progress + active section → store (drives nav fill). */
  onNav?: (s: { frac: number; idx: number }) => void;
  /** A route panel was activated → navigate to /<route>. */
  onRoute?: (route: string) => void;
  /**
   * Land directly on this section when arriving from another page (a nav link
   * that travels to a homepage section). Skips the brand intro and glides the
   * camera straight to the section. Null/undefined = normal first-visit intro.
   */
  initialSection?: number | null;
};

export type HomeCameraController = {
  destroy: () => void;
  gotoPanel: (i: number) => void;
  /** Travel to a section even if the brand loader is still up (drops it first). */
  gotoSection: (i: number) => void;
  replayIntro: () => void;
};

export function createHomeCamera(root: HTMLElement, opts: HomeCameraOpts = {}): HomeCameraController {
  /* ---------- sections (each a panel on the world) ---------- */
  const bars = (arr: string[]) => `<div class="e-bars">${arr.map((w) => `<div class="bar" style="width:${w}"></div>`).join('')}</div>`;
  const cta = (txt: string, cls = '') => `<span class="e-cta ${cls}">${txt}</span>`;
  const img = (label?: string, style?: string) => `<div class="e-img" style="${style || ''}">${label ? `<span class="e-imlbl">${label}</span>` : ''}</div>`;
  const ghost = (label?: string, style?: string) => `<div class="e-ghost" style="${style || ''}">+ ${label}</div>`;
  const fact = (k: string, v: string) => `<div class="e-fact"><span class="e-tag">${k}</span><span class="e-factv">${v}</span></div>`;
  const pv = (label: string, inner: string) => `<div class="e-prevtag">preview · ${label}</div><div class="e-prevframe">${inner}</div>`;

  const SECTIONS: Section[] = [
    { id: 'work', ix: '01', tag: 'WORK', title: 'my designs', w: 900, h: 340, route: 'work', pvZoom: 1.28, say: 'open weld ↗', dwellMs: 900,
      body: `<div class="e-work-img"><img src="/assets/weld/cards.webp" alt="weld — this is who'll be here" draggable="false"></div>
       <span class="e-tag"><b class="e-bb-num" data-count="200">200</b> signups · $0 paid · built solo</span>`,
      pvSrc: 'Jawad Work Wireframes.html', pvDir: 'D',
      prev: pv('/work', `<div class="e-pv-row">${img('weld', 'flex:2;height:96px;')}${ghost('soon', 'flex:1;height:96px;')}</div><div class="e-pv-row">${ghost('soon', 'flex:1;height:52px;')}${ghost('soon', 'flex:1;height:52px;')}</div>`),
      note: ['Work', 'my designs — weld image; tilts + glares like the others, blooms the live /work preview on dwell.'] },
    { id: 'services', ix: '02', tag: 'SERVICES', title: '', w: 620, h: 300, route: 'services', say: 'open services ↗', dwellMs: 250, merge: true,
      body: `<div class="e-svc">
       <div class="e-svc-cluster" aria-hidden="true">
         <span class="e-svc-sticker s1">design</span>
         <span class="e-svc-sticker s2">build</span>
         <span class="e-svc-sticker s3">ship</span>
       </div>
       <div class="e-svc-merged">
         <span class="e-svc-stmt">I design it, build it, ship it.</span>
       </div>
     </div>`,
      pvSrc: 'Jawad Services Wireframes.html', pvDir: 'D',
      prev: pv('/services', `<div class="e-pv-row">${ghost('design', 'flex:1;height:54px;')}${ghost('build', 'flex:1;height:54px;')}</div><div class="e-pv-row">${ghost('ship', 'flex:1;height:46px;')}${ghost('care', 'flex:1;height:46px;')}</div>`),
      note: ['Services', 'Sticker-merge — design/build/ship stickers merge into one statement on dwell, then the /services preview blooms.'] },
    { id: 'process', ix: '03', tag: 'PROCESS', title: '', w: 1480, h: 250, route: 'process', say: 'open process ↗', dwellMs: 260, ribbon: true,
      body: (function () {
        const P = [['Brief', 'we agree the goal before anything starts'], ['Direction', 'you sign off the look first'], ['Build', 'the real thing in your hands early'], ['Polish', 'the details that make it feel right'], ['Ship', 'it goes live'], ['Maintain', 'a CMS, so you never wait on me for a change']];
        const N = P.length, W = 2000, cy = 120, amp = 16, OFF = 108, ext = 150;
        const nd = P.map((p, i) => ({ x: ((i + 0.5) / N * W), y: cy + amp * Math.sin((i / (N - 1)) * 1.2 * Math.PI) }));
        const cr = (pts: Pt[]) => { let s = ''; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1]; s += ' C ' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + ' ' + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1); } return s; };
        const d = 'M ' + nd[0].x.toFixed(1) + ' ' + nd[0].y.toFixed(1) + cr(nd);
        const tp = nd.map((p) => ({ x: p.x, y: p.y - OFF })), bp = nd.map((p) => ({ x: p.x, y: p.y + OFF }));
        const L = (nd[0].x - ext), R = (nd[N - 1].x + ext), rr = 22;
        const border = 'M ' + nd[0].x.toFixed(1) + ' ' + tp[0].y.toFixed(1) + cr(tp)
          + ' L ' + (R - rr).toFixed(1) + ' ' + tp[N - 1].y.toFixed(1) + ' Q ' + R.toFixed(1) + ' ' + tp[N - 1].y.toFixed(1) + ' ' + R.toFixed(1) + ' ' + (tp[N - 1].y + rr).toFixed(1)
          + ' L ' + R.toFixed(1) + ' ' + (bp[N - 1].y - rr).toFixed(1) + ' Q ' + R.toFixed(1) + ' ' + bp[N - 1].y.toFixed(1) + ' ' + (R - rr).toFixed(1) + ' ' + bp[N - 1].y.toFixed(1)
          + ' L ' + nd[N - 1].x.toFixed(1) + ' ' + bp[N - 1].y.toFixed(1) + cr(bp.slice().reverse())
          + ' L ' + (L + rr).toFixed(1) + ' ' + bp[0].y.toFixed(1) + ' Q ' + L.toFixed(1) + ' ' + bp[0].y.toFixed(1) + ' ' + L.toFixed(1) + ' ' + (bp[0].y - rr).toFixed(1)
          + ' L ' + L.toFixed(1) + ' ' + (tp[0].y + rr).toFixed(1) + ' Q ' + L.toFixed(1) + ' ' + tp[0].y.toFixed(1) + ' ' + (L + rr).toFixed(1) + ' ' + tp[0].y.toFixed(1)
          + ' L ' + nd[0].x.toFixed(1) + ' ' + tp[0].y.toFixed(1) + ' Z';
        const steps = P.map((p, i) => '<div class="e-rstep" data-i="' + i + '" style="left:' + ((i + 0.5) / N * 100).toFixed(2) + '%;--cy:' + nd[i].y.toFixed(1) + 'px"><span class="e-rdot">' + (i + 1) + '</span><span class="e-rlabel">' + p[0] + '</span><span class="e-rline">' + p[1] + '</span></div>').join('');
        return '<div class="e-ribbon"><svg class="e-ribbon-line" viewBox="0 0 ' + W + ' 260" preserveAspectRatio="none" aria-hidden="true"><path class="e-rb-border" d="' + border + '"></path><path class="e-rb-path" d="' + d + '"></path></svg><div class="e-ribbon-steps">' + steps + '</div></div><span class="e-tag e-ribbon-tag">the full story</span>';
      })(),
      pvSrc: 'Jawad Process Wireframes.html', pvDir: 'D',
      prev: pv('/process', `<div class="e-pv-row">${[1, 2, 3, 4, 5, 6].map(() => ghost('', 'flex:1;height:46px;')).join('')}</div>${bars(['100%', '72%'])}`),
      note: ['Process', 'The ribbon — filled low-wide band; 6 phases reveal left→right scrubbed to camera; tilts+glares; opens /process.'] },
    { id: 'about', ix: '04', tag: 'ABOUT', title: 'just me', w: 420, h: 300, open: 'about', cls: 'e-portal', say: 'open about ↗',
      body: `<div class="e-portal-frame"><div class="e-portal-ring"><img class="e-portal-face" src="/assets/jawad-portrait.webp" alt="Jawad" draggable="false"><span class="e-portal-glare"></span></div></div>
       <div class="e-portal-facts"><div class="e-portal-chip">based in<b>london</b></div><div class="e-portal-chip">age<b>15</b></div><div class="e-portal-chip">builds<b>good stuff</b></div></div>`,
      pvDetail: 'about',
      prev: pv('/about', `<div class="e-pv-row" style="align-items:center;"><div class="e-img e-portrait" style="width:72px;height:72px;"></div><div style="flex:1;">${bars(['100%', '80%', '62%'])}</div></div><div class="e-pv-row">${ghost('who', 'flex:1;height:46px;')}${ghost('how I work', 'flex:1;height:46px;')}</div>`),
      note: ['About', 'just me — a framed portrait in a frosted panel with three frosted fact chips; lifts, tilts, glares and previews /about like every other panel. Click zooms into the portrait (match-cut) to the orbit canvas.'] },
    { id: 'trust', ix: '05', tag: 'TRUST', title: '', w: 520, h: 300, open: 'trust', cls: 'e-poster', say: 'open trust ↗',
      body: `<div class="e-poster-sheet"><div class="e-quote" data-matchcut><span class="e-qline q1">great skill</span><span class="e-qline q2">great design</span><span class="e-qline q3">great speed</span></div></div>
       <div class="e-attrib">Joel Jeon · founder, weld</div>`,
      pvDetail: 'trust',
      prev: pv('/trust', `<div class="e-pv-row">${ghost('“ great skill · great design · great speed', 'flex:1;height:58px;')}</div><div class="e-pv-row">${ghost('the full testimonial', 'flex:2;height:46px;')}${ghost('200 · $0', 'flex:1;height:46px;')}</div>`),
      note: ['Trust', 'A torn pull-quote poster — great skill / great design / great speed, leaning, with Joel Jeon · founder, weld straight beneath. Click zooms in (match-cut on the quote) to the proof behind the line.'] },
    { id: 'pricing', ix: '06', tag: 'PRICING', title: '3 packages.', w: 720, h: 360, route: 'pricing', cls: 'e-podiumpanel', say: 'open pricing ↗', dwellMs: 250,
      body: `<div class="e-podium-wrap">
       <div class="e-pod e-pod1"><div class="e-pod-h"><b>The Single</b><span>from $500</span></div><div class="e-pod-line">A focused site, live in a week.</div><ul class="e-pod-list"><li>up to 3 pages</li><li>1 revision</li><li>30 days care</li></ul></div>
       <div class="e-pod e-pod2"><div class="e-pod-h"><b>The Edition</b><span>from $1,200</span></div><div class="e-pod-line">Room to grow, a look that travels.</div><ul class="e-pod-list"><li>up to 5 pages</li><li>CMS + source files</li><li>2 revisions</li></ul></div>
       <div class="e-pod e-pod3"><div class="e-pod-h"><b>The Commission</b><span>from $3,000</span></div><div class="e-pod-line">A flagship that has to land.</div><ul class="e-pod-list"><li>full multi-page site</li><li>signature interaction</li><li>full brand system</li></ul></div>
     </div>
     <span class="e-tag">prices are where the conversation starts</span>`,
      pvSrc: 'Jawad Pricing Wireframes.html', pvDir: 'D',
      prev: pv('/pricing', `<div class="e-pv-row" style="align-items:stretch;">${ghost('The Single · $500', 'flex:1;height:88px;')}${ghost('The Edition · $1,200', 'flex:1.12;height:100px;')}${ghost('The Commission · $3,000', 'flex:1;height:88px;')}</div><div class="e-pv-row">${bars(['100%', '70%'])}</div>`),
      note: ['Pricing', 'Three tiers as one rising podium — Single, Edition, Commission — ascending with price; blooms the live /pricing preview on dwell; opens /pricing.'] },
    { id: 'contact', ix: '06', tag: 'CONTACT', title: '', w: 1040, h: 600, open: 'contact', cls: 'e-slab e-on-dark', say: 'open contact ↗', dwellMs: 250,
      body: `<div class="e-slab-head" data-matchcut>Your move.</div>
       <div class="e-slab-base"><a href="mailto:hijawadjalal@gmail.com">hijawadjalal@gmail.com</a></div>`,
      pvDetail: 'contact',
      note: ['Contact', 'The dark slab — Your move., one CTA to /contact, email baseline. No bloom preview, so the slab stays full and centred. Click match-cuts into the nested enquiry form. Terminal panel: advancing loops back to the hero.'] },
  ];

  /* ---------- path layouts ---------- */
  function layout(path: string): Pt[] {
    if (path === 'vertical') return SECTIONS.map((s, i) => ({ x: 0, y: i * 440 }));
    if (path === 'horizontal') {
      const wave = [0, -35, -35, 0, -35, 0, 35];
      return SECTIONS.map((s, i) => ({ x: i * 880, y: wave[i] !== undefined ? wave[i] : 0 }));
    }
    const X = 236, DY = 480;
    const xs = [0, -X, X, 0, -X, 0, 0];
    return SECTIONS.map((s, i) => ({ x: xs[i] !== undefined ? xs[i] : (i % 2 ? X : -X), y: i * DY }));
  }

  /* ---------- shell refs (rendered by HomeCamera.tsx) ---------- */
  const stage = root.querySelector('.e-stage') as HTMLElement;
  const viewport = root.querySelector('.e-viewport') as HTMLElement;
  viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Homepage tour — use arrow keys to move between sections');
  const track = root.querySelector('.e-track') as HTMLElement;
  const world = root.querySelector('.e-world') as HTMLElement;
  const wires = root.querySelector('.e-wires') as SVGSVGElement;
  const minimap = root.querySelector('.e-minimap') as HTMLElement;
  const navMap = root.querySelector('.e-nav-map') as HTMLElement;
  const progressBar = root.querySelector('.e-progress') as HTMLElement;
  const detail = root.querySelector('.e-detail') as HTMLElement;
  const detailBody = root.querySelector('.e-detail-body') as HTMLElement;

  /* ---------- state ---------- */
  let PATH = 'horizontal', pts: Pt[] = [], scale = 1.0, built = false, pgSuspended = false;
  let navStyle = 'spine', navPts: Pt[] | null = null, navTravEl: SVGPathElement | null = null, navTravLen = 0, navCometEl: SVGCircleElement | null = null, navLabelEl: HTMLElement | null = null;
  let introActive = false, introPlayed = false;
  let navLastFrac = 0, navLastIdx = 0;
  let travPath: SVGPathElement | null = null, travLen = 0, panelLen: number[] = [];
  const EASE = 'subtle';
  const FINE = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer:fine)').matches);
  const mqCoarse = window.matchMedia('(pointer:coarse)');
  // 768px matches STACK_MQ (motion.ts) so the home camera falls back to native
  // scroll at the *same* width as every other route — no 760/768 dead zone.
  const mqNarrow = window.matchMedia('(max-width: 768px)');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function spatial() { return FINE && !mqCoarse.matches && !mqNarrow.matches; }
  const SETTLE_SCALE = 1.02;
  // per-panel depth (z ~0.6 far → 1.4 near), index-matched to SECTIONS
  const DEPTH = [0.8, 1.12, 1.16, 0.78, 0.84, 1.18, 1.34];
  let settled = false, settledIdx = -1;
  let blackout: HTMLElement | null = null, loaderEl: HTMLElement | null = null, loaderWheel: ((e: any) => void) | null = null, heroHP = 0, heroResize: (() => void) | null = null;
  let heroEndAt = 0, idleSpin = 0, heroDir = 1, heroAnimId = 0, heroAnimating = false;

  /* ---------- lifecycle bookkeeping (so destroy() leaves nothing running) ---------- */
  const tickers = new Set<(...a: any[]) => void>();
  const timers = new Set<number>();
  const cleanups: Array<() => void> = [];
  function addTick(fn: (...a: any[]) => void) { if (!tickers.has(fn)) { tickers.add(fn); gsap.ticker.add(fn); } }
  function removeTick(fn: (...a: any[]) => void) { if (tickers.has(fn)) { tickers.delete(fn); gsap.ticker.remove(fn); } }
  function T(fn: () => void, ms: number) { const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function on<K extends string>(t: EventTarget, ev: K, fn: (e: any) => void, o?: AddEventListenerOptions | boolean) {
    t.addEventListener(ev, fn as EventListener, o); cleanups.push(() => t.removeEventListener(ev, fn as EventListener, o));
  }

  /* find arc-length along the spine at each panel point, so the camera rests dead-centre */
  function computePanelLens() {
    panelLen = [];
    const n = pts.length;
    if (!travPath || travLen <= 0) { for (let i = 0; i < n; i++) panelLen.push(i / Math.max(1, n - 1) * travLen); return; }
    const N = 700, samples: { l: number; x: number; y: number }[] = [];
    for (let s = 0; s <= N; s++) { const l = s / N * travLen; const pt = travPath.getPointAtLength(l); samples.push({ l, x: pt.x, y: pt.y }); }
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (const sm of samples) { const dx = sm.x - pts[i].x, dy = sm.y - pts[i].y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = sm.l; } }
      panelLen.push(best);
    }
    panelLen[0] = 0; panelLen[n - 1] = travLen;
  }

  function drawPathArrows() { wires.querySelectorAll('.e-arrow').forEach((a) => a.remove()); }

  /* per-segment easing — kept close to linear so camera velocity stays steady */
  function segEase(f: number, mode: string) {
    const ss = (x: number) => x * x * (3 - 2 * x);
    const sss = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
    if (mode === 'subtle') return f + (ss(f) - f) * 0.18;
    if (mode === 'strong') return sss(f);
    return f + (ss(f) - f) * 0.4;
  }
  /* Catmull-Rom → cubic bezier, smooth curved spine through the panel points */
  function splineD(P: Pt[]) {
    if (P.length < 2) return '';
    let d = `M ${P[0].x} ${P[0].y}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function panelHTML(s: Section, i: number) {
    const openA = s.open ? ` data-open="${s.open}" tabindex="0" role="button" aria-label="Open ${s.tag}"` : '';
    const routeA = s.route ? ` data-route="${s.route}" tabindex="0" role="button" aria-label="Open ${s.tag} page"` : '';
    const pvA = s.pvSrc ? ` data-pvsrc="${s.pvSrc}" data-pvdir="${s.pvDir || 'D'}"` : (s.pvDetail ? ` data-pvdetail="${s.pvDetail}"` : '');
    const sayA = s.say ? ` data-cursor-say="${s.say}"` : '';
    const dwellA = s.dwellMs ? ` data-dwell="${s.dwellMs}"` : '';
    const pvzA = s.pvZoom ? ` data-pvzoom="${s.pvZoom}"` : '';
    const mergeA = s.merge ? ' data-merge="1"' : '';
    return `<div class="e-panel${(s.open || s.route) ? ' openable' : ''}${s.billboard ? ' e-billboard' : ''}${s.ribbon ? ' e-ribbon-panel' : ''}${s.bare ? ' bare' : ''}${s.cls ? ' ' + s.cls : ''}" data-i="${i}"${openA}${routeA}${pvA}${sayA}${dwellA}${pvzA}${mergeA} style="left:0;top:0;width:${s.w}px;min-height:${s.h}px;">
      <div class="e-title${s.titleCls ? ' ' + s.titleCls : (s.xl ? ' xl' : '')}">${s.title}</div>${s.body}
      ${s.prev ? `<div class="e-preview">${s.prev}</div>` : ''}
      ${s.open ? '<span class="e-open-cur">Enter ⤢</span>' : ''}</div>`;
  }
  function build() {
    // idempotent: clear any artifacts a prior mount appended (React strict-mode
    // double-invokes effects in dev; this keeps a remount from duplicating panels).
    world.querySelectorAll(':scope > .e-panel').forEach((p) => p.remove());
    stage.querySelectorAll('.e-blackout,.e-loader,.e-preload').forEach((n) => n.remove());
    blackout = null; loaderEl = null; preEl = null;
    SECTIONS.forEach((s, i) => {
      const d = document.createElement('div'); d.innerHTML = panelHTML(s, i).trim();
      const pe = d.firstChild as HTMLElement; if (!mqReduce.matches) pe.classList.add('e-reveal-pending');
      world.appendChild(pe);
    });
    built = true;
    if (!blackout) { blackout = document.createElement('div'); blackout.className = 'e-blackout'; stage.insertBefore(blackout, stage.firstChild); }
    if (!loaderEl) buildLoader();
    placePanels();
    initPanelTilt();
    addTick(idleBreath); // living-canvas idle drift
    maybeIntro();
    buildPreloader();
  }

  /* ---------- controls preloader (once per session, skippable) ---------- */
  let preEl: HTMLElement | null = null;
  function buildPreloader() {
    if (preEl) return;
    let replayEvery = true;
    try { if (localStorage.getItem('jawad-pre-replay') === '0') replayEvery = false; } catch (_) { /* ignore */ }
    if (!replayEvery) { try { if (sessionStorage.getItem('jawad-preloader') === '1') return; } catch (_) { /* ignore */ } }
    const mobile = !spatial();
    preEl = document.createElement('div'); preEl.className = 'e-preload'; preEl.id = 'e-preload';
    preEl.setAttribute('role', 'button'); preEl.tabIndex = 0;
    preEl.setAttribute('aria-label', mobile ? 'Intro — scroll to enter' : 'Intro — left click to go backward, right click to go forward');
    if (mobile) {
      preEl.innerHTML = '<div class="e-preload-grid"></div>'
        + '<div class="e-pl-stage"><div class="e-pl-hint">scroll<span class="ar">↓</span></div></div>';
    } else {
      preEl.innerHTML = '<div class="e-preload-grid"></div>'
        + '<div class="e-pl-stage">'
        + '<svg class="e-pl-mouse" id="e-pl-mouse" viewBox="0 0 44 64" aria-hidden="true">'
        + '<path class="pm-btn pm-left" d="M22 3 A19 19 0 0 0 3 22 L3 26 L22 26 Z"></path>'
        + '<path class="pm-btn pm-right" d="M22 3 A19 19 0 0 1 41 22 L41 26 L22 26 Z"></path>'
        + '<rect class="pm-body" x="3" y="3" width="38" height="58" rx="19"></rect>'
        + '<line class="pm-div" x1="22" y1="3" x2="22" y2="26"></line>'
        + '<line class="pm-div" x1="3" y1="26" x2="41" y2="26"></line>'
        + '</svg>'
        + '<div class="e-pl-lines">'
        + '<div class="e-pl-line e-pl-l1"><span class="t1"></span><span class="e-pl-caret"></span></div>'
        + '<div class="e-pl-line e-pl-l2"><span class="t2"></span></div>'
        + '</div>'
        + '</div>';
    }
    stage.appendChild(preEl);

    let alive = true; const localTimers: number[] = [];
    const PT = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { if (alive || fn === finish) fn(); }, ms); localTimers.push(id); timers.add(id); return id; };
    function finish() { if (preEl) { preEl.remove(); preEl = null; } }
    function done() { if (!alive) return; alive = false; localTimers.forEach(clearTimeout); preEl!.classList.add('gone'); T(finish, 600); }
    on(preEl, 'pointerdown', done);
    on(preEl, 'wheel', done, { passive: true });
    on(preEl, 'touchstart', done, { passive: true });
    on(preEl, 'keydown', () => { done(); });
    try { sessionStorage.setItem('jawad-preloader', '1'); } catch (_) { /* ignore */ }

    if (mobile) { PT(done, 1700); return; }

    const mouse = preEl.querySelector('#e-pl-mouse') as HTMLElement | null;
    const t1 = preEl.querySelector('.t1') as HTMLElement, t2 = preEl.querySelector('.t2') as HTMLElement;
    const L1 = 'left click to go backward, right click to go forward';
    const L2 = 'on mobile? scroll';
    const left = mouse && mouse.querySelector('.pm-left'), right = mouse && mouse.querySelector('.pm-right');
    const flash = (el: Element | null) => { if (!el || !alive) return; el.classList.add('on'); PT(() => el.classList.remove('on'), 240); };
    const SP = 29;
    function type(el: HTMLElement, text: string, i: number, cb?: () => void) {
      if (!alive) return; el.textContent = text.slice(0, i);
      if (i === ('left click').length) flash(left);
      if (i === ('left click to go backward, right click').length) flash(right);
      if (i < text.length) PT(() => type(el, text, i + 1, cb), SP);
      else if (cb) PT(cb, 320);
    }
    PT(() => { if (mouse) mouse.classList.add('in'); }, 120);
    PT(() => type(t1, L1, 0, () => {
      const c1 = preEl && preEl.querySelector('.e-pl-l1 .e-pl-caret'); if (c1) c1.remove();
      const c2 = document.createElement('span'); c2.className = 'e-pl-caret';
      if (t2 && t2.parentNode) t2.parentNode.appendChild(c2);
      PT(() => type(t2, L2, 0, () => PT(done, 700)), 260);
    }), 440);
  }

  /* ---------- LOADER — brand landing ---------- */
  function buildLoader() {
    loaderEl = document.createElement('div');
    loaderEl.className = 'e-loader'; loaderEl.id = 'e-loader';
    loaderEl.setAttribute('role', 'button'); loaderEl.tabIndex = 0;
    loaderEl.setAttribute('aria-label', 'Enter — open the canvas');
    const lg = (key: string, side: string, j: number) => {
      const svg = LOGOS[key] || '';
      const nm = LOGO_NAMES[key] || key;
      return '<div class="e-hlogo e-hlogo--' + side + '" data-side="' + side + '" data-j="' + j + '" style="--exp:0;--d:' + ((j * 0.5) + (side === 'right' ? 0.25 : 0)).toFixed(2) + 's">'
        + '<span class="e-hlogo-ic">' + svg + '</span><span class="e-hlogo-name">' + nm + '</span></div>';
    };
    const logos = HERO_LOGOS.left.map((k, j) => lg(k, 'left', j)).join('') + HERO_LOGOS.right.map((k, j) => lg(k, 'right', j)).join('');
    loaderEl.innerHTML = '<div class="e-loader-grid" aria-hidden="true"></div>'
      + '<div class="e-hero2" id="e-hero2">'
      + '<div class="e-hlogos" id="e-hlogos">' + logos + '</div>'
      + '<div class="e-w1 e-wsticker" id="e-w1"><b>JAWAD</b></div>'
      + '<div class="e-w1 e-wsticker" id="e-w1b" style="opacity:0"><b>DESIGN</b></div>'
      + '<div class="e-im" id="e-im">hi, i\'m</div>'
      + '<div class="e-im" id="e-im2" style="opacity:0">i also</div>'
      + '<div class="e-hero-ring e-sticker" id="e-ring"><img src="/assets/jawad-hero.webp" alt="Jawad" draggable="false"><span class="e-ring-glare"></span></div>'
      + '</div>'
      + '<span class="e-loader-cue" id="e-cue">scroll</span>';
    stage.appendChild(loaderEl);
    setupTilt();
    const act = (e?: Event) => { if (e && (e as Event).preventDefault) e.preventDefault(); if (heroHP > 0.01) animateHeroTo(0); }; // left-click = back
    on(loaderEl, 'click', act);
    on(loaderEl, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') act(e); });
    on(loaderEl, 'contextmenu', (e: Event) => { if (e && e.preventDefault) e.preventDefault(); if (heroHP < 0.99) animateHeroTo(1); else dismissLoader(); });
    heroResize = () => { if (loaderEl && loaderEl.style.display !== 'none') renderHero(heroHP); };
    on(window, 'resize', heroResize);
  }
  const _cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  /* portrait: centred; tilts in 3D toward the cursor, soft moving glare; lifts in state 2 */
  let tiltRX = 0, tiltRY = 0, tiltTX = 0, tiltTY = 0, tiltTicking = false;
  function applyRing() {
    const ring = loaderEl && loaderEl.querySelector('#e-ring') as HTMLElement | null; if (!ring) return;
    const tC = _cl((heroHP - 0.64) / 0.36, 0, 1);
    const lift = tC * -20, sc = 1 + tC * 0.05;
    ring.style.transform = 'translate(-50%,-50%) translateY(' + lift.toFixed(1) + 'px) perspective(950px) '
      + 'rotateX(' + tiltRX.toFixed(2) + 'deg) rotateY(' + tiltRY.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
    const glare = ring.querySelector('.e-ring-glare') as HTMLElement | null;
    if (glare) {
      glare.style.setProperty('--gx', (46 - tiltRY * 1.7).toFixed(1) + '%');
      glare.style.setProperty('--gy', (32 + tiltRX * 1.7).toFixed(1) + '%');
    }
  }
  function tiltLoop() {
    tiltRX += (tiltTX - tiltRX) * 0.12; tiltRY += (tiltTY - tiltRY) * 0.12;
    applyRing();
    if (!(Math.abs(tiltTX - tiltRX) > 0.04 || Math.abs(tiltTY - tiltRY) > 0.04)) { tiltRX = tiltTX; tiltRY = tiltTY; applyRing(); tiltTicking = false; removeTick(tiltLoop); }
  }
  function kickTilt() { if (!tiltTicking) { tiltTicking = true; addTick(tiltLoop); } }
  function setupTilt() {
    const MAX = 15;
    on(loaderEl!, 'pointermove', (e: PointerEvent) => {
      const ring = loaderEl!.querySelector('#e-ring') as HTMLElement | null; if (!ring) return;
      const r = ring.getBoundingClientRect(); const rx = r.left + r.width / 2, ry = r.top + r.height / 2;
      const dx = _cl((e.clientX - rx) / (r.width / 2), -1, 1), dy = _cl((e.clientY - ry) / (r.height / 2), -1, 1);
      tiltTY = dx * MAX; tiltTX = dy * -MAX; kickTilt();
    });
    on(loaderEl!, 'pointerleave', () => { tiltTX = 0; tiltTY = 0; kickTilt(); });
  }
  function renderHero(hp: number) {
    if (!loaderEl) return;
    const W = loaderEl.clientWidth || 1200, Hh = loaderEl.clientHeight || 700, cx = W / 2, cy = Hh / 2;
    const ring = loaderEl.querySelector('#e-ring') as HTMLElement | null; if (!ring) return;
    const pr = (ring.offsetWidth || 340) / 2;
    const tC = _cl((hp - 0.58) / 0.42, 0, 1);
    const eC = tC < 0.5 ? 2 * tC * tC : 1 - Math.pow(-2 * tC + 2, 2) / 2;
    const lift = tC * -20;
    const eiC = (x: number) => x * x * x;
    const backO = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
    const easeO = (x: number) => 1 - (1 - x) * (1 - x);
    const enterEase = heroDir < 0 ? easeO : backO;
    const outP = _cl(tC / 0.42, 0, 1), inP = _cl((tC - 0.40) / 0.60, 0, 1);
    const eX = eiC(outP), bN = inP > 0 ? enterEase(inP) : 0;
    const w1 = loaderEl.querySelector('#e-w1') as HTMLElement, w1b = loaderEl.querySelector('#e-w1b') as HTMLElement;
    if (w1) { w1.style.opacity = (1 - eX).toFixed(3); w1.style.transform = 'translate(-50%,-50%) translateY(' + (-30 * eX).toFixed(1) + 'px) scale(' + (1 - 0.5 * eX).toFixed(3) + ')'; }
    if (w1b) { w1b.style.opacity = _cl(inP * 1.5, 0, 1).toFixed(3); w1b.style.transform = 'translate(-50%,-50%) scale(' + (0.32 + 0.68 * bN).toFixed(3) + ')'; }
    const im = loaderEl.querySelector('#e-im') as HTMLElement, im2 = loaderEl.querySelector('#e-im2') as HTMLElement;
    if (im) im.style.opacity = (1 - eX).toFixed(3);
    if (im2) { im2.style.opacity = _cl(inP * 1.5, 0, 1).toFixed(3); im2.style.transform = 'translateX(-50%) scale(' + (0.42 + 0.58 * bN).toFixed(3) + ')'; }
    applyRing();
    const Rarc = Math.min(pr + 94, (Hh * 0.5 - 30) / 0.92), Ro = Rarc + 8;
    const rightBase = [-72, -36, 0, 36, 72], leftBase = [252, 216, 180, 144, 108];
    const rightArc = [-64, -27, 0, 27, 64], leftArc = [244, 207, 180, 153, 116];
    const emergeP = _cl((hp - 0.03) / 0.25, 0, 1);
    const emE = 1 - Math.pow(1 - emergeP, 3);
    const orbT = _cl((hp - 0.05) / 0.59, 0, 1);
    const orbRot = orbT * 2.0 * Math.PI;
    const spin = idleSpin;
    const D2R = Math.PI / 180;
    loaderEl.querySelectorAll('.e-hlogo').forEach((elx) => {
      const el = elx as HTMLElement;
      const side = el.dataset.side, j = +el.dataset.j!;
      const baseA = ((side === 'left' ? leftBase[j] : rightBase[j]) || 0) * D2R;
      const arcA = ((side === 'left' ? leftArc[j] : rightArc[j]) || 0) * D2R;
      const spinAng = baseA + orbRot + spin;
      const ang = spinAng * (1 - eC) + (arcA + 2 * Math.PI) * eC;
      const R = (Ro * emE) * (1 - eC) + Rarc * eC;
      const x = cx + R * Math.cos(ang), y = cy + lift + R * Math.sin(ang);
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      el.style.opacity = '1';
      el.style.setProperty('--sc', (0.7 + 0.3 * emE).toFixed(3));
    });
  }
  function animateHeroTo(target: number) {
    heroDir = target < heroHP ? -1 : 1;
    const myId = ++heroAnimId; heroAnimating = true;
    const start = heroHP, t0 = performance.now(), dur = 1950, eo = (x: number) => 1 - Math.pow(1 - x, 3);
    const step = () => {
      if (myId !== heroAnimId) { removeTick(step); return; }
      const x = Math.min(1, (performance.now() - t0) / dur);
      heroHP = start + (target - start) * eo(x); renderHero(heroHP); updateCue();
      if (x >= 1) { heroHP = target; renderHero(heroHP); updateCue(); if (myId === heroAnimId) heroAnimating = false; removeTick(step); }
    };
    addTick(step);
  }
  function updateCue() { const c = loaderEl && loaderEl.querySelector('#e-cue'); if (c) c.textContent = heroHP > 0.985 ? 'scroll again to enter ↓' : 'scroll ↓'; }
  /* slow perpetual orbit once state 2 is reached; dt-based so it's frame-rate independent */
  let idleSpinTicking = false, idleSpinLast = 0;
  function startIdleSpin() {
    if (idleSpinTicking) return;
    idleSpinTicking = true; idleSpinLast = performance.now();
    const tick = () => {
      if (!loaderEl || loaderEl.classList.contains('gone') || loaderEl.style.display === 'none') { stopIdleSpin(); return; }
      const now = performance.now(), dt = Math.min(0.1, (now - idleSpinLast) / 1000); idleSpinLast = now;
      if (!heroAnimating) { idleSpin += dt * 0.13; if (heroHP > 0.06) renderHero(heroHP); }
    };
    (startIdleSpin as any)._tick = tick; addTick(tick);
  }
  function stopIdleSpin() { if (idleSpinTicking) { idleSpinTicking = false; const tick = (startIdleSpin as any)._tick; if (tick) removeTick(tick); } }
  /* time-based tween, stepped by the ticker */
  function introTween(dur: number, onUpdate: (x: number) => void, onDone?: () => void) {
    const t0 = performance.now();
    const tick = () => {
      if (!introActive) { removeTick(tick); return; }
      const x = Math.min(1, (performance.now() - t0) / dur);
      onUpdate(x);
      if (x >= 1) { removeTick(tick); if (onDone) onDone(); }
    };
    addTick(tick);
  }
  function maybeIntro() {
    if (introPlayed) return;
    if (!built || !loaderEl || !spatial()) return;
    introPlayed = true;
    showLoader();
  }
  function showLoader() {
    if (!loaderEl) return;
    introActive = true;
    loaderEl.style.display = 'flex';
    loaderEl.classList.remove('gone');
    viewport.style.overflow = 'hidden';
    heroHP = 0; renderHero(0); updateCue();
    startIdleSpin();
    if (!loaderWheel) {
      let ty = 0;
      loaderWheel = (e: any) => {
        if (e && e.cancelable) e.preventDefault();
        let dy = e.deltaY || 0;
        if (e.type === 'touchmove' && e.touches && e.touches[0]) { dy = ty - e.touches[0].clientY; ty = e.touches[0].clientY; }
        const prev = heroHP;
        heroAnimId++; heroAnimating = false;
        heroDir = dy < 0 ? -1 : 1;
        heroHP = Math.max(0, Math.min(1, heroHP + dy * 0.00098));
        renderHero(heroHP); updateCue();
        if (heroHP >= 1 && prev < 1) { heroEndAt = performance.now(); startIdleSpin(); }
        else if (heroHP >= 1 && dy > 0 && heroEndAt && (performance.now() - heroEndAt) > 500) { dismissLoader(); }
      };
      on(loaderEl, 'wheel', loaderWheel, { passive: false });
      on(loaderEl, 'touchstart', (e: TouchEvent) => { if (e.touches && e.touches[0]) ty = e.touches[0].clientY; }, { passive: true });
      on(loaderEl, 'touchmove', loaderWheel, { passive: false });
    }
    const hero2 = loaderEl.querySelector('#e-hero2') as HTMLElement | null, grid = loaderEl.querySelector('.e-loader-grid') as HTMLElement | null, cue = loaderEl.querySelector('#e-cue') as HTMLElement | null;
    const back = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const eo = (x: number) => 1 - Math.pow(1 - x, 3);
    if (grid) grid.style.opacity = '0';
    if (cue) cue.style.opacity = '0';
    if (hero2) { hero2.style.opacity = '0'; hero2.style.transform = 'scale(.86)'; }
    introTween(540, (x) => { if (hero2) { hero2.style.opacity = Math.min(1, x * 1.5).toFixed(3); hero2.style.transform = 'scale(' + back(x).toFixed(3) + ')'; } });
    T(() => { if (!introActive) return; introTween(460, (x) => { const v = eo(x).toFixed(3); if (grid) grid.style.opacity = v; if (cue) cue.style.opacity = v; }); }, 340);
  }
  function dismissLoader() {
    if (!loaderEl) return;
    introActive = false;
    stopIdleSpin();
    if (loaderWheel) { loaderEl.removeEventListener('wheel', loaderWheel as EventListener); loaderEl.removeEventListener('touchmove', loaderWheel as EventListener); loaderWheel = null; }
    loaderEl.classList.add('gone');
    T(() => { if (loaderEl) loaderEl.style.display = 'none'; }, 620);
    viewport.style.overflow = '';
    pos = target = 0; viewport.scrollTop = 0; applyFromProgress(0);
    settled = true; expandActive(0);
  }
  function placePanels() {
    pts = layout(PATH);
    const minX = Math.min(...pts.map((p) => p.x)), minY = Math.min(...pts.map((p) => p.y));
    const off = { x: 700 - minX, y: 420 - minY };
    pts = pts.map((p) => ({ x: p.x + off.x, y: p.y + off.y }));
    const panels = world.querySelectorAll(':scope > .e-panel');
    panels.forEach((el, i) => { (el as HTMLElement).style.left = pts[i].x + 'px'; (el as HTMLElement).style.top = pts[i].y + 'px'; });
    const vhFill = (viewport.clientHeight || 720) - 72;
    panels.forEach((el, i) => {
      const sid = SECTIONS[i] && SECTIONS[i].id;
      if (sid === 'hero' || sid === 'footer') { (el as HTMLElement).style.height = spatial() ? vhFill + 'px' : ''; }
    });
    const d = splineD(pts);
    // the VISIBLE route starts at Work (pts[1]) so the painted line never cuts the hero;
    // the camera path (e-trav) keeps the full spline so the camera still lands on it.
    const dVis = splineD(pts.slice(1));
    wires.innerHTML = `<path class="e-spine" d="${dVis}"></path><path class="e-trav" d="${d}"></path>`;
    travPath = wires.querySelector('.e-trav');
    try { travLen = travPath!.getTotalLength(); } catch (_) { travLen = 0; }
    if (travLen > 0 && travPath) { travPath.style.strokeDasharray = String(travLen); travPath.style.strokeDashoffset = String(travLen); }
    computePanelLens();
    drawPathArrows();
    const vh = viewport.clientHeight || 640;
    track.style.height = (vh * (PATH === 'horizontal' ? SECTIONS.length + 2 : SECTIONS.length)) + 'px';
    buildNav();
    pos = target = viewport.scrollTop;
    if (spatial() && !introActive) applyFromProgress(currentProgress());
  }

  /* ---------- spatial-map nav (mini curve + nodes) ---------- */
  function buildNav() {
    if (!navMap) return;
    const n = pts.length; if (n < 2) { navMap.innerHTML = ''; return; }
    const W = 300, H = 46, padX = 18, padY = 10;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const spanx = Math.max(1, maxx - minx), spany = Math.max(1, maxy - miny);
    const NP = pts.map((p) => ({ x: padX + (p.x - minx) / spanx * (W - 2 * padX), y: padY + (1 - (p.y - miny) / spany) * (H - 2 * padY) }));
    navPts = NP;
    const d = splineD(NP);
    const hits = NP.map((p, i) => `<circle class="e-nav-hit" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12"></circle>`).join('');
    const dots = NP.map((p, i) => `<circle class="e-nav-node" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"></circle>`).join('');
    navMap.innerHTML = `<div class="e-nav-plot" style="width:${W}px;height:${H}px;">
      <svg class="e-nav-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <path class="e-nav-base" d="${d}"></path>
        <path class="e-nav-trav" d="${d}"></path>
        ${dots}${hits}
        <circle class="e-nav-comet" r="2.6" cx="${NP[0].x.toFixed(1)}" cy="${NP[0].y.toFixed(1)}"></circle>
      </svg>
      <div class="e-nav-label"></div>
    </div>`;
    navTravEl = navMap.querySelector('.e-nav-trav');
    navCometEl = navMap.querySelector('.e-nav-comet');
    navLabelEl = navMap.querySelector('.e-nav-label');
    try { navTravLen = navTravEl!.getTotalLength(); } catch (_) { navTravLen = 0; }
    if (navTravLen > 0 && navTravEl) { navTravEl.style.strokeDasharray = String(navTravLen); navTravEl.style.strokeDashoffset = String(navTravLen); }
  }
  function updateNav(pt: any, p: number) {
    const frac = (pt.frac != null ? pt.frac : p);
    navLastFrac = frac; navLastIdx = pt.idx;
    opts.onNav?.({ frac, idx: pt.idx }); // drive the persistent bottom-nav curve
    if (!navTravEl || !navPts) return;
    if (navTravLen > 0) navTravEl.style.strokeDashoffset = ((1 - frac) * navTravLen).toFixed(1);
    if (navCometEl && navTravLen > 0) { const cp = navTravEl.getPointAtLength(frac * navTravLen); navCometEl.setAttribute('cx', cp.x.toFixed(1)); navCometEl.setAttribute('cy', cp.y.toFixed(1)); }
    navMap.querySelectorAll('.e-nav-node').forEach((c, i) => c.classList.toggle('on', i === pt.idx));
    if (navLabelEl && navPts[pt.idx]) {
      const tag = SECTIONS[pt.idx] ? SECTIONS[pt.idx].tag : '';
      if (navLabelEl.textContent !== tag) navLabelEl.textContent = tag;
      const lx = Math.max(26, Math.min(300 - 26, navPts[pt.idx].x));
      navLabelEl.style.left = lx + 'px'; navLabelEl.style.top = (navPts[pt.idx].y - 6) + 'px';
      navLabelEl.classList.add('show');
    }
  }
  function currentProgress() {
    const max = track.scrollHeight ? (viewport.scrollHeight - viewport.clientHeight) : 0;
    return max > 0 ? Math.min(1, Math.max(0, viewport.scrollTop / max)) : 0;
  }
  function pathPoint(p: number) {
    const n = pts.length, seg = n - 1;
    if (seg < 1) return { x: pts[0].x, y: pts[0].y, idx: 0, frac: 0 };
    const t = p * seg; const i = Math.min(seg - 1, Math.floor(t)); let f = t - i;
    f = segEase(f, EASE);
    if (travPath && travLen > 0 && panelLen.length === n) {
      const dist = panelLen[i] + (panelLen[i + 1] - panelLen[i]) * f;
      const pt = travPath.getPointAtLength(dist);
      return { x: pt.x, y: pt.y, idx: Math.round(p * seg), frac: dist / travLen };
    }
    const a = pts[i], b = pts[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, idx: Math.round(p * seg), frac: (i + f) / seg };
  }
  let camX = 0, camY = 0;
  let curEff = scale, idleX = 0, idleY = 0, idleAmp = 0;
  const IDLE_AMP = 7;
  function writeWorld() { world.style.transform = `translate(${(camX + idleX).toFixed(1)}px,${(camY + idleY).toFixed(1)}px) scale(${curEff})`; }
  function idleBreath() {
    if (!spatial() || mqReduce.matches) { if (idleX || idleY) { idleX = idleY = 0; writeWorld(); } return; }
    const still = (performance.now() - lastInputT > 220) && !settling;
    idleAmp += ((still ? 1 : 0) - idleAmp) * 0.05;
    const t = performance.now() / 1000;
    idleX = Math.sin(t * 0.85) * IDLE_AMP * idleAmp;
    idleY = Math.cos(t * 0.62) * IDLE_AMP * 0.7 * idleAmp;
    writeWorld();
  }
  function centerOn(px: number, py: number, biasX: number, eff: number) {
    eff = eff || scale;
    const vw = world.clientWidth, vh = viewport.clientHeight;
    camX = vw / 2 + (biasX || 0) - px * eff; camY = vh / 2 - py * eff; curEff = eff;
    writeWorld();
  }
  function applyFromProgress(p: number) {
    const pt = pathPoint(p);
    const seg = SECTIONS.length - 1;
    const footerT = 0; // footer removed — Contact centres like a normal panel
    const fS = smooth(footerT);
    const vwB = viewport.clientWidth || 1200;
    const eff = scale;
    const biasX = fS * (vwB / 2 - 56 - 210);
    if (blackout) { const slabT = seg > 0 ? Math.max(0, Math.min(1, p * seg - (seg - 1))) : 0; blackout.style.opacity = (smooth(slabT) * 0.8).toFixed(3); }
    centerOn(pt.x, pt.y, biasX, eff);
    progressBar.style.width = (p * 100) + '%';
    if (travPath && travLen > 0) travPath.style.strokeDashoffset = String((1 - (pt.frac != null ? pt.frac : p)) * travLen);
    const fx = pt.x, fy = pt.y, reduce = mqReduce.matches;
    const PARF = reduce ? 0 : 0.45;
    const RANGE = 820;
    world.querySelectorAll(':scope > .e-panel').forEach((elx, i) => {
      const el = elx as Fx;
      const active = (i === pt.idx);
      el.classList.toggle('is-active', active);
      if (!(SECTIONS[i] && SECTIONS[i].id === 'contact')) el.classList.remove('e-on-dark');
      const z = (DEPTH[i] != null ? DEPTH[i] : 1);
      const px = (pts[i] ? pts[i].x : fx), py = (pts[i] ? pts[i].y : fy);
      const dx = px - fx, dy = py - fy, dist = Math.hypot(dx, dy);
      let pr = Math.max(0, Math.min(1, 1 - dist / RANGE)); pr = pr * pr * (3 - 2 * pr);
      const tx = dx * (z - 1) * PARF, ty = dy * (z - 1) * PARF;
      const sf = 0.58 + (z - 0.6) * 0.55, of = 0.40 + (z - 0.6) * 0.5;
      const sc = sf + (SETTLE_SCALE - sf) * pr;
      const op = of + (1 - of) * pr;
      if (!reduce) {
        if (pr > 0.55 && el.dataset.rev !== '1') { el.dataset.rev = '1'; el.classList.remove('e-reveal-pending'); }
        else if (pr < 0.05 && el.dataset.rev === '1') { el.dataset.rev = ''; el.classList.add('e-reveal-pending'); }
      } else if (el.classList.contains('e-reveal-pending')) el.classList.remove('e-reveal-pending');
      if (!(settled && i === settledIdx)) {
        el.__base = `translate(-50%,-50%) translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${(active ? SETTLE_SCALE : sc).toFixed(3)})`;
        el.style.transform = el.__base + tiltSuffix(el);
      }
      el.style.opacity = (active ? 1 : op).toFixed(3);
      el.style.zIndex = String(Math.round(z * 10 + pr * 12 + (active ? 20 : 0)));
    });
    updateNav(pt, p);
  }

  /* ---------- subtle cursor-tilt + glare on every canvas panel ---------- */
  let panelTiltTicking = false, ptMouse: { x: number; y: number } | null = null, panelTiltWired = false;
  function tiltSuffix(el: Fx) { const rx = el.__rx || 0, ry = el.__ry || 0; if (Math.abs(rx) < 0.02 && Math.abs(ry) < 0.02) return ''; return ` perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; }
  function initPanelTilt() {
    world.querySelectorAll(':scope > .e-panel').forEach((p) => { if (!p.querySelector(':scope > .e-panel-glare')) { const g = document.createElement('span'); g.className = 'e-panel-glare'; p.appendChild(g); } });
    if (panelTiltWired) return; panelTiltWired = true;
    on(viewport, 'pointermove', (e: PointerEvent) => { ptMouse = { x: e.clientX, y: e.clientY }; kickPanelTilt(); }, { passive: true });
    on(viewport, 'pointerleave', () => { ptMouse = null; kickPanelTilt(); });
  }
  function kickPanelTilt() { if (!panelTiltTicking) { panelTiltTicking = true; addTick(panelTiltStep); } }
  function panelTiltStep() {
    const MAX = 5.5;
    const loaderVisible = loaderEl && loaderEl.style.display !== 'none';
    let alive = false;
    world.querySelectorAll(':scope > .e-panel').forEach((px) => {
      const p = px as Fx;
      if (p.classList.contains('e-billboard')) return;
      let trx = 0, try_ = 0, gx = 50, gy = 28, ga = 0;
      if (ptMouse && !loaderVisible) {
        const r = p.getBoundingClientRect();
        if (r.width && r.height) {
          const nx = (ptMouse.x - (r.left + r.width / 2)) / (r.width / 2);
          const ny = (ptMouse.y - (r.top + r.height / 2)) / (r.height / 2);
          const reach = Math.hypot(nx, ny);
          const fall = reach <= 1 ? 1 : Math.max(0, 1 - (reach - 1) / 1.3);
          const cnx = Math.max(-1, Math.min(1, nx)), cny = Math.max(-1, Math.min(1, ny));
          try_ = cnx * MAX * fall;
          trx = cny * -MAX * fall;
          gx = 50 + cnx * 32; gy = 30 + cny * 30; ga = 0.92 * fall;
        }
      }
      p.__rx = (p.__rx || 0) + (trx - (p.__rx || 0)) * 0.14;
      p.__ry = (p.__ry || 0) + (try_ - (p.__ry || 0)) * 0.14;
      if (Math.abs(trx - p.__rx) > 0.02 || Math.abs(try_ - p.__ry) > 0.02) alive = true;
      if (p.__base != null) p.style.transform = p.__base + tiltSuffix(p);
      const g = p.querySelector(':scope > .e-panel-glare') as HTMLElement | null;
      if (g) { g.style.opacity = ga.toFixed(3); g.style.setProperty('--gx', gx.toFixed(1) + '%'); g.style.setProperty('--gy', gy.toFixed(1) + '%'); }
    });
    if (!(alive || ptMouse)) { panelTiltTicking = false; removeTick(panelTiltStep); }
  }

  /* ---------- inertia scroll + gentle magnetic settle (no scroll-snap) ---------- */
  let pos = 0, target = 0, lastWriteT = 0;
  let subActive = false; const PROC_SUB = 2.45;
  let idleTimer: number | null = null, settling = false, settleStop: (() => void) | null = null;
  const scrollMax = () => Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  const clampS = (v: number) => Math.max(0, Math.min(scrollMax(), v));
  const SMOOTH = 0.11;
  const SETTLE_ZONE = 0.35;
  let lastInputT = 0;

  function writeScroll(v: number) {
    lastWriteT = performance.now();
    viewport.scrollTop = v;
    applyFromProgress(currentProgress());
  }
  let inertiaTicking = false;
  function cancelInertia() { if (inertiaTicking) { inertiaTicking = false; removeTick(inertiaStep); } }
  function cancelSettle() { settling = false; if (settleStop) { settleStop(); settleStop = null; } }
  function cancelSnap() { cancelSettle(); cancelInertia(); if (idleTimer) clearTimeout(idleTimer); clearSettlePose(); }
  function kickInertia() { if (!inertiaTicking) { inertiaTicking = true; addTick(inertiaStep); } }
  function inertiaStep() {
    if (pgSuspended || !spatial()) { cancelInertia(); return; }
    const diff = target - pos;
    if (Math.abs(diff) < 0.4) { pos = target; writeScroll(pos); cancelInertia(); return; }
    pos += diff * SMOOTH;
    writeScroll(pos);
  }
  function scheduleIdleSettle() { if (idleTimer) clearTimeout(idleTimer); idleTimer = window.setTimeout(tryMagneticSettle, 120); timers.add(idleTimer); }
  function tryMagneticSettle() {
    if (pgSuspended || !spatial() || settling) return;
    if (subActive) { const sub = PROC_SUB / (SECTIONS.length - 1); if (Math.abs(currentProgress() - sub) < 0.05) return; subActive = false; }
    const seg = SECTIONS.length - 1, max = scrollMax(); if (seg < 1 || max <= 0) return;
    if (Math.abs(target - pos) > 1.2) { scheduleIdleSettle(); return; }
    const p = (pos / max) * seg;
    const idx = Math.round(p), dist = Math.abs(p - idx);
    if (dist > SETTLE_ZONE) { settled = false; return; }
    settleTo((idx / seg) * max, idx);
  }
  function settleTo(dest: number, idx: number) {
    dest = clampS(dest);
    if (!spatial()) { pos = target = dest; settled = true; expandActive(idx); return; }
    cancelInertia(); cancelSettle();
    settling = true;
    const start = pos, distp = dest - start, t0 = performance.now();
    const dur = Math.max(420, Math.min(720, 380 + Math.abs(distp) * 0.6));
    const ease = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // easeInOutCubic
    const step = () => {
      if (!settling) { removeTick(step); return; }
      const x = Math.min(1, (performance.now() - t0) / dur), e = ease(x);
      pos = start + distp * e; target = pos; writeScroll(pos);
      if (x >= 1) { settling = false; settled = true; removeTick(step); expandActive(idx); }
    };
    settleStop = () => removeTick(step);
    addTick(step);
  }

  // wheel / trackpad → feed the weighted inertia integrator
  on(viewport, 'wheel', (e: WheelEvent) => {
    if (!spatial() || introActive) return;
    lastInputT = performance.now();
    if (mqReduce.matches) { cancelSettle(); settled = false; clearSettlePose(); collapseAll(); return; }
    e.preventDefault();
    cancelSettle();
    settled = false; clearSettlePose(); collapseAll();
    const dom = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    let d = dom; if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= viewport.clientHeight;
    target = clampS(target + d);
    kickInertia();
    scheduleIdleSettle();
  }, { passive: false });

  // native scroll (scrollbar drag / OS momentum)
  on(viewport, 'scroll', () => {
    if (pgSuspended || !spatial() || introActive) return;
    lastInputT = performance.now();
    if (performance.now() - lastWriteT < 80) return;
    if (mqReduce.matches) { pos = target = viewport.scrollTop; settled = false; clearSettlePose(); collapseAll(); applyFromProgress(currentProgress()); scheduleIdleSettle(); return; }
    cancelSettle(); cancelInertia();
    pos = target = viewport.scrollTop;
    settled = false; clearSettlePose(); collapseAll();
    applyFromProgress(currentProgress());
    scheduleIdleSettle();
  });
  on(viewport, 'touchstart', () => cancelSettle(), { passive: true });
  on(viewport, 'pointerdown', () => cancelSettle(), { passive: true });

  // ---------- smooth glide to a specific panel (keyboard · minimap) ----------
  function glideTo(i: number) {
    const seg = SECTIONS.length - 1, max = scrollMax();
    const t = Math.max(0, Math.min(seg, i)), dest = clampS((t / seg) * max);
    if (idleTimer) clearTimeout(idleTimer);
    if (!spatial()) { pos = target = dest; settled = true; expandActive(t); return; }
    cancelInertia(); cancelSettle();
    settling = true;
    const start = pos, distp = dest - start, t0 = performance.now();
    const dur = Math.max(460, Math.min(820, 420 + Math.abs(distp) * 0.5));
    const easeInOut = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const step = () => {
      if (!settling) { removeTick(step); return; }
      const x = Math.min(1, (performance.now() - t0) / dur), e = easeInOut(x);
      pos = start + distp * e; target = pos; writeScroll(pos);
      if (x >= 1) { settling = false; settled = true; removeTick(step); expandActive(t); }
    };
    settleStop = () => removeTick(step);
    addTick(step);
  }
  function gotoPanel(i: number) { cancelSnap(); glideTo(Math.max(0, Math.min(SECTIONS.length - 1, i))); }
  // Like gotoPanel, but copes with the brand loader still being up (e.g. a nav
  // link clicked the instant you land on home): drop the loader first so the
  // camera is live, then travel.
  function gotoSection(i: number) {
    if (introActive || (loaderEl && loaderEl.style.display !== 'none')) dismissLoader();
    gotoPanel(i);
  }
  function currentIdx() { return Math.round(currentProgress() * (SECTIONS.length - 1)); }
  function navFwd() { const i = currentIdx(); if (i >= SECTIONS.length - 1) { loopToHero(); return; } gotoPanel(i + 1); }
  function loopToHero() {
    if (mqReduce.matches) { try { pos = target = 0; viewport.scrollTop = 0; applyFromProgress(0); } catch (_) { /* ignore */ } if (loaderEl) { introPlayed = true; showLoader(); } return; }
    gotoPanel(0);
    T(() => { if (loaderEl) { introPlayed = true; showLoader(); } }, 1300);
  }
  function navBack() { gotoPanel(currentIdx() - 1); }
  on(root, 'keydown', (e: KeyboardEvent) => {
    if (!spatial() || introActive) return;
    if ((e.target as HTMLElement).closest('.e-minimap')) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); navFwd(); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); navBack(); }
    else if (k === 'Home') { e.preventDefault(); gotoPanel(0); }
    else if (k === 'End') { e.preventDefault(); gotoPanel(SECTIONS.length - 1); }
  });

  // minimap removed from the Next shell — bottom nav is the single path UI
  if (minimap) {
    on(minimap, 'click', (e: MouseEvent) => {
      const d = (e.target as HTMLElement).closest('.e-nav-node,.e-nav-hit') as HTMLElement | null; if (!d || introActive) return;
      cancelSnap(); glideTo(+d.dataset.i!);
    });
  }

  /* ---------- open / close nested canvases ---------- */
  on(world, 'click', (e: MouseEvent) => {
    const routeEl = (e.target as HTMLElement).closest('.e-panel[data-route]') as HTMLElement | null;
    if (routeEl) { opts.onRoute?.(routeEl.dataset.route!); return; } // route panels navigate to a page
    const op = (e.target as HTMLElement).closest('.e-panel.openable') as HTMLElement | null;
    if (op) { openDetail(op.dataset.open!, op); return; }
    const pvEl = (e.target as HTMLElement).closest('.e-preview') as HTMLElement | null;
    if (pvEl) { const c = pvEl.closest('.e-panel')!.querySelector('.e-cta') as HTMLElement | null; if (c && c !== e.target && !pvEl.contains(c)) c.click(); }
  });
  // left-click empty canvas -> back ; right-click -> forward
  on(stage, 'click', (e: MouseEvent) => {
    if (loaderEl && loaderEl.style.display !== 'none') return;
    if (detail.classList.contains('open')) return;
    if ((e.target as HTMLElement).closest('.e-minimap,.e-detail,.e-hint,.e-progress,.e-cta,.e-foot-nav span,.e-socdot,.e-panel.openable,.e-panel[data-route],.e-preview,.e-dctrls,a,button')) return;
    navBack();
  });
  on(stage, 'contextmenu', (e: MouseEvent) => {
    if (loaderEl && loaderEl.style.display !== 'none') return;
    if (detail.classList.contains('open')) return;
    if ((e.target as HTMLElement).closest('.e-minimap,.e-detail,.e-dctrls,a,button')) return;
    e.preventDefault();
    navFwd();
  });
  function expandActive(idx?: number) {
    if (!spatial()) return;
    if (idx == null) idx = Math.round(currentProgress() * (SECTIONS.length - 1));
    settledIdx = idx;
    const a = world.querySelector(`.e-panel[data-i="${idx}"]`) as Fx | null;
    world.querySelectorAll('.e-panel.e-ribbon-panel').forEach((rp) => rp.classList.toggle('ribbon-play', rp === a));
    world.querySelectorAll('.e-panel.is-expanded').forEach((p) => { if (p !== a) p.classList.remove('is-expanded'); });
    if (a) {
      if (a.querySelector('.e-preview')) {
        const dwell = spatial() ? (parseInt(a.dataset.dwell!, 10) || 0) : 0;
        clearTimeout(a.__dwellT);
        a.__dwellT = window.setTimeout(() => {
          if (!settled || settledIdx != +a.dataset.i!) return;
          const bloom = () => { if (!settled || settledIdx != +a.dataset.i!) return; a.classList.add('is-expanded'); mountPreview(a); countUp(a); };
          if (a.dataset.merge) { a.classList.add('svc-merged'); if (spatial()) { T(bloom, 1000); } else bloom(); }
          else bloom();
        }, dwell);
        timers.add(a.__dwellT);
      }
      startSettlePose(a);
    }
  }
  function countUp(scope: HTMLElement) {
    scope.querySelectorAll('[data-count]').forEach((elx) => {
      const el = elx as Fx;
      if (el.__counted) return; el.__counted = true;
      const to = parseInt(el.dataset.count!, 10) || 0, dur = 900, t0 = performance.now();
      const tick = () => { const x = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - x, 3); el.textContent = String(Math.round(to * e)); if (x >= 1) { el.textContent = String(to); removeTick(tick); } };
      addTick(tick);
    });
  }
  function collapseAll() { clearSettlePose(); world.querySelectorAll('.e-panel.is-expanded').forEach((p) => p.classList.remove('is-expanded')); }

  /* ---------- settle pose: active panel centres, lifts, then leans back ---------- */
  let poseStop: (() => void) | null = null;
  function clearSettlePose() { if (poseStop) { poseStop(); poseStop = null; } }
  function startSettlePose(a: Fx) {
    clearSettlePose(); if (!a) return;
    const hasPv = !!a.querySelector('.e-preview');
    const t0 = performance.now(), dur = hasPv ? 660 : 430;
    const step = () => { const x = Math.min(1, (performance.now() - t0) / dur); applySettlePose(a, x, hasPv); if (x >= 1) removeTick(step); };
    poseStop = () => removeTick(step);
    addTick(step);
  }
  function smooth(v: number) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
  function applySettlePose(a: Fx, x: number, hasPv: boolean) {
    const easeOut = 1 - Math.pow(1 - x, 3);
    const lift = (hasPv ? -186 : -13) * smooth(x / 0.55);
    const tilt = (hasPv ? 7.5 : 2.6) * smooth((x - 0.32) / 0.68);
    const sc = SETTLE_SCALE + 0.04 * easeOut;
    a.__base = `translate(-50%,-50%) perspective(1200px) translateY(${lift.toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    a.style.transform = a.__base + tiltSuffix(a);
  }

  /* ---------- preview bloom ----------
     When the camera settles on a panel, its preview frame blooms into a live,
     scaled, non-interactive screenshot of the *actual page*:
     - route panels (Work / Services / Process / Pricing) mount a same-origin
       <iframe> of the real Next route (/work, …), scaled to fit the frame.
       This restores the prototype's "a real screenshot of the page" preview —
       in the export it loaded standalone wireframe HTML through an explorer
       shell (the FS_CSS tab-stripping); here the route IS the page, so there's
       no shell to strip, only our persistent chrome (nav + cursor) to hide.
     - About / Trust / Contact have no standalone route, so they keep rendering
       their real nested-canvas markup scaled in place (mountDetailPreview). */
  const PV_W = 1280, PV_H = 800;
  // Hide the persistent shell chrome inside the preview iframe so it reads as a
  // clean page screenshot (the prototype stripped its explorer chrome the same
  // way). Same-origin, so we can inject a <style>.
  const PV_CHROME_CSS = '#nav,#nav-hint,#jawad-cursor{display:none!important;}'
    + 'html,body{cursor:none!important;overflow:hidden!important;}';
  function mountPreview(panel: HTMLElement) {
    if (panel.dataset.pvdetail) { mountDetailPreview(panel); return; }
    const route = panel.dataset.route; if (!route) return;
    const frame = panel.querySelector('.e-prevframe') as HTMLElement | null;
    if (!frame || frame.dataset.pvMounted) return;
    frame.dataset.pvMounted = '1';
    const fw = frame.clientWidth || 360;
    const z = parseFloat(panel.dataset.pvzoom!) || 1;
    const fit = fw / PV_W, s = fit * z;
    const CLIP = Math.min(Math.round(PV_H * fit), 336);     // a centred horizontal band, not the page top
    const pvtx = -(PV_W * s - fw) / 2, pvty = -(PV_H * s - CLIP) / 2; // centre the crop on both axes
    frame.classList.add('e-pv-live'); frame.innerHTML = '';
    frame.style.height = CLIP + 'px';
    const port = document.createElement('div'); port.className = 'e-pv-scaleport'; port.style.height = CLIP + 'px';
    const load = document.createElement('div'); load.className = 'e-pv-loading'; load.textContent = 'loading preview…';
    const ifr = document.createElement('iframe');
    ifr.className = 'e-pv-iframe'; ifr.tabIndex = -1; ifr.setAttribute('aria-hidden', 'true'); ifr.setAttribute('scrolling', 'no');
    ifr.style.width = PV_W + 'px'; ifr.style.height = PV_H + 'px';
    ifr.style.transform = `translate(${pvtx.toFixed(1)}px,${pvty.toFixed(1)}px) scale(${s})`;
    on(ifr, 'load', () => stripPreview(ifr, load));
    ifr.src = `/${route}`;
    port.appendChild(ifr); port.appendChild(load); frame.appendChild(port);
  }
  function stripPreview(ifr: HTMLIFrameElement, load: HTMLElement | null) {
    let d: Document | null = null;
    try { d = ifr.contentDocument; } catch (_) { /* same-origin, shouldn't throw */ }
    if (d) {
      try {
        if (!d.getElementById('__pvfs')) { const st = d.createElement('style'); st.id = '__pvfs'; st.textContent = PV_CHROME_CSS; (d.head || d.documentElement).appendChild(st); }
        d.body.style.pointerEvents = 'none';
      } catch (_) { /* ignore */ }
      // the canvas engine fits to the 1280×800 frame on mount; nudge it a few
      // times so it re-centres once the route has hydrated + built its DOM.
      [120, 360, 720].forEach((t) => T(() => { try { d!.defaultView!.dispatchEvent(new Event('resize')); } catch (_) { /* ignore */ } }, t));
    }
    T(() => { ifr.classList.add('ready'); if (load) load.remove(); }, 460);
  }
  function mountDetailPreview(panel: HTMLElement) {
    const id = panel.dataset.pvdetail!;
    const frame = panel.querySelector('.e-prevframe') as HTMLElement | null; if (!frame || frame.dataset.pvMounted) return;
    frame.dataset.pvMounted = '1';
    const SW = 980, SH = 600, fw = frame.clientWidth || 360, s = fw / SW, h = Math.round(SH * s);
    const CLIP = Math.min(h, 336);
    frame.classList.add('e-pv-live'); frame.innerHTML = '';
    frame.style.height = CLIP + 'px';
    const port = document.createElement('div'); port.className = 'e-pv-scaleport'; port.style.height = CLIP + 'px';
    const stageEl = document.createElement('div');
    stageEl.style.cssText = 'position:absolute;top:' + (-Math.round((h - CLIP) / 2)) + 'px;left:0;width:' + SW + 'px;height:' + SH + 'px;transform-origin:top left;transform:scale(' + s + ');pointer-events:none;overflow:hidden;';
    stageEl.innerHTML = detailFor(id);
    port.appendChild(stageEl); frame.appendChild(port);
    const dctrls = stageEl.querySelector('.e-dctrls') as HTMLElement | null; if (dctrls) dctrls.style.display = 'none';
    const wrap = stageEl.querySelector('.e-dwrap') as HTMLElement | null; if (wrap) { wrap.style.cursor = 'default'; wrap.style.position = 'absolute'; wrap.style.inset = '0'; }
    const dw = stageEl.querySelector('.e-dworld') as HTMLElement | null; if (dw) { dw.style.transform = 'translate(-50%,-50%) scale(0.84)'; }
  }

  on(world, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const p = (e.target as HTMLElement).closest('.e-panel.openable') as HTMLElement | null; if (!p) return;
    e.preventDefault();
    if (p.dataset.route) { opts.onRoute?.(p.dataset.route); return; }
    openDetail(p.dataset.open!, p);
  });
  function openDetail(id: string, panel: HTMLElement) {
    detailBody.innerHTML = detailFor(id);
    detail.classList.toggle('e-detail-dark', id === 'contact');
    const sr = stage.getBoundingClientRect();
    const anchorEl = (panel.querySelector('.e-portal-ring,[data-matchcut]') as HTMLElement | null) || panel; // match-cut origin
    const pr = anchorEl.getBoundingClientRect();
    detail.style.transformOrigin = `${pr.left + pr.width / 2 - sr.left}px ${pr.top + pr.height / 2 - sr.top}px`;
    detail.classList.add('open');
    T(() => initDetailCanvas(), 0);
  }
  function closeDetail() { detail.classList.remove('open'); }
  on(root.querySelector('.e-back')!, 'click', closeDetail);
  on(root.querySelector('.e-close')!, 'click', closeDetail);

  function detailFor(id: string) {
    if (id === 'about') {
      const orb = (o: any) => `<div class="e-panel e-orbit-panel" style="left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);--ox:${o.x}px;--oy:${o.y}px;width:${o.w}px;min-height:${o.h}px;">
        ${o.tag ? `<span class="e-tag">${o.tag}</span>` : ''}<div class="e-title" style="font-size:22px;">${o.title || ''}</div>${o.body || ''}</div>`;
      const inner = `<div class="e-dworld" id="e-dworld">
        <div class="e-about-core">
          <div class="e-portal-ring e-portal-ring-xl"><img class="e-portal-face" src="/assets/jawad-hero.webp" alt="Jawad" draggable="false"><span class="e-portal-glare"></span></div>
          <div class="e-title" style="font-size:30px;margin-top:14px;">Jawad</div><span class="e-tag">designer · engineer · 15 · london</span></div>
        ${orb({ tag: 'WHO', title: 'The short version', x: -360, y: -185, w: 280, h: 128, body: bars(['100%', '86%', '60%']) })}
        ${orb({ tag: 'HOW I WORK', title: 'One person, start to ship', x: 360, y: -185, w: 280, h: 128, body: bars(['100%', '78%']) })}
        ${orb({ tag: 'BEYOND WORK', title: 'Off the clock', x: -360, y: 185, w: 280, h: 128, body: bars(['100%', '70%']) })}
        ${orb({ tag: 'SAY HI', title: 'Work with me', x: 360, y: 185, w: 280, h: 128, body: cta('→ /contact', 'primary') })}
      </div>`;
      return chrome('About — me, in the middle', inner);
    }
    if (id === 'trust') {
      const sat = (o: any) => `<div class="e-panel e-orbit-panel" style="left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);--ox:${o.x}px;--oy:${o.y}px;width:${o.w}px;min-height:${o.h}px;">
        ${o.tag ? `<span class="e-tag">${o.tag}</span>` : ''}<div class="e-title" style="font-size:21px;">${o.title || ''}</div>${o.body || ''}</div>`;
      const inner = `<div class="e-dworld" id="e-dworld">
        <div class="e-trust-core">
          <div class="e-quote e-quote-sm"><span class="e-qline q1">great skill</span><span class="e-qline q2">great design</span><span class="e-qline q3">great speed</span></div>
          <div class="e-attrib">Joel Jeon · founder, weld</div></div>
        ${sat({ tag: 'THE TESTIMONIAL', title: 'others love me', x: -380, y: -128, w: 300, h: 140, body: bars(['100%', '88%', '62%']) })}
        ${sat({ tag: 'WHO JOEL IS', title: 'Founder, weld', x: 380, y: -128, w: 300, h: 140, body: `<span class="e-tag">roblox talent studio</span>${bars(['100%', '70%'])}` })}
        ${sat({ tag: 'THE RESULT', title: 'weld, in numbers', x: 0, y: 212, w: 380, h: 120, body: `<div class="e-facts" style="justify-content:center;">${fact('signups', '200')}${fact('paid', '$0')}${fact('trajectory', 'grew fast')}</div>` })}
      </div>`;
      return chrome('Trust — the proof behind the line', inner);
    }
    if (id === 'contact') {
      const field = (label: string, tall?: boolean) => `<div class="e-field${tall ? ' tall' : ''}">${label}</div>`;
      const inner = `<div class="e-dworld" id="e-dworld">
        <div class="e-contact-core">
          <div class="e-slab-head" data-matchcut style="font-size:clamp(40px,6vw,68px);">Your move.</div>
          <div class="e-form">
            ${field('your name')}${field('email')}${field('what do you want to build?', true)}
            <div class="e-cta primary" style="align-self:center;margin-top:2px;pointer-events:auto;">Send it ▸</div>
          </div>
          <div class="e-slab-base"><a href="mailto:hijawadjalal@gmail.com">hijawadjalal@gmail.com</a></div>
        </div>
      </div>`;
      return chrome('Contact — your move', inner);
    }
    return '';
  }
  function chrome(title: string, inner: string) {
    return `<div class="e-dwrap" id="e-dwrap"><div class="e-dctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>${inner}</div>`;
  }
  // pan/zoom for the nested detail canvases
  let dscale = 0.82, dx = 0, dy = 0, ddrag = false, dsx = 0, dsy = 0, dox = 0, doy = 0;
  function initDetailCanvas() {
    const wrap = detail.querySelector('#e-dwrap') as HTMLElement | null, dw = detail.querySelector('#e-dworld') as HTMLElement | null; if (!wrap || !dw) return;
    dscale = 0.82; dx = 0; dy = 0; const apply = () => { dw.style.transform = `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${dscale})`; }; apply();
    wrap.onpointerdown = (e) => { if ((e.target as HTMLElement).closest('.e-dctrls')) return; ddrag = true; wrap.classList.add('grabbing'); dsx = e.clientX; dsy = e.clientY; dox = dx; doy = dy; try { wrap.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } };
    wrap.onpointermove = (e) => { if (!ddrag) return; dx = dox + (e.clientX - dsx); dy = doy + (e.clientY - dsy); apply(); };
    wrap.onpointerup = () => { ddrag = false; wrap.classList.remove('grabbing'); };
    wrap.onwheel = (e) => { e.preventDefault(); dscale = Math.min(1.5, Math.max(0.4, dscale - e.deltaY * 0.0012)); apply(); };
    (wrap.querySelector('.e-dctrls') as HTMLElement).onclick = (e) => { const z = (e.target as HTMLElement).dataset.z; if (!z) return; if (z === 'in') dscale = Math.min(1.5, dscale + 0.15); if (z === 'out') dscale = Math.max(0.4, dscale - 0.15); if (z === 'home') { dscale = 0.82; dx = 0; dy = 0; } apply(); };
  }

  /* ---------- resize + media-change relayout ---------- */
  const onResize = () => { if (built) placePanels(); };
  on(window, 'resize', onResize);
  [mqReduce, mqCoarse, mqNarrow].forEach((mq) => {
    const h = () => { if (built) { cancelSnap(); placePanels(); } };
    if (mq.addEventListener) mq.addEventListener('change', h);
    cleanups.push(() => { if (mq.removeEventListener) mq.removeEventListener('change', h); });
  });

  /* ---------- boot ---------- */
  // When we arrive from another page via a nav-link section request, suppress
  // the brand intro (introPlayed=true keeps maybeIntro from showing the loader)
  // so we can land straight on the requested section.
  if (opts.initialSection != null) introPlayed = true;
  build();
  if (opts.initialSection != null) {
    const tgt = Math.max(0, Math.min(SECTIONS.length - 1, opts.initialSection));
    // build() sets loaderEl inside buildLoader(), so TS's straight-line flow
    // still thinks it's null here — cast to read the real (built) reference.
    const ldr = loaderEl as HTMLElement | null;
    if (ldr) ldr.style.display = 'none';
    introActive = false;
    viewport.style.overflow = '';
    if (!spatial()) {
      // mobile: no camera — just position the native scroll on the section slice
      const seg = SECTIONS.length - 1, max = scrollMax();
      const dest = seg > 0 ? clampS((tgt / seg) * max) : 0;
      pos = target = dest; viewport.scrollTop = dest; applyFromProgress(currentProgress());
      settled = true; expandActive(tgt);
    } else {
      // desktop: settle on the hero, then glide the camera over to the section
      pos = target = 0; viewport.scrollTop = 0; applyFromProgress(0);
      settled = true; expandActive(0);
      if (tgt > 0) gotoPanel(tgt);
    }
  }

  return {
    destroy() {
      tickers.forEach((fn) => gsap.ticker.remove(fn)); tickers.clear();
      timers.forEach((id) => clearTimeout(id)); timers.clear();
      cleanups.forEach((fn) => { try { fn(); } catch (_) { /* ignore */ } });
    },
    gotoPanel,
    gotoSection,
    replayIntro() { if (loaderEl) { introPlayed = true; showLoader(); } },
  };
}
