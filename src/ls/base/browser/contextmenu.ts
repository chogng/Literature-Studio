import type { BaseAction } from 'ls/base/common/actions';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';
import type { ContextViewAnchor } from 'ls/base/browser/ui/contextview/contextview';

export type ContextMenuAnchor = ContextViewAnchor;

export type ContextMenuAlignment = 'start' | 'end';
export type ContextMenuPosition = 'auto' | 'above' | 'below';
export type ContextMenuAnchorAlignment = 'left' | 'right';
export type ContextMenuAnchorAxisAlignment = 'vertical' | 'horizontal';

// This is the current repo-level menu action contract shared by platform,
// workbench, and native menu bridges. It is intentionally smaller than the
// upstream IAction-based system and can be expanded later if the action stack
// is introduced.
export interface ContextMenuAction extends BaseAction {
  value: string;
  icon?: LxIconName;
}

export interface ContextMenuDelegate {
  getAnchor: () => ContextMenuAnchor;
  getActions: () => readonly ContextMenuAction[];
  onSelect?: (value: string) => void;
  onHide?: (didCancel: boolean) => void;
  getMenuClassName?: () => string;
  anchorAlignment?: ContextMenuAnchorAlignment;
  anchorAxisAlignment?: ContextMenuAnchorAxisAlignment;
  alignment?: ContextMenuAlignment;
  position?: ContextMenuPosition;
  minWidth?: number;
}

export interface ContextMenuProvider {
  showContextMenu: (delegate: ContextMenuDelegate) => void;
}

export interface ContextMenuService extends ContextMenuProvider {
  hideContextMenu: () => void;
  isVisible: () => boolean;
  dispose?: () => void;
}
