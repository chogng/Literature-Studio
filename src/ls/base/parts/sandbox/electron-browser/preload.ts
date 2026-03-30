import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppCommand,
  AppErrorCode,
  AppCommandPayloadMap,
  AppCommandResultMap,
  FetchStatus,
  NativeMenuEvent,
  NativeMenuOpenPayload,
  NativeMenuState,
  NativeModalState,
  NativeToastLayout,
  NativeToastOptions,
  NativeToastState,
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

type AppInvokeResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error: string };

const electronAPI = {
  async invoke<TCommand extends AppCommand>(command: TCommand, args?: AppCommandPayloadMap[TCommand]) {
    try {
      const response = await invokeIpc<AppInvokeResponse<AppCommandResultMap[TCommand]>>(
        'app:invoke',
        command,
        args ?? {},
      );
      if (!response.ok) {
        throw new Error(response.error);
      }
      return response.result;
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
    activate(targetId?: string | null) {
      sendIpc('app:preview-activate', { targetId: targetId ?? null });
    },
    release(targetId?: string | null) {
      sendIpc('app:preview-release', { targetId: targetId ?? null });
    },
    async navigate(url: string, targetId?: string | null) {
      try {
        return await invokeIpc<PreviewState>('app:preview-navigate', {
          url,
          targetId: targetId ?? null,
        });
      } catch (error) {
        throw normalizeInvokeError(error);
      }
    },
    getState(targetId?: string | null) {
      return invokeIpc<PreviewState>('app:preview-get-state', {
        targetId: targetId ?? null,
      });
    },
    setBounds(bounds: PreviewBounds | null) {
      sendIpc('app:preview-set-bounds', bounds);
    },
    setVisible(visible: boolean) {
      sendIpc('app:preview-set-visible', visible);
    },
    reload(targetId?: string | null) {
      sendIpc('app:preview-reload', { targetId: targetId ?? null });
    },
    goBack(targetId?: string | null) {
      sendIpc('app:preview-go-back', { targetId: targetId ?? null });
    },
    goForward(targetId?: string | null) {
      sendIpc('app:preview-go-forward', { targetId: targetId ?? null });
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
    onStateChange(listener: (state: NativeModalState | null) => void) {
      return subscribeIpc<NativeModalState | null>('app:modal-state', listener, null);
    },
  },
  toast: {
    show(options: NativeToastOptions) {
      sendIpc('app:native-toast-show', options);
    },
    dismiss(id: number) {
      sendIpc('app:native-toast-dismiss', id);
    },
    getState() {
      return invokeIpc<NativeToastState>('app:native-toast-get-state');
    },
    onStateChange(listener: (state: NativeToastState) => void) {
      return subscribeIpc<NativeToastState>('app:native-toast-state', listener, {
        items: [],
      });
    },
    reportLayout(layout: NativeToastLayout) {
      sendIpc('app:native-toast-layout', layout);
    },
    setHovering(hovering: boolean) {
      sendIpc('app:native-toast-hover', hovering);
    },
  },
  menu: {
    open(payload: NativeMenuOpenPayload) {
      sendIpc('app:native-menu-open', payload);
    },
    close(requestId: string) {
      sendIpc('app:native-menu-close', requestId);
    },
    select(requestId: string, value: string) {
      sendIpc('app:native-menu-select', requestId, value);
    },
    getState() {
      return invokeIpc<NativeMenuState | null>('app:native-menu-get-state');
    },
    onStateChange(listener: (state: NativeMenuState | null) => void) {
      return subscribeIpc<NativeMenuState | null>('app:native-menu-state', listener, null);
    },
    onEvent(listener: (event: NativeMenuEvent) => void) {
      return subscribeIpc<NativeMenuEvent>('app:native-menu-event', listener, {
        requestId: '',
        type: 'close',
      });
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
