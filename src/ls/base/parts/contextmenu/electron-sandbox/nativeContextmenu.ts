// Renderer-side wrapper for the native-popup context-menu bridge. This mirrors
// the upstream `parts/contextmenu` split: the sandbox side only serializes
// menu items, forwards selection/hide events, and exposes `popup` / `close`.

import type {
  ContextMenuPopupApi,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

import type {
  ContextMenuEvent,
  ContextMenuItem,
  ContextMenuPopupEvent,
  ContextMenuPopupPayload,
  PopupOptions,
  SerializableContextMenuItem,
} from 'ls/base/parts/contextmenu/common/contextmenu';

type ActivePopup = {
  items: ContextMenuItem[];
  onHide?: () => void;
};

let popupIdPool = 0;
const activePopups = new Map<string, ActivePopup>();
let removeEventListener: (() => void) | null = null;

function getApi(): ContextMenuPopupApi | undefined {
  return nativeHostService.nativePopupContextMenu;
}

function createSerializableItem(
  item: ContextMenuItem,
  processedItems: ContextMenuItem[],
): SerializableContextMenuItem {
  const serializableItem: SerializableContextMenuItem = {
    id: processedItems.length,
    label: item.label,
    type: item.type,
    accelerator: item.accelerator,
    checked: item.checked,
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    visible: typeof item.visible === 'boolean' ? item.visible : true,
  };

  processedItems.push(item);

  if (Array.isArray(item.submenu)) {
    serializableItem.submenu = item.submenu.map((submenuItem) =>
      createSerializableItem(submenuItem, processedItems),
    );
  }

  return serializableItem;
}

function handlePopupEvent(event: ContextMenuPopupEvent) {
  const activePopup = activePopups.get(event.requestId);
  if (!activePopup) {
    return;
  }

  if (event.type === 'select') {
    const itemId = typeof event.itemId === 'number' ? event.itemId : -1;
    activePopup.items[itemId]?.click?.(event.context ?? {});
    return;
  }

  activePopups.delete(event.requestId);
  activePopup.onHide?.();
}

function ensureEventBridge() {
  const api = getApi();
  if (removeEventListener || !api) {
    return;
  }

  removeEventListener = api.onEvent((event) => {
    handlePopupEvent(event);
  });
}

export function popup(
  items: ContextMenuItem[],
  options?: PopupOptions,
  onHide?: () => void,
): string | null {
  const api = getApi();
  if (!api) {
    return null;
  }

  ensureEventBridge();

  const processedItems: ContextMenuItem[] = [];
  const requestId = `native-popup-context-menu-${popupIdPool++}`;
  const payload: ContextMenuPopupPayload = {
    requestId,
    items: items.map((item) => createSerializableItem(item, processedItems)),
    options,
  };

  activePopups.set(requestId, {
    items: processedItems,
    onHide,
  });

  api.open(payload);
  return requestId;
}

export function close(requestId: string) {
  getApi()?.close(requestId);
}

export type {
  ContextMenuEvent,
  ContextMenuItem,
  PopupOptions,
};
