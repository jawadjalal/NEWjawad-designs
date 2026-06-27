/**
 * /work/[slug] case study — Direction D content builder.
 *
 * Faithful 1:1 port of the Direction-D part of the prototype's `slug.js`
 * (`window.SLUG`): the compact nested case-study canvas (`sheetD`), where each
 * section of the write-up is a panel placed spatially around the weld hero and
 * wires radiate from the hero to all of them.
 *
 * The prototype only populates the template with the **weld** project, so this
 * renders weld for every slug (other projects would slot into the same shape).
 * Pan / zoom + wires only — no zoom-into-detail here.
 */

const bar = (w = '100%', h?: number) => `<div class="bar" style="width:${w}${h ? `;height:${h}px` : ''}"></div>`;
const flag = (t: string, pos: string) => `<span class="cta-flag" style="${pos}">${t}</span>`;
const btn = (txt: string, cls = '') => `<span class="btn ${cls}">${txt}</span>`;

type PanelOpts = { n?: number; tag: string; cls?: string; flag?: string; cur?: boolean; x: number; y: number; w: number; h: number; body: string };
function scasePanel(o: PanelOpts): string {
  const base = `left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);width:${o.w}px;height:${o.h}px;`;
  const badge = o.n ? `<span class="sc-num">${o.n}</span>` : '';
  return `<div class="sc-panel${o.cls ? ' ' + o.cls : ''}" style="${base}">${badge}
      <span class="sc-tag">${o.tag}</span>
      <div class="sc-body">${o.body}</div>
      ${o.flag ? flag(o.flag, 'top:-13px;left:10px;') : ''}
      ${o.cur ? '<span class="view-cur">VIEW</span>' : ''}
    </div>`;
}

export function sheetD(): string {
  const microMeta = `<div class="sc-meta">
      <div><span class="lbl">Client</span><span class="mval">weld — own product</span></div>
      <div><span class="lbl">Year</span><span class="mval">2025</span></div>
      <div><span class="lbl">Services</span><span class="mval">Product · Design · Eng</span></div></div>`;
  const miniStats = `<div class="sc-stats">
      <div class="sc-stat"><span class="sc-statnum">200</span><span class="lbl">signups</span></div>
      <div class="sc-stat"><span class="sc-statnum">$0</span><span class="lbl">paid</span></div>
      <div class="sc-stat"><span class="sc-statnum">1</span><span class="lbl">solo</span></div></div>`;
  const twoThumbs = `<div class="sc-thumbs"><div class="img" style="flex:1;height:100%;"></div><div class="img" style="flex:1;height:100%;"></div></div>`;
  const panels: PanelOpts[] = [
    { n: 1, tag: '① HERO', cls: 'sc-hero accent-zone sc-focal', x: 0, y: -26, w: 248, h: 150, body: `<div class="sc-proj">weld</div><div class="bars" style="width:80%;margin-top:8px;">${bar('100%', 8)}${bar('60%', 8)}</div>`, cur: true },
    { n: 2, tag: '② META', x: 308, y: -176, w: 212, h: 118, body: microMeta },
    { n: 3, tag: '③ PROBLEM', x: -318, y: -168, w: 214, h: 128, body: `<div class="bars" style="width:92%;">${bar('100%', 12)}${bar('78%', 12)}</div><div class="bars" style="width:80%;margin-top:8px;">${bar('100%', 7)}${bar('66%', 7)}</div>` },
    { n: 4, tag: '④ WHAT I BUILT', x: -330, y: 108, w: 206, h: 122, body: `<span class="solo-badge">built solo</span><div class="bars" style="width:88%;margin-top:9px;">${bar('100%', 7)}${bar('100%', 7)}${bar('54%', 7)}</div>` },
    { n: 5, tag: '⑤ PROCESS', x: 318, y: 96, w: 230, h: 140, flag: 'parallax', body: twoThumbs },
    { n: 6, tag: '⑥ OUTCOME', cls: 'accent-zone', x: 0, y: 188, w: 300, h: 128, flag: 'counts up on scroll', body: miniStats },
    { n: 7, tag: '⑦ STACK', x: 0, y: 344, w: 330, h: 62, body: `<span class="mval" style="font-size:11px;">Next.js · TypeScript · Tailwind · Supabase · Vercel</span>` },
    { n: 8, tag: '⑧ CONTACT', cls: 'sc-cta', x: 330, y: 286, w: 206, h: 118, body: `<div class="bars" style="width:78%;margin-bottom:9px;">${bar('100%', 9)}</div>${btn('Work with me ▸', 'cta-ring')}` },
  ];
  return `<div class="scase">
      <div class="sc-head">weld — case study <span>nested canvas · drag · scroll to zoom</span></div>
      <div class="sc-canvas">
        <svg class="sc-wires"></svg>
        ${panels.map(scasePanel).join('')}
      </div>
      <div class="sc-next">Next panel →</div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>`;
}
