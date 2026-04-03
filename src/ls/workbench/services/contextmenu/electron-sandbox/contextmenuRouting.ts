import { canUseElectronOverlayContextMenus } from 'ls/base/parts/contextmenu/electron-overlay/overlayContextmenu';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

// The workbench keeps only the backend choices that matter to product code:
// DOM, Electron overlay (a dedicated WebContentsView surface that can cover
// other WebContentsView instances), and native popup.

export type WorkbenchContextMenuBackend = 'dom' | 'electron-overlay' | 'native-popup';
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
    case 'electron-overlay':
      return canUseElectronOverlayContextMenus() ? 'electron-overlay' : 'dom';
    case 'native-popup':
      if (canUseNativePopupContextMenus()) {
        return 'native-popup';
      }
      return canUseElectronOverlayContextMenus() ? 'electron-overlay' : 'dom';
    default:
      if (canUseElectronOverlayContextMenus()) {
        return 'electron-overlay';
      }
      if (canUseNativePopupContextMenus()) {
        return 'native-popup';
      }
      return 'dom';
  }
}
