// zz-prev-check.mjs — one-shot smoke check for the regenerated preview page.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { pathToFileURL } from 'url';

const url = pathToFileURL(new URL('./preview-lighthouse.html', import.meta.url).pathname).href;
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 900));
const info = await page.evaluate(() => {
  const c = document.getElementById('c');
  const x = c.getContext('2d');
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 40) sum += d[i];
  return { title: document.title, canvas: c.width + 'x' + c.height, meanSampledR: sum / (d.length / 40), hasOptions: !!document.getElementById('opts') };
});
console.log(JSON.stringify({ info, errs }, null, 1));
await browser.close();
process.exit(errs.length ? 1 : 0);