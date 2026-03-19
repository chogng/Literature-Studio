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
} from '../common/desktopTypes.js';
import { parseSerializedAppError } from '../../../common/errors.js';

const APP_IPC_CHANNEL_PREFIX = 'app:';

type DesktopInvokeError = Error & {
  code?: AppErrorCode;
  details?: Record<string, unknown>;
};

type ContextAwareProcess = NodeJS.Process & {
  contextIsolated?: boolean;
};

function validateIpcChannel(channel: string): string {
  if (!channel || !channel.startsWith(APP_IPC_CHANNEL_PREFIX)) {
    throw new Error(`Unsupported IPC channel '${channel}'.`);
  }

  return channel;
}

function sendIpc(channel: string, ...args: unknown[]) {
  ipcRenderer.send(validateIpcChannel(channel), ...args);
}

function invokeIpc<TResult>(channel: string, ...args: unknown[]) {
  return ipcRenderer.invoke(validateIpcChannel(channel), ...args) as Promise<TResult>;
}

function subscribeIpc<TPayload>(
  channel: string,
  listener: (payload: TPayload) => void,
  fallbackPayload: TPayload,
) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  const safeChannel = validateIpcChannel(channel);
  const wrapped = (_event: Electron.IpcRendererEvent, payload: TPayload | undefined) =>
    listener(payload ?? fallbackPayload);

  ipcRenderer.on(safeChannel, wrapped);
  return () => {
    ipcRenderer.removeListener(safeChannel, wrapped);
  };
}

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
      return await invokeIpc<AppCommandResultMap[TCommand]>('app:invoke', command, args ?? {});
    } catch (error) {
      throw normalizeInvokeError(error);
    }
  },
  windowControls: {
    perform(action: WindowControlAction) {
      sendIpc('app:window-action', action);
    },
    getState() {
      return invokeIpc<WindowState>('app:get-window-state');
    },
    onStateChange(listener: (state: WindowState) => void) {
      return subscribeIpc<WindowState>('app:window-state', listener, {
        isMaximized: false,
      });
    },
  },
  preview: {
    async navigate(url: string) {
      try {
        return await invokeIpc<PreviewState>('app:preview-navigate', url);
      } catch (error) {
        throw normalizeInvokeError(error);
      }
    },
    getState() {
      return invokeIpc<PreviewState>('app:preview-get-state');
    },
    setBounds(bounds: PreviewBounds | null) {
      sendIpc('app:preview-set-bounds', bounds);
    },
    setVisible(visible: boolean) {
      sendIpc('app:preview-set-visible', visible);
    },
    reload() {
      sendIpc('app:preview-reload');
    },
    goBack() {
      sendIpc('app:preview-go-back');
    },
    goForward() {
      sendIpc('app:preview-go-forward');
    },
    onStateChange(listener: (state: PreviewState) => void) {
      return subscribeIpc<PreviewState>('app:preview-state', listener, {
        url: '',
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        visible: false,
      });
    },
  },
  fetch: {
    onFetchStatus(listener: (status: FetchStatus) => void) {
      return subscribeIpc<FetchStatus>('app:fetch-status', listener, {
        sourceId: '',
        pageUrl: '',
        pageNumber: 0,
        fetchChannel: 'network',
        fetchDetail: null,
        previewReuseMode: null,
        extractorId: null,
        paginationStopped: false,
        paginationStopReason: null,
      });
    },
  },
  modal: {
    getState() {
      return invokeIpc<NativeModalState | null>('app:modal-get-state');
    },
  },
};

function exposeElectronApi() {
  const contextIsolationEnabled = (process as ContextAwareProcess).contextIsolated !== false;

  if (contextIsolationEnabled) {
    try {
      contextBridge.exposeInMainWorld('electronAPI', electronAPI);
      return;
    } catch (error) {
      console.error('Failed to expose electronAPI via contextBridge.', error);
    }
  }

  const windowGlobal = globalThis as typeof globalThis & {
    electronAPI?: typeof electronAPI;
  };
  windowGlobal.electronAPI = electronAPI;
}

exposeElectronApi();
