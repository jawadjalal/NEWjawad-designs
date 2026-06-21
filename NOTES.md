# NOTES — architecture decisions

A running log of *why* things are built the way they are. Plain language, for a
designer reading the code later.

---

## Phase 0 — Foundation

### Decision: real routes (not one mega-canvas) + `next-view-transitions`

**The choice.** Three options were on the table (roadmap §3.1):

1. **Real routes** — `/`, `/work`, `/work/[slug]`, `/services`, `/process`, `/pricing`, `/contact`, with one persistent shell (nav + cursor) in the root layout.
2. **One canvas** — keep the whole experience under `/` and fake "pages" with internal state.
3. **Hybrid** — routes for real sub-pages, canvas state for the rest.

**We picked option 1 (real routes).** Reasons:

- It's a **portfolio**. Recruiters Google you and share deep links — `/work/weld` has to be a real, shareable, SEO-able URL. Option 2 throws that away.
- The persistent **shell lives in `app/layout.tsx`** (Nav, Cursor, SmoothScroll). Because the layout never remounts between route changes, the nav pill, the curved fill, and the cursor stay perfectly continuous — we get seamless motion *and* real URLs.
- About + Trust are **not routes** — in the prototype they're panels inside the home canvas. They stay that way: their nav links point at `/` and (in Phase 2) open the in-canvas panel. They're kept in the nav curve as the 4th/5th of the 7 nodes so the curve shape matches the prototype exactly.

**Transitions.** Animated *exit* transitions are the known-fiddly part of the Next App Router (roadmap §8). We chose the **View Transitions API via `next-view-transitions`** (option (a) in §3.1): `<ViewTransitions>` wraps the layout and the nav uses its `<Link>` / `useTransitionRouter`. This gives cross-route morphs without fighting the router, and keeps SEO. If a specific transition ever fights us, the fallback is to drop that one route under internal canvas state — but we're not pre-paying that complexity.

### Stack notes

- **Tailwind v3** (not v4) — the brief asks for tokens in `tailwind.config.ts`, which is the v3 config shape. Tokens are mirrored in `globals.css` as CSS custom properties so the ported nav/cursor CSS keeps using `var(--ink)` etc. unchanged.
- **GSAP 3.13** — all the plugins we need (ScrollTrigger, Draggable, InertiaPlugin, Flip, DrawSVGPlugin, MotionPathPlugin) are free as of April 2025. Registered once in `src/lib/gsap.ts`; import `gsap` from there everywhere.
- **Fonts via `next/font`** — Architects Daughter (`--hand`), Baloo 2 700/800 (the CTA / `--display`), Permanent Marker (`--marker`). No CSS `@import`, so no layout shift. SF Mono stays a system stack (`--mono`).
- **Lenis** — wired in `SmoothScroll.tsx`, driven off the GSAP ticker so it'll stay in lockstep with ScrollTrigger in Phase 2. One constant (`ENABLE_LENIS`) turns it off; it also self-disables under `prefers-reduced-motion`.

### Explicitly NOT ported (export scaffolding, per the brief)

The iframe shell, the `FS_CSS` injection, `routeFromText` text-matching routing, and the A/B/C/D "directions" explorer are all artifacts of how Claude Design exports multiple HTML files. They're gone. We keep only each page's shipped direction (E for home, D for the rest) and re-architect into routes + components.

---

## Phase 1 — Persistent shell

### Nav fill: two modes, faithful to the prototype

`PathProgress.tsx` ports `buildNavCurve` / `applyNavProgress`:

- **buildNavCurve** measures the live `<a>` rects, threads a Catmull-Rom→Bézier curve through the label centers (same `navOFF` offsets + amplitude), and lays the `nc-line` (track), `nc-trav` (fill), per-label dots, and the red triangle tip. It rebuilds on mount, on `document.fonts.ready`, and on resize — DOM math needs the layout settled and fonts loaded.
- **Fill mode A — discrete (route pages):** on `/work`, `/services`, … the fill *snaps* to that link's node (old `setActiveNav`).
- **Fill mode B — continuous (home):** on `/` the fill tracks `store.scrollFrac`. In Phase 1 the home stub feeds `scrollFrac` from raw window scroll; in Phase 2 the home camera feeds it instead. Same channel either way (old `setNavScroll`).

### Cursor: `gsap.quickTo` instead of the hand-rolled lerp

The brief asked to port `cursor.js` faithfully but swap the manual `requestAnimationFrame` lerp for `gsap.quickTo()`. The original's per-frame lerp constants map to quickTo durations:

| feel mode | original `k` (per frame) | quickTo duration |
|---|---|---|
| snappy (default) | 0.5 | 0.18s |
| smooth | 0.16 | 0.5s |
| magnetic | 0.30 | 0.32s |
| (nav-path lock) | ~0.45 | 0.12s |

This works because the original loop's target is *static between pointer moves* (the magnetic blend and path-lock point are recomputed only on `pointermove`), so a retargeting quickTo reproduces the same convergence. Everything else — feel modes, ink splat, OPEN bloom over `.openable`/`[data-open]`, GRAB over draggables, invert over `.cta`, the `[data-cursor-say]` bubble, and lock+rotate along `[data-cursor-path]` — is ported 1:1. Under `prefers-reduced-motion` the durations collapse to ~0 (snap) and the spin keyframe is skipped.

### Navigation a11y (roadmap §8 pitfall)

The prototype's left-click=back / right-click=forward hijacks the context menu and has no keyboard path. So **visible nav links + arrow keys (← →) are the primary path**. The click shortcuts are kept as a **power-user** extra but guarded: right-click steps forward; left-click steps back **only** when the target isn't an interactive element / inside the nav / marked `[data-no-back]`, so it can never steal a real click. A one-time dismissible hint (`#nav-hint`) surfaces the shortcut.

---

## Phase 2 — Homepage camera (Direction E)

The whole home route is now the spatial canvas. The engine is a faithful 1:1
port of `extracted/homepage-e-v2.js` (the `HOMEE` engine).

### Shape: a framework-agnostic engine, mounted by a thin component

`lib/home-camera.ts` is `createHomeCamera(root, { onNav, onRoute })` — the entire
imperative engine (panels, brand loader, controls preloader, inertia scroll +
magnetic settle, depth/parallax, settle-pose, panel tilt+glare, idle breath,
minimap, nested About/Trust/Contact canvases). `components/home/HomeCamera.tsx`
renders only the static shell and mounts the engine in `useGSAP` (DOM-measuring,
client-only). Two wires connect it to the app:
- `onNav({frac, idx})` → `useStore.setScroll`, so the persistent bottom-nav curve
  (Phase 1) fills against the **real camera** instead of the window-scroll stub.
- `onRoute(route)` → the view-transition router, so a route panel navigates.

Why a near-verbatim imperative port rather than a React rewrite: the engine is a
single tightly-coupled state machine (camera ↔ scroll ↔ settle ↔ preview ↔ tilt),
and the bar for this phase is *pixel- and feel-identical*. Re-expressing it as
React state/effects would risk the feel for no behavioural gain. Same reasoning
the Phase-1 cursor followed.

### GSAP as the clock, integrator math untouched

Per the "GSAP is the motion engine" rule, every per-frame loop runs on
`gsap.ticker` (added/removed via `addTick`/`removeTick`) instead of bare
`requestAnimationFrame`/`setTimeout(…,16)`. The **math is unchanged** — same
`SMOOTH = 0.11` inertia approach, same `*0.12 / *0.14` tilt lerps, same
easeInOutCubic settle, same distance-aware durations, same hero word-swap
easings. `gsap.ticker` fires at the same rAF cadence the original used, so the
convergence per frame is identical → identical feel. Pure *delays* (the dwell
timer, the 120 ms idle-settle debounce, the preloader typewriter) stay as
`setTimeout`; they're not animation. All tickers + timers + listeners are tracked
and torn down in `destroy()`, and `build()` is idempotent (clears prior panels/
loader) so React strict-mode's double-mount in dev can't duplicate the canvas.

### What was deliberately NOT ported (export scaffolding)

The live-iframe page previews — `mountPreview`'s `PV_FS_CSS` injection that loaded
and screenshot the *other* prototype HTML files — are the export scaffolding the
migration drops (hard rule #2). The greybox preview still **blooms** on settle
(the `.e-preview` expand + count-up), and the About/Trust/Contact detail previews
(pure scaled DOM, no iframe) are kept. Route panels just keep their static
greybox. Also gone: the `window.HOMEE` Tweaks API, the A/B/C/D tab/explorer shell,
the in-page annotation bar — none of it is part of the shipped page.

### Standalone presentation

In the prototype, Direction E lived inside the explorer at `min(78vh,780px)`; the
*shipped* (embedded) form fills the screen. So `home.css` ends with a `.e-home`
block that makes the stage fill the viewport, hides the in-canvas `.e-hint` (the
bottom nav pill already shows the click-shortcut hint), and lifts the spatial
minimap clear of the nav pill. The minimap is **kept visible** (panel-jump
navigation) since, standalone, the bottom-nav links route to pages rather than
home panels.

### Fonts

The hero wordmark's `--hero-font` default was the Google font **Bungee**; added to
`next/font` (`--font-bungee`) and the literal family names in the ported CSS were
swapped for the `--font-*` vars (Bungee / Permanent Marker / Baloo 2 / Architects
Daughter). No CSS `@import`.

### One faithfulness fix (flagged for review)

The Contact nested canvas is classed `e-detail-dark`, sets `background:#141310`,
and every child (slab head, fields, CTA) is styled white-on-dark — but the source
had **no** `.e-detail-dark .e-dwrap` rule, so `.e-dwrap`'s opaque paper grid sat on
top and washed the whole dark form out. Added the one missing rule so the dark
canvas reads as designed. This realises the existing design's clear intent (not a
redesign); if the live prototype actually showed it on paper, delete
`.e-detail-dark .e-dwrap` in `home.css` to revert.

---

## Phase 3 — Spatial canvas (Services, Direction D)

The `/services` route is now the pannable six-panel canvas with zoom-into-detail,
ported 1:1 from `services-render.js` + `services.js` (Direction D only).

### Shape: a reusable engine + a content builder + a thin component

Same split as Phase 2. Three pieces:
- `lib/spatial-canvas.ts` — `createSpatialCanvas(root, { detailFor, onRoute? })`,
  the framework-agnostic engine: pan, wheel/button zoom, connector wires, and
  the tap-to-zoom-into a nested detail canvas. This is the reusable core the
  roadmap calls `SpatialCanvas`/`Wires`/`DetailCanvas`; Phase 4's Work whiteboard
  will reuse it.
- `lib/services-content.ts` — a verbatim port of the prototype's `SVC` builders
  (`sheetD`, `detailFor` + helpers). Returns HTML strings, exactly as the
  prototype did. Copy / coordinates / sizes / class names are unchanged so the
  layout is pixel-identical.
- `components/services/ServicesCanvas.tsx` — `'use client'`; injects `sheetD()`
  once on mount and mounts the engine in `useGSAP` (DOM-measuring, client-only).

Why inject HTML rather than render JSX: the engine generates the *detail* canvas
on demand from `detailFor(id)` (innerHTML, as the prototype does), so building the
main sheet the same way keeps one source of truth and guarantees byte-identical
markup. Consistent with Phase 2's imperative home camera.

### GSAP owns the transform; the zoom-open stays the prototype's CSS transition

Per "GSAP is the motion engine", the one continuously-animated channel — the
canvas pan/zoom transform — is written through `gsap.set(cv,{x,y,scale})`, which
is visually identical to the prototype's raw `translate()/scale()` writes. **No
inertia is added** — the prototype's pan has none, and the bar is feel-identical,
so Draggable+InertiaPlugin would change the feel. Zoom stays instant and clamped
to the same 0.28–1.5 range about the canvas centre (not cursor-origin — that
would change behaviour).

The zoom-into-detail is a *discrete state change*, not a per-frame animation, and
the prototype implements it as a CSS transition (`transform .42s
cubic-bezier(.2,.7,.2,1), opacity .3s`). That CSS is ported verbatim, so its
timing is guaranteed identical; reduced-motion neutralises it in one media query
(hard rule #5). Nothing here needed `gsap.matchMedia()` because the only easing
lives in that CSS and pan/zoom is direct manipulation.

### The `[data-no-back]` fix (a real cross-phase interaction)

Tapping a canvas panel was *also* triggering the Nav's Phase-1 power-user
"left-click = back" shortcut, navigating away from `/services` the instant a
detail opened. Home never hit this only because it is route index 0 (back is a
no-op there). The fix is the guard Phase 1 built for exactly this: mark the canvas
wrapper `data-no-back` so left-click on the canvas means pan/open, never back.
Right-click = forward is left intact (it was global in the prototype shell too).

### What was deliberately NOT ported

Directions A/B/C (the linear `/services` layouts), the mobile frames, the
annotation column, and the Tweaks panel are all export/explorer scaffolding —
dropped, same as Phase 2 keeping only home E. We ship D. The CTA detail's
"See pricing → /pricing" / "Work with me → /contact" remain visual (as in the
standalone prototype); real conversion is the persistent nav CTA. Wiring those to
routes, plus the Work whiteboard (`work.js`, the `.wb` canvas + billboard slat
animation) and the other pages, is Phase 4.

### CSS source

`styles/canvas.css` = the `/services` `<style>` Direction-D rules + the handful of
shared `wireframe.css` atoms D actually renders (`.btn/.ghost-btn/.cta-ring/.lbl`)
+ the shell's `fs-nobezel` full-screen presentation (a fixed full-viewport stage;
zoom controls lifted clear of the bottom-nav, same move as Phase 2's minimap).
Font literals → `--font-*` vars; the greybox `--fill/--fill-2/--hatch` tokens are
scoped to `.svc-page` (globals.css carries only the public token set).

---

## Phase 4 — The pages (Work, the case-study slug, Process, Pricing, Contact)

All five remaining routes now ship their Direction D, replacing the placeholders.
The key discovery: **four of them are the same `.scase` engine from Phase 3** —
only the content and a couple of constants differ — so most of Phase 4 was
content ports + small parametrisation, not new machinery.

### Shared base (a small refactor first)

- The greybox tokens (`--fill/--fill-2/--hatch`) moved to `globals.css :root`
  (every spatial page needs them now), and `canvas.css`'s full-screen block is a
  shared `.canvas-page` class. The Phase-3 `.svc-page` wrapper became
  `.canvas-page`; nothing about Services changed visually.
- `canvas.css` also gained the shared **nested-detail atoms** (`.pr-tname`,
  `.nd-best`, `.nd-cta-prom`, `.sc-btn-lg`, …) since Pricing *and* Contact render
  them; each page's own CSS file (`pricing.css`, `contact.css`, `work.css`,
  `slug.css`, `process.css`) holds only what's unique to it.
- `components/canvas/SpatialCanvasPage.tsx` is the generic mount used by Pricing,
  Contact and the slug: it injects a page's `sheet()` HTML and wires
  `createSpatialCanvas`. `engineOpts` forwards per-page overrides; `onMount` runs
  extra wiring (the Contact form). All canvas pages carry `data-no-back` (the
  Phase-3 fix) and are `'use client'` — passing the builder functions from a
  Server Component is disallowed, and the whole page is a client canvas anyway.

### `createSpatialCanvas` gained four options (for the slug)

`mainHomeScale` (0.46 default; slug 0.78), `zoomMin` (0.28; slug 0.3),
`wireSelector` (`.sc-clushead, .sc-offerpanel` default; slug wires the hero to
*every* panel: `.sc-panel:not(.sc-hero)`), and `wireClass` (`w-main`; slug uses
the base stroke). The drag-ignore selector also grew to include form fields so
Contact's embedded form is usable.

### Pricing / Contact — same engine, new content

- **Pricing** (`pricing-content.ts`): the 7-panel openable canvas — header
  anchor + three tiers (the Edition is the `sc-hero` hub) + always-included +
  FAQ + CTA — with tier/FAQ zoom-into-detail. The Tweaks-only `tierMode:"scope"`
  detail variant is dropped; the shipped default `"map"` is what `detailFor`
  returns.
- **Contact** (`contact-content.ts`): the focused-form canvas — you land on a
  real, focusable form (`sc-hero`) with socials / Discord / Calendly cards
  orbiting and opening. `ContactPage`'s `wireForm` ports `setTier`: the in-form
  segmented control + a `?tier=` query update the tier label/border. Direction D
  uses `form()` (not the A/B/C `formWrap`), so it has **no success state** and
  "Send it" is inert — exactly as the prototype's D.

### Work whiteboard + the case-study slug

- **Work** is the one page with a *different* canvas (`.wb`, not `.scase`), so it
  gets a dedicated `lib/whiteboard.ts`: the prototype's `initWhiteboards`
  (pan + 0.35–1.6 zoom, home 0.9) and `initBillboards` (the venetian-blind slat
  cycle every 4.2 s). GSAP writes the pan/zoom transform; the slat fold keeps the
  prototype's inline CSS transitions verbatim; under reduced motion the auto-cycle
  is skipped. **Migration touch:** a clean tap on a real-project panel opens
  `/work/[slug]` (the panels' "open work"/"VIEW" cursor implies this; the
  standalone wireframe had no router). The VizzBees/KleoKlaw screenshots were
  copied into `public/uploads/`.
- **The slug** (`/work/[slug]`, `slug-content.ts`) reuses `createSpatialCanvas`
  via `engineOpts` — the 8-panel weld case-study canvas, pan/zoom + hero→all
  wires, no detail. The prototype only populated the template with **weld**, so
  every slug renders the weld write-up.

### Process — a strip, not a canvas

`/process` is the odd one: the main view is a horizontal **scroll-strip** of step
cards, not a `.scase`. `lib/process-strip.ts` ports `initProcess` (vertical wheel
→ horizontal scroll, drag-to-scroll, active-card highlight, progress bar, click →
open). Native scroll drives the strip (as the prototype does — nothing to animate
there); each step's radial detail canvas, though, *is* a normal nested `.scase`,
so the strip engine just spins up a `createSpatialCanvas` on the detail subtree
when a step opens and destroys it on close. (Source quirk kept verbatim: the title
says "Six steps", there are six, each card tags "STEP n OF 5".)

### Not ported / deferred

A/B/C directions, mobile frames, annotation columns and Tweaks panels for every
page (export scaffolding) — dropped, D only. Image optimisation (WebP/AVIF +
`next/image`, roadmap §9) and the mobile vertical fallback are **Phase 5** polish;
for now the upload PNGs are served as-is and the canvases are desktop-first.

---

## Phase 5a — Performance + accessibility

Polish pass. No visual or behavioural change to the prototype — only smaller
assets, a closed reduced-motion gap, and keyboard/landmark a11y.

### Images: optimise the asset, not the component

The content is built as HTML *strings* injected via `innerHTML` (Phases 2–4),
so `next/image` can't be used without rewriting every builder to JSX and losing
the byte-identical-markup guarantee. So we optimise at the **asset** level:
`scripts/optimize-images.mjs` (sharp, run via `npm run optimize:images`) walks
`public/` and emits a `.webp` for every PNG/JPG (plus `.avif` when it beats webp
by ≥15%). The string `src`/`url()` references were repointed to `.webp` —
dimensions, `object-position`, and markup all unchanged, so layout is identical.
Originals stay on disk as the source of truth.

- **Result:** raster assets 16.7 MB → 649 KB (−96%). Per route: home images
  5.47 MB → 293 KB (−95%), work 6.44 MB → 370 KB (−94%).
- **`.webp`, not `.avif`, in the markup:** a single `<img src>` can't carry a
  `<picture>` fallback list cleanly inside these one-line string builders, and
  WebP is universally supported in every current browser — so webp is the one
  format referenced. (AVIF files are emitted for the heaviest images as a future
  option but not wired in.)
- **`loading="lazy"` deliberately NOT added** to canvas images: every panel
  lives inside an always-present, transformed full-screen canvas (and the work
  billboard *cycles* its image), so lazy-loading risks deferring a visible image
  or breaking the slat animation — and at 26–117 KB each the win is negligible.
- `next.config.ts` was created (previously absent): `reactStrictMode` + the
  documented `images.formats` default.

### Reduced-motion gap closed (hard rule #5)

`process-strip.ts` was the one engine with no calm branch. The strip scrolls via
native CSS smooth-scroll, so the fix is CSS: a `@media (prefers-reduced-motion:
reduce)` block in `process.css` forces `scroll-behavior: auto` and neutralises
the active-card / progress-bar transitions — mirroring the targeted approach in
`canvas.css`. The nested step-detail canvas was already covered (it's a normal
`sc-*` canvas). Other engines re-checked: all still collapse to their calm
branch.

### Accessibility (roadmap §9)

- **Esc closes detail.** `spatial-canvas.ts` and `process-strip.ts` only closed a
  zoomed-in detail via the back/close buttons. Added a window `keydown` listener
  (tracked + torn down) so Esc closes an open `.sc-detail` — keyboard parity with
  the buttons, which stay the visible path. Additive, no visual change.
- **Focus ring.** The custom cursor is decorative and hides the pointer, so
  keyboard users had no focus indicator (globals.css had none). Added a
  token-based `:focus-visible` outline (`var(--accent)`) for interactive
  elements. `:focus-visible` (not `:focus`) keeps it keyboard-only, so the mouse
  look is unchanged.
- **`<main>` landmark.** `layout.tsx` now wraps `{children}` in `<main>`. Every
  page root is `position:fixed` (out of flow), so the wrapper is layout-neutral
  but gives screen-reader landmark navigation. Nav was already `<nav
  aria-label="Primary">`; images already carry meaningful `alt`.

### Verification

`npm run build` + `npm run lint` clean; all 9 routes screenshot-rendered with
WebP images loading and no console errors (the only 404 is the pre-existing
missing `favicon.ico` — add one in 5c for the deploy/Lighthouse best-practices
score). A full Lighthouse run is best done against the deployed URL in 5c; the
−95% image payload is the headline perf win here. `scripts/_verify-shots.mjs` is
a temporary full-route screenshot helper (kept for the 5b mobile pass).

---

## Phase 5b — Mobile / touch fallback

The canvas pages were desktop-first (Phase 4): a pannable, pinch-zoom plane is
rough on a phone. Per roadmap §8 we ship the **vertical-scroll fallback** — the
*same panels and markup*, just stacked and natively scrollable below ~768px or
on a coarse pointer. (Home already had this from Phase 2; 5b is the rest.)

### One breakpoint, two halves (engine gate + CSS reflow)

`lib/motion.ts` defines `STACK_MQ = '(max-width: 768px), (pointer: coarse)'` and
`prefersStackedCanvas()`. Every canvas **engine** reads it and, when stacked,
**skips the pan/zoom/wheel/drag wiring entirely** — that machinery fights native
scroll. The matching **CSS** (`@media STACK_MQ` in each stylesheet) does the
reflow. The JS gate and the CSS condition MUST stay identical, which is why both
reference the same string in spirit (the home camera keeps its own 760px gate,
`spatial()`, ported with Direction E — left untouched).

- **spatial-canvas** (Services/Pricing/Contact/slug): stacked → no pan/zoom, no
  `drawWires`; keeps **tap-to-open-detail** via a click handler. The detail
  overlay becomes a `position:fixed`, scrollable sheet with a sticky back-chrome;
  its nested `.scase` reflows by the same rules.
- **whiteboard** (Work): stacked → no pan/zoom; a tap on a `[data-slug]` panel
  still routes to the case study; the billboard keeps cycling. Decorative
  "coming soon" **ghosts (no `data-slug`) are hidden** on the linear view so it
  reads as a focused selected-work list, not a wall of empty boxes.
- **process-strip**: stacked → no wheel→horizontal / drag / active-card tracking;
  the strip becomes a vertical column (native scroll), CTA drops into flow,
  progress bar hidden. Tapping a step still opens its (stacked) detail.

### CSS reflow mechanics

The builders set `left/top/width/height` **inline**, so the stacked overrides use
`!important` to win: `.sc-canvas` → `display:flex;flex-direction:column` (a
centred max-width:620px column with bottom padding to clear the bottom-nav pill);
`.sc-panel` → `position:static;transform:none;width/height:auto`. Wires + zoom
controls hidden; the canvas title becomes a **sticky paper header band**. Touch
has no hover, so the "OPEN ⤢" / "VIEW" affordances are forced visible. Slug
(collapsed `.sc-thumbs` height) and Contact (circular socials → cards, 1-col
Calendly) got tiny per-page fixes.

### The persistent nav (a shared-shell decision — flagged for review)

The bottom nav pill was **650px wide → clipped on a 390px phone**. The prototype
was desktop-only, so there was no reference. **Per your call, we compacted the
existing pill** (smaller avatar / label type / link width / padding / CTA under
`STACK_MQ`) so all 7 curved-path nodes fit ~355px with margins — the *exact same
design, smaller*. Safe because `PathProgress` threads the curve from live rects
and rebuilds on resize, so it re-fits itself; no JS changed. The misleading
`#nav-hint` (left/right-click + arrow-key shortcuts that don't exist on touch) is
hidden on mobile. **To revert** to a desktop-only nav, delete the two `STACK_MQ`
blocks at the end of the `#nav` section in `globals.css`.

### Verification

`npm run build` + `npm run lint` clean. Every route screenshot-rendered at 390px:
all stack, scroll, and clear the nav; tap-to-open-detail, tap-to-route (Work),
and tap-to-open-step (Process) all work; the nested detail reflows to a
scrollable sheet. `scripts/_verify-mobile.mjs` is the (temporary) mobile-shot
helper, mirroring `_verify-shots.mjs`.

---

## Phase 5c — Favicon, metadata, deploy/Lighthouse

### Favicon + metadata (the Lighthouse best-practices / SEO prep)

- `src/app/icon.svg` — App Router serves it as the favicon automatically (kills
  the pre-existing `favicon.ico` 404). Drawn from the brand tokens: paper tile,
  ink "J" pen-stroke, the burnt-orange accent as the tittle dot. SVG (not `.ico`)
  is enough for every current browser.
- `layout.tsx` gained an explicit `viewport` (device-width + `themeColor` =
  `--paper`, so the mobile fallback engages and the browser chrome blends in) and
  richer `metadata` (title template, `metadataBase`, OpenGraph, Twitter, robots).
  `metadataBase`/`SITE_URL` is a **placeholder Vercel URL** — swap it to the real
  domain after deploy (it only affects absolute OG/Twitter URLs). Marked TODO(5c).

### Lighthouse (local prod build, `/services`)

Ran against `npm run start` on localhost (Chrome via the bundled Puppeteer):

| Performance | Accessibility | Best practices | SEO |
|---|---|---|---|
| **79** | **100** | **100** | **100** |

The three 100s confirm the 5a a11y pass + the 5c favicon/metadata. Performance
79: CLS **0**, FCP 1.1s, LCP 3.3s, but **TBT 540ms** is the drag — GSAP +
mounting the engine + building the canvas DOM via `innerHTML` on the client. That
cost is **inherent to the faithful imperative port** (Phases 2–4); cutting it
would mean SSR-ing the canvases / deferring GSAP, i.e. re-architecting away from
the 1:1 port — out of scope for this phase. A **local** score also understates
the deployed number (no CDN/Brotli/edge-cache), so the roadmap's "≥90 desktop"
target should be re-checked against the live URL. Re-run Lighthouse post-deploy.

### Deploy — LIVE on Vercel

Deployed via the Vercel CLI (`npm i -g vercel && vercel`), logged in as
`weldroblox-5402`. The auto-derived project name (the folder "NEW Jawad Design")
was rejected (uppercase/spaces), so the project is linked explicitly as
**`jawad-designs-projects1/jawad-portfolio`** (matching `package.json`). Next.js
auto-detected; no extra config. A **`.vercelignore`** was added to skip the
54 MB prototype zip, `extracted/` (56 MB) and `temporary screenshots/` from the
upload. `SITE_URL` in `layout.tsx` now points at the production alias.

- **Production:** https://jawad-portfolio-kohl.vercel.app — all 8 routes 200, favicon serves.
- Redeploy: `vercel deploy --prod --yes` from this folder (the `.vercel/` link persists).

### Lighthouse (live production URL)

| Route | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/services` | **77** | **100** | **100** | **100** |
| `/` (home) | **68** | **100** | **100** | **100** |

A11y / Best-practices / SEO are **100 across the board** (the 5a a11y pass + the
5c favicon/metadata). Performance (CLS **0** everywhere) is bound by **TBT** —
home runs the full HOMEE camera engine + fonts; the canvas pages build their DOM
via `innerHTML` + GSAP on mount. That cost is **inherent to the faithful 1:1
imperative port**; reaching the roadmap's "≥90 desktop" target would mean
SSR-ing the canvases / deferring GSAP — a re-architecture away from the port, so
it's deliberately **out of scope** for the migration. If perf becomes a priority
it's a separate, explicit effort (and a natural fit for the future redesign
track). Local vs live scores matched within ~2 pts, confirming the bottleneck is
client CPU (JS execution), not transfer.

### Fix — Nav power-user shortcut hijacked the canvas (right-click → /work)

The persistent `Nav` registered **window-level** left-click (back-one-route),
right-click (forward-one-route) and arrow-key shortcuts — a 1:1 port of the
prototype shell's "travel between directions" power-user nav. In the prototype
the shell and the page-canvas lived in **separate iframes**, so those shortcuts
never reached the canvas. The unified Next.js app puts both in **one document**,
so a right-click on the home hero (which the home camera uses to *advance* the
hero) bubbled to the Nav and pushed `/` → `/work` mid-animation — the reported
"hero is incomplete and it instantly goes to /work". Arrow keys collided the
same way (camera `navFwd` + Nav `step(1)`), and `onContext` had **no** guard at
all (unlike `onClick`, which already checked `[data-no-back]`).

**Decision:** the Nav shortcut now **defers to any route that owns those gestures**
— a `canvasRoute` check (`/`, `/work`, `/services`, `/process`) makes all three
window handlers no-op there, and `onContext` gained the same interactive/`#nav`/
`[data-no-back]` guard as `onClick`. The shortcut stays live only on flat routes
(pricing, contact). Tradeoff: right-click on a canvas route no longer travels
routes — but that matches the prototype (where the iframe boundary blocked it),
and the visible nav links + arrow keys still navigate everywhere.

### Fix — route-panel previews now reveal the real page (not a greybox)

The home Direction-E route panels (Work / Services / Process / Pricing) bloom a
preview frame on dwell. The original prototype filled it with a **live, scaled
iframe screenshot of the actual page**; the first migration pass stubbed
`mountPreview` to a no-op for route panels, leaving only the static greybox
placeholder (the `prev:` ghost boxes). About / Trust / Contact already rendered
their real nested-canvas markup (`mountDetailPreview`).

**Fix:** `mountPreview` now mounts a same-origin `<iframe src="/<route>">` (the
real Next page), scaled to fit the frame with a centred crop — the same math as
the prototype (`PV_W/PV_H`, centred `pvtx/pvty`, `data-pvzoom`). Because the
route *is* the page (no explorer shell to strip), `stripPreview` only injects a
small CSS rule to hide our persistent chrome (`#nav`, `#nav-hint`,
`#jawad-cursor`) and freezes pointer-events, then nudges a `resize` so the canvas
re-centres after hydration. Tradeoff: each preview boots a full route in an
iframe — heavy, but lazy (mounts once, on dwell) and exactly what the prototype
did. Verified: all four previews mount `/work`,`/services`,`/process`,`/pricing`
and the in-iframe chrome is hidden (no double-nav).

### Change — nav links now travel to homepage sections (not separate pages)

The persistent bottom-nav links used to route to standalone pages (`/work`,
`/services`, …; About/Trust pointed at `/`). Requested change: each link should
travel the home camera to the **matching homepage section** instead.

**How:** the seven links are index-aligned with the camera's `SECTIONS` (Work ·
Services · Process · About · Trust · Pricing · Contact), so a link just carries a
section index. `<Nav/>` (persistent shell) reaches the camera through a small
Zustand bridge: `<HomeCamera/>` registers `ctrl.gotoSection` on mount
(`registerCamera`) and clears it on unmount. Clicking a link:
- **on `/`** → calls `cameraGoto(i)` directly → `gotoSection` drops the brand
  loader if it's still up, then glides to the section.
- **off `/`** → `requestSection(i)` parks the target, then routes to `/`;
  `<HomeCamera/>` `consumeSection()`s it on mount via the new `initialSection`
  option, which suppresses the intro and lands straight on the section (glide on
  desktop, native-scroll jump on mobile).

The CTA follows the same rule (ORDER → Contact section 6; "See the work" → Work
0). Links stay real `<Link href="/">` anchors (so middle-click / open-in-new-tab
still go home, and PathProgress keeps the `<a>` curve markup it measures); the
click is intercepted with `preventDefault`. **Tradeoff:** the standalone route
pages still exist and are still reachable by clicking the on-canvas panels (that
`onRoute` path is unchanged) — only the *navbar* now prefers the in-page
section. Verified end-to-end (scripts/_verify-navsection.mjs): same-page travel,
About travels without opening its detail, and cross-page `/work` + Process lands
on home section 2, all without leaving `/`.

---

## Polish phase · liquid-glass material across the secondary pages

The migration is done; first polish task was to make `/services`, `/pricing`,
`/contact`, `/process`, `/work` (+ `/work/[slug]`) read with the same finish as
the home camera. They were faithful ports of the prototype's wireframe
Direction D (opaque paper cards, ink borders, flat/"sketch" offset shadows),
which looked unfinished next to the homepage's frosted-glass panels.

**Decision:** promote the homepage `.e-panel` recipe to shared CSS custom
properties (`--glass-*` in `globals.css`) and point the spatial-canvas panel
*surfaces* at them — `.sc-panel` (+ its hero/anchor/cta/sat/core/nd-* variants),
`.proc-step`/`.proc-cta`, the pricing tiers/header, and the contact form panel +
frosted fields/chips. `home.css` keeps its literal values and stays the canonical
reference (left untouched to avoid regressing the working homepage); the tokens
are copied verbatim from it, so the material is identical.

**Tradeoffs / boundaries:**
- Glass goes on card **chrome**, not media: image/greybox placeholders (`.img`,
  `.bar`, `.cal-slot`, the dark billboard `.bb-wrap`) stay as wireframe stand-ins.
- `/work` is the exception to "use the blur": its board can hold many panels and
  the cover images would hide the blur anyway, so the project/weld cards use the
  homepage's *sticker-frame* treatment instead (white border + deep rim-light
  shadow, matching `.e-billboard`) — no per-card `backdrop-filter`, which keeps
  pan/zoom smooth. Only the few empty "coming soon" ghosts get soft glass.
- `backdrop-filter` is proven to work inside the transformed canvases here
  because the homepage already blurs `.e-panel` inside the transformed `.e-world`.

---

## Responsive overhaul — Phase 1 (foundation & consistency)

Kicking off a full responsive pass (target devices: phones 320–430px and
small laptops / resized desktop windows 1024–1280px). Phase 1 is the low-risk
foundation the later phases build on.

**Decisions:**
- **One breakpoint, everywhere.** The home camera used to fall back to native
  scroll at `760px` while every other route used `768px` (STACK_MQ) — an 8px
  dead zone where routes disagreed. Unified the home camera (`home-camera.ts`)
  and all `home.css` media queries to `768px`, matching the rest of the site.
- **Single source of truth for breakpoints.** Added `screens` to
  `tailwind.config.ts` (`md: 768px` == STACK_MQ) so future components can use
  `sm:`/`md:`/`lg:` utilities instead of hand-written media queries. Note: CSS
  custom properties can't be used inside `@media` conditions, so the literal
  `768px` still has to be repeated in the CSS — the tailwind config + STACK_MQ
  comment are the documented canonical values these literals must track.
- **No more fixed-px overflow.** Cards that used hard pixel widths
  (`.e-portal` 420px, `.e-poster` 480px, `.proc-step` 340px) now use
  `min(<cap>, <vw>)` so they cap at the desired desktop size but shrink to fit
  rather than overflowing a narrow phone.

**Tradeoff:** overriding (not extending) Tailwind's `screens` drops the default
`2xl` — intentional, since large-desktop is deprioritized for this pass.

---

## Responsive overhaul — Phase 2 (small-screen hardening, phones 320–430px)

**Decisions:**
- **Stacked-layout tokens (`--stack-gutter`, `--stack-bottom`).** The mobile
  vertical-scroll fallback repeated `18px` side padding and a `132px`/`96px`
  bottom clearance across five files with slightly different values. Promoted
  both to `:root` tokens and threaded them through every stacked column + sticky
  header (canvas, work, process, home). One place to tune the mobile rhythm, and
  the home page now matches the canvas pages' nav clearance (was 96px → 120px).
- **No padding collapse at 320px.** `--stack-gutter` is `clamp(13px, 4vw, 18px)`
  — it stays 18px on roomy phones but eases to 13px at ~320px, recovering ~10px
  of column width on the smallest devices so content no longer squeezes to ~284px.
- **`overflow-wrap: break-word`** on stacked panels (`.sc-panel`, `.wb-panel`,
  `.proc-step`, home `.e-panel`) so a long word or URL can't push a card past the
  viewport edge and reintroduce horizontal scroll.

**Left deliberately alone (flagged for on-device review):** the bottom nav pill's
8.5px mobile labels. The pill's curve is fitted from live rects in JS
(PathProgress), so resizing the labels risks the path math; it's safer to eyeball
it on a real phone before touching it. No glass-parity work was needed — stacked
panels already inherit the `--glass-*` material from their base rules.

---

## Standalone /about + /trust pages (nav no longer dumps to the homepage hero)

**Why:** clicking About/Trust in the bottom nav from another page routed to `/`
and the desktop home-camera settles on the hero before gliding to the section —
it read as "thrown back to the start of the homepage." About/Trust were the only
nav items with no standalone route (they lived only as homepage panels), so
`goTo()` in `Nav.tsx` fell back to `requestSection()` + `push('/')`.

**Decision:** give every nav item its own page — build real `/about` and
`/trust` routes. They follow the **Contact precedent**: the homepage panel still
match-cuts into its on-canvas nested detail, AND a standalone route is reachable
from the nav. So `home-camera.ts` is untouched; only the nav links gain routes.

**Shape:** both pages reuse the slug/`SpatialCanvasPage` pattern — a `.sc-hero`
core (About: portrait + bio; Trust: the pull-quote) with satellite cards wired
off it (`about-content.ts` / `trust-content.ts`, `about.css` / `trust.css`).

**Tradeoff:** the orbit copy now exists both in `detailFor('about'/'trust')`
(home nested detail) and in the new page content — the same small duplication
Contact already carries. Accepted: the two render in different markup formats
(home detail engine vs `.scase`), so sharing one source would cost more than it
saves. The greybox placeholder bars from the orbit canvas were promoted to real
sentences, since this is now a page people read.

---

## Responsive overhaul — Phase 3 (small-laptop & live-resize behavior)

**The bug:** the generic spatial-canvas engines (`createSpatialCanvas`,
`createWhiteboard`, `createProcessStrip`) read `prefersStackedCanvas()` exactly
once at init to decide whether to wire pan/zoom/wheel. They had no media-change
listener, so a *live* resize across 768px — narrowing a desktop window, snapping
to half-screen on a small laptop, opening devtools, rotating a tablet — left the
engine in the wrong mode (pan/zoom fighting the CSS stacked scroll, or a desktop
canvas with no interactivity) until a full reload. This directly hurt the
"resized desktop window / small laptop" case we're targeting.

**Decision:** rebuild the engine at the React boundary rather than teaching each
engine to hot-swap modes (which would mean unwinding half-built state in three
different files). New hook `useStackedBreakpoint()` (`lib/use-stacked.ts`) tracks
STACK_MQ and is fed into each component's `useGSAP({ dependencies: [stacked],
revertOnUpdate: true })`. When the breakpoint flips, useGSAP runs the existing
cleanup (engine.destroy + clear injected HTML) and re-runs the builder, so the
engine comes back up in the correct mode from a clean slate.

**Why not the home camera too:** `createHomeCamera` already has its own
resize + media-change relayout (home-camera.ts), so it adapts in place; routing
it through the hook would risk regressing its bespoke intro/loader. Left as-is.

**Centering check:** the canvas transform is applied about the element centre
with px/py = 0, so the composition stays centred at any viewport width — no
dead-space/clipping fix was needed in the 1024–1280 band; resize already
re-draws the connector wires (spatial-canvas onResize).

---

## Responsive overhaul — Phase 4 (mobile experience polish)

Target devices stayed phones + small laptops. Three planned items; what each
became after meeting the codebase:

**1. Responsive / lazy images → `decoding="async"` everywhere + `fetchpriority`.**
The heavy source PNGs are already superseded by `.webp` (78K hero/portrait vs
1.8M PNG) and the code only ever references the webp, so `srcset` would buy
almost nothing. `loading="lazy"` turned out to be *unsafe* here: the home camera
and whiteboard move content with CSS **transforms**, and `loading="lazy"` relies
on IntersectionObserver, which doesn't reliably fire on transform-driven motion —
a lazy image could simply never load when the camera pans to it. So instead:
- `decoding="async"` on every injected `<img>` (off-main-thread decode, smoother
  paints, zero intersection dependency — safe in a transformed canvas).
- `fetchpriority="high"` + `decoding="async"` on the LCP hero ring image.
- Nested-detail images (About portrait, weld card) are already deferred *by
  construction* — their HTML is only injected when the detail opens — so they
  need no lazy attribute.
- The four unreferenced source PNGs (~5.7 MB total) are dead weight in the repo
  but never shipped to clients (nothing requests them); left in place since they
  may be kept as originals. Safe to delete later if repo/deploy size matters.

**2. Mobile nav + control tap feel.** Added `touch-action: manipulation` +
`-webkit-tap-highlight-color: transparent` to the persistent shell controls (nav
links, brand, CTA) and the detail-sheet buttons — removes the ~300ms tap delay
and the grey tap-flash so touch feels as immediate as the desktop cursor UI. The
8.5px nav labels are still left for on-device review (path-fit risk, as flagged).

**3. Container queries for detail overlays → deliberately skipped.** The
zoom-into-detail overlay is already full-viewport on both mobile and desktop, so
a container query would resolve to the same thing as the viewport query it'd
replace — pure complexity with no behavioural gain (no premature abstraction).
Instead spent the budget on real touch targets: the sheet's close (26px) and
back controls were sub-44px, now ~44px on the touch/stacked breakpoint.

---

## SEO / GEO pass (name-search ranking)

Goal: rank for "jawad designs / jawad jalal / jawad jalal designs" and make
link/AI-summary previews look right. Decisions + tradeoffs:

- **Canonical domain → `https://jawadj.design`** (centralised in `lib/seo.ts`).
  `jawad.design` was taken; the new domain goes live shortly. Everything
  (canonical tags, sitemap, robots `host`, OG URLs, JSON-LD) derives from this
  one constant — change it there and the whole site follows.
- **Open Graph / Twitter image = the real hero.** Rather than a synthetic card,
  `app/opengraph-image.png` (+ `twitter-image.png`) is a 1200×630 screenshot of
  the homepage's "i also DESIGN" intro climax, captured with the dev tooling
  (Puppeteer drives `animateHeroTo(1)` → Sharp crops to 1200×630). Re-run via
  the throwaway script pattern if the hero changes; it's a committed static PNG.
- **Favicon = the nav memoji.** Removed the old hand-drawn "J" `icon.svg`;
  `app/icon.png` + `apple-icon.png` (and `public/icon-{192,512}.png` for the
  manifest) are the memoji on a paper-token rounded badge, built with Sharp.
- **Per-route metadata via passthrough server layouts.** The page components are
  all `'use client'` and so can't export `metadata`. Instead each route folder
  got a tiny server `layout.tsx` that exports a unique title/description/
  canonical (`pageMeta()` helper) and just returns `children` — zero DOM, zero
  change to the client pages, no regression risk. `work/[slug]` uses
  `generateMetadata` to title each case study.
- **JSON-LD (`components/seo/JsonLd.tsx`)** — Person + WebSite + ProfilePage in
  one `@graph`, cross-linked by `@id`, with `sameAs` to the real socials
  (X/TikTok/YouTube `@jawadmakes`, LinkedIn `jawad-jalal-designs`, IG
  `j.awadjalal`). This is the main lever for getting Google to treat "Jawad
  Jalal" as one entity. It's the consistency across these surfaces that matters.
- **Known inconsistency (left for review):** the Contact canvas still shows
  `@jawad.design` (IG) + a Behance card + `hi@jawad.design`. Those don't match
  the real handles / new domain and Behance doesn't exist yet — flagged as a
  follow-up rather than silently rewriting visible brand copy.
