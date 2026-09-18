const { app, ipcMain } = require('electron')
const {
  dataPath,
  databasePath,
  errorLogPath,
  templatePath,
} = require('../paths.cjs')
const { closeApplicationStore } = require('../database/manager.cjs')
const { logError } = require('../errorLog.cjs')
const {
  approveWindowClose,
  cancelWindowClose,
} = require('../window.cjs')

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
    dataPath: databasePath(),
    databasePath: databasePath(),
    legacyDataPath: dataPath(),
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

  ipcMain.handle('window:completeClose', async () => {
    const mainWindow = getMainWindow()
    try {
      await closeApplicationStore()
      return { success: approveWindowClose(mainWindow) }
    } catch (error) {
      cancelWindowClose(mainWindow)
      logError('window:completeClose', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('window:cancelClose', async () => {
    return cancelWindowClose(getMainWindow())
  })

  ipcMain.handle(
    'window:isMaximized',
    async () => Boolean(getMainWindow()?.isMaximized()),
  )
}

module.exports = { registerAppHandlers }
