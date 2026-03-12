import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppCommand,
  AppCommandPayloadMap,
  AppCommandResultMap,
  PreviewBounds,
  PreviewState,
  WindowControlAction,
  WindowState,
} from './types.js';

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
  preview: {
    navigate(url: string) {
      return ipcRenderer.invoke('app:preview-navigate', url) as Promise<PreviewState>;
    },
    getState() {
      return ipcRenderer.invoke('app:preview-get-state') as Promise<PreviewState>;
    },
    setBounds(bounds: PreviewBounds | null) {
      ipcRenderer.send('app:preview-set-bounds', bounds);
    },
    setVisible(visible: boolean) {
      ipcRenderer.send('app:preview-set-visible', visible);
    },
    reload() {
      ipcRenderer.send('app:preview-reload');
    },
    goBack() {
      ipcRenderer.send('app:preview-go-back');
    },
    goForward() {
      ipcRenderer.send('app:preview-go-forward');
    },
    onStateChange(listener: (state: PreviewState) => void) {
      if (typeof listener !== 'function') {
        return () => {};
      }

      const wrapped = (_event: Electron.IpcRendererEvent, payload: PreviewState | undefined) =>
        listener(
          payload ?? {
            url: '',
            canGoBack: false,
            canGoForward: false,
            isLoading: false,
            visible: false,
          },
        );

      ipcRenderer.on('app:preview-state', wrapped);
      return () => {
        ipcRenderer.removeListener('app:preview-state', wrapped);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
