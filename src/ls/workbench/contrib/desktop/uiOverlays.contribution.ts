import { registerToastBridge } from 'ls/base/browser/ui/toast/toast';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

function canUseNativeToastOverlay() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (new URLSearchParams(window.location.search).get('nativeOverlay') === 'toast') {
    return false;
  }

  return typeof nativeHostService.toast?.show === 'function';
}

registerToastBridge({
  canHandle: canUseNativeToastOverlay,
  show: (options) => {
    nativeHostService.toast?.show(options);
    return -1;
  },
  dismiss: (id) => {
    nativeHostService.toast?.dismiss(id);
  },
});
