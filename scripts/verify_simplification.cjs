const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../docs/screenshots/simplification');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test across Viewports
  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'laptop_1280', width: 1280, height: 800 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 }
  ];

  console.log('--- 1. CAPTURING OVERVIEW ACROSS VIEWPORTS ---');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const outPath = path.join(SCREENSHOT_DIR, `overview_${vp.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${outPath}`);
  }

  // Set back to 1440 for core desktop testing
  await page.setViewport({ width: 1440, height: 900 });

  console.log('--- 2. COPILOT INITIAL STATE ---');
  await page.goto('http://127.0.0.1:5173/copilot', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot_initial.png') });
  console.log('Saved: copilot_initial.png');

  console.log('--- 3. TESTING CHATBOT: SENDING "Hi" ---');
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.type('Hi');
    await page.keyboard.press('Enter');
    // Wait for response to finish streaming (done event or stop button disappearance)
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot_hi_response.png') });
    console.log('Saved: copilot_hi_response.png');

    // Extract message text from page
    const messages = await page.evaluate(() => {
      const els = document.querySelectorAll('p, .whitespace-pre-wrap');
      return Array.from(els).map(e => e.textContent.trim()).filter(Boolean);
    });
    console.log('Messages on page:', messages.filter(m => m.includes('Hey!') || m.includes('investigate')));
  }

  console.log('--- 4. TESTING CHATBOT: SENDING "What can you do?" ---');
  // Click "New Chat"
  const newChatBtn = await page.$('button');
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('New Chat')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  const textarea2 = await page.$('textarea');
  if (textarea2) {
    await textarea2.type('What can you do?');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'copilot_capabilities_response.png') });
    console.log('Saved: copilot_capabilities_response.png');
  }

  console.log('--- 5. CAPTURING OTHER SIMPLIFIED PAGES ---');
  const pagesToCapture = [
    { route: '/incidents', name: 'incidents' },
    { route: '/events', name: 'events' },
    { route: '/detections', name: 'detections' },
    { route: '/response', name: 'response' },
    { route: '/audit', name: 'audit' }
  ];

  for (const p of pagesToCapture) {
    await page.goto(`http://127.0.0.1:5173${p.route}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${p.name}.png`) });
    console.log(`Saved: ${p.name}.png`);
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
