import type { EditorStatusLabels, EditorStatusItem, EditorStatusState } from '../editor/editorStatus';

function createEmptyStatusValue(): EditorStatusState {
  return {
    ariaLabel: '',
    kind: 'empty',
    summary: '',
    leftItems: [],
    rightItems: [],
  };
}

export function createDefaultStatusbarState(
  labels: Pick<EditorStatusLabels, 'statusbarAriaLabel' | 'ready'>,
): EditorStatusState {
  return {
    ariaLabel: labels.statusbarAriaLabel,
    kind: 'empty',
    summary: labels.ready,
    leftItems: [],
    rightItems: [],
  };
}

function areStatusItemsEqual(
  previous: readonly EditorStatusItem[],
  next: readonly EditorStatusItem[],
) {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const previousItem = previous[index];
    const nextItem = next[index];
    if (
      previousItem.id !== nextItem.id ||
      previousItem.label !== nextItem.label ||
      previousItem.value !== nextItem.value ||
      previousItem.tone !== nextItem.tone
    ) {
      return false;
    }
  }

  return true;
}

function areStatusbarStatesEqual(previous: EditorStatusState, next: EditorStatusState) {
  return (
    previous.ariaLabel === next.ariaLabel &&
    previous.kind === next.kind &&
    previous.modeLabel === next.modeLabel &&
    previous.summary === next.summary &&
    areStatusItemsEqual(previous.leftItems, next.leftItems) &&
    areStatusItemsEqual(previous.rightItems, next.rightItems)
  );
}

let statusbarState: EditorStatusState = createEmptyStatusValue();
const statusbarListeners = new Set<() => void>();

function emitStatusbarStateChange() {
  for (const listener of statusbarListeners) {
    listener();
  }
}

export function subscribeStatusbarState(listener: () => void) {
  statusbarListeners.add(listener);
  return () => {
    statusbarListeners.delete(listener);
  };
}

export function getStatusbarStateSnapshot() {
  return statusbarState;
}

export function setStatusbarState(nextState: EditorStatusState) {
  if (areStatusbarStatesEqual(statusbarState, nextState)) {
    return;
  }

  statusbarState = nextState;
  emitStatusbarStateChange();
}

export function resetStatusbarState(
  labels: Pick<EditorStatusLabels, 'statusbarAriaLabel' | 'ready'>,
) {
  setStatusbarState(createDefaultStatusbarState(labels));
}
