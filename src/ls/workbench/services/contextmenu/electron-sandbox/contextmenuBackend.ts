import { canUseElectronOverlayContextMenus } from 'ls/workbench/browser/contextmenu/electronOverlayMenuController';

export type WorkbenchContextMenuBackend = 'dom' | 'electron-overlay' | 'system';
export type WorkbenchContextMenuBackendPreference =
  | 'auto'
  | WorkbenchContextMenuBackend;

export type ResolveWorkbenchContextMenuBackendOptions = {
  backend?: WorkbenchContextMenuBackendPreference;
  supportsCustomOverlay?: boolean;
};

export function canUseSystemContextMenus() {
  // Reserve this backend for a real OS-level menu implementation.
  return false;
}

export function resolveWorkbenchContextMenuBackend(
  options: ResolveWorkbenchContextMenuBackendOptions = {},
): WorkbenchContextMenuBackend {
  // Custom overlays require DOM rendering even when other menu backends exist.
  if (options.supportsCustomOverlay) {
    return 'dom';
  }

  switch (options.backend) {
    case 'dom':
      return 'dom';
    case 'electron-overlay':
      return canUseElectronOverlayContextMenus() ? 'electron-overlay' : 'dom';
    case 'system':
      if (canUseSystemContextMenus()) {
        return 'system';
      }
      return canUseElectronOverlayContextMenus() ? 'electron-overlay' : 'dom';
    default:
      if (canUseElectronOverlayContextMenus()) {
        return 'electron-overlay';
      }
      if (canUseSystemContextMenus()) {
        return 'system';
      }
      return 'dom';
  }
}
