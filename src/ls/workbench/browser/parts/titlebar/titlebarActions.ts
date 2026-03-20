export type TitlebarUiAction =
  | { type: 'OPEN_ADDRESS_BAR_SOURCE_MENU' }
  | { type: 'FOCUS_WEB_URL_INPUT' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'NAVIGATE_FORWARD' }
  | { type: 'NAVIGATE_WEB' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'EXPORT_DOCX' };

type TitlebarUiActionListener = (action: TitlebarUiAction) => void;

const listeners = new Set<TitlebarUiActionListener>();

function emitTitlebarUiAction(action: TitlebarUiAction) {
  for (const listener of listeners) {
    listener(action);
  }
}

export function subscribeTitlebarUiActions(listener: TitlebarUiActionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenAddressBarSourceMenu() {
  emitTitlebarUiAction({ type: 'OPEN_ADDRESS_BAR_SOURCE_MENU' });
}

export function requestFocusTitlebarWebUrlInput() {
  emitTitlebarUiAction({ type: 'FOCUS_WEB_URL_INPUT' });
}

export function requestToggleTitlebarSidebar() {
  emitTitlebarUiAction({ type: 'TOGGLE_SIDEBAR' });
}

export function requestTitlebarNavigateBack() {
  emitTitlebarUiAction({ type: 'NAVIGATE_BACK' });
}

export function requestTitlebarNavigateForward() {
  emitTitlebarUiAction({ type: 'NAVIGATE_FORWARD' });
}

export function requestTitlebarNavigateWeb() {
  emitTitlebarUiAction({ type: 'NAVIGATE_WEB' });
}

export function requestToggleTitlebarSettings() {
  emitTitlebarUiAction({ type: 'TOGGLE_SETTINGS' });
}

export function requestExportTitlebarDocx() {
  emitTitlebarUiAction({ type: 'EXPORT_DOCX' });
}
