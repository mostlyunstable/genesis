const puppeteer = require('puppeteer');

async function testResponsive() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'laptop_1280', width: 1280, height: 800 },
    { name: 'small_window_800', width: 800, height: 600 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  const routes = [
    { name: 'copilot', path: '/copilot' },
    { name: 'response', path: '/response' },
    { name: 'audit', path: '/audit' },
    { name: 'settings', path: '/settings' },
  ];

  console.log('Testing responsive viewports and routes...');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    for (const route of routes) {
      await page.goto(`http://127.0.0.1:5173${route.path}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 600));

      // Check for horizontal overflow on document
      const metrics = await page.evaluate(() => {
        return {
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          hasOuterVerticalScrollOnBody: document.body.scrollHeight > window.innerHeight
        };
      });

      console.log(`Route [${route.name}]: overflowX=${metrics.hasHorizontalOverflow}, scrollW=${metrics.scrollWidth}, clientW=${metrics.windowInnerWidth}`);
      
      if (vp.name === 'laptop_1280' || vp.name === 'mobile_390' || vp.name === 'small_window_800') {
        await page.screenshot({
          path: `docs/screenshots/simplification/${route.name}_${vp.name}.png`
        });
      }
    }
  }

  await browser.close();
  console.log('\nVerification complete!');
}

testResponsive().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
