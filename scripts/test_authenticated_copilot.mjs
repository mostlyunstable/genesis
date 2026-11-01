import puppeteer from 'puppeteer';
import path from 'path';

const AUDIT_IMG_DIR = path.resolve('docs/screenshots/user-audit');
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWNvcHNfYW5hbHlzdEBzZW50aW5lbC5haSIsInJvbGUiOiJhZG1pbiIsImlkIjoiVVNSLTAwMSIsImV4cCI6MTc5MzU1NzA2MX0.ZBlUG0gOuSu9E8UBGHyCx4KZyFPLXqoXe6CtgBOMpn4';

async function testWithToken() {
  console.log('--- TESTING COPILOT WITH AUTHENTICATED ANALYST TOKEN ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to app and set token in localStorage
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('sentinel_auth_token', tok);
  }, TOKEN);

  // Navigate to /copilot
  console.log('Navigating to /copilot with token...');
  await page.goto('http://127.0.0.1:5173/copilot', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '04-copilot-authenticated-empty.png'), fullPage: true });

  // Test Scenario A: "Hello, what can you do for me?"
  console.log('Sending Scenario A message...');
  const textarea = await page.$('textarea');
  if (textarea) {
    await page.type('textarea', 'Hello, what can you do for me?');
    const sendBtn = await page.$('button[title*="Send message"]');
    if (sendBtn) await sendBtn.click();
    else await page.keyboard.press('Enter');

    console.log('Waiting for AI response streaming...');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '04-scenario-a-auth-response.png'), fullPage: true });
  }

  // Check messages rendered in the thread
  const messagesRendered = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.prose, p')).map(p => p.textContent?.trim()).filter(Boolean);
  });
  console.log('Rendered Messages snippet:', messagesRendered.slice(0, 5));

  // Test Scenario B: "What is a brute-force attack, and how can you detect one in my logs?"
  console.log('\nSending Scenario B message...');
  await page.type('textarea', 'What is a brute-force attack, and how can you detect one in my logs?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '04-scenario-b-auth-response.png'), fullPage: true });

  // Test Scenario E: "Investigate the latest suspicious activity in my environment."
  console.log('\nSending Scenario E message...');
  await page.type('textarea', 'Investigate the latest suspicious activity in my environment.');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '04-scenario-e-auth-response.png'), fullPage: true });

  // Test Scenario F: "Can you block the suspicious IP?"
  console.log('\nSending Scenario F message...');
  await page.type('textarea', 'Can you block the suspicious IP?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(AUDIT_IMG_DIR, '04-scenario-f-auth-response.png'), fullPage: true });

  const finalState = await page.evaluate(() => {
    const actionCards = Array.from(document.querySelectorAll('[class*="border-amber"], [class*="ActionProposal"]')).map(el => el.textContent?.trim());
    const evidenceChips = Array.from(document.querySelectorAll('button:has(.rounded-full)')).map(el => el.textContent?.trim());
    return { actionCards, evidenceChips };
  });
  console.log('Action Cards:', finalState.actionCards);
  console.log('Evidence Chips:', finalState.evidenceChips);

  await browser.close();
  console.log('--- AUTHENTICATED COPILOT TEST COMPLETE ---');
}

testWithToken().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
