const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ghostop', Object.freeze({
  selectFolder: () => ipcRenderer.invoke('folder:choose'),
  listMedia: folder => ipcRenderer.invoke('folder:listMedia', folder),
  readFile: filePath => ipcRenderer.invoke('file:read', filePath),
  readRange: (filePath, start, length) => ipcRenderer.invoke('file:readRange', filePath, start, length),
  moveFile: (folder, source, relParts, name) => ipcRenderer.invoke('file:move', folder, source, relParts, name),
  undoMove: (folder, relParts, movedName, originalPath) => ipcRenderer.invoke('file:undo', folder, relParts, movedName, originalPath),
  writeSortLog: (folder, records) => ipcRenderer.invoke('file:writeLog', folder, records),
  removeSortLog: folder => ipcRenderer.invoke('file:removeLog', folder),
  windowAction: action => ipcRenderer.invoke('window:action', action),
  modelStatus: () => ipcRenderer.invoke('model:status'),
  modelDownload: () => ipcRenderer.invoke('model:download'),
  modelCancel: () => ipcRenderer.invoke('model:cancel'),
  modelDelete: () => ipcRenderer.invoke('model:delete'),
  onModelProgress: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on('model:progress', listener); return () => ipcRenderer.removeListener('model:progress', listener); },
  reverseGeocode: (latitude, longitude) => ipcRenderer.invoke('location:reverseGeocode', latitude, longitude)
}));
