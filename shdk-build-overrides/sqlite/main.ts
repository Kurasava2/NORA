import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { SqliteStorageAdapter } from '../storage/SqliteStorageAdapter';
import { migrateStorage } from '../storage/migrations';
import { registerIpc } from './ipc';

let storage: SqliteStorageAdapter | undefined;

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f4f6f8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.once('ready-to-show', () => win.show());
  if (process.env.VITE_DEV_SERVER_URL) await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else await win.loadFile(path.join(__dirname, '../../dist/index.html'));
}

app.whenReady().then(async () => {
  const dbPath = path.join(app.getPath('userData'), 'personnel.sqlite');
  storage = new SqliteStorageAdapter(dbPath);
  await storage.open();
  await migrateStorage(storage);
  registerIpc(storage);
  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
}).catch((error: unknown) => {
  reportStartupError('Application bootstrap failed', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event: { preventDefault(): void }) => {
  if (!storage) return;
  event.preventDefault();
  const activeStorage = storage;
  storage = undefined;
  void activeStorage.close().finally(() => app.exit(0));
});

function reportStartupError(message: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.stack ?? error.message}` : String(error);
  const text = `[${new Date().toISOString()}] ${message}\n${detail}\n\n`;
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, text, 'utf8');
  } catch {}
  try { dialog.showErrorBox('Ошибка запуска — Личный состав', `${message}\n\n${detail}`); } catch {}
  console.error(message, error);
}

process.on('uncaughtException', (error) => reportStartupError('Необработанная ошибка', error));
process.on('unhandledRejection', (error) => reportStartupError('Необработанное отклонение Promise', error));
