const { app, dialog, ipcMain } = require('electron')
const fs = require('fs')
const { createUniversalBackup, parseUniversalBackup } = require('../backup.cjs')
const { writeFileAtomic } = require('../storage.cjs')
const { checkFileSize, logError } = require('../errorLog.cjs')

const MAX_BACKUP_BYTES = 32 * 1024 * 1024

function registerBackupHandlers(getMainWindow) {
  ipcMain.handle('backup:export', async (_event, { data, suggestedName }) => {
    const dialogResult = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Сохранить резервную копию',
      defaultPath: suggestedName || 'ГСМ_универсальная_копия.gsmbackup',
      filters: [{ name: 'ГСМ универсальная копия', extensions: ['gsmbackup'] }],
    })
    if (dialogResult.canceled || !dialogResult.filePath) return { canceled: true }

    try {
      const backupText = createUniversalBackup(data, { appVersion: app.getVersion() })
      if (Buffer.byteLength(backupText, 'utf8') > MAX_BACKUP_BYTES) {
        throw new Error('Резервная копия слишком большая для сохранения.')
      }
      await writeFileAtomic(dialogResult.filePath, backupText, 'utf8')
      return { success: true, path: dialogResult.filePath }
    } catch (error) {
      logError('backup:export', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('backup:import', async () => {
    const dialogResult = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Выбрать резервную копию',
      properties: ['openFile'],
      filters: [{ name: 'ГСМ универсальная копия', extensions: ['gsmbackup'] }],
    })
    if (dialogResult.canceled || !dialogResult.filePaths[0]) return { canceled: true }

    try {
      const filePath = dialogResult.filePaths[0]
      checkFileSize(filePath, MAX_BACKUP_BYTES, 'Резервная копия')
      const backupText = await fs.promises.readFile(filePath, 'utf8')
      const parsedBackup = parseUniversalBackup(backupText)
      return {
        success: true,
        data: parsedBackup.data,
        meta: parsedBackup.meta,
        path: filePath,
      }
    } catch (error) {
      logError('backup:import', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerBackupHandlers }
