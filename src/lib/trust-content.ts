/**
 * /trust — standalone page content builder.
 *
 * Like /about, Trust used to live only as a homepage panel that match-cut into
 * a nested orbit canvas (detailFor('trust') in home-camera.ts). It now has its
 * own route (same Contact-style pattern): the homepage panel still opens its
 * on-canvas detail, and this page renders the proof as a real spatial canvas —
 * the pull-quote hero with the testimonial, who Joel is, and the result wired
 * off it. Copy is lifted from the orbit canvas and expanded from the original
 * greybox placeholders into real lines.
 */

type PanelOpts = { tag: string; cls?: string; x: number; y: number; w: number; h: number; body: string };

function scasePanel(o: PanelOpts): string {
  const base = `left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);width:${o.w}px;min-height:${o.h}px;`;
  return `<div class="sc-panel${o.cls ? ' ' + o.cls : ''}" style="${base}">
      <span class="sc-tag">${o.tag}</span>
      <div class="sc-body">${o.body}</div>
    </div>`;
}

const stat = (v: string, k: string) => `<div class="tr-stat"><span class="tr-statnum">${v}</span><span class="lbl">${k}</span></div>`;

export function sheetD(): string {
  // The pull-quote hero — the line, then who said it.
  const hero = `<div class="sc-panel sc-hero tr-hero" style="left:50%;top:calc(50% - 16px);width:360px;min-height:188px;">
      <div class="tr-quote"><span class="q1">great skill</span><span class="q2">great design</span><span class="q3">great speed</span></div>
      <div class="tr-attrib">Joel Jeon · founder, weld</div>
    </div>`;

  const sats: PanelOpts[] = [
    { tag: 'THE TESTIMONIAL', x: -360, y: -118, w: 288, h: 160,
      body: `<div class="tr-h">others love me</div><p class="tr-p">“Jawad shipped weld with great skill, great design, and great speed — solo. He moves like a whole team.”</p>` },
    { tag: 'WHO JOEL IS', x: 360, y: -118, w: 288, h: 160,
      body: `<div class="tr-h">Founder, weld</div><span class="sc-tag">roblox talent studio</span><p class="tr-p">Joel runs weld, a Roblox talent studio. He brought me on to design and build the product from zero.</p>` },
    { tag: 'THE RESULT', cls: 'tr-result', x: 0, y: 196, w: 380, h: 120,
      body: `<div class="tr-h">weld, in numbers</div><div class="tr-stats">${stat('200', 'signups')}${stat('$0', 'paid')}${stat('fast', 'trajectory')}</div>` },
  ];

  return `<div class="scase">
      <div class="sc-head">trust — the proof behind the line <span>nested canvas · drag · scroll to zoom</span></div>
      <div class="sc-canvas">
        <svg class="sc-wires"></svg>
        ${hero}
        ${sats.map(scasePanel).join('')}
      </div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>`;
}
