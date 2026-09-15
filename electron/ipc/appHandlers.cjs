const { app, ipcMain } = require('electron')
const { dataPath, errorLogPath, templatePath } = require('../paths.cjs')
const { logError } = require('../errorLog.cjs')

function registerAppHandlers(getMainWindow) {
  ipcMain.handle('app:logError', async (_event, { scope, message }) => {
    logError(
      `renderer:${String(scope || 'unknown').slice(0, 80)}`,
      new Error(String(message || 'Unknown renderer error')),
    )
    return true
  })

  ipcMain.handle('app:info', async () => ({
    version: app.getVersion(),
    dataPath: dataPath(),
    errorLogPath: errorLogPath(),
    templatePath: templatePath(),
    platform: process.platform,
    electron: process.versions.electron,
    chromium: process.versions.chrome,
  }))

  ipcMain.handle('window:minimize', async () => {
    getMainWindow()?.minimize()
    return true
  })
  ipcMain.handle('window:maximize', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', async () => {
    getMainWindow()?.close()
    return true
  })
  ipcMain.handle('window:isMaximized', async () => Boolean(getMainWindow()?.isMaximized()))
}

module.exports = { registerAppHandlers }
