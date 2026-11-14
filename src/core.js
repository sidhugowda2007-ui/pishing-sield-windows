'use strict';
// Electron-free logic (testable with plain Node): URL extraction, scan history, settings, browser discovery.
const fs = require('fs');
const path = require('path');

const URL_RE = /https?:\/\/[^\s<>"'\u201c\u201d\u2018\u2019]+/gi;

function extractUrls(text, max = 5) {
  if (typeof text !== 'string') return [];
  const found = new Set();
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0];
    while (url.length && '.,;:!?)]}'.includes(url[url.length - 1])) url = url.slice(0, -1);
    if (url.length > 8) found.add(url);
    if (found.size >= max) break;
  }
  return [...found];
}

/** First http(s) URL in a command line (Windows launches "PhishGuard.exe <url>" for a clicked link). */
function findUrlArg(argv) {
  return (argv || []).find(a => typeof a === 'string' && /^https?:\/\//i.test(a)) || null;
}

function isHttpUrl(value) {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}

/** Scan history. Stores only scheme://host of each link (paths/queries can carry tokens). Same record shape as the extension. */
function createScanStore(file, max = 2000) {
  return {
    list: () => { const v = readJson(file, []); return Array.isArray(v) ? v : []; },
    json() { return JSON.stringify(this.list()); },
    add(url, verdict, source, now = Date.now()) {
      let stored = url;
      try { stored = new URL(url).origin; } catch { /* keep as is */ }
      const record = { url: stored, host: verdict.host, time: now, score: verdict.score, level: verdict.level, source };
      writeJson(file, [record, ...this.list()].slice(0, max));
    },
    clear: () => writeJson(file, [])
  };
}

function createSettings(file, defaults = { browser: null, clipboard: true }) {
  return {
    get: () => ({ ...defaults, ...readJson(file, {}) }),
    set(patch) { writeJson(file, { ...this.get(), ...patch }); }
  };
}

/** Installed browsers PhishGuard can forward safe links to (never PhishGuard itself, so no loop). */
function findBrowsers(env = process.env, exists = fs.existsSync) {
  const pf = env.PROGRAMFILES, pf86 = env['PROGRAMFILES(X86)'], local = env.LOCALAPPDATA;
  const j = (...parts) => (parts[0] ? path.win32.join(...parts) : null);
  const candidates = [
    { id: 'edge', label: 'Microsoft Edge', paths: [j(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), j(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')] },
    { id: 'chrome', label: 'Google Chrome', paths: [j(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), j(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'), j(local, 'Google', 'Chrome', 'Application', 'chrome.exe')] },
    { id: 'firefox', label: 'Mozilla Firefox', paths: [j(pf, 'Mozilla Firefox', 'firefox.exe'), j(pf86, 'Mozilla Firefox', 'firefox.exe')] },
    { id: 'brave', label: 'Brave', paths: [j(pf, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'), j(local, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')] },
    { id: 'opera', label: 'Opera', paths: [j(local, 'Programs', 'Opera', 'opera.exe')] }
  ];
  const out = [];
  for (const c of candidates) {
    const found = c.paths.filter(Boolean).find(p => exists(p));
    if (found) out.push({ id: c.id, label: c.label, path: found });
  }
  return out;
}

module.exports = { extractUrls, findUrlArg, isHttpUrl, createScanStore, createSettings, findBrowsers };
