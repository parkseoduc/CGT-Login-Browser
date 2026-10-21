const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.send('app:openExternal', url),
  openPath: (path) => ipcRenderer.send('app:openPath', path),
  showItemInFolder: (path) => ipcRenderer.send('app:showItemInFolder', path),
  getVersion: () => ipcRenderer.invoke('app:version'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
});
