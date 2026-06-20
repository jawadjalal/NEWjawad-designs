// One-off verification for the "nav links travel to homepage sections" change.
// Drives a headless desktop browser, clicks nav links, and asserts the home
// camera lands on the matching section (the active panel's data-i) without
// leaving "/". Also checks the cross-page case (/work → click Process → home).
import puppeteer from 'puppeteer';

const BASE = process.env.BASE || 'http://localhost:3001';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

// Force the desktop-only spatial canvas to mount under headless Chrome.
await page.evaluateOnNewDocument(() => {
  const orig = window.matchMedia.bind(window);
  window.matchMedia = (q) =>
    /pointer:\s*fine/.test(q)
      ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }
      : orig(q);
});

const activeIdx = () =>
  page.evaluate(() => {
    const el = document.querySelector('.e-panel.is-active');
    return el ? Number(el.getAttribute('data-i')) : -1;
  });
const clickNav = (label) =>
  page.evaluate((lbl) => {
    const a = [...document.querySelectorAll('#nav .nav-links > a')].find(
      (n) => n.textContent.trim().toLowerCase() === lbl.toLowerCase(),
    );
    if (!a) throw new Error('nav link not found: ' + lbl);
    a.click();
  }, label);

let pass = true;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!ok) pass = false;
};

// ---- Case 1: same-page travel ----
await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
await sleep(1200);

// Click "Pricing" (section 5). gotoSection should drop the loader and glide there.
await clickNav('Pricing');
await sleep(1400);
let idx = await activeIdx();
let url = page.url();
check('home: Pricing → section 5', idx === 5, `active=${idx}`);
check('home: stayed on /', url.endsWith('/'), url);

// Click "Work" (section 0) — travel back.
await clickNav('Work');
await sleep(1400);
idx = await activeIdx();
check('home: Work → section 0', idx === 0, `active=${idx}`);

// Click "About" (section 3) — an in-canvas panel, should just travel (not open).
await clickNav('About');
await sleep(1400);
idx = await activeIdx();
const detailOpen = await page.evaluate(() => document.querySelector('.e-detail')?.classList.contains('open') ?? false);
check('home: About → section 3 (travel, no detail open)', idx === 3 && !detailOpen, `active=${idx} detailOpen=${detailOpen}`);

// ---- Case 2: cross-page travel ----
await page.goto(`${BASE}/work`, { waitUntil: 'networkidle0' });
await sleep(900);
// From /work, click "Process" (section 2): should route home and land on 2.
await clickNav('Process');
await sleep(1800);
idx = await activeIdx();
url = page.url();
check('cross-page: /work + Process → home section 2', idx === 2, `active=${idx}`);
check('cross-page: landed on /', url.endsWith('/'), url);

await browser.close();
console.log(pass ? '\nALL PASS' : '\nSOME FAILED');
process.exit(pass ? 0 : 1);
