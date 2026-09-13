const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { copyFileAtomic, loadJsonWithRecovery, writeFileAtomic, writeJsonAtomic } = require('./storage.cjs')
const { createUniversalBackup, parseUniversalBackup } = require('./backup.cjs')

const MAX_BACKUP_BYTES = 32 * 1024 * 1024
const MAX_BINARY_BYTES = 128 * 1024 * 1024
const MAX_TEMPLATE_BYTES = 64 * 1024 * 1024
const MAX_ERROR_LOG_BYTES = 1024 * 1024

let mainWindow

const dataPath = () => path.join(app.getPath('userData'), 'gsm-data.json')
const templatePath = () => path.join(app.getPath('userData'), 'statement-template.xlsx')
const templateMetaPath = () => path.join(app.getPath('userData'), 'statement-template.json')
const errorLogPath = () => path.join(app.getPath('userData'), 'gsm-errors.log')
function logError(scope, error) {
  try {
    const file = errorLogPath()
    const previous = `${file}.previous`
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (fs.existsSync(file) && fs.statSync(file).size >= MAX_ERROR_LOG_BYTES) {
      try { if (fs.existsSync(previous)) fs.unlinkSync(previous) } catch {}
      try { fs.renameSync(file, previous) } catch {}
    }
    const detail = error?.stack || error?.message || String(error)
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${scope}\n${detail}\n\n`, 'utf8')
  } catch {}
}

function checkFileSize(file, maxBytes, label) {
  const size = fs.statSync(file).size
  if (size > maxBytes) throw new Error(`${label} слишком большой (${Math.ceil(size / 1024 / 1024)} МБ).`)
  return size
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#030712',
    autoHideMenuBar: true,
    frame: false,
    show: false,
    title: 'ГСМ Ведомости',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  const dev = process.env.VITE_DEV_SERVER_URL
  if (dev) mainWindow.loadURL(dev)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('data:load', async () => {
  try {
    const loaded = loadJsonWithRecovery(dataPath())
    return {
      success: true,
      data: loaded.data,
      recoveredFrom: loaded.recoveredFrom,
      recoveryDetail: loaded.mainError || ''
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

ipcMain.handle('backup:export', async (_event, { data, suggestedName }) => {
  const out = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить резервную копию',
    defaultPath: suggestedName || 'ГСМ_универсальная_копия.gsmbackup',
    filters: [{ name: 'ГСМ универсальная копия', extensions: ['gsmbackup'] }]
  })
  if (out.canceled || !out.filePath) return { canceled: true }
  try {
    const text = createUniversalBackup(data, { appVersion: app.getVersion() })
    if (Buffer.byteLength(text, 'utf8') > MAX_BACKUP_BYTES) throw new Error('Резервная копия слишком большая для сохранения.')
    await writeFileAtomic(out.filePath, text, 'utf8')
    return { success: true, path: out.filePath }
  } catch (error) {
    logError('backup:export', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('backup:import', async () => {
  const out = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбрать резервную копию',
    properties: ['openFile'],
    filters: [{ name: 'ГСМ универсальная копия', extensions: ['gsmbackup'] }]
  })
  if (out.canceled || !out.filePaths[0]) return { canceled: true }
  try {
    const file = out.filePaths[0]
    checkFileSize(file, MAX_BACKUP_BYTES, 'Резервная копия')
    const text = await fs.promises.readFile(file, 'utf8')
    const parsed = parseUniversalBackup(text)
    return { success: true, data: parsed.data, meta: parsed.meta, path: file }
  } catch (error) {
    logError('backup:import', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('file:saveBinary', async (_event, { bytes, suggestedName, filters }) => {
  const out = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить файл',
    defaultPath: suggestedName || 'Ведомость.xlsx',
    filters: Array.isArray(filters) && filters.length ? filters : [{ name: 'Все файлы', extensions: ['*'] }]
  })
  if (out.canceled || !out.filePath) return { canceled: true }
  try {
    const buffer = Buffer.from(bytes)
    if (buffer.byteLength > MAX_BINARY_BYTES) throw new Error('Экспортируемый файл слишком большой для 32-битной сборки.')
    await writeFileAtomic(out.filePath, buffer)
    return { success: true, path: out.filePath }
  } catch (error) {
    logError('file:saveBinary', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('template:choose', async () => {
  const out = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите Excel-книгу — шаблон ведомости',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  if (out.canceled || !out.filePaths[0]) return { canceled: true }
  try {
    const src = out.filePaths[0]
    checkFileSize(src, MAX_TEMPLATE_BYTES, 'Excel-шаблон')
    await copyFileAtomic(src, templatePath())
    writeJsonAtomic(templateMetaPath(), { name: path.basename(src), source: src, savedAt: new Date().toISOString() })
    return { success: true, name: path.basename(src) }
  } catch (error) {
    logError('template:choose', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('template:load', async () => {
  try {
    if (!fs.existsSync(templatePath())) return { success: false }
    checkFileSize(templatePath(), MAX_TEMPLATE_BYTES, 'Excel-шаблон')
    const meta = fs.existsSync(templateMetaPath()) ? loadJsonWithRecovery(templateMetaPath()).data || {} : {}
    const bytes = new Uint8Array(await fs.promises.readFile(templatePath()))
    return { success: true, name: meta.name || 'statement-template.xlsx', bytes }
  } catch (error) {
    logError('template:load', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('template:remove', async () => {
  try {
    for (const file of [templatePath(), templateMetaPath(), `${templateMetaPath()}.bak`, `${templateMetaPath()}.tmp`]) {
      try { await fs.promises.unlink(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    return { success: true }
  } catch (error) {
    logError('template:remove', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('printers:list', async () => {
  if (!mainWindow) return []
  try {
    const list = await mainWindow.webContents.getPrintersAsync()
    return list.map(printer => ({
      name: printer.name,
      displayName: printer.displayName || printer.name,
      description: printer.description || '',
      isDefault: !!printer.isDefault,
      status: printer.status || 0
    }))
  } catch (error) {
    logError('printers:list', error)
    throw error
  }
})

ipcMain.handle('print:html', async (_event, { html, options }) => {
  let window = null
  const file = path.join(os.tmpdir(), `gsm-print-${Date.now()}.html`)
  try {
    await fs.promises.writeFile(file, html, 'utf8')
    window = new BrowserWindow({
      parent: mainWindow,
      width: 1000,
      height: 900,
      show: !options?.silent,
      autoHideMenuBar: true,
      title: 'Предпросмотр печати',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    })
    await window.loadFile(file)
    const result = await new Promise(resolve => window.webContents.print({
      silent: !!options?.silent,
      printBackground: true,
      deviceName: options?.deviceName || undefined,
      landscape: false,
      color: false,
      margins: { marginType: 'none' },
      pageSize: 'A4'
    }, (ok, reason) => resolve(ok ? { success: true } : { success: false, error: reason || 'Ошибка печати' })))
    window.close()
    window = null
    return result
  } catch (error) {
    try { window?.close() } catch {}
    logError('print:html', error)
    return { success: false, error: error.message }
  } finally {
    setTimeout(() => fs.promises.unlink(file).catch(() => {}), 3000)
  }
})

ipcMain.handle('app:logError', async (_event, { scope, message }) => {
  logError(`renderer:${String(scope || 'unknown').slice(0, 80)}`, new Error(String(message || 'Unknown renderer error')))
  return true
})

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  dataPath: dataPath(),
  errorLogPath: errorLogPath(),
  templatePath: templatePath(),
  platform: process.platform,
  electron: process.versions.electron,
  chromium: process.versions.chrome
}))

ipcMain.handle('window:minimize', async () => { mainWindow?.minimize(); return true })
ipcMain.handle('window:maximize', async () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
  return mainWindow.isMaximized()
})
ipcMain.handle('window:close', async () => { mainWindow?.close(); return true })
ipcMain.handle('window:isMaximized', async () => !!mainWindow?.isMaximized())

const singleInstanceLock = app.requestSingleInstanceLock()
if (!singleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
