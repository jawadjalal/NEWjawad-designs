/**
 * Contact page — Direction D content builders.
 *
 * Faithful 1:1 port of the Direction-D parts of the prototype's `contact.js`
 * (`window.CONTACT`): the focused-form canvas (`sheetD`) — you land on a real,
 * focusable form panel, with socials / Discord / Calendly cards orbiting it —
 * and the nested detail canvases (`detailFor`). Returns HTML strings.
 *
 * Direction D only. D embeds `form()` (no success state — that belonged to the
 * A/B/C `formWrap`), so the "Send" button is visually inert here, exactly as in
 * the prototype's D. The tier label is wired live in ContactCanvas.
 */

const flag = (t: string, pos: string) => `<span class="cta-flag" style="${pos}">${t}</span>`;
const btn = (txt: string, cls = '') => `<span class="btn ${cls}">${txt}</span>`;

const HEADLINE = 'Let’s build something.';
const EMAIL = 'hi@jawadj.design';
export const TIER_NAMES: Record<string, string> = { none: '—', single: 'The Single', edition: 'The Edition', commission: 'The Commission' };

function form(o: { flags?: boolean; big?: boolean } = {}): string {
  return `<form class="cf-form" novalidate>
    <div class="cf-tier" data-tier-label><span class="lbl">tier</span><b data-tier-name>—</b><span class="cf-tier-from">pre-filled from /pricing?tier=</span></div>
    <label class="cf-field"><span class="cf-lab">name</span><input class="cf-input" type="text" placeholder="your name" autocomplete="name"></label>
    <label class="cf-field"><span class="cf-lab">email</span><input class="cf-input" type="email" placeholder="you@studio.com" autocomplete="email"></label>
    <label class="cf-field"><span class="cf-lab">message</span><textarea class="cf-input cf-area${o.big ? ' cf-area-lg' : ''}" rows="${o.big ? 4 : 3}" placeholder="what are we building?"></textarea></label>
    <input type="text" class="cf-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" placeholder="leave blank">
    <div class="cf-foot">
      <div class="cf-tierseg" role="group" aria-label="choose a tier">
        <span class="lbl">switch tier</span>
        ${Object.keys(TIER_NAMES).map((k) => `<button type="button" data-tier="${k}">${k === 'none' ? 'none' : TIER_NAMES[k].replace('The ', '')}</button>`).join('')}
      </div>
      <span class="btn cta-ring cf-send">Send it ▸</span>
    </div>
    ${o.flags ? `${flag('honeypot · hidden anti-spam field', 'top:-13px;right:10px;')}` : ''}
  </form>`;
}

function calendly(): string {
  return `<div class="cal-embed"><span class="section-tag csec-tag" style="margin:0 0 10px;">CALENDLY · restyled embed</span>
    <div class="cal-grid"><div class="cal-col">${[0, 1, 2, 3, 4].map(() => '<span class="cal-slot"></span>').join('')}</div>
      <div class="cal-times">${[0, 1, 2, 3].map(() => '<span class="cal-time"></span>').join('')}</div></div></div>`;
}

type PanelOpts = { n?: number; tag?: string; cls?: string; open?: string; flag?: string; x: number; y: number; w: number; h: number; body: string };
function scPanel(o: PanelOpts): string {
  const base = `left:calc(50% + ${o.x}px);top:calc(50% + ${o.y}px);width:${o.w}px;height:${o.h}px;`;
  const open = o.open ? ` data-open="${o.open}"` : '';
  return `<div class="sc-panel${o.cls ? ' ' + o.cls : ''}${o.open ? ' openable' : ''}" style="${base}"${open}>
      ${o.n ? `<span class="sc-num">${o.n}</span>` : ''}
      ${o.tag ? `<span class="sc-tag">${o.tag}</span>` : ''}
      <div class="sc-body">${o.body}</div>
      ${o.flag ? flag(o.flag, 'top:-13px;left:10px;') : ''}
      ${o.open ? '<span class="sc-open-cur">OPEN ⤢</span>' : ''}
    </div>`;
}

export function sheetD(): string {
  // the FORM is the one focused panel you land on (centre, sc-hero); supporting cards orbit and open.
  const formPanel = scPanel({ n: 1, tag: '① THE FORM · land here', cls: 'sc-hero cf-formpanel accent-zone sc-focal', x: 0, y: 0, w: 404, h: 486, body: `<div class="cf-headline sm">${HEADLINE}</div>${form({ flags: false, big: true })}` });
  const socials = scPanel({ n: 2, tag: '② SOCIALS + DIRECT', cls: 'sc-clushead', open: 'socials', x: -418, y: -118, w: 262, h: 152, body: `<div class="clus-title">Find me</div><span class="lbl">Instagram · X · LinkedIn</span><span class="lbl" style="margin-top:5px;">${EMAIL}</span>` });
  const discord = scPanel({ n: 3, tag: '③ DISCORD', cls: 'sc-clushead', open: 'discord', x: 418, y: -118, w: 262, h: 152, body: `<div class="clus-title">My Discord server</div><span class="lbl">the studio’s community channel</span>` });
  const cal = scPanel({ n: 4, tag: '④ BOOK A CALL', cls: 'sc-clushead sc-cta', open: 'calendly', x: 0, y: 348, w: 300, h: 140, body: `<div class="clus-title">Book a call</div><span class="lbl">restyled Calendly · 15 min</span>` });
  return `<div class="scase worlds cf-canvas">
      <div class="sc-head">Contact <span>the form is centred · drag to reveal cards · click a card to open</span></div>
      <div class="sc-canvas"><svg class="sc-wires"></svg>
        ${formPanel}${socials}${discord}${cal}</div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>
    <div class="sc-detail"><div class="detail-chrome"><span class="back-pill">← Back to form</span><span class="close-x">✕</span></div><div class="detail-body"></div></div>`;
}

/* nested canvas-in-a-canvas detail for the side cards (radial) */
function ndHero(title: string, sub: string): string {
  return scPanel({ n: 1, tag: '① ' + title.toUpperCase(), cls: 'sc-hero sc-dhero accent-zone', x: 0, y: -40, w: 300, h: 140, body: `<div class="pr-tname">${title}</div><span class="nd-foot" style="margin-top:6px;">${sub}</span>` });
}
function ndP(n: number, tag: string, body: string, x: number, y: number, w: number, h: number, cls?: string): string {
  return scPanel({ n, tag, cls: 'sc-clushead' + (cls ? ' ' + cls : ''), x, y, w, h, body });
}
function nestedWrap(title: string, inner: string): string {
  return `<div class="scase nested">
      <div class="sc-head">${title} <span>drag · scroll to zoom</span></div>
      <div class="sc-canvas"><svg class="sc-wires"></svg>${inner}</div>
      <div class="wb-ctrls sc-ctrls"><button data-z="out">–</button><button data-z="home">⊚</button><button data-z="in">+</button></div>
    </div>`;
}
export function detailFor(id: string): string {
  if (id === 'socials') {
    const hero = ndHero('Find me', 'where I actually post');
    const ig = ndP(2, '', `<span class="soc-circ-name">IG</span><span class="nd-foot">@j.awadjalal</span>`, -210, 134, 150, 150, 'nd-soc-circle');
    const x = ndP(3, '', `<span class="soc-circ-name">X</span><span class="nd-foot">@jawadmakes</span>`, 0, 134, 150, 150, 'nd-soc-circle');
    const li = ndP(4, '', `<span class="soc-circ-name">in</span><span class="nd-foot">/in/jawad-jalal-designs</span>`, 210, 134, 150, 150, 'nd-soc-circle');
    const em = scPanel({ n: 5, tag: 'email', cls: 'sc-cta nd-cta-prom accent-zone', x: 0, y: 300, w: 392, h: 126, body: `<span class="nd-cta-lead">Or just email me.</span><span class="btn cta-ring sc-btn-lg">${EMAIL}</span>` });
    return nestedWrap('Socials — detail', hero + ig + x + li + em);
  }
  if (id === 'discord') {
    const hero = ndHero('My Discord server', 'the studio community');
    const a = ndP(2, 'what’s inside', '<div class="nd-best">Channels for works-in-progress, resources I’m sharing, and a #show-your-work room.</div>', -300, 34, 300, 150, 'nd-best');
    const b = ndP(3, 'who’s in', '<div class="nd-best">Clients, past + present, plus designers and founders I’ve worked with.</div>', 300, 34, 300, 150, 'nd-best');
    const j = scPanel({ n: 4, tag: 'join', cls: 'sc-cta nd-cta-prom accent-zone', x: 0, y: 232, w: 392, h: 128, body: `<span class="nd-cta-lead">Come hang out in the server.</span><span class="btn cta-ring sc-btn-lg">Join the server ▸</span><span class="sc-sat-eyebrow">→ discord.gg/jawad</span>` });
    return nestedWrap('Discord — detail', hero + a + b + j);
  }
  if (id === 'calendly') {
    const hero = scPanel({ n: 1, tag: '① BOOK A CALL', cls: 'sc-hero sc-dhero accent-zone', x: 0, y: -128, w: 300, h: 96, body: `<div class="pr-tname">Book a call</div><span class="nd-foot" style="margin-top:4px;">15 min · no pitch</span>` });
    const embed = ndP(2, 'restyled embed', calendly(), 0, 46, 360, 176, 'nd-cal');
    const j = scPanel({ n: 3, tag: 'or', cls: 'sc-cta nd-cta-prom accent-zone', x: 0, y: 210, w: 360, h: 96, body: `<span class="nd-cta-lead">Prefer email?</span><span class="btn cta-ring sc-btn">${EMAIL}</span>` });
    return nestedWrap('Calendly — detail', hero + embed + j);
  }
  return '';
}
