import type {
  ElectronFetchApi,
  ElectronInvoke,
  ElectronMenuApi,
  ElectronModalApi,
  ElectronToastApi,
  ElectronWebContentApi,
  ElectronWindowControls,
} from '../../../base/parts/sandbox/common/desktopTypes.js';

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
