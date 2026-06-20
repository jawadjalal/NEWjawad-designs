# CLAUDE.md — Jawad Portfolio

Project rules and context for Claude Code. Read this before doing anything.

## What this project is

My design portfolio: a **Next.js (App Router) + React + Tailwind + GSAP** site.
It was originally a Claude Design HTML export (standalone pages in iframes); that
has been **fully migrated** to a real Next.js app with real routes and a
persistent shell. The migration is **done** — we are now in the **polish /
"make it better" phase**: refining the existing pages, not rebuilding them.

The current design language is the homepage's hand-drawn + **liquid-glass** look
(grid paper, translucent glass panels, custom cursor, GSAP motion). The job now
is to raise every page to that same level of finish and keep the whole site
coherent.

(`MIGRATION_ROADMAP.md` and `NOTES.md` are kept as historical record of how the
migration was done. Roadmap §4 — the future "paper / sketch" redesign — is still
a separate, not-yet-started effort. Don't start it unless I ask.)

## About me (how to write code for me)

I'm a designer and AI power user, not a deep engineer. I use AI to build *and* to learn. So:
- Comment non-obvious logic in plain language — explain the **why**, not the what.
- When you make an architectural or design decision, add a 2–3 line note to `NOTES.md` with the tradeoff.
- Favor clear, modern, idiomatic patterns over clever ones. No premature abstraction.
- I work solo on a laptop. Prefer free/low-cost, low-maintenance tools.

## Stack (decided — do not substitute)

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** — layout + design tokens only, NOT animation
- **GSAP** + plugins (all free), via `@gsap/react` (`useGSAP`): ScrollTrigger, Draggable, InertiaPlugin, Flip, DrawSVGPlugin, MotionPathPlugin
- **Zustand** — cross-component animation state (current section, scroll fraction, zoom, pan)
- **`next/font`** — fonts (no CSS `@import`)
- **Lenis** — smooth scroll (kept easy to disable)

Do **not** add: Framer Motion, a pan/zoom library, rough.js, or any new design libraries.

## Working rules

1. **One design language.** The homepage's liquid-glass + hand-drawn look is the
   reference. New work should match it — same tokens, same glass material, same
   easings/speeds. Keep the site coherent; don't introduce a second visual style.
2. **GSAP is the motion engine.** Tailwind/CSS for layout and static style; GSAP
   for anything animated or DOM-measuring.
3. **Client vs server:** all animated / DOM-measuring components are `'use client'`;
   DOM math goes in `useGSAP` / `useLayoutEffect`, SSR-guarded.
4. **Reduced motion always:** wrap motion in `gsap.matchMedia()` with a
   `prefers-reduced-motion` calm branch.
5. **Tokens are the source of truth:** the `:root` vars below live in
   `tailwind.config.ts` + `globals.css`. No hard-coded hex in components. Shared
   surface treatments (e.g. the glass material) are tokens too, defined once and reused.
6. **Phased + reviewed:** keep commits small and labelled. Finish a piece,
   summarize, and wait for my review before the next one. Don't sprint the whole
   site in one go.
7. **No regressions.** Don't break the homepage or existing behavior while polishing.
   `npm run build` must pass before a piece is "done".

## Tokens (source of truth — from `:root`)

```
--paper:#f4f3f0; --paper-2:#eceae6; --ink:#2c2c2a; --ink-soft:#6f6e6a;
--line:#8d8c88;  --line-soft:#b9b8b3; --accent:#d2502f;
--fill:#cfcec9;  --fill-2:#dcdbd6;    --hatch:#d6d5d0;
--hand: 'Architects Daughter', cursive;  --mono: 'SF Mono', ui-monospace, monospace;
--ease-smooth: cubic-bezier(0.16,1,0.3,1);  --ease-bounce: cubic-bezier(0.34,1.56,0.64,1);
```
Glass material (the homepage `.e-panel` recipe; now also exposed as `--glass-*` tokens):
gradient `linear-gradient(152deg, rgba(255,255,255,.7), rgba(245,244,240,.6) 52%, rgba(235,233,228,.66))`,
`backdrop-filter: blur(10px) saturate(1.06)`, border `3px solid rgba(255,255,255,.82)`,
radius `13px`, shadow `0 0 0 1px var(--line-soft), 0 14px 30px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.78)`.

## Project structure

```
src/
  app/        layout.tsx (persistent Shell), page.tsx (home), work/, work/[slug]/, services/, process/, pricing/, contact/
  components/ shell/ (Nav, Cursor, PathProgress, SmoothScroll)  home/ (HomeCamera)  canvas/ (SpatialCanvasPage)  services/ process/ work/  ui/
  lib/        gsap.ts (register plugins once), store.ts (Zustand), motion.ts (eases/reduced-motion),
              home-camera.ts, spatial-canvas.ts, *-content.ts (page data), fonts.ts
  styles/     globals.css (tokens + base), home.css, canvas.css, process.css, pricing.css, contact.css, work.css, slug.css
public/       assets/ (optimized images)
extracted/    historical prototype reference (do not ship)
```

## Commands

- `npm run dev` — local dev
- `npm run build` — production build (must pass with no type errors)
- `npm run lint`

## Definition of done (every piece)

- `npm run dev` boots with no console errors; `npm run build` passes.
- The change matches the established design language and doesn't regress the homepage.
- Non-obvious code is commented; design decisions logged in `NOTES.md`.
- Then stop and summarize for review.
