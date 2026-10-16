const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.send('app:openExternal', url),
  getVersion: () => ipcRenderer.invoke('app:version'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
});
