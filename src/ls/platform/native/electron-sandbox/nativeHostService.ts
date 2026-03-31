import type {
  ElectronAPI,
  ElectronInvoke,
} from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { INativeHostService } from '../common/native.js';

class ElectronSandboxNativeHostService implements INativeHostService {
  private get api(): ElectronAPI | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return window.electronAPI;
  }

  canInvoke() {
    return typeof this.api?.invoke === 'function';
  }

  invoke: ElectronInvoke = (command: string, args?: Record<string, unknown>) => {
    if (!this.api?.invoke) {
      return Promise.reject(new Error('Desktop invoke bridge is unavailable.'));
    }

    return this.api.invoke(command, args);
  };

  get windowControls() {
    return this.api?.windowControls;
  }

  get webContent() {
    return this.api?.webContent;
  }

  get fetch() {
    return this.api?.fetch;
  }

  get modal() {
    return this.api?.modal;
  }

  get toast() {
    return this.api?.toast;
  }

  get menu() {
    return this.api?.menu;
  }
}

export const nativeHostService: INativeHostService =
  new ElectronSandboxNativeHostService();
