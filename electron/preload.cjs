const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(command, args) {
    return ipcRenderer.invoke('app:invoke', command, args ?? {});
  },
  windowControls: {
    perform(action) {
      ipcRenderer.send('app:window-action', action);
    },
    getState() {
      return ipcRenderer.invoke('app:get-window-state');
    },
    onStateChange(listener) {
      if (typeof listener !== 'function') {
        return () => {};
      }
      const wrapped = (_event, payload) => listener(payload ?? { isMaximized: false });
      ipcRenderer.on('app:window-state', wrapped);
      return () => {
        ipcRenderer.removeListener('app:window-state', wrapped);
      };
    },
  },
});
