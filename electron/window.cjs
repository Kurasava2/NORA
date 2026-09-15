const { BrowserWindow } = require('electron')
const path = require('path')

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

  mainWindow.once('ready-to-show', () => mainWindow.show())
  const developmentServerUrl = process.env.VITE_DEV_SERVER_URL
  if (developmentServerUrl) mainWindow.loadURL(developmentServerUrl)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  return mainWindow
}

module.exports = { createMainWindow }
