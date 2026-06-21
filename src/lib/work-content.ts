/**
 * /work — Direction D content: the infinite whiteboard.
 *
 * Faithful 1:1 port of the Direction-D part of the prototype's `work.js`:
 * weld anchored at centre, VizzBees + KleoKlaw orbiting as real project panels,
 * and a billboard panel that auto-cycles all real projects with a venetian-blind
 * slat animation. Returns the `.wb` markup; createWhiteboard wires pan/zoom +
 * the slat animation + opening a project.
 *
 * Migration touch: real-project panels carry `data-slug` so a click opens
 * /work/[slug] — the prototype's panels show an "open work" / "VIEW" cursor but
 * the standalone wireframe had no router; this realises that intent. Ghost
 * ("coming soon") panels stay inert. Image paths rebased to /uploads + /assets.
 */

type Proj = { id: string; src: string; name: string; cat: string; pos: string };

const PROJS: Proj[] = [
  { id: 'vizzbees', src: '/uploads/pasted-1781353449899-0.webp', name: 'VizzBees', cat: 'web · saas', pos: '50% 8%' },
  { id: 'kleoklaw', src: '/uploads/pasted-1781353513462-0.webp', name: 'KleoKlaw', cat: 'product · mobile', pos: '50% 5%' },
];
// Billboard cycles KleoKlaw → Weld → VizzBees
const BB_PROJS: Proj[] = [
  { id: 'kleoklaw', src: '/uploads/pasted-1781353513462-0.webp', name: 'KleoKlaw', cat: 'product · mobile', pos: '50% 5%' },
  { id: 'weld', src: '/assets/weld/cards.webp', name: 'weld', cat: 'product · 2025', pos: '50% 0%' },
  { id: 'vizzbees', src: '/uploads/pasted-1781353449899-0.webp', name: 'VizzBees', cat: 'web · saas', pos: '50% 8%' },
];

type Panel = { type?: string; x: number; y: number; w: number; h: number; r?: number };
const PANELS: Panel[] = [
  { type: 'weld', x: 0, y: 0, w: 286, h: 212, r: 0 },
  { type: 'bb', x: -390, y: -202, w: 234, h: 164, r: -3 },
  { type: 'vizzbees', x: 262, y: -232, w: 186, h: 132, r: -2 },
  { type: 'kleoklaw', x: -90, y: -272, w: 172, h: 128, r: 2 },
  { x: -504, y: 20, w: 150, h: 152, r: 3 },
  { x: 318, y: -50, w: 192, h: 136, r: -2 },
  { x: -348, y: 244, w: 172, h: 122, r: -3 },
  { x: -50, y: 308, w: 156, h: 140, r: 2 },
  { x: 222, y: 302, w: 164, h: 122, r: -2 },
  { x: 566, y: -54, w: 152, h: 166, r: 3 },
  { x: -582, y: 270, w: 142, h: 120, r: -2 },
  { x: 128, y: -348, w: 150, h: 112, r: 2 },
  { x: 574, y: 156, w: 160, h: 132, r: -3 },
];

const N_SLATS = 8;
function bbSlatsHTML(proj: Proj): string {
  return Array.from({ length: N_SLATS }, () => `<div class="bb-slat"><img src="${proj.src}" alt="${proj.name}" draggable="false" decoding="async" style="position:absolute;left:0;width:100%;display:block;object-fit:cover;object-position:${proj.pos};"/></div>`).join('');
}

// JSON the slat animation reads (id included so a click can route to the project).
const bbJSON = () => JSON.stringify(BB_PROJS.map((pr) => ({ id: pr.id, src: pr.src, name: pr.name, cat: pr.cat, pos: pr.pos })));
const bbPips = () => BB_PROJS.map((_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('');

function base(p: Panel): string {
  return `left:calc(50% + ${p.x}px);top:calc(50% + ${p.y}px);width:${p.w}px;height:${p.h}px;transform:translate(-50%,-50%) rotate(${p.r || 0}deg);`;
}

function wbBillboard(p: Panel): string {
  return `<div class="wb-panel wb-billboard" style="${base(p)}box-sizing:border-box;" data-bb='${bbJSON()}' data-slug="${BB_PROJS[0].id}">
    <div class="bb-wrap">
      <div class="bb-slats">${bbSlatsHTML(BB_PROJS[0])}</div>
      <div class="bb-overlay"><span class="bb-name">${BB_PROJS[0].name}</span><span class="bb-cat">${BB_PROJS[0].cat}</span></div>
      <div class="bb-pips">${bbPips()}</div>
    </div>
    <span class="view-cur">open work</span>
  </div>`;
}

function wbProj(p: Panel, proj: Proj): string {
  return `<div class="wb-panel wb-proj" data-slug="${proj.id}" style="${base(p)}box-sizing:border-box;background:var(--paper);padding:8px;display:flex;flex-direction:column;gap:6px;border:2.5px solid rgba(255,255,255,.85);border-radius:7px;box-shadow:0 0 0 1px var(--line-soft),0 16px 38px rgba(0,0,0,.2);">
    <div style="flex:1;min-height:0;border-radius:3px;overflow:hidden;">
      <img src="${proj.src}" alt="${proj.name}" draggable="false" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:${proj.pos};display:block;"/>
    </div>
    <div style="flex:none;display:flex;align-items:baseline;gap:6px;padding:0 1px;">
      <span class="lbl" style="font-family:var(--hand);font-size:14px;color:var(--ink);">${proj.name}</span>
      <span class="lbl" style="color:var(--ink-soft);font-size:8px;text-transform:uppercase;letter-spacing:.08em;">${proj.cat}</span>
    </div>
    <span class="view-cur">VIEW</span>
  </div>`;
}

function wbPanel(p: Panel): string {
  if (p.type === 'bb') return wbBillboard(p);
  if (p.type === 'vizzbees') return wbProj(p, PROJS[0]);
  if (p.type === 'kleoklaw') return wbProj(p, PROJS[1]);
  if (p.type === 'weld') {
    return `<div class="wb-panel wb-weld" data-slug="weld" style="${base(p)}box-sizing:border-box;background:var(--paper);padding:10px;display:flex;flex-direction:column;gap:8px;border:2.5px solid rgba(255,255,255,.85);border-radius:8px;box-shadow:0 0 0 1px var(--line-soft),0 20px 50px rgba(0,0,0,.22);" data-bb='${bbJSON()}'>
      <div class="bb-wrap" style="flex:1;min-height:0;border-radius:4px;overflow:hidden;">
        <div class="bb-slats">${bbSlatsHTML(BB_PROJS[0])}</div>
        <div class="bb-overlay"><span class="bb-name">${BB_PROJS[0].name}</span><span class="bb-cat">${BB_PROJS[0].cat}</span></div>
        <div class="bb-pips">${bbPips()}</div>
      </div>
      <div style="flex:none;display:flex;align-items:baseline;gap:8px;padding:0 2px;">
        <span class="lbl wb-bb-meta-name" style="font-family:var(--hand);font-size:18px;color:var(--ink);">${BB_PROJS[0].name}</span>
        <span class="lbl wb-bb-meta-cat" style="color:var(--ink-soft);">${BB_PROJS[0].cat}</span>
      </div>
      <span class="view-cur">open work</span>
    </div>`;
  }
  // Ghost (no data-slug → inert)
  return `<div class="wb-panel" style="${base(p)}">
    <div class="ghost" style="width:100%;height:100%;"><span class="plus">+</span><span class="lbl">coming soon</span><span class="view-cur">VIEW</span></div></div>`;
}

export function whiteboard(): string {
  const panels = PANELS.map(wbPanel).join('');
  return `<div class="wb">
    <div class="wb-head">Selected work. <span>drag to explore · scroll to zoom</span></div>
    <div class="wb-canvas">${panels}</div>
    <div class="wb-ctrls"><button data-z="out" title="zoom out">–</button><button data-z="home" title="recentre">⊚</button><button data-z="in" title="zoom in">+</button></div>
  </div>`;
}
