import { Copy, Minus, PanelLeftClose, PanelLeftOpen, Settings, Square, X } from 'lucide-react';
import './titlebar.css';

export type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';

type TitlebarLabels = {
  controlsAriaLabel: string;
  settingsLabel: string;
  minimizeLabel: string;
  maximizeLabel: string;
  restoreLabel: string;
  closeLabel: string;
};

type TitlebarProps = {
  appName?: string;
  labels: TitlebarLabels;
  isWindowMaximized: boolean;
  onWindowControl: (action: TitlebarAction) => void;
  isSidebarOpen?: boolean;
  sidebarToggleLabel?: string;
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
};

export function Titlebar({
  appName = 'Journal Reader',
  labels,
  isWindowMaximized,
  onWindowControl,
  isSidebarOpen = true,
  sidebarToggleLabel,
  onToggleSidebar,
  onToggleSettings,
}: TitlebarProps) {
  return (
    <header className="titlebar">
      <div className="titlebar-start">
        <div className="titlebar-drag-region">
          <span className="titlebar-app-name">{appName}</span>
        </div>
        {onToggleSidebar && sidebarToggleLabel ? (
          <button
            className="titlebar-btn titlebar-btn-sidebar"
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
          >
            {isSidebarOpen ? <PanelLeftClose size={14} strokeWidth={1.5} /> : <PanelLeftOpen size={14} strokeWidth={1.5} />}
          </button>
        ) : null}
      </div>
      <div className="titlebar-controls" role="group" aria-label={labels.controlsAriaLabel}>
        {onToggleSettings && (
          <button
            className="titlebar-btn titlebar-btn-settings"
            type="button"
            onClick={onToggleSettings}
            aria-label={labels.settingsLabel}
            title={labels.settingsLabel}
          >
            <Settings size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('minimize')}
          aria-label={labels.minimizeLabel}
          title={labels.minimizeLabel}
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
          title={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
        >
          {isWindowMaximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          type="button"
          onClick={() => onWindowControl('close')}
          aria-label={labels.closeLabel}
          title={labels.closeLabel}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

export default Titlebar;
