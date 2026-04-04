// Main-process side of the native-popup context menu bridge. This is the
// Electron `Menu.popup()` route and intentionally does not handle the
// WebContentsView overlay surface.

import { BrowserWindow, Menu, MenuItem } from 'electron';

import type {
  ContextMenuPopupEvent,
  ContextMenuPopupPayload,
  SerializableContextMenuItem,
} from 'ls/base/parts/contextmenu/common/contextmenu';

export type ContextMenuIpcChannels = {
  open: string;
  close: string;
  event: string;
};

type RegisterNativePopupContextMenuIpcOptions = {
  ipcMain: Electron.IpcMain;
  resolveWindowFromWebContents: (
    sender: Electron.WebContents,
  ) => BrowserWindow | null | undefined;
  channels: ContextMenuIpcChannels;
};

type ActiveMenu = {
  menu: Menu;
  window: BrowserWindow | null;
};

function createMenu(
  requestId: string,
  sender: Electron.WebContents,
  eventChannel: string,
  items: SerializableContextMenuItem[],
): Menu {
  const menu = new Menu();

  for (const item of items) {
    let menuItem: MenuItem;

    if (item.type === 'separator') {
      menuItem = new MenuItem({
        type: 'separator',
      });
    } else if (Array.isArray(item.submenu)) {
      menuItem = new MenuItem({
        label: item.label,
        submenu: createMenu(requestId, sender, eventChannel, item.submenu),
      });
    } else {
      menuItem = new MenuItem({
        label: item.label,
        type: item.type,
        accelerator: item.accelerator,
        checked: item.checked,
        enabled: item.enabled,
        visible: item.visible,
        click: (_menuItem, _window, context) => {
          const payload: ContextMenuPopupEvent = {
            requestId,
            type: 'select',
            itemId: item.id,
            context: {
              shiftKey: context.shiftKey,
              ctrlKey: context.ctrlKey,
              altKey: context.altKey,
              metaKey: context.metaKey,
            },
          };
          sender.send(eventChannel, payload);
        },
      });
    }

    menu.append(menuItem);
  }

  return menu;
}

export function registerNativePopupContextMenuIpc(
  options: RegisterNativePopupContextMenuIpcOptions,
) {
  const activeMenus = new Map<string, ActiveMenu>();

  options.ipcMain.on(options.channels.open, (event, payload: ContextMenuPopupPayload) => {
    if (!payload?.requestId || !Array.isArray(payload.items) || payload.items.length === 0) {
      return;
    }

    const targetWindow = options.resolveWindowFromWebContents(event.sender) ?? null;
    const menu = createMenu(
      payload.requestId,
      event.sender,
      options.channels.event,
      payload.items,
    );

    activeMenus.set(payload.requestId, {
      menu,
      window: targetWindow,
    });

    menu.popup({
      window: targetWindow ?? undefined,
      x: payload.options?.x,
      y: payload.options?.y,
      positioningItem: payload.options?.positioningItem,
      callback: () => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(options.channels.event, {
            requestId: payload.requestId,
            type: 'close',
          } satisfies ContextMenuPopupEvent);
        }
        activeMenus.delete(payload.requestId);
      },
    });
  });

  options.ipcMain.on(options.channels.close, (_event, requestId: string) => {
    const activeMenu = activeMenus.get(requestId);
    if (!activeMenu) {
      return;
    }

    try {
      activeMenu.menu.closePopup(activeMenu.window ?? undefined);
    } catch {
      // Best effort only. The close callback is still expected to run naturally.
    }
  });
}
