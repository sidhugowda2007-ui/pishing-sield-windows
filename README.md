# PhishGuard for Windows

Windows version of the PhishGuard Chrome extension. It runs in the system tray, starts with Windows, and uses the
**original analyzer.js** (unchanged apart from the module wrapper) with the same dashboard and warning screens.
All checking happens on your PC.

## What it does

| Where the link comes from | How PhishGuard sees it |
|---|---|
| Clicked in any app (Outlook, Teams, Word, chat apps...) | Choose PhishGuard as a browser option in Windows Default apps. Safe links open instantly in your real browser; risky ones show the warning first. |
| Copied to the clipboard (background) | A background watcher checks copied links and shows a Windows notification for risky ones. Can be switched off. |
| Typed in the address bar of a browser | Not covered, same limit as the extension. |

## Get the installer (no setup on your PC)
1. Push this folder to a GitHub repository.
2. The *Build Windows installer* workflow runs on its own (Actions tab). Download **PhishGuard-Windows-Installer** from the run.
3. Run `PhishGuard Setup 1.0.0.exe`. It installs for your user only (no admin). The installer is unsigned, so Windows SmartScreen may show
   "Windows protected your PC": choose *More info > Run anyway*.

Or build locally on Windows with Node 22: `npm install`, `npm test`, `npm run dist` (installer appears in `dist/`).
To try it without installing: `npm install` then `npm start`.

## First-time setup
1. Open PhishGuard (tray icon near the clock, or the Start menu).
2. In the dashboard, click **Open Default apps** and choose PhishGuard under *Web browser* (Windows only lets you, not the app, change this).
3. Pick which browser safe links open in. Edge, Chrome, Firefox, Brave and Opera are detected.

If you ever uninstall PhishGuard while it is the default, choose your browser again in Default apps.

## Notes
- No page-level signals (password-form checks): the app only sees the link, not the page.
- History keeps only `scheme://host` per link and is capped at 2,000 entries (`%APPDATA%\PhishGuard\scans.json`).
- Scores are warning signals, not proof of safety or danger.

## Layout
`src/main.js` tray, link handler, clipboard watcher, windows. `src/core.js` testable logic. `src/analyzer.js` the extension's scoring.
`src/renderer/` dashboard and warning UI. `build/installer.nsh` registers PhishGuard in Windows Default apps.
`tests/` includes a check that the analyzer scores 38 sample URLs exactly like the original extension.
