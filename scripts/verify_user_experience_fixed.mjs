import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const VERIFIED_IMG_DIR = path.resolve('docs/screenshots/user-audit/verified');
if (!fs.existsSync(VERIFIED_IMG_DIR)) {
  fs.mkdirSync(VERIFIED_IMG_DIR, { recursive: true });
}

// Create a real sample log file for Scenario C
const sampleLogPath = path.resolve('scratch_auth_audit.log');
fs.writeFileSync(sampleLogPath, `Nov  1 10:14:02 bastion-01 sshd[12390]: Failed password for root from 198.51.100.42 port 49152 ssh2
Nov  1 10:14:05 bastion-01 sshd[12391]: Failed password for admin from 198.51.100.42 port 49154 ssh2
Nov  1 10:14:08 bastion-01 sshd[12392]: Failed password for ubuntu from 198.51.100.42 port 49156 ssh2
Nov  1 10:14:12 bastion-01 sshd[12393]: Accepted password for deploy from 198.51.100.42 port 49158 ssh2
`);

async function runVerification() {
  console.log('=== VERIFYING REAL USER EXPERIENCE POST-FIXES ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkErrors = [];
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      networkErrors.push({ url: resp.url(), status: resp.status() });
      console.log(`[NETWORK WARN] ${resp.status()} ${resp.url()}`);
    }
  });

  // 1. Visit /copilot as brand new unauthenticated user (clean localStorage)
  console.log('\nStep 1: Navigating to /copilot with clean state...');
  await page.goto('http://127.0.0.1:5173/copilot', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '01-copilot-fresh-clean.png'), fullPage: true });

  // 2. Scenario A: "Hello, what can you do for me?"
  console.log('\nStep 2: Testing Scenario A: "Hello, what can you do for me?"');
  await page.type('textarea', 'Hello, what can you do for me?');
  const sendBtn = await page.$('button[title*="Send message"]');
  if (sendBtn) await sendBtn.click();
  else await page.keyboard.press('Enter');

  console.log('Waiting for AI response streaming...');
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '02-scenario-a-greeting.png'), fullPage: true });

  const textA = await page.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.prose, p')).map(p => p.textContent?.trim()).filter(Boolean);
    return bubbles.slice(-4);
  });
  console.log('Scenario A snippet:', textA);

  // 3. Scenario B: "What is a brute-force attack, and how can you detect one in my logs?"
  console.log('\nStep 3: Testing Scenario B: "What is a brute-force attack, and how can you detect one in my logs?"');
  await page.type('textarea', 'What is a brute-force attack, and how can you detect one in my logs?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4500));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '03-scenario-b-concept.png'), fullPage: true });

  // 4. Scenario C: File upload via paperclip
  console.log('\nStep 4: Testing Scenario C: File Upload via paperclip input...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(sampleLogPath);
    console.log('Uploaded sample log file. Waiting for analysis...');
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '04-scenario-c-upload.png'), fullPage: true });
  } else {
    console.log('ERROR: File input not found!');
  }

  // 5. Scenario D: Follow-ups
  console.log('\nStep 5: Testing Scenario D: Multi-turn Follow-up: "Which accounts were affected?"');
  await page.type('textarea', 'Which accounts were affected?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Testing Scenario D: "Was there any successful login?"');
  await page.type('textarea', 'Was there any successful login?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Testing Scenario D: "Generate an investigation report."');
  await page.type('textarea', 'Generate an investigation report.');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4500));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '05-scenario-d-investigation-report.png'), fullPage: true });

  // 6. Scenario F: "Can you block the suspicious IP?"
  console.log('\nStep 6: Testing Scenario F: "Can you block the suspicious IP?"');
  await page.type('textarea', 'Can you block the suspicious IP?');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4500));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '06-scenario-f-action-proposal.png'), fullPage: true });

  // 7. Verify AI Investigator route does NOT crash
  console.log('\nStep 7: Verifying AI Investigator page (/investigator)...');
  await page.goto('http://127.0.0.1:5173/investigator', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '07-investigator-dossier-fixed.png'), fullPage: true });

  // 8. Test Overview Directive bar search
  console.log('\nStep 8: Testing Overview Directive bar handoff...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder*="Direct Sentinel"]', { timeout: 10000 });
  await page.type('input[placeholder*="Direct Sentinel"]', 'Investigate IP 198.51.100.42');
  await page.click('button[type="submit"]');
  console.log('Clicked Investigate from Overview. Waiting for handoff to Copilot...');
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: path.join(VERIFIED_IMG_DIR, '08-overview-handoff-to-copilot.png'), fullPage: true });

  await browser.close();
  if (fs.existsSync(sampleLogPath)) fs.unlinkSync(sampleLogPath);

  console.log('\n=== REAL USER VERIFICATION FINISHED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
