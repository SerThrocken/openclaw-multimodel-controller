const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  aiRequest: (options) => ipcRenderer.invoke('ai-request', options),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  platform: process.platform,
});
