const { BrowserWindow } = require('electron')
const path = require('path')

const closeStates = new WeakMap()

function closeState(mainWindow) {
  if (!closeStates.has(mainWindow)) {
    closeStates.set(mainWindow, { approved: false, pending: false })
  }
  return closeStates.get(mainWindow)
}

function installCloseGuard(mainWindow) {
  mainWindow.on('close', event => {
    const state = closeState(mainWindow)
    if (state.approved || mainWindow.webContents.isLoadingMainFrame()) return

    event.preventDefault()
    if (state.pending) return

    state.pending = true
    mainWindow.webContents.send('window:close-requested')
  })
}

function approveWindowClose(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  const state = closeState(mainWindow)
  state.approved = true
  state.pending = false
  mainWindow.close()
  return true
}

function cancelWindowClose(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  closeState(mainWindow).pending = false
  return true
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
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
      backgroundThrottling: true,
    },
  })

  installCloseGuard(mainWindow)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  const developmentServerUrl = process.env.VITE_DEV_SERVER_URL
  if (developmentServerUrl) mainWindow.loadURL(developmentServerUrl)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  return mainWindow
}

module.exports = {
  createMainWindow,
  approveWindowClose,
  cancelWindowClose,
}
