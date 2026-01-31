/**
 * Preload script - Bridge between Electron and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisAPI', {
    // Get configuration
    getConfig: () => ipcRenderer.invoke('get-config'),

    // Window controls
    minimize: () => ipcRenderer.send('minimize'),
    close: () => ipcRenderer.send('close'),

    // Listen for events from main process
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (event, data) => callback(data));
    }
});
