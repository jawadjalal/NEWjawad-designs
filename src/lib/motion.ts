/**
 * Shared motion constants. Eases mirror the prototype's --ease-smooth /
 * --ease-bounce; durations follow roadmap §4.4. Keeping them here means the
 * whole site speaks one motion language and reduced-motion is a single switch.
 */

// GSAP-readable cubic-beziers (same curves as the CSS vars).
export const EASE_SMOOTH = 'cubic-bezier(0.16,1,0.3,1)';
export const EASE_BOUNCE = 'cubic-bezier(0.34,1.56,0.64,1)';

export const DUR = {
  travel: 0.75, // camera / path travel: 0.6–0.9s
  panel: 0.5, // panel zoom open/close
  micro: 0.18, // hovers
} as const;

/** True when the user asked the OS to reduce motion. SSR-safe (false on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The breakpoint at which a pannable spatial canvas falls back to a plain
 * vertical-scroll stack (Phase 5b / roadmap §8). We stack on a genuinely narrow
 * viewport OR on a *touch-only* device (a coarse pointer with NO fine pointer
 * available). The `any-pointer` checks matter: a touchscreen laptop / 2-in-1
 * has BOTH a coarse pointer (the screen) AND a fine one (the trackpad), and
 * many browsers report the coarse one as *primary* — so the old
 * `(pointer: coarse)` test wrongly dropped those laptops into the phone stack
 * (no intro animation, no side-scroll camera). Keying off "is a fine pointer
 * *available* anywhere" instead keeps every laptop on the desktop experience
 * while real phones/tablets (coarse, no fine) still stack. The trailing
 * `(any-pointer: coarse)` guard means browsers with no pointer-media support at
 * all fall through to the desktop default (safe).
 *
 * This MUST match the `@media` condition the canvas CSS uses, so the JS engine
 * and the layout agree on when to switch. The home camera mirrors it in
 * home-camera.ts `spatial()`, so every route flips on the same condition.
 */
export const STACK_MQ =
  '(max-width: 768px), (any-pointer: coarse) and (not (any-pointer: fine))';

/** True when the spatial canvases should render as a stacked scroll. SSR-safe. */
export function prefersStackedCanvas(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(STACK_MQ).matches;
}
