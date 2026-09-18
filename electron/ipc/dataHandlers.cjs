const { ipcMain } = require('electron')
const { getApplicationStore } = require('../database/manager.cjs')
const { logError } = require('../errorLog.cjs')

function registerDataHandlers() {
  ipcMain.handle('data:load', async () => {
    try {
      const loadResult = await getApplicationStore().load()
      return { success: true, ...loadResult }
    } catch (error) {
      logError('data:load', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('data:save', async (_event, payload) => {
    try {
      const data = payload?.data ?? payload
      const options = payload?.data ? payload.options || {} : {}
      await getApplicationStore().save(data, options)
      return { success: true }
    } catch (error) {
      logError('data:save', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerDataHandlers }
