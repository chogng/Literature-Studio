import { contextBridge, ipcRenderer } from 'electron';
import type { AppCommand, AppCommandPayloadMap, AppCommandResultMap, WindowControlAction, WindowState } from './types.js';

const electronAPI = {
  invoke<TCommand extends AppCommand>(command: TCommand, args?: AppCommandPayloadMap[TCommand]) {
    return ipcRenderer.invoke('app:invoke', command, args ?? {}) as Promise<AppCommandResultMap[TCommand]>;
  },
  windowControls: {
    perform(action: WindowControlAction) {
      ipcRenderer.send('app:window-action', action);
    },
    getState() {
      return ipcRenderer.invoke('app:get-window-state') as Promise<WindowState>;
    },
    onStateChange(listener: (state: WindowState) => void) {
      if (typeof listener !== 'function') {
        return () => {};
      }

      const wrapped = (_event: Electron.IpcRendererEvent, payload: WindowState | undefined) =>
        listener(payload ?? { isMaximized: false });

      ipcRenderer.on('app:window-state', wrapped);
      return () => {
        ipcRenderer.removeListener('app:window-state', wrapped);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
