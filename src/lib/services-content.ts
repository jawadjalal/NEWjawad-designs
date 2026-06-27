/**
 * Services page — Direction D content builders.
 *
 * A faithful 1:1 port of the Direction-D parts of the prototype's
 * `services.js` (`window.SVC`): the spatial-canvas markup (`sheetD`) and the
 * nested per-panel detail canvases (`detailFor`). These return HTML strings,
 * exactly as the prototype did — the spatial-canvas engine injects the main
 * sheet once and swaps in a detail sheet whenever a panel is opened.
 *
 * Only Direction D is ported (the shipped direction); the A/B/C linear sheets
 * and the mobile/annotation variants are dropped, same as Phase 2 keeping only
 * home Direction E. The copy, panel coordinates, sizes and class names are
 * verbatim so the canvas lays out pixel-for-pixel like the prototype.
 */

/* ---------- atoms ---------- */
const flag = (t: string, pos: string) => `<span class="cta-flag" style="${pos}">${t}</span>`;

/* ---------- content ---------- */
const PHILOSOPHY = 'Two things, done exceptionally.';

type Service = {
  name: string;
  for: string;
  outcome: string;
  ex: string[];
  deliver: string[];
};

const SERVICES: Service[] = [
  {
    name: 'Portfolio sites',
    for: 'for creatives',
    outcome: 'You get a site that earns trust in the first three seconds.',
    ex: ['photographers', 'illustrators', 'studios'],
    deliver: ['responsive build', 'your CMS or static', 'contact + analytics', 'SEO basics', 'you own the code'],
  },
  {
    name: 'Landing pages',
    for: 'for founders',
    outcome: 'You get one page that turns a launch into signups.',
    ex: ['waitlists', 'pre-orders', 'demos'],
    deliver: ['one focused page', 'signup / waitlist form', 'A/B-ready copy slots', 'fast + measured', 'you own it'],
  },
  {
    name: 'A light brand system',
    for: 'with every project',
    outcome: 'You get a consistent look you can keep running yourself.',
    ex: ['type + colour', 'logo lockup', 'UI components'],
    deliver: ['type + colour scale', 'logo lockup', 'reusable components', 'usage notes', 'handover files'],
  },
];

const STANDARDS = ['loads under a second', 'SEO done right', 'you own it', 'no lock-in', 'responsive', 'measured'];
const STD_GLOSS: Record<string, string> = {
  'loads under a second': 'a performance budget on every page',
  'SEO done right': 'semantic, indexable, sitemap + meta',
  'you own it': 'your repo, your domain, your accounts',
  'no lock-in': 'no proprietary builder to escape',
  responsive: 'great from 320px to ultrawide',
  measured: 'analytics wired in from day one',
};

/* ---------- panel atom ---------- */
type PanelOpts = {
  n?: number;
  tag?: string;
  cls?: string;
  open?: string;
  flag?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  body: string;
};
function scPanel(o: PanelOpts): string {
  const base = `left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);width:${o.w}px;height:${o.h}px;`;
  const data = ''; // sheetD panels carry no data-cluster (no satellites)
  const open = o.open ? ` data-open="${o.open}"` : '';
  return `<div class="sc-panel${o.cls ? ' ' + o.cls : ''}${o.open ? ' openable' : ''}" style="${base}"${data}${open}>
      ${o.n ? `<span class="sc-num">${o.n}</span>` : ''}
      ${o.tag ? `<span class="sc-tag">${o.tag}</span>` : ''}
      <div class="sc-body">${o.body}</div>
      ${o.flag ? flag(o.flag, 'top:-13px;left:10px;') : ''}
      ${o.open ? '<span class="sc-open-cur">OPEN ⤢</span>' : ''}
    </div>`;
}

/* ---------- MAIN canvas: 6 showstopper panels, no satellites ---------- */
export function sheetD(): string {
  const anchor = scPanel({
    n: 1,
    tag: '① PHILOSOPHY · the offer',
    cls: 'sc-hero sc-anchor accent-zone sc-focal',
    x: 0,
    y: -244,
    w: 480,
    h: 182,
    body: `<span class="anchor-eyebrow">the whole offer — in one line</span><div class="philo big">${PHILOSOPHY}</div><span class="anchor-foot">click a service or panel to open it ⤢</span>`,
  });
  // panels 2 & 3 — the two CORE services, substantial; panel 4 (brand) is the lighter "+ bonus"
  const svcCore = (s: Service, n: number, id: string, x: number, y: number) =>
    scPanel({
      n,
      tag: `② SERVICE ${n - 1} · core`,
      cls: 'sc-clushead sc-svc-core',
      open: id,
      x,
      y,
      w: 336,
      h: 222,
      body: `<div class="svc-name md">${s.name}</div><span class="svc-for">${s.for}</span><div class="svc-outcome">${s.outcome}</div><div class="chips">${s.ex
        .map((e) => `<span class="chip">${e}</span>`)
        .join('')}</div><span class="sc-deliver-hint">+ what you get inside ⤢</span>`,
    });
  const svcBonus = (s: Service, id: string, x: number, y: number) =>
    scPanel({
      n: 4,
      tag: '② SERVICE 3 · with every project',
      cls: 'sc-clushead sc-svc-bonus',
      open: id,
      x,
      y,
      w: 312,
      h: 150,
      body: `<div class="svc-name sm">${s.name}</div><span class="svc-for">${s.for}</span><div class="svc-outcome sm">${s.outcome}</div>`,
    });
  const services = svcCore(SERVICES[0], 2, 'svc1', -378, 8) + svcCore(SERVICES[1], 3, 'svc2', 378, 8) + svcBonus(SERVICES[2], 'svc3', 0, 62);
  const standards = scPanel({
    n: 5,
    tag: '③ ALWAYS INCLUDED',
    cls: 'sc-offerpanel',
    open: 'standards',
    x: -378,
    y: 272,
    w: 300,
    h: 150,
    body: `<div class="clus-title">Always included</div><span class="lbl">six standards · every project</span><div class="std-chiplist tight">${STANDARDS.slice(0, 3)
      .map((s) => `<span class="chip">${s}</span>`)
      .join('')}<span class="chip ghost-chip">+3</span></div>`,
  });
  const ctaP = scPanel({
    n: 6,
    tag: '④ CTA',
    cls: 'sc-offerpanel sc-cta',
    open: 'cta',
    x: 378,
    y: 272,
    w: 300,
    h: 150,
    body: `<div class="clus-title">Start a project</div><span class="lbl">see pricing · or get in touch</span><span class="lbl" style="margin-top:6px;">primary CTA also pinned in the nav →</span>`,
  });
  return `<div class="scase worlds">
      <div class="sc-head">Services <span>drag · scroll to zoom · click a panel to open</span></div>
      <div class="sc-canvas">
        <svg class="sc-wires"></svg>
        ${anchor}${services}${standards}${ctaP}
      </div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>
    <div class="sc-detail"><div class="detail-chrome"><span class="back-pill">← Back to services</span><span class="close-x">✕</span></div><div class="detail-body"></div></div>`;
}

/* ---------- NESTED canvas-in-a-canvas: per-panel detail map ---------- */
function ndHero(title: string, sub: string, big?: boolean): string {
  return scPanel({
    cls: 'sc-hero sc-dhero accent-zone',
    x: 0,
    y: -156,
    w: 330,
    h: 128,
    body: `<div class="${big ? 'svc-name sm' : 'philo sm'}">${title}</div>${sub ? `<span class="svc-for" style="margin-top:6px;">${sub}</span>` : ''}`,
  });
}
function ndPanel(tag: string, body: string, x: number, y: number, w: number, h: number, cls?: string): string {
  return scPanel({ tag, cls: 'sc-clushead' + (cls ? ' ' + cls : ''), x, y, w, h, body });
}
function nestedWrap(title: string, inner: string): string {
  return `<div class="scase nested">
      <div class="sc-head">${title} <span>drag · scroll to zoom</span></div>
      <div class="sc-canvas"><svg class="sc-wires"></svg>${inner}</div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>`;
}
function serviceDetail(s: Service): string {
  const hero = ndHero(s.name, s.for, true);
  const outcome = ndPanel('▸ THE OUTCOME', `<div class="svc-outcome">${s.outcome}</div>`, 0, 8, 380, 96, 'nd-outcome');
  const exTiles = s.ex.map((ex, i) => ndPanel('example', `<span class="sc-sat-lbl">${ex}</span>`, -176 + i * 176, 168, 150, 64, 'nd-ex')).join('');
  const deliver = ndPanel(
    '▸ WHAT YOU GET · deliverables',
    `<div class="std-chiplist">${s.deliver.map((d) => `<span class="chip">${d}</span>`).join('')}</div>`,
    0,
    288,
    400,
    118,
    'nd-deliver',
  );
  return nestedWrap(`${s.name} — detail`, hero + outcome + exTiles + deliver);
}

export function detailFor(id: string): string {
  if (id === 'svc1') return serviceDetail(SERVICES[0]);
  if (id === 'svc2') return serviceDetail(SERVICES[1]);
  if (id === 'svc3') return serviceDetail(SERVICES[2]);
  if (id === 'philosophy') {
    const hero = ndHero(PHILOSOPHY, 'the whole offer');
    const a = ndPanel('① TWO THINGS', '<div class="clus-title">Two things</div><span class="svc-for">Portfolio sites · Landing pages — nothing else.</span>', -220, 30, 250, 116);
    const b = ndPanel('② DONE EXCEPTIONALLY', '<div class="clus-title">Done exceptionally</div><span class="svc-for">Not ten services done okay.</span>', 220, 30, 250, 116);
    const c = ndPanel('③ WHY TWO', '<div class="clus-title">Focus is the feature</div><span class="svc-for">One person, two things, all-in on the outcome.</span>', 0, 210, 300, 112);
    return nestedWrap('Philosophy — detail', hero + a + b + c);
  }
  if (id === 'standards') {
    const hero = ndHero('Always included', 'six standards, every project');
    const offs = [
      [-310, -6],
      [0, -6],
      [310, -6],
      [-310, 158],
      [0, 158],
      [310, 158],
    ];
    const tiles = STANDARDS.map((s, i) =>
      ndPanel('▸ standard', `<div class="std-name">${s}</div><span class="svc-for">${STD_GLOSS[s]}</span>`, offs[i][0], offs[i][1], 240, 118, 'nd-std'),
    ).join('');
    return nestedWrap('Always included — detail', hero + tiles);
  }
  if (id === 'cta') {
    const hero = ndHero('Start a project', 'two ways in');
    const a = ndPanel('▸ PRIMARY', `<span class="btn cta-ring sc-btn">See pricing ▸</span><span class="sc-sat-eyebrow">→ /pricing</span>`, -200, 30, 230, 116, 'nd-cta');
    const b = ndPanel('▸ SECONDARY', `<span class="btn ghost-btn sc-btn">Work with me ▸</span><span class="sc-sat-eyebrow">→ /contact</span>`, 200, 30, 230, 116);
    const c = ndPanel('▸ SCARCITY', '<div class="clus-title">One project at a time</div><span class="svc-for">One seat open this month.</span>', 0, 208, 300, 112);
    return nestedWrap('Start a project — detail', hero + a + b + c);
  }
  return '';
}
