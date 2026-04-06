// LEGACY: titlebar-specific UI actions are retired from the active workbench path.
// Keep this event bus only for compatibility while the old titlebar code is phased out.
export type TitlebarUiAction =
  | { type: 'TOGGLE_PRIMARY_SIDEBAR' }
  | { type: 'TOGGLE_AGENT_SIDEBAR' }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'NAVIGATE_FORWARD' }
  | { type: 'NAVIGATE_REFRESH' }
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

export function requestToggleTitlebarPrimarySidebar() {
  emitTitlebarUiAction({ type: 'TOGGLE_PRIMARY_SIDEBAR' });
}

export function requestToggleTitlebarAgentSidebar() {
  emitTitlebarUiAction({ type: 'TOGGLE_AGENT_SIDEBAR' });
}

export function requestTitlebarNavigateBack() {
  emitTitlebarUiAction({ type: 'NAVIGATE_BACK' });
}

export function requestTitlebarNavigateForward() {
  emitTitlebarUiAction({ type: 'NAVIGATE_FORWARD' });
}

export function requestTitlebarNavigateRefresh() {
  emitTitlebarUiAction({ type: 'NAVIGATE_REFRESH' });
}

export function requestToggleTitlebarSettings() {
  emitTitlebarUiAction({ type: 'TOGGLE_SETTINGS' });
}

export function requestExportTitlebarDocx() {
  emitTitlebarUiAction({ type: 'EXPORT_DOCX' });
}
