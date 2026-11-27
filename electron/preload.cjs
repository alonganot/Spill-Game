// The only bridge between the game page and Electron: update status and the
// Update button. The page gets no Node or Electron access beyond this.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spillDesktop', {
  /** Calls `listener` with the current update status, then on every change. Returns an unsubscribe. */
  onUpdateStatus(listener) {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on('updates:status', handler);
    ipcRenderer.invoke('updates:status').then(listener);
    return () => ipcRenderer.removeListener('updates:status', handler);
  },
  /** Downloads the available update; it installs and restarts the game when done. */
  downloadUpdate() {
    return ipcRenderer.invoke('updates:download');
  },
});
