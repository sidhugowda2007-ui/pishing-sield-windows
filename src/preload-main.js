'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('PG', {
  getScans: () => ipcRenderer.sendSync('scans:get'),
  clearScans: () => ipcRenderer.send('scans:clear'),
  getSettings: () => ipcRenderer.sendSync('settings:get'),
  setBrowser: id => ipcRenderer.send('settings:browser', String(id)),
  setClipboard: on => ipcRenderer.send('settings:clipboard', !!on),
  openDefaultApps: () => ipcRenderer.send('defaults:open')
});
