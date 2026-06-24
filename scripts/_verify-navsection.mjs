// Verification for the nav + contact-section behaviour.
//  - Nav links: ON the homepage they travel the camera to the matching section;
//    on a SUB-PAGE they navigate to that link's page (About/Trust, which have no
//    page, route home + travel instead).
//  - The dark homepage contact section inverts the cursor to white, and its form
//    fields are real, focusable, typeable inputs (the /contact page cursor stays
//    dark since that page is light paper).
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

// ---- Nav rule: on a SUB-PAGE, a routed link navigates to its page ----
await page.goto(`${BASE}/work`, { waitUntil: 'networkidle0' });
await sleep(800);
await clickNav('Services');
await sleep(1200);
check('subpage: /work + Services → /services', page.url().endsWith('/services'), page.url());

// About has no page → route home + travel to section 3
await clickNav('About');
await sleep(1600);
let idx = await activeIdx();
check('subpage: /services + About → home section 3', page.url().endsWith('/') && idx === 3, `url=${page.url()} active=${idx}`);

// ---- Nav rule: on the HOMEPAGE, a link travels to its section ----
await clickNav('Pricing');
await sleep(1400);
idx = await activeIdx();
check('home: Pricing → section 5 (stays on /)', page.url().endsWith('/') && idx === 5, `url=${page.url()} active=${idx}`);

// ---- Contact section: white cursor + inputable form ----
await clickNav('Contact');
await sleep(1500);
await page.evaluate(() => {
  const panel = document.querySelector('.e-panel[data-i="6"]');
  const b = panel.getBoundingClientRect();
  panel.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 }));
});
await sleep(1200);

await page.mouse.move(720, 379, { steps: 4 });
await sleep(200);
const invOverForm = await page.evaluate(() => document.querySelector('#jawad-cursor').classList.contains('inv'));
check('cursor white (inv) in dark contact detail', invOverForm);

// real mouse click → focus → type (proves the drag handler doesn't hijack it)
const nameBox = await page.evaluate(() => {
  const i = document.querySelector('.e-form input.e-field');
  const b = i.getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
await page.mouse.click(nameBox.x, nameBox.y);
await sleep(120);
await page.keyboard.type('Joel');
const nameVal = await page.evaluate(() => document.querySelector('.e-form input.e-field').value);
check('contact form: click focuses input + types', nameVal === 'Joel', `val=${nameVal}`);

// ---- /contact page cursor must NOT invert (light paper page) ----
await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle0' });
await sleep(1500);
await page.mouse.move(720, 400, { steps: 3 });
await sleep(200);
const invOnPage = await page.evaluate(() => document.querySelector('#jawad-cursor').classList.contains('inv'));
check('/contact page cursor stays dark (not inv)', !invOnPage, `inv=${invOnPage}`);

await browser.close();
console.log(pass ? '\nALL PASS' : '\nSOME FAILED');
process.exit(pass ? 0 : 1);
