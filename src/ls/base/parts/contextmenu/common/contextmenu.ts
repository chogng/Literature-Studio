// Shared context-menu contracts for transport-safe popup menu payloads and
// events. Workbench-level routing stays above this layer and distinguishes DOM,
// native popup, and Electron WebContentsView overlay surfaces.

export interface CommonContextMenuItem {
  label?: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  accelerator?: string;
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
}

export interface SerializableContextMenuItem extends CommonContextMenuItem {
  id: number;
  submenu?: SerializableContextMenuItem[];
}

export interface ContextMenuItem extends CommonContextMenuItem {
  click?: (event: ContextMenuEvent) => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuEvent {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export interface PopupOptions {
  x?: number;
  y?: number;
  positioningItem?: number;
}

export interface ContextMenuPopupPayload {
  requestId: string;
  items: SerializableContextMenuItem[];
  options?: PopupOptions;
}

export interface ContextMenuPopupEvent {
  requestId: string;
  type: 'select' | 'close';
  itemId?: number;
  context?: ContextMenuEvent;
}

export const NATIVE_POPUP_CONTEXT_MENU_OPEN_CHANNEL = 'app:native-popup-context-menu-open';
export const NATIVE_POPUP_CONTEXT_MENU_CLOSE_CHANNEL = 'app:native-popup-context-menu-close';
export const NATIVE_POPUP_CONTEXT_MENU_EVENT_CHANNEL = 'app:native-popup-context-menu-event';
