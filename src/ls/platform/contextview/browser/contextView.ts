import type {
  ContextMenuAction,
} from 'ls/base/browser/contextmenu';
import type {
  ContextViewAlignment,
  ContextViewPosition,
} from 'ls/base/browser/ui/contextview/contextview';

export type ContextViewAnchor = HTMLElement | {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ContextViewRenderResult =
  | void
  | (() => void)
  | {
    dispose: () => void;
  };

export interface ContextViewDelegate {
  canRelayout?: boolean;
  getAnchor: () => ContextViewAnchor;
  render: (container: HTMLElement) => ContextViewRenderResult;
  onHide?: (data?: unknown) => void;
  className?: string;
  alignment?: ContextViewAlignment;
  position?: ContextViewPosition;
  offset?: number;
  matchAnchorWidth?: boolean;
  minWidth?: number;
}

export interface ContextViewDisposable {
  dispose: () => void;
}

export interface ContextViewService {
  showContextView: (delegate: ContextViewDelegate) => ContextViewDisposable;
  hideContextView: (data?: unknown) => void;
  getContextViewElement: () => HTMLElement;
  layout: () => void;
  isVisible: () => boolean;
  dispose: () => void;
}

export interface ContextMenuDelegate {
  getAnchor: () => ContextViewAnchor;
  getActions: () => readonly ContextMenuAction[];
  onSelect?: (value: string) => void;
  onHide?: (didCancel: boolean) => void;
  getMenuClassName?: () => string;
  alignment?: ContextViewAlignment;
  position?: ContextViewPosition;
  minWidth?: number;
}

export type ContextMenuListener = () => void;
export interface ContextMenuListenerDisposable {
  dispose: () => void;
}

export interface ContextMenuService {
  onDidShowContextMenu: (listener: ContextMenuListener) => ContextMenuListenerDisposable;
  onDidHideContextMenu: (listener: ContextMenuListener) => ContextMenuListenerDisposable;
  showContextMenu: (delegate: ContextMenuDelegate) => void;
  hideContextMenu: () => void;
  isVisible: () => boolean;
  dispose: () => void;
}
