const { registerAppHandlers } = require('./appHandlers.cjs')
const { registerBackupHandlers } = require('./backupHandlers.cjs')
const { registerDataHandlers } = require('./dataHandlers.cjs')
const { registerFileHandlers } = require('./fileHandlers.cjs')
const { registerPrintHandlers } = require('./printHandlers.cjs')

function registerIpcHandlers(getMainWindow) {
  registerDataHandlers()
  registerBackupHandlers(getMainWindow)
  registerFileHandlers(getMainWindow)
  registerPrintHandlers(getMainWindow)
  registerAppHandlers(getMainWindow)
}

module.exports = { registerIpcHandlers }
