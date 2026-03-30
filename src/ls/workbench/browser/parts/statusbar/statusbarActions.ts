import type { EditorStatusState } from '../editor/editorStatus';
import { resetStatusbarState, setStatusbarState } from './statusbarModel';

export function updateStatusbarState(status: EditorStatusState) {
  setStatusbarState(status);
}

export function initializeStatusbarState(labels: {
  statusbarAriaLabel: string;
  ready: string;
}) {
  resetStatusbarState(labels);
}
