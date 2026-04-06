import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

// The workbench keeps only the backend choices that matter to product code:
// DOM and native popup.

export type WorkbenchContextMenuBackend = 'dom' | 'native-popup';
export type WorkbenchContextMenuBackendPreference =
  | 'auto'
  | WorkbenchContextMenuBackend;

export type ResolveWorkbenchContextMenuBackendOptions = {
  backend?: WorkbenchContextMenuBackendPreference;
  supportsCustomOverlay?: boolean;
};

export function canUseNativePopupContextMenus() {
  return Boolean(nativeHostService.nativePopupContextMenu);
}

export function resolveWorkbenchContextMenuRouting(
  options: ResolveWorkbenchContextMenuBackendOptions = {},
): WorkbenchContextMenuBackend {
  // Custom overlays require DOM rendering even when other menu backends exist.
  if (options.supportsCustomOverlay) {
    return 'dom';
  }

  switch (options.backend) {
    case 'dom':
      return 'dom';
    case 'native-popup':
      return canUseNativePopupContextMenus() ? 'native-popup' : 'dom';
    default:
      if (canUseNativePopupContextMenus()) {
        return 'native-popup';
      }
      return 'dom';
  }
}
