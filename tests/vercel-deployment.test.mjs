import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBackendOrigin } from '../scripts/validate-vercel-env.mjs';

test('Vercel deployment requires a public HTTPS backend origin', () => {
  for (const value of [
    undefined, '', 'api.host.com', 'http://api.host.com', 'https://localhost',
    'https://127.0.0.1:8000', 'https://10.0.0.1', 'https://192.168.1.1',
    'https://[::1]', 'https://[fd00::1]', 'https://[febf::1]', 'https://api.example.com',
    'https://api.host.com/api/v1', 'https://api.host.com?key=secret',
    'https://user:secret@api.host.com', 'https://api.host.com#fragment',
  ]) {
    assert.throws(() => validateBackendOrigin(value));
  }
  assert.equal(validateBackendOrigin('https://api.genesis.host/'), 'https://api.genesis.host');
});

test('Vercel configuration builds only the frontend and enables SPA routes', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.match(config.installCommand, /PUPPETEER_SKIP_DOWNLOAD=true npm ci/);
  for (const route of ['/copilot', '/response', '/audit', '/settings']) {
    const rule = config.rewrites.find(rule => new RegExp('^' + rule.source + '$').test(route));
    assert.equal(rule.destination, '/index.html');
  }
});
