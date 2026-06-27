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

type NavLink = { label: string; section: number; route?: string };

// 7 nodes in curve order. Their index is the homepage section index (the home
// camera's SECTIONS are in this exact order: Work · Services · Process · About ·
// Trust · Pricing · Contact). `route` is the section's standalone page, where
// one exists — About + Trust live only on the home canvas, so they have none.
//
// Behaviour depends on where you are: ON the homepage a link glides the camera
// to that section (explore the spatial canvas); on ANY OTHER page a link is a
// normal site nav and takes you to that section's separate page. (See goTo.)
const LINKS: NavLink[] = [
  { label: 'Work', section: 0, route: '/work' },
  { label: 'Services', section: 1, route: '/services' },
  { label: 'Process', section: 2, route: '/process' },
  { label: 'About', section: 3, route: '/about' },
  { label: 'Trust', section: 4, route: '/trust' },
  { label: 'Pricing', section: 5, route: '/pricing' },
  { label: 'Contact', section: 6, route: '/contact' },
];

// distinct routes in nav order, for arrow-key / click stepping
const ROUTES = ['/', '/work', '/services', '/process', '/about', '/trust', '/pricing', '/contact'];

function baseRoute(path: string): string {
  if (path.startsWith('/work')) return '/work';
  if (path.startsWith('/services')) return '/services';
  if (path.startsWith('/process')) return '/process';
  if (path.startsWith('/about')) return '/about';
  if (path.startsWith('/trust')) return '/trust';
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

  // CTA flips on the contact page, exactly like the prototype's updateCTA.
  // It follows the same home-vs-page rule as the links: ORDER → Contact
  // (section 6 / /contact); on the contact page, "See the work" → Work (0 / /work).
  // The arrow is rendered as its own span so the primary CTA can tint just the
  // arrow with the accent (see #nav .cta-primary .cta-arrow). Label text here
  // carries no arrow glyph; the order/see-work split is the home-vs-page rule.
  const onContact = pathname.startsWith('/contact');
  const cta: NavLink = onContact
    ? { label: 'See the work', section: 0, route: '/work' }
    : { label: 'ORDER', section: 6, route: '/contact' };

  // Resolve a nav target. On the homepage the nav explores the spatial canvas,
  // so we glide the live camera to the section. On any other page the nav acts
  // like a normal site nav and goes to the section's standalone page; sections
  // with no page of their own (About/Trust) fall back to routing home and
  // travelling there, where <HomeCamera/> picks up the parked section on mount.
  const goTo = useCallback(
    (link: NavLink) => {
      const { cameraGoto, requestSection } = useStore.getState();
      if (onHome && cameraGoto) cameraGoto(link.section);
      else if (link.route) router.push(link.route);
      else {
        requestSection(link.section);
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
            <img className="brand-av" src="/assets/nav-memoji.webp" alt="Jawad" draggable={false} decoding="async" />
          </Link>

          <div className="nav-links" data-cursor-path ref={linksRef}>
            <svg className="nav-curve" aria-hidden="true" />
            {LINKS.map((l, i) => (
              // href reflects where the click actually goes (so middle-click /
              // open-in-new-tab and the rendered <a> are correct): the standalone
              // page when off-home, else "/" (the home camera handles in-place
              // travel). PathProgress measures the <a> geometry regardless of href.
              <Link
                key={`${l.label}-${i}`}
                href={!onHome && l.route ? l.route : '/'}
                data-go={l.label.toLowerCase()}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(l);
                }}
              >
                <span className="lbl">{l.label}</span>
              </Link>
            ))}
          </div>

          <Link
            // cta-primary marks the ORDER action (off the contact page) so only
            // it gets the accent arrow — the contact-page "See the work" is the
            // secondary variant and stays neutral.
            className={`cta${onContact ? '' : ' cta-primary'}`}
            href={!onHome && cta.route ? cta.route : '/'}
            onClick={(e) => {
              e.preventDefault();
              goTo(cta);
            }}
          >
            <span className="cta-lbl">{cta.label}</span>
            <span className="cta-arrow" aria-hidden="true">→</span>
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
