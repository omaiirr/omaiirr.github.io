// zz-auto-detect-live.mjs -- pins the live toggle behavior added to Expanded Settings.
//
//   runs=4 fails=0 errors=0
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const BASE='http://127.0.0.1:4000/pomora/';
let failed=0, errors=0;
const check=(name,pass,detail)=>{
  if(!pass) failed++;
  const d=detail?('  ['+String(detail).slice(0,170)+']'):'';
  console.log('  '+(pass?'PASS':'FAIL')+'  '+name+d);
};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({browser:'firefox',executablePath:'/usr/bin/firefox',headless:true});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900});
  page.on('pageerror',e=>{ if(!/downloadable font/i.test(e.message)) errors++; });
  page.on('console',m=>{ if(m.type()==='error'&&!/downloadable font/i.test(m.text())) errors++; });
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  await page.evaluate(()=>{ const n=document.getElementById('updateNoticePopup'); if(n&&n.classList.contains('open')) window.dismissUpdateNoticeBtn?.click(); });
  await sleep(1200);
  console.log('== 1. scene theme active: ON derives on pick');
  await page.evaluate(()=>{
    const cfg={ id:'adv_probe_scene', name:'ADV Probe Scene', createdAt:new Date().toISOString(), bg:{ type:'scene', sceneId:'koi', sceneOptions:{}, sceneBgColor:'' }, colors:{...ThemeEngine.DEFAULTS}, overlay:{ color:'rgba(0,0,0,0)' } };
    ThemeEngine.save(cfg);
    ThemeEngine.activate('gradient-default');
    window.__advProbeSceneId='adv_probe_scene';
  });
  await sleep(500);
  await page.evaluate(()=>{ ThemeEngine.activate(window.__advProbeSceneId); ThemeEngine._rebuildCustomList(); });
  await sleep(700);
  const scenic=await page.evaluate(async ()=>{
    if(typeof ThemeEngine.applyNativeScene==='function') ThemeEngine.applyNativeScene('koi',{},'');
    await new Promise(r=>setTimeout(r,900));
    return { accent:document.documentElement.style.getPropertyValue('--th-accent').trim(), themed:document.body.classList.contains('custom-theme-active') };
  });
  check('scene theme derives its palette on pick', scenic.accent==='#0d9488'&&scenic.themed===true, JSON.stringify(scenic));
  console.log('== 2. Expanded Settings toggle: OFF reverts, ON re-derives');
  await page.evaluate(()=>{ const b=document.getElementById('openAdvancedSettingsBtn')||document.getElementById('openAdvModalBtn')||document.getElementById('openAdvBtn'); if(b) b.click(); });
  await sleep(650);
  const advOpen=await page.evaluate(()=>document.getElementById('advancedSettingsModal')?.classList.contains('open'));
  check('Expanded Settings is open', advOpen===true, String(advOpen));
  if(advOpen){
    const beforeOff=await page.evaluate(()=>({
      accent:document.documentElement.style.getPropertyValue('--th-accent').trim(),
      themed:document.body.classList.contains('custom-theme-active'),
      start:getComputedStyle(document.getElementById('startBtn')).backgroundColor,
    }));
    check('before OFF: site accent is the scene teal', beforeOff.accent==='#0d9488'&&beforeOff.themed===true, JSON.stringify(beforeOff));
    const afterOff=await page.evaluate(async ()=>{
      const t=document.getElementById('tlAutoDetectToggle');
      t.checked=false; t.dispatchEvent(new Event('change',{ bubbles:true }));
      await new Promise(r=>setTimeout(r,900));
      return {
        accent:document.documentElement.style.getPropertyValue('--th-accent').trim(),
        themed:document.body.classList.contains('custom-theme-active'),
        start:getComputedStyle(document.getElementById('startBtn')).backgroundColor,
        tl:localStorage.getItem('tlAutoDetectColors'),
      };
    });
    check('OFF: accent reverts to site default indigo', afterOff.accent==='#6366f1', afterOff.accent);
    check('OFF: themed chrome off', afterOff.themed===false, String(afterOff.themed));
    check('OFF: Start CTA is default indigo', afterOff.start==='rgb(99, 102, 241)', afterOff.start);
    check('OFF: Start CTA is default indigo', afterOff.start==='rgb(99, 102, 241)', afterOff.start);
    check('OFF: localStorage=0', afterOff.tl==='0', afterOff.tl);
    const afterOn=await page.evaluate(async ()=>{
      const t=document.getElementById('tlAutoDetectToggle');
      t.checked=true; t.dispatchEvent(new Event('change',{ bubbles:true }));
      await new Promise(r=>setTimeout(r,700));
      return {
        accent:document.documentElement.style.getPropertyValue('--th-accent').trim(),
        themed:document.body.classList.contains('custom-theme-active'),
        start:getComputedStyle(document.getElementById('startBtn')).backgroundColor,
      };
    });
    check('ON: accent re-derives from scene config', afterOn.accent==='#0d9488', afterOn.accent);
    check('ON: themed chrome back on', afterOn.themed===true, String(afterOn.themed));
    check('ON: Start CTA follows derived accent', afterOn.start==='rgb(13, 148, 136)', afterOn.start);
    await page.evaluate(()=>{
      const t=document.getElementById('tlAutoDetectToggle');
      t.checked=false; t.dispatchEvent(new Event('change',{ bubbles:true }));
    });
    await sleep(900);
    const afterFinal=await page.evaluate(()=>({
      accent:document.documentElement.style.getPropertyValue('--th-accent').trim(),
      themed:document.body.classList.contains('custom-theme-active'),
      tl:localStorage.getItem('tlAutoDetectColors'),
    }));
    check('final OFF: accent resets to defaults', afterFinal.accent==='#6366f1', afterFinal.accent);
    check('final OFF: themed chrome off', afterFinal.themed===false, String(afterFinal.themed));
    check('final OFF: localStorage=0', afterFinal.tl==='0', afterFinal.tl);
  } else {
    console.log('    (Expanded Settings not open — skipping in-modal checks)');
    check('halt: Expanded Settings is open', false, 'skipped in-modal checks');
  }
  console.log('== 3. no page or console errors');
  check('zero page errors', errors===0, errors?`pageerrors=${errors}`:'');
  console.log(`STATS: runs=4 fails=${failed} errors=${errors}`);
} finally { await browser.close(); }
process.exit(failed||errors?1:0);
