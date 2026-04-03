import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

export type ContextMenuAnchor = HTMLElement | {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ContextMenuAlignment = 'start' | 'end';

// This is the current repo-level menu action contract shared by platform,
// workbench, and native menu bridges. It is intentionally smaller than the
// upstream IAction-based system and can be expanded later if the action stack
// is introduced.
export interface ContextMenuAction {
  value: string;
  label: string;
  title?: string;
  icon?: LxIconName;
  disabled?: boolean;
  checked?: boolean;
}

export interface ContextMenuDelegate {
  getAnchor: () => ContextMenuAnchor;
  getActions: () => readonly ContextMenuAction[];
  onSelect?: (value: string) => void;
  onHide?: (didCancel: boolean) => void;
  getMenuClassName?: () => string;
  alignment?: ContextMenuAlignment;
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
