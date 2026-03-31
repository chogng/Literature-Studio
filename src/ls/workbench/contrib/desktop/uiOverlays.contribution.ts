import { registerToastBridge } from '../../../base/browser/ui/toast/toast';

function canUseNativeToastOverlay() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (new URLSearchParams(window.location.search).get('nativeOverlay') === 'toast') {
    return false;
  }

  return typeof window.electronAPI?.toast?.show === 'function';
}

registerToastBridge({
  canHandle: canUseNativeToastOverlay,
  show: (options) => {
    window.electronAPI?.toast?.show(options);
    return -1;
  },
  dismiss: (id) => {
    window.electronAPI?.toast?.dismiss(id);
  },
});
