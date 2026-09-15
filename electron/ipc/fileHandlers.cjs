const { dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const { copyFileAtomic, loadJsonWithRecovery, writeFileAtomic, writeJsonAtomic } = require('../storage.cjs')
const { templateMetaPath, templatePath } = require('../paths.cjs')
const { checkFileSize, logError } = require('../errorLog.cjs')

const MAX_BINARY_BYTES = 128 * 1024 * 1024
const MAX_TEMPLATE_BYTES = 64 * 1024 * 1024

function registerFileHandlers(getMainWindow) {
  ipcMain.handle('file:saveBinary', async (_event, { bytes, suggestedName, filters }) => {
    const dialogResult = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Сохранить файл',
      defaultPath: suggestedName || 'Ведомость.xlsx',
      filters:
        Array.isArray(filters) && filters.length
          ? filters
          : [{ name: 'Все файлы', extensions: ['*'] }],
    })
    if (dialogResult.canceled || !dialogResult.filePath) return { canceled: true }

    try {
      const fileBuffer = Buffer.from(bytes)
      if (fileBuffer.byteLength > MAX_BINARY_BYTES) {
        throw new Error('Экспортируемый файл слишком большой для 32-битной сборки.')
      }
      await writeFileAtomic(dialogResult.filePath, fileBuffer)
      return { success: true, path: dialogResult.filePath }
    } catch (error) {
      logError('file:saveBinary', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('template:choose', async () => {
    const dialogResult = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Выберите Excel-книгу — шаблон ведомости',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    if (dialogResult.canceled || !dialogResult.filePaths[0]) return { canceled: true }

    try {
      const sourcePath = dialogResult.filePaths[0]
      checkFileSize(sourcePath, MAX_TEMPLATE_BYTES, 'Excel-шаблон')
      await copyFileAtomic(sourcePath, templatePath())
      writeJsonAtomic(templateMetaPath(), {
        name: path.basename(sourcePath),
        source: sourcePath,
        savedAt: new Date().toISOString(),
      })
      return { success: true, name: path.basename(sourcePath) }
    } catch (error) {
      logError('template:choose', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('template:load', async () => {
    try {
      const workbookPath = templatePath()
      if (!fs.existsSync(workbookPath)) return { success: false }

      checkFileSize(workbookPath, MAX_TEMPLATE_BYTES, 'Excel-шаблон')
      const metadata = fs.existsSync(templateMetaPath())
        ? loadJsonWithRecovery(templateMetaPath()).data || {}
        : {}
      const bytes = new Uint8Array(await fs.promises.readFile(workbookPath))
      return { success: true, name: metadata.name || 'statement-template.xlsx', bytes }
    } catch (error) {
      logError('template:load', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('template:remove', async () => {
    try {
      const relatedPaths = [
        templatePath(),
        templateMetaPath(),
        `${templateMetaPath()}.bak`,
        `${templateMetaPath()}.tmp`,
      ]
      for (const relatedPath of relatedPaths) {
        try {
          await fs.promises.unlink(relatedPath)
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      return { success: true }
    } catch (error) {
      logError('template:remove', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = { registerFileHandlers }
