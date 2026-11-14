'use strict';
const { app, BrowserWindow, Tray, Menu, Notification, clipboard, ipcMain, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const core = require('./core');
const { analyzeUrl } = require('./analyzer');

app.setAppUserModelId('com.phishguard.desktop');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); return; }   // a running copy handles the link instead (module-level return is valid in CommonJS)

let store, settings, tray, dashboard = null, quitting = false;
const warnings = new Map();            // webContents.id -> { url, score, level, indicators }
const notices = new Set();             // keep toast objects alive until closed
const seenRecently = new Map();        // url -> time, avoids re-alerting the same copied link
let lastClipboard = '';

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const rendererFile = name => path.join(__dirname, 'renderer', name);

// ---------- opening links ----------
function openInBrowser(url) {
  if (!core.isHttpUrl(url)) return;
  const browsers = core.findBrowsers();
  const chosen = browsers.find(b => b.id === settings.get().browser) || browsers[0];
  if (!chosen) { dialog.showErrorBox('PhishGuard', 'No other browser was found to open this link. Install Edge, Chrome or Firefox.'); return; }
  // No shell, and the URL is validated as http(s) above, so it cannot be treated as a command or flag.
  spawn(chosen.path, [url], { detached: true, stdio: 'ignore' }).unref();
}

function handleLink(url, source) {
  if (!core.isHttpUrl(url)) return;
  const verdict = analyzeUrl(url);
  store.add(url, verdict, source);
  refreshDashboard();
  if (verdict.level === 'low') { openInBrowser(url); return; }
  showWarning(url, verdict);
}

function showWarning(url, verdict) {
  const win = new BrowserWindow({
    width: 560, height: 780, title: 'PhishGuard link warning', icon: iconPath, alwaysOnTop: true, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-warning.js'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.setMenu(null);
  lockdown(win);
  const id = win.webContents.id;
  warnings.set(id, { url, score: verdict.score, level: verdict.level, indicators: verdict.indicators.map(i => ({ label: i.label, points: i.points })) });
  win.on('closed', () => warnings.delete(id));
  win.loadFile(rendererFile('warning.html'));
}

ipcMain.on('warning:get', e => { e.returnValue = JSON.stringify(warnings.get(e.sender.id) || {}); });
ipcMain.on('warning:back', e => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.on('warning:proceed', e => {
  const data = warnings.get(e.sender.id);
  if (data) openInBrowser(data.url);
  BrowserWindow.fromWebContents(e.sender)?.close();
});

// ---------- dashboard ----------
function lockdown(win) {
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showDashboard() {
  if (dashboard && !dashboard.isDestroyed()) { dashboard.show(); dashboard.focus(); return; }
  dashboard = new BrowserWindow({
    width: 800, height: 900, minWidth: 420, title: 'PhishGuard', icon: iconPath, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-main.js'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  dashboard.setMenu(null);
  lockdown(dashboard);
  dashboard.on('close', e => { if (!quitting) { e.preventDefault(); dashboard.hide(); } });   // keep running in the tray
  dashboard.loadFile(rendererFile('popup.html'));
}

function refreshDashboard() {
  if (dashboard && !dashboard.isDestroyed()) dashboard.webContents.executeJavaScript('window.refresh && window.refresh()').catch(() => {});
}

ipcMain.on('scans:get', e => { e.returnValue = store.json(); });
ipcMain.on('scans:clear', () => { store.clear(); refreshDashboard(); });
ipcMain.on('settings:get', e => { e.returnValue = JSON.stringify({ ...settings.get(), browsers: core.findBrowsers().map(({ id, label }) => ({ id, label })) }); });
ipcMain.on('settings:browser', (e, id) => { settings.set({ browser: String(id) }); buildTray(); });
ipcMain.on('settings:clipboard', (e, on) => { settings.set({ clipboard: !!on }); buildTray(); });
ipcMain.on('defaults:open', openDefaultApps);

function openDefaultApps() { shell.openExternal('ms-settings:defaultapps'); }   // Windows only lets the user choose the default browser

// ---------- background clipboard protection ----------
function watchClipboard() {
  setInterval(() => {
    if (!settings.get().clipboard) return;
    let text = '';
    try { text = clipboard.readText(); } catch { return; }
    if (!text || text === lastClipboard) return;
    lastClipboard = text;
    const now = Date.now();
    for (const url of core.extractUrls(text, 3)) {
      if (now - (seenRecently.get(url) || 0) < 60000) continue;
      seenRecently.set(url, now);
      const verdict = analyzeUrl(url);
      store.add(url, verdict, 'clipboard');
      if (verdict.level !== 'low') alert(url, verdict);
    }
    for (const [u, t] of seenRecently) if (now - t > 60000) seenRecently.delete(u);
    refreshDashboard();
  }, 1500);
}

function alert(url, verdict) {
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: verdict.level === 'high' ? 'High-risk link copied' : 'Copied link worth reviewing',
    body: `${verdict.host} · risk score ${verdict.score}/100. Don't open it unless you trust the sender.`
  });
  notices.add(n);
  n.on('click', showDashboard);
  n.on('close', () => notices.delete(n));
  n.show();
}

// ---------- tray ----------
function buildTray() {
  const s = settings.get();
  const browsers = core.findBrowsers();
  const chosen = browsers.find(b => b.id === s.browser) || browsers[0];
  const menu = Menu.buildFromTemplate([
    { label: 'Open dashboard', click: showDashboard },
    { type: 'separator' },
    { label: 'Check copied links (clipboard)', type: 'checkbox', checked: s.clipboard, click: item => { settings.set({ clipboard: item.checked }); buildTray(); } },
    { label: 'Open safe links with', submenu: browsers.length
        ? browsers.map(b => ({ label: b.label, type: 'radio', checked: chosen && chosen.id === b.id, click: () => { settings.set({ browser: b.id }); buildTray(); } }))
        : [{ label: 'No browser found', enabled: false }] },
    { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: item => app.setLoginItemSettings({ openAtLogin: item.checked, args: ['--hidden'] }) },
    { label: 'Make PhishGuard a default browser option…', click: openDefaultApps },
    { type: 'separator' },
    { label: 'Quit PhishGuard', click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

// ---------- lifecycle ----------
app.on('second-instance', (e, argv) => {            // Windows runs PhishGuard.exe <url> again when a link is clicked
  const url = core.findUrlArg(argv);
  if (url) handleLink(url, 'link-click'); else showDashboard();
});
app.on('window-all-closed', () => { /* stay in the tray */ });
app.on('before-quit', () => { quitting = true; });

app.whenReady().then(() => {
  const dir = app.getPath('userData');
  store = core.createScanStore(path.join(dir, 'scans.json'));
  settings = core.createSettings(path.join(dir, 'settings.json'));

  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip('PhishGuard is checking your links');
  tray.on('click', showDashboard);

  const firstRun = !app.getLoginItemSettings().openAtLogin && !settings.get().initialized;
  if (firstRun) { app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] }); settings.set({ initialized: true }); }
  buildTray();
  watchClipboard();

  const url = core.findUrlArg(process.argv);
  if (url) handleLink(url, 'link-click');
  else if (!process.argv.includes('--hidden')) showDashboard();
});
