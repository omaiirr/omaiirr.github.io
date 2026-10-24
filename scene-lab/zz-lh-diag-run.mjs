// zz-lh-diag-run.mjs — prints diagnostic strips for the lighthouse beam probe.
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { pathToFileURL } from 'url';

const url = pathToFileURL(new URL('./zz-lh-diag.html', import.meta.url).pathname).href;
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 400));
const d = await page.evaluate(() => window.__DIAG());
console.log(JSON.stringify(d, null, 1));
console.log('pageErrors:', JSON.stringify(errs));
await browser.close();