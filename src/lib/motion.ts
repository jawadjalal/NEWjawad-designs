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
 * vertical-scroll stack (Phase 5b / roadmap §8). Touch *or* narrow viewport:
 * pinch-pan-zoom is rough on phones, so on those devices the canvas pages
 * present the same panels stacked and natively scrollable instead. This MUST
 * match the `@media` condition the canvas CSS uses, so the JS engine and the
 * layout agree on when to switch. The home camera uses the same 768px gate
 * (see home-camera.ts `spatial()`), so every route flips at one width.
 */
export const STACK_MQ = '(max-width: 768px), (pointer: coarse)';

/** True when the spatial canvases should render as a stacked scroll. SSR-safe. */
export function prefersStackedCanvas(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(STACK_MQ).matches;
}
