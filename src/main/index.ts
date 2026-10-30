import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { ProviderRegistry } from '../core/providers/registry';
import { setupIpcHandlers } from './ipc';
import { TerminalExecutor } from './terminal-executor';
import { WorkspaceService } from './workspace-service';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'NOXiden IDE',
    backgroundColor: '#181824',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  // Services
  const workspaceService = new WorkspaceService();
  const providerRegistry = new ProviderRegistry();
  const terminalExecutor = new TerminalExecutor(workspaceService);

  setupIpcHandlers(workspaceService, providerRegistry, terminalExecutor);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

