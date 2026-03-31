import type { EditorStatusState } from '../../../../editor/browser/shared/editorStatus';
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
