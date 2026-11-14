'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../src/core');
const { analyzeUrl } = require('../src/analyzer');

test('analyzer matches the original extension on every fixture URL', () => {
  const urls = fs.readFileSync(path.join(__dirname, 'fixtures/urls.txt'), 'utf8').split('\n').filter(Boolean);
  const expected = fs.readFileSync(path.join(__dirname, 'fixtures/expected.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  assert.strictEqual(urls.length, expected.length);
  urls.forEach((u, i) => {
    const r = analyzeUrl(u);
    assert.deepStrictEqual({ u, score: r.score, level: r.level, ids: r.indicators.map(x => x.id) }, expected[i]);
  });
});

test('extractUrls trims punctuation, dedupes and caps', () => {
  const t = 'Parcel: http://bit.ly/3abc, see (https://example.com/a?b=1). Visit https://paypa1.com/signin! dup http://bit.ly/3abc';
  assert.deepStrictEqual(core.extractUrls(t), ['http://bit.ly/3abc', 'https://example.com/a?b=1', 'https://paypa1.com/signin']);
  assert.strictEqual(core.extractUrls('https://a.example/1 https://b.example/2 https://c.example/3', 2).length, 2);
  assert.deepStrictEqual(core.extractUrls(null), []);
  assert.deepStrictEqual(core.extractUrls('no links'), []);
});

test('findUrlArg and isHttpUrl only accept http(s)', () => {
  assert.strictEqual(core.findUrlArg(['C:\\app.exe', '--hidden', 'https://x.io/a']), 'https://x.io/a');
  assert.strictEqual(core.findUrlArg(['C:\\app.exe', '--hidden']), null);
  assert.strictEqual(core.findUrlArg(['C:\\app.exe', 'file:///etc/passwd', 'javascript:alert(1)']), null);
  assert.ok(core.isHttpUrl('https://x.io')); assert.ok(!core.isHttpUrl('file:///x')); assert.ok(!core.isHttpUrl('--flag'));
});

test('scan store keeps only the origin, newest first, capped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-'));
  const store = core.createScanStore(path.join(dir, 'scans.json'), 3);
  for (let i = 0; i < 5; i++) store.add(`https://e${i}.com/secret?token=abc`, analyzeUrl(`https://e${i}.com/`), 'clipboard', 1000 + i);
  const list = JSON.parse(store.json());
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list[0].url, 'https://e4.com');
  assert.ok(!JSON.stringify(list).includes('token'));
  store.clear();
  assert.deepStrictEqual(store.list(), []);
});

test('settings merge defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-'));
  const s = core.createSettings(path.join(dir, 's.json'));
  assert.deepStrictEqual(s.get(), { browser: null, clipboard: true });
  s.set({ browser: 'chrome' });
  assert.deepStrictEqual(s.get(), { browser: 'chrome', clipboard: true });
});

test('findBrowsers detects installed browsers from Windows paths', () => {
  const env = { PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' };
  const present = new Set(['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Mozilla Firefox\\firefox.exe']);
  const found = core.findBrowsers(env, p => present.has(p));
  assert.deepStrictEqual(found.map(b => b.id), ['edge', 'firefox']);
  assert.deepStrictEqual(core.findBrowsers({}, () => false), []);
});
