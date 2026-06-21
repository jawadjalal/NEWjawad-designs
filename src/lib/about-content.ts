/**
 * /about — standalone page content builder.
 *
 * About used to live only as a homepage panel that match-cut into a nested
 * "orbit" canvas (detailFor('about') in home-camera.ts). Now it has its own
 * route, following the same pattern as /contact: the homepage panel still opens
 * its on-canvas detail, and this page renders the same idea as a real spatial
 * canvas (a central "me" hero with satellite cards wired off it).
 *
 * Same Direction-D shape as the slug case study: a `.scase` with a `.sc-hero`
 * core and satellite `.sc-panel`s; wires radiate hero → each card. Copy is
 * lifted from the orbit canvas (WHO / HOW I WORK / BEYOND WORK / SAY HI) and
 * fleshed out from the original greybox placeholders into real sentences now
 * that this is a page people actually read.
 */

type PanelOpts = { tag: string; cls?: string; x: number; y: number; w: number; h: number; body: string };

function scasePanel(o: PanelOpts): string {
  const base = `left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);width:${o.w}px;min-height:${o.h}px;`;
  return `<div class="sc-panel${o.cls ? ' ' + o.cls : ''}" style="${base}">
      <span class="sc-tag">${o.tag}</span>
      <div class="sc-body">${o.body}</div>
    </div>`;
}

export function sheetD(): string {
  // The "me, in the middle" hero — portrait ring + name + one-line bio.
  const hero = `<div class="sc-panel sc-hero ab-hero" style="left:50%;top:calc(50% - 12px);width:320px;min-height:236px;">
      <div class="ab-ring"><img class="ab-face" src="/assets/jawad-hero.webp" alt="Jawad" draggable="false"><span class="ab-glare"></span></div>
      <div class="ab-name">Jawad</div>
      <span class="sc-tag ab-bio">designer · engineer · 15 · london</span>
    </div>`;

  const sats: PanelOpts[] = [
    { tag: 'WHO', x: -330, y: -150, w: 248, h: 150,
      body: `<div class="ab-h">The short version</div><p class="ab-p">15, based in London. I design and build digital products end to end — the idea, the interface, and the code that ships it.</p>` },
    { tag: 'HOW I WORK', x: 330, y: -150, w: 248, h: 150,
      body: `<div class="ab-h">One person, start to ship</div><p class="ab-p">No handoffs. I carry a problem from first sketch to a deployed product, so the original vision stays intact the whole way through.</p>` },
    { tag: 'BEYOND WORK', x: -330, y: 156, w: 248, h: 140,
      body: `<div class="ab-h">Off the clock</div><p class="ab-p">When I'm not shipping I'm pulling apart design systems, motion, and the games and tools that make me want to build the next thing.</p>` },
    { tag: 'SAY HI', cls: 'sc-cta ab-cta', x: 330, y: 156, w: 248, h: 140,
      body: `<div class="ab-h">Work with me</div><a class="btn cta-ring" href="/contact">Start a project ▸</a>` },
  ];

  return `<div class="scase">
      <div class="sc-head">about — just me <span>nested canvas · drag · scroll to zoom</span></div>
      <div class="sc-canvas">
        <svg class="sc-wires"></svg>
        ${hero}
        ${sats.map(scasePanel).join('')}
      </div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>`;
}
