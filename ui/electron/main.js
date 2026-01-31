/**
 * J.A.R.V.I.S. Electron Main Process
 * Holographic transparent window with global shortcut
 */

import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../../jarvis.config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let isVisible = true;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 480,
        height: 700,
        x: width - 500,
        y: 100,
        frame: false,
        transparent: true,
        alwaysOnTop: config.ui.alwaysOnTop,
        skipTaskbar: true,
        resizable: true,
        hasShadow: false,
        vibrancy: 'hud',
        visualEffectState: 'active',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, 'preload.js')
        }
    });

    // Load the renderer
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

    // Keep window on top
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    // Handle window events
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('blur', () => {
        // Keep visible but reduce opacity when unfocused
        if (mainWindow && isVisible) {
            mainWindow.setOpacity(0.8);
        }
    });

    mainWindow.on('focus', () => {
        if (mainWindow) {
            mainWindow.setOpacity(1);
        }
    });

    // Open DevTools in development
    if (config.debug) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

function toggleWindow() {
    if (!mainWindow) return;

    isVisible = !isVisible;
    if (isVisible) {
        mainWindow.show();
        mainWindow.focus();
    } else {
        mainWindow.hide();
    }
}

// Register global shortcut
function registerShortcuts() {
    globalShortcut.register(config.ui.globalShortcut, () => {
        toggleWindow();
    });
}

// IPC handlers
ipcMain.handle('get-config', () => {
    return {
        serverUrl: `http://${config.server.host}:${config.server.port}`,
        theme: config.ui.theme
    };
});

ipcMain.on('minimize', () => {
    if (mainWindow) {
        mainWindow.hide();
        isVisible = false;
    }
});

ipcMain.on('close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    registerShortcuts();
});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
