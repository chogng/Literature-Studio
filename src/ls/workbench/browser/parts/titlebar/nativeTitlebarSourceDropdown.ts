import type {
  NativeMenuEvent,
  NativeMenuOpenPayload,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import {
  createDropdownView,
  type DropdownProps,
} from '../../../../base/browser/ui/dropdown/dropdown.js';
import { nativeHostService } from '../../../../platform/native/browser/nativeHostService.js';

export type TitlebarSourceDropdownView = {
  getElement: () => HTMLElement;
  focus: () => void;
  open: () => void;
  close: () => void;
  dispose: () => void;
};

let nativeDropdownRequestId = 0;

function canUseNativeTitlebarMenu() {
  if (typeof window === 'undefined') {
    return false;
  }

  const nativeOverlayKind = new URLSearchParams(window.location.search).get('nativeOverlay');
  if (nativeOverlayKind === 'menu' || nativeOverlayKind === 'toast') {
    return false;
  }

  return typeof nativeHostService.menu?.open === 'function';
}

export function createTitlebarSourceDropdownView(
  props: DropdownProps,
): TitlebarSourceDropdownView {
  const useNativeMenu = canUseNativeTitlebarMenu();
  const requestId = `native-titlebar-dropdown-${++nativeDropdownRequestId}`;
  const menuApi = nativeHostService.menu;
  let suppressCloseRequest = false;

  const view = createDropdownView({
    ...props,
    menuMode: useNativeMenu ? 'external' : 'dom',
    onExternalMenuChange: (request) => {
      if (!useNativeMenu || !menuApi) {
        return;
      }

      if (!request) {
        if (!suppressCloseRequest) {
          menuApi.close(requestId);
        }
        return;
      }

      const payload: NativeMenuOpenPayload = {
        requestId,
        triggerRect: request.triggerRect,
        options: request.options,
        value: request.value,
        align: 'end',
        coverage: 'trigger-band',
      };
      menuApi.open(payload);
    },
  });

  const removeNativeMenuEventListener =
    useNativeMenu && typeof menuApi?.onEvent === 'function'
      ? menuApi.onEvent((event) => {
          const nativeEvent = event as NativeMenuEvent;
          if (nativeEvent.requestId !== requestId) {
            return;
          }

          suppressCloseRequest = true;
          view.close();
          suppressCloseRequest = false;

          if (nativeEvent.type === 'select' && typeof nativeEvent.value === 'string') {
            props.onChange?.({ target: { value: nativeEvent.value } });
          }
        })
      : () => {};

  return {
    getElement: () => view.getElement(),
    focus: () => view.focus(),
    open: () => view.open(),
    close: () => view.close(),
    dispose: () => {
      removeNativeMenuEventListener();
      view.dispose();
    },
  };
}
