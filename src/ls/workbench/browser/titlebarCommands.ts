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
