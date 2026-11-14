'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('PG', {
  getWarning: () => ipcRenderer.sendSync('warning:get'),
  back: () => ipcRenderer.send('warning:back'),
  proceed: () => ipcRenderer.send('warning:proceed')
});
