/**
 * Cross-component animation state.
 *
 * Why Zustand and not React state: the nav fill, minimap, and (later) the
 * home camera all read/write this 60×/second. Putting it in React state
 * would trigger a re-render storm. GSAP code reads the current values via
 * `useStore.getState()` and writes with `setScroll(...)` without subscribing;
 * only the small bits of UI that must visibly change (active label, etc.)
 * subscribe with the hook.
 *
 * This is the Phase 1 shape. `goto` currently just snaps the section index +
 * a matching scrollFrac so the nav curve fills to the right node; in Phase 2
 * it will wrap the real GSAP camera glide.
 */
import { create } from 'zustand';

/** The home world's sections, in travel order (see homepage-e-v2 SECTIONS). */
export const SECTION_COUNT = 7;

export type CameraMode = 'travel' | 'freeroam';

type StoreState = {
  /** Active section along the path, 0..SECTION_COUNT-1. */
  sectionIndex: number;
  /** Continuous progress along the path, 0..1. Drives nav fill + minimap. */
  scrollFrac: number;
  /** Home camera interaction mode. */
  mode: CameraMode;
  /** Spatial-canvas transform (Phase 3). */
  zoom: number;
  panX: number;
  panY: number;

  /** Jump to a section. Phase 2 will make this a GSAP glide. */
  goto: (i: number) => void;
  /** Continuous update from the scroll integrator (Phase 2). */
  setScroll: (frac: number, idx?: number) => void;
  setMode: (mode: CameraMode) => void;
  setCanvas: (t: { zoom?: number; panX?: number; panY?: number }) => void;

  /**
   * Bridge to the live home camera. <HomeCamera/> registers its section-travel
   * fn here while mounted; the persistent <Nav/> calls it so a nav link glides
   * the camera to that homepage section instead of routing to a separate page.
   * Null whenever the homepage (and its camera) isn't mounted.
   */
  cameraGoto: ((i: number) => void) | null;
  /**
   * A section requested from another page, before the camera exists. Stashed
   * here, then consumed by <HomeCamera/> on mount so the link still "travels"
   * to the right section once we've landed on home.
   */
  pendingSection: number | null;
  registerCamera: (goto: ((i: number) => void) | null) => void;
  requestSection: (i: number) => void;
  /** Read + clear any pending section (call once, on camera mount). */
  consumeSection: () => number | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const useStore = create<StoreState>((set, get) => ({
  sectionIndex: 0,
  scrollFrac: 0,
  mode: 'travel',
  zoom: 1,
  panX: 0,
  panY: 0,
  cameraGoto: null,
  pendingSection: null,

  goto: (i) => {
    const idx = clamp(Math.round(i), 0, SECTION_COUNT - 1);
    // Stub fill: place the curve tip proportionally at this node. Phase 2
    // replaces this with the actual fraction emitted by the camera.
    set({ sectionIndex: idx, scrollFrac: idx / (SECTION_COUNT - 1) });
  },

  setScroll: (frac, idx) =>
    set((s) => ({
      scrollFrac: clamp(frac, 0, 1),
      sectionIndex: idx != null ? clamp(Math.round(idx), 0, SECTION_COUNT - 1) : s.sectionIndex,
    })),

  setMode: (mode) => set({ mode }),
  setCanvas: (t) => set((s) => ({ ...s, ...t })),

  registerCamera: (goto) => set({ cameraGoto: goto }),
  requestSection: (i) => set({ pendingSection: clamp(Math.round(i), 0, SECTION_COUNT - 1) }),
  consumeSection: () => {
    const pending = get().pendingSection;
    if (pending != null) set({ pendingSection: null });
    return pending;
  },
}));
