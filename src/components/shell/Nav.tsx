'use client';

/**
 * The persistent bottom nav pill — ported 1:1 from the prototype shell.
 * Liquid-glass styling lives in globals.css (#nav). This renders the brand
 * avatar, the curved-path link cluster (drawn by <PathProgress/>), and the
 * dark CTA. It also owns navigation: visible links + arrow keys are the
 * primary path (a11y), with the prototype's left/right-click kept as a
 * power-user shortcut, guarded so it can't hijack real interactions.
 */
import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Link, useTransitionRouter } from 'next-view-transitions';
import PathProgress from './PathProgress';
import { useStore } from '@/lib/store';

type NavLink = { label: string; section: number };

// 7 nodes in curve order. Their index is the homepage section index (the home
// camera's SECTIONS are in this exact order: Work · Services · Process · About ·
// Trust · Pricing · Contact). Clicking a link travels the camera to that
// section rather than routing to a standalone page.
const LINKS: NavLink[] = [
  { label: 'Work', section: 0 },
  { label: 'Services', section: 1 },
  { label: 'Process', section: 2 },
  { label: 'About', section: 3 },
  { label: 'Trust', section: 4 },
  { label: 'Pricing', section: 5 },
  { label: 'Contact', section: 6 },
];

// distinct routes in nav order, for arrow-key / click stepping
const ROUTES = ['/', '/work', '/services', '/process', '/pricing', '/contact'];

function baseRoute(path: string): string {
  if (path.startsWith('/work')) return '/work';
  if (path.startsWith('/services')) return '/services';
  if (path.startsWith('/process')) return '/process';
  if (path.startsWith('/pricing')) return '/pricing';
  if (path.startsWith('/contact')) return '/contact';
  return '/';
}

export default function Nav() {
  const pathname = usePathname();
  const router = useTransitionRouter();
  const linksRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const onHome = pathname === '/';

  // CTA flips on the contact page, exactly like the prototype's updateCTA. Like
  // the links, it now travels to a homepage section instead of a page: ORDER →
  // the Contact slab (6); on the contact page, "See the work" → Work (0).
  const onContact = pathname.startsWith('/contact');
  const cta = onContact ? { label: 'See the work →', section: 0 } : { label: 'ORDER →', section: 6 };

  // Travel the home camera to a section. On the homepage we call the live
  // camera directly; from any other page we park the target and route home,
  // where <HomeCamera/> picks it up on mount and glides there.
  const goToSection = useCallback(
    (i: number) => {
      const { cameraGoto, requestSection } = useStore.getState();
      if (onHome && cameraGoto) cameraGoto(i);
      else {
        requestSection(i);
        router.push('/');
      }
    },
    [onHome, router],
  );

  // keyboard + power-user click navigation
  useEffect(() => {
    // Routes that render their own spatial canvas (home camera, the work/
    // services/process pan-zoom canvases). Those pages OWN left/right-click and
    // the arrow keys for in-page navigation — the home hero, for instance, uses
    // right-click to advance and arrows to move between panels. In the original
    // prototype the shell and the canvas lived in separate iframes, so the
    // shell's "travel between routes" mouse/key shortcut never reached the
    // canvas. In this unified app they share one document, so we must defer to
    // the canvas on these routes — otherwise a right-click on the home hero
    // bubbles up here and yanks you to /work mid-animation. The shortcut stays
    // live only on flat routes (pricing, contact) where nothing else claims it.
    const canvasRoute = ['/', '/work', '/services', '/process'].includes(baseRoute(pathname));

    const step = (dir: 1 | -1) => {
      const i = ROUTES.indexOf(baseRoute(pathname));
      const next = ROUTES[Math.max(0, Math.min(ROUTES.length - 1, i + dir))];
      if (next && next !== baseRoute(pathname)) router.push(next);
    };

    const onKey = (e: KeyboardEvent) => {
      if (canvasRoute) return; // the canvas owns the arrow keys here
      const t = e.target as HTMLElement;
      if (t && t.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
    };

    // power-user shortcut: right-click = forward, left-click (on empty
    // background only) = back. Guarded so it never steals a real click, and
    // disabled entirely on canvas routes (which own these gestures themselves).
    const interactive = 'a,button,input,textarea,select,[role="button"],[contenteditable="true"]';
    const onContext = (e: MouseEvent) => {
      if (canvasRoute) return;
      const t = e.target as HTMLElement;
      if (t && (t.closest(interactive) || t.closest('#nav') || t.closest('[data-no-back]'))) return;
      e.preventDefault();
      step(1);
    };
    const onClick = (e: MouseEvent) => {
      if (canvasRoute) return;
      const t = e.target as HTMLElement;
      if (!t || t.closest(interactive) || t.closest('#nav') || t.closest('[data-no-back]')) return;
      step(-1);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onContext);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('contextmenu', onContext);
      window.removeEventListener('click', onClick);
    };
  }, [pathname, router]);

  // one-time hint about the click shortcuts
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem('jawad-nav-hint') === '1';
    } catch {
      /* private mode */
    }
    if (seen) return;
    const node = hintRef.current;
    if (!node) return;
    const show = setTimeout(() => node.classList.add('show'), 900);
    const hide = setTimeout(() => {
      node.classList.remove('show');
      try {
        localStorage.setItem('jawad-nav-hint', '1');
      } catch {
        /* private mode */
      }
    }, 6500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <nav id="nav" aria-label="Primary">
        <div id="nav-row">
          <Link className="brand" href="/" aria-label="Home" data-cursor-say="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-av" src="/assets/nav-memoji.webp" alt="Jawad" draggable={false} />
          </Link>

          <div className="nav-links" data-cursor-path ref={linksRef}>
            <svg className="nav-curve" aria-hidden="true" />
            {LINKS.map((l, i) => (
              // Still a Link to "/" (so middle-click / open-in-new-tab land on
              // home, and the rendered <a> keeps the curve markup PathProgress
              // measures), but onClick preventDefaults and travels in-place.
              <Link
                key={`${l.label}-${i}`}
                href="/"
                data-go={l.label.toLowerCase()}
                onClick={(e) => {
                  e.preventDefault();
                  goToSection(l.section);
                }}
              >
                <span className="lbl">{l.label}</span>
              </Link>
            ))}
          </div>

          <Link
            className="cta"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              goToSection(cta.section);
            }}
          >
            <span className="cta-lbl">{cta.label}</span>
          </Link>
        </div>
        {/* PathProgress draws + fills the curve inside .nav-links */}
        <PathProgress containerRef={linksRef} />
      </nav>

      <div id="nav-hint" ref={hintRef} aria-hidden="true">
        ← → arrow keys to travel · right-click forward · left-click back
      </div>
    </>
  );
}
