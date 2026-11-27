// The only bridge between the game page and Electron: update status, the
// Update button, and fullscreen. The page gets no Node or Electron access beyond this.
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
  /** Calls `listener` with whether the window is fullscreen, then on every change. Returns an unsubscribe. */
  onFullScreenChange(listener) {
    const handler = (_event, fullscreen) => listener(fullscreen);
    ipcRenderer.on('window:fullscreen', handler);
    ipcRenderer.invoke('window:isFullScreen').then(listener);
    return () => ipcRenderer.removeListener('window:fullscreen', handler);
  },
  setFullScreen(fullscreen) {
    return ipcRenderer.invoke('window:setFullScreen', fullscreen);
  },
  /** Closes the app. */
  quit() {
    return ipcRenderer.invoke('app:quit');
  },
});
