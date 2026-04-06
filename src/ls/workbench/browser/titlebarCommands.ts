// LEGACY: the workbench no longer mounts or drives the titlebar as an active UI surface.
// Keep this compatibility shim only for stale imports during the retirement period.
export type WorkbenchTitlebarCommandHandlers = {
  onTogglePrimarySidebar: () => void;
  onToggleAgentSidebar: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateRefresh: () => void;
  onNavigateWeb: () => void;
  onToggleSettings: () => void;
  onExportDocx: () => void;
};

let workbenchTitlebarCommandHandlers: WorkbenchTitlebarCommandHandlers | null = null;

export function setWorkbenchTitlebarCommandHandlers(
  handlers: WorkbenchTitlebarCommandHandlers | null,
) {
  workbenchTitlebarCommandHandlers = handlers;
}

export function getWorkbenchTitlebarCommandHandlers() {
  return workbenchTitlebarCommandHandlers;
}
