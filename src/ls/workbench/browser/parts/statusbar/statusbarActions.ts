import type { EditorStatusState } from 'ls/editor/browser/shared/editorStatus';
import { resetStatusbarState, setStatusbarState } from 'ls/workbench/browser/parts/statusbar/statusbarModel';

export function updateStatusbarState(status: EditorStatusState) {
  setStatusbarState(status);
}

export function initializeStatusbarState(labels: {
  statusbarAriaLabel: string;
  ready: string;
}) {
  resetStatusbarState(labels);
}
