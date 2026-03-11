import { ArrowLeft, ArrowRight, Copy, Download, Minus, PanelLeftClose, PanelLeftOpen, RefreshCcw, Settings, Square, X } from 'lucide-react';
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
  // Browser navigation
  browserUrl?: string;
  canDownload?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onDownloadPdf?: () => void;
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
  browserUrl,
  canDownload,
  onNavigateBack,
  onNavigateForward,
  onRefresh,
  onDownloadPdf,
}: TitlebarProps) {
  const hasBrowserNav = onNavigateBack || onNavigateForward || onRefresh || onDownloadPdf;

  return (
    <header className="titlebar">
      <div className="titlebar-start">
        <div className="titlebar-brand">
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
        {hasBrowserNav ? (
          <div className="titlebar-nav-group">
            {onNavigateBack ? (
              <button
                className="titlebar-btn titlebar-btn-nav"
                type="button"
                onClick={onNavigateBack}
                disabled={!browserUrl}
                aria-label="后退"
                title="后退"
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
              </button>
            ) : null}
            {onNavigateForward ? (
              <button
                className="titlebar-btn titlebar-btn-nav"
                type="button"
                onClick={onNavigateForward}
                disabled={!browserUrl}
                aria-label="前进"
                title="前进"
              >
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            ) : null}
            {onRefresh ? (
              <button
                className="titlebar-btn titlebar-btn-nav"
                type="button"
                onClick={onRefresh}
                disabled={!browserUrl}
                aria-label="刷新"
                title="刷新"
              >
                <RefreshCcw size={14} strokeWidth={1.5} />
              </button>
            ) : null}
            {onDownloadPdf ? (
              <button
                className="titlebar-btn titlebar-btn-nav"
                type="button"
                onClick={onDownloadPdf}
                disabled={!browserUrl || !canDownload}
                aria-label="下载 PDF"
                title={canDownload ? '下载 PDF' : '仅桌面端可用'}
              >
                <Download size={14} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="titlebar-drag-region"></div>
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
          className="titlebar-btn titlebar-btn-window"
          type="button"
          onClick={() => onWindowControl('minimize')}
          aria-label={labels.minimizeLabel}
          title={labels.minimizeLabel}
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <button
          className="titlebar-btn titlebar-btn-window"
          type="button"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
          title={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
        >
          {isWindowMaximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn-window titlebar-btn-close"
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
