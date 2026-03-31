import type {
  NativeMenuEvent,
  NativeMenuOpenPayload,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import {
  createDropdownView,
  type DropdownProps,
  type DropdownExternalMenuRequest,
} from '../../../../base/browser/ui/dropdown/dropdown.js';
import { nativeHostService } from '../../../../platform/native/electron-sandbox/nativeHostService.js';

export type TitlebarSourceDropdownView = {
  getElement: () => HTMLElement;
  setProps: (props: DropdownProps) => void;
  focus: () => void;
  dismiss: () => void;
  open: () => void;
  close: () => void;
  dispose: () => void;
};

let nativeDropdownRequestId = 0;

function areTriggerRectsEqual(
  left: DropdownExternalMenuRequest['triggerRect'] | null,
  right: DropdownExternalMenuRequest['triggerRect'] | null,
) {
  return (
    left?.x === right?.x &&
    left?.y === right?.y &&
    left?.width === right?.width &&
    left?.height === right?.height
  );
}

function areMenuOptionsEqual(
  left: DropdownExternalMenuRequest['options'],
  right: DropdownExternalMenuRequest['options'],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((option, index) => {
    const nextOption = right[index];
    return (
      option.value === nextOption?.value &&
      option.label === nextOption?.label &&
      option.title === nextOption?.title &&
      Boolean(option.disabled) === Boolean(nextOption?.disabled)
    );
  });
}

function shouldRefreshActiveMenu(
  current: DropdownExternalMenuRequest,
  next: DropdownExternalMenuRequest,
) {
  return (
    current.align !== next.align ||
    current.value !== next.value ||
    !areTriggerRectsEqual(current.triggerRect, next.triggerRect) ||
    !areMenuOptionsEqual(current.options, next.options)
  );
}

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
  const menuApi = nativeHostService.menu;
  let suppressCloseRequest = false;
  let activeRequestId: string | null = null;
  let activeTriggerRect: DropdownExternalMenuRequest['triggerRect'] | null = null;
  let activeMenuRequest: DropdownExternalMenuRequest | null = null;
  let currentProps = props;

  const handleExternalMenuChange = (request: DropdownExternalMenuRequest | null) => {
    if (!useNativeMenu || !menuApi) {
      return;
    }

    if (!request) {
      const requestIdToClose = activeRequestId;
      activeRequestId = null;
      activeTriggerRect = null;
      activeMenuRequest = null;
      if (!suppressCloseRequest && requestIdToClose) {
        menuApi.close(requestIdToClose);
      }
      return;
    }

    const requestId =
      activeRequestId ?? `native-titlebar-dropdown-${++nativeDropdownRequestId}`;
    activeRequestId = requestId;
    if (!activeTriggerRect || request.source === 'open' || request.source === 'viewport') {
      activeTriggerRect = request.triggerRect;
    }

    const nextRequest: DropdownExternalMenuRequest = {
      ...request,
      triggerRect: activeTriggerRect ?? request.triggerRect,
    };
    if (
      request.source === 'props' &&
      activeMenuRequest &&
      !shouldRefreshActiveMenu(activeMenuRequest, nextRequest)
    ) {
      return;
    }

    activeMenuRequest = nextRequest;
    const payload: NativeMenuOpenPayload = {
      requestId,
      triggerRect: nextRequest.triggerRect,
      options: nextRequest.options,
      value: nextRequest.value,
      align: nextRequest.align,
      coverage: 'trigger-band',
    };
    menuApi.open(payload);
  };

  const applyProps = (nextProps: DropdownProps) => {
    currentProps = nextProps;
    view.setProps({
      ...nextProps,
      menuMode: useNativeMenu ? 'external' : 'dom',
      menuAlign: 'end',
      onExternalMenuChange: handleExternalMenuChange,
    });
  };

  const view = createDropdownView({
    ...props,
    menuMode: useNativeMenu ? 'external' : 'dom',
    menuAlign: 'end',
    onExternalMenuChange: handleExternalMenuChange,
  });

  const removeNativeMenuEventListener =
    useNativeMenu && typeof menuApi?.onEvent === 'function'
      ? menuApi.onEvent((event) => {
          const nativeEvent = event as NativeMenuEvent;
          if (!activeRequestId || nativeEvent.requestId !== activeRequestId) {
            return;
          }

          suppressCloseRequest = true;
          activeRequestId = null;
          activeTriggerRect = null;
          activeMenuRequest = null;
          view.dismiss();
          suppressCloseRequest = false;

          if (nativeEvent.type === 'select' && typeof nativeEvent.value === 'string') {
            currentProps.onChange?.({ target: { value: nativeEvent.value } });
          }
        })
      : () => {};

  return {
    getElement: () => view.getElement(),
    setProps: applyProps,
    focus: () => view.focus(),
    dismiss: () => view.dismiss(),
    open: () => view.open(),
    close: () => view.close(),
    dispose: () => {
      removeNativeMenuEventListener();
      view.dispose();
    },
  };
}
