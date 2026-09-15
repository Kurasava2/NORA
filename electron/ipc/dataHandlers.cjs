const { ipcMain } = require('electron')
const { loadJsonWithRecovery, writeJsonAtomic } = require('../storage.cjs')
const { dataPath } = require('../paths.cjs')
const { logError } = require('../errorLog.cjs')

function registerDataHandlers() {
  ipcMain.handle('data:load', async () => {
    try {
      const loadedData = loadJsonWithRecovery(dataPath())
      return {
        success: true,
        data: loadedData.data,
        recoveredFrom: loadedData.recoveredFrom,
        recoveryDetail: loadedData.mainError || '',
      }
    } catch (error) {
      logError('data:load', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('data:save', async (_event, data) => {
    try {
      writeJsonAtomic(dataPath(), data)
      return { success: true }
    } catch (error) {
      logError('data:save', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.on('data:saveSync', (event, data) => {
    try {
      writeJsonAtomic(dataPath(), data)
      event.returnValue = { success: true }
    } catch (error) {
      logError('data:saveSync', error)
      event.returnValue = { success: false, error: error.message }
    }
  })
}

module.exports = { registerDataHandlers }
