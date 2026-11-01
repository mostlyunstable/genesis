import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const AUDIT_IMG_DIR = path.resolve('docs/screenshots/user-audit');
if (!fs.existsSync(AUDIT_IMG_DIR)) {
  fs.mkdirSync(AUDIT_IMG_DIR, { recursive: true });
}

async function runAudit() {
  console.log('=== STARTING SENTINEL AI REAL USER AUDIT SESSION ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      networkErrors.push({ url: resp.url(), status: resp.status() });
      console.log(`[NETWORK ERROR] ${resp.status()} ${resp.url()}`);
    }
  });

  // ==========================================
  // PHASE 1 — FIRST IMPRESSION (Clean State, No Token)
  // ==========================================
  console.log('\n--- PHASE 1: FIRST IMPRESSION ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '01-first-impression-1440.png'), fullPage: true });

  const pageTitle = await page.title();
  const pageUrl = page.url();
  console.log(`Initial URL: ${pageUrl}, Title: ${pageTitle}`);

  // Inspect what the user sees
  const initialText = await page.evaluate(() => {
    return {
      h1: Array.from(document.querySelectorAll('h1, h2')).map(el => el.textContent?.trim()),
      navItems: Array.from(document.querySelectorAll('nav a, aside a')).map(el => el.textContent?.trim()),
      buttons: Array.from(document.querySelectorAll('button')).map(el => el.textContent?.trim()).filter(Boolean)
    };
  });
  console.log('Visible Headers:', initialText.h1);
  console.log('Navigation items:', initialText.navItems);
  console.log('Buttons:', initialText.buttons.slice(0, 10));

  // ==========================================
  // PHASE 2 — EXPLORE THE ENTIRE APPLICATION
  // ==========================================
  console.log('\n--- PHASE 2: EXPLORE APPLICATION ROUTES ---');
  const routes = [
    { name: 'Overview / Command Center', path: '/' },
    { name: 'Security Copilot', path: '/copilot' },
    { name: 'AI Investigator', path: '/investigator' },
    { name: 'Security Events', path: '/events' },
    { name: 'Incidents Queue', path: '/incidents' },
    { name: 'Threat Intelligence', path: '/threats' },
    { name: 'Detection Engine', path: '/detection' },
    { name: 'Response Center', path: '/response' },
    { name: 'Audit Trail', path: '/audit' },
    { name: 'Settings', path: '/settings' }
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.name} (${r.path})...`);
    await page.goto(`http://127.0.0.1:5173${r.path}`, { waitUntil: 'networkidle2', timeout: 10000 }).catch(e => console.log(`Nav error: ${e.message}`));
    await new Promise(res => setTimeout(res, 1000));
    const safeName = r.path === '/' ? 'overview' : r.path.replace('/', '');
    await page.screenshot({ path: path.join(AUDIT_IMG_DIR, `02-route-${safeName}.png`), fullPage: true });
  }

  // ==========================================
  // PHASE 3 — USE THE CHATBOT LIKE A REAL USER
  // ==========================================
  console.log('\n--- PHASE 3: INTERACTING WITH CHATBOT /copilot ---');
  await page.goto('http://127.0.0.1:5173/copilot', { waitUntil: 'networkidle2', timeout: 10000 });
  await new Promise(res => setTimeout(res, 2000));

  // Check state of copilot page
  const copilotUIState = await page.evaluate(() => {
    const errorEl = document.querySelector('.bg-red-50, .text-red-600, [role="alert"]');
    const inputEl = document.querySelector('textarea, input[type="text"]');
    const sendBtn = document.querySelector('button[type="submit"], button:has(svg)');
    const fileUpload = document.querySelector('input[type="file"]');
    return {
      hasError: !!errorEl,
      errorText: errorEl ? errorEl.textContent?.trim() : null,
      hasInput: !!inputEl,
      inputPlaceholder: inputEl ? inputEl.getAttribute('placeholder') : null,
      hasFileUpload: !!fileUpload,
      allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim() || b.getAttribute('aria-label') || 'icon-btn')
    };
  });
  console.log('Copilot UI State:', copilotUIState);

  // Scenario A: "Hello, what can you do for me?"
  console.log('\nTesting Scenario A: "Hello, what can you do for me?"');
  const textareaExists = await page.$('textarea');
  if (textareaExists) {
    await page.type('textarea', 'Hello, what can you do for me?');
    await page.keyboard.press('Enter');
    console.log('Sent Scenario A query. Waiting 6 seconds for response...');
    await new Promise(res => setTimeout(res, 6000));
    await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '03-scenario-a-response.png'), fullPage: true });

    const messagesA = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.prose, [class*="message"], [class*="bubble"]')).map(el => el.textContent?.trim());
      const alerts = Array.from(document.querySelectorAll('.bg-red-50, .text-red-500, .text-red-600')).map(el => el.textContent?.trim());
      return { msgs, alerts };
    });
    console.log('Scenario A UI Messages/Alerts:', messagesA);
  } else {
    console.log('CRITICAL: No textarea found on /copilot!');
  }

  // Check file upload capability
  console.log('\nChecking Scenario C: File upload capability');
  const uploadInfo = await page.evaluate(() => {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const uploadButtons = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent?.toLowerCase().includes('upload') || 
      b.getAttribute('aria-label')?.toLowerCase().includes('upload') ||
      b.innerHTML.includes('Upload') ||
      b.innerHTML.includes('Paperclip') ||
      b.innerHTML.includes('Attach')
    );
    return {
      fileInputCount: fileInputs.length,
      uploadButtons: uploadButtons.map(b => b.textContent?.trim() || b.getAttribute('aria-label') || 'btn')
    };
  });
  console.log('Upload Info:', uploadInfo);

  // Responsive Viewports Audit
  console.log('\n--- PHASE 6: RESPONSIVE VIEWPORT CHECKS ---');
  const viewports = [
    { name: '1280-laptop', width: 1280, height: 800 },
    { name: '768-tablet', width: 768, height: 1024 },
    { name: '390-mobile', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://127.0.0.1:5173/copilot', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(AUDIT_IMG_DIR, `06-copilot-${vp.name}.png`), fullPage: true });
    
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(AUDIT_IMG_DIR, `06-overview-${vp.name}.png`), fullPage: true });
  }

  await browser.close();
  console.log('=== AUDIT RUN COMPLETED ===');
}

runAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
