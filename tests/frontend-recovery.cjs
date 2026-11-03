const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadApi(fetch) {
  const storage = new Map();
  const events = [];
  const module = { exports: {} };
  const source = fs.readFileSync('src/services/api/index.ts', 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', "''");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, fetch, console, Event, TextDecoder, AbortController,
    window: { dispatchEvent: event => events.push(event.type) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
  return { ...module.exports, events };
}

test('production API uses same-origin and does not silently sign in', async () => {
  const calls = [];
  const { sentinelApi } = loadApi(async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ provider: 'Ollama', model: 'test', available: true }));
  });
  await sentinelApi.chat.getModel();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/v1/chat/model');
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test('EOF before completion reports interruption instead of hanging', async () => {
  const { sentinelApi } = loadApi(async () => new Response('event: token\ndata: {"delta":"Partial"}\n\n'));
  const failures = [], tokens = [];
  await assert.rejects(sentinelApi.chat.streamMessage('conversation', 'question', {
    onToken: delta => tokens.push(delta), onError: error => failures.push(error.message),
  }), /connection ended/);
  assert.deepEqual(tokens, ['Partial']);
  assert.equal(failures.length, 1);
});

test('completed stream targets the selected reply without extra user requests', async () => {
  let body;
  const { sentinelApi } = loadApi(async (_, options) => {
    body = JSON.parse(options.body);
    return new Response('event: done\ndata: {"messageId":"reply-1","tokenCount":4}\n\n');
  });
  let completed = false;
  await sentinelApi.chat.streamMessage('conversation', 'question', {
    onDone: () => { completed = true; },
  }, undefined, undefined, undefined, undefined, 'reply-1');
  assert.equal(body.retryMessageId, 'reply-1');
  assert.equal(completed, true);
});

test('expired sessions request sign-in', async () => {
  const { sentinelApi, events } = loadApi(async () => new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 }));
  await assert.rejects(sentinelApi.chat.getModel(), /Expired/);
  assert.deepEqual(events, ['genesis-session-expired']);
});
