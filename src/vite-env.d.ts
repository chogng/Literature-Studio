/// <reference types="vite/client" />

type ElectronInvoke = <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;
type WindowControlAction =
  | 'minimize'
  | 'maximize'
  | 'unmaximize'
  | 'toggle-maximize'
  | 'close';
type WindowState = {
  isMaximized: boolean;
};
type WindowStateListener = (state: WindowState) => void;

interface Window {
  electronAPI?: {
    invoke: ElectronInvoke;
    windowControls?: {
      perform: (action: WindowControlAction) => void;
      getState: () => Promise<WindowState>;
      onStateChange: (listener: WindowStateListener) => () => void;
    };
  };
}
