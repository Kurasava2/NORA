const { BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { logError } = require('../errorLog.cjs')

function registerPrintHandlers(getMainWindow) {
  ipcMain.handle('printers:list', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return []

    try {
      const printerList = await mainWindow.webContents.getPrintersAsync()
      return printerList.map(printer => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        description: printer.description || '',
        isDefault: Boolean(printer.isDefault),
        status: printer.status || 0,
      }))
    } catch (error) {
      logError('printers:list', error)
      throw error
    }
  })

  ipcMain.handle('print:html', async (_event, { html, options }) => {
    let printWindow = null
    const temporaryHtmlPath = path.join(os.tmpdir(), `gsm-print-${Date.now()}.html`)

    try {
      await fs.promises.writeFile(temporaryHtmlPath, html, 'utf8')
      printWindow = new BrowserWindow({
        parent: getMainWindow(),
        width: 1000,
        height: 900,
        show: !options?.silent,
        autoHideMenuBar: true,
        title: 'Предпросмотр печати',
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      })
      await printWindow.loadFile(temporaryHtmlPath)

      const printResult = await new Promise(resolve => {
        printWindow.webContents.print(
          {
            silent: Boolean(options?.silent),
            printBackground: true,
            deviceName: options?.deviceName || undefined,
            landscape: false,
            color: false,
            margins: { marginType: 'none' },
            pageSize: 'A4',
          },
          (success, reason) =>
            resolve(
              success
                ? { success: true }
                : { success: false, error: reason || 'Ошибка печати' },
            ),
        )
      })

      printWindow.close()
      printWindow = null
      return printResult
    } catch (error) {
      try {
        printWindow?.close()
      } catch {}
      logError('print:html', error)
      return { success: false, error: error.message }
    } finally {
      setTimeout(() => fs.promises.unlink(temporaryHtmlPath).catch(() => {}), 3000)
    }
  })
}

module.exports = { registerPrintHandlers }
