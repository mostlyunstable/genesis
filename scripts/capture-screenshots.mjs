import puppeteer from 'puppeteer';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const screenshotDir = resolve(process.cwd(), 'docs/screenshots');
if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
}

const routes = [
  { name: 'command-center', path: '/' },
  { name: 'threat-intelligence', path: '/threats' },
  { name: 'security-events', path: '/events' },
  { name: 'detection-engine', path: '/detections' },
  { name: 'incidents', path: '/incidents' },
  { name: 'ai-investigator', path: '/investigator' },
  { name: 'response-operations', path: '/response' },
  { name: 'audit-trail', path: '/audit' },
  { name: 'system-configuration', path: '/settings' }
];

async function capture() {
  console.log('Starting headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. Capture Desktop Viewports (1440 x 900)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  for (const route of routes) {
    const url = `http://127.0.0.1:5173${route.path}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    // Wait an extra 300ms for animations and stores to stabilize
    await new Promise(r => setTimeout(r, 400));
    
    const outputPath = resolve(screenshotDir, `${route.name}-desktop.png`);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Saved screenshot: ${route.name}-desktop.png`);
  }

  // 2. Capture Mobile Viewport for Command Center (390 x 844)
  console.log('Capturing mobile viewport...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: resolve(screenshotDir, 'command-center-mobile.png'), fullPage: false });
  console.log('Saved screenshot: command-center-mobile.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
