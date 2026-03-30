export type WorkbenchTitlebarCommandHandlers = {
  onToggleSidebar: () => void;
  onToggleAuxiliarySidebar: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
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
