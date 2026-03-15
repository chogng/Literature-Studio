import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppCommand,
  AppErrorCode,
  AppCommandPayloadMap,
  AppCommandResultMap,
  FetchStatus,
  NativeModalState,
  PreviewBounds,
  PreviewState,
  WindowControlAction,
  WindowState,
} from './types.js';
import { parseSerializedAppError } from './utils/app-error.js';

type DesktopInvokeError = Error & {
  code?: AppErrorCode;
  details?: Record<string, unknown>;
};

function normalizeInvokeError(error: unknown): DesktopInvokeError {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const parsed = parseSerializedAppError(rawMessage);

  const invokeError: DesktopInvokeError = new Error(parsed?.code ?? rawMessage);
  invokeError.name = 'DesktopInvokeError';

  if (parsed) {
    invokeError.code = parsed.code;
    if (parsed.details) {
      invokeError.details = parsed.details;
      if (typeof parsed.details.message === 'string') {
        invokeError.message = parsed.details.message;
      }
    }
  }

  return invokeError;
}

const electronAPI = {
  async invoke<TCommand extends AppCommand>(command: TCommand, args?: AppCommandPayloadMap[TCommand]) {
    try {
      return await (ipcRenderer.invoke('app:invoke', command, args ?? {}) as Promise<AppCommandResultMap[TCommand]>);
    } catch (error) {
      throw normalizeInvokeError(error);
    }
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
    async navigate(url: string) {
      try {
        return await (ipcRenderer.invoke('app:preview-navigate', url) as Promise<PreviewState>);
      } catch (error) {
        throw normalizeInvokeError(error);
      }
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
  fetch: {
    onFetchStatus(listener: (status: FetchStatus) => void) {
      if (typeof listener !== 'function') {
        return () => {};
      }

      const wrapped = (_event: Electron.IpcRendererEvent, payload: FetchStatus | undefined) =>
        listener(
          payload ?? {
            sourceId: '',
            pageUrl: '',
            pageNumber: 0,
            fetchChannel: 'network',
            fetchDetail: null,
            previewReuseMode: null,
            extractorId: null,
            paginationStopped: false,
            paginationStopReason: null,
          },
        );

      ipcRenderer.on('app:fetch-status', wrapped);
      return () => {
        ipcRenderer.removeListener('app:fetch-status', wrapped);
      };
    },
  },
  modal: {
    getState() {
      return ipcRenderer.invoke('app:modal-get-state') as Promise<NativeModalState | null>;
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
