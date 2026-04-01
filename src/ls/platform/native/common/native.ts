import type {
  ElectronFetchApi,
  ElectronInvoke,
  ElectronMenuApi,
  ElectronModalApi,
  ElectronToastApi,
  ElectronWebContentApi,
  ElectronWindowControls,
} from 'ls/base/parts/sandbox/common/desktopTypes';

export interface INativeHostService {
  canInvoke(): boolean;
  invoke: ElectronInvoke;
  readonly windowControls: ElectronWindowControls | undefined;
  readonly webContent: ElectronWebContentApi | undefined;
  readonly fetch: ElectronFetchApi | undefined;
  readonly modal: ElectronModalApi | undefined;
  readonly toast: ElectronToastApi | undefined;
  readonly menu: ElectronMenuApi | undefined;
}
