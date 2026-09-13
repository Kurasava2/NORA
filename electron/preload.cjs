const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: data => ipcRenderer.invoke('data:save', data),
  saveDataSync: data => ipcRenderer.sendSync('data:saveSync', data),
  exportBackup: (data, suggestedName) => ipcRenderer.invoke('backup:export', { data, suggestedName }),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  saveBinary: (bytes, suggestedName, filters) => ipcRenderer.invoke('file:saveBinary', { bytes, suggestedName, filters }),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  printHtml: (html, options) => ipcRenderer.invoke('print:html', { html, options }),
  chooseTemplate: () => ipcRenderer.invoke('template:choose'),
  loadTemplate: () => ipcRenderer.invoke('template:load'),
  removeTemplate: () => ipcRenderer.invoke('template:remove'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  logError: (scope, message) => ipcRenderer.invoke('app:logError', { scope, message }),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized')
})
