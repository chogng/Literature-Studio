import { ArrowLeft, ArrowRight, Copy, Download, Minus, PanelLeftClose, PanelLeftOpen, RefreshCcw, Settings, Square, X } from 'lucide-react';
import { Button } from './components/Button';
import { Input } from './components/Input';
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
  canGoBack?: boolean;
  canGoForward?: boolean;
  canDownload?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onDownloadPdf?: () => void;
  // URL Bar
  webUrl?: string;
  onWebUrlChange?: (url: string) => void;
  onNavigateWeb?: () => void;
  articleUrlPlaceholder?: string;
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
  canGoBack = false,
  canGoForward = false,
  canDownload,
  onNavigateBack,
  onNavigateForward,
  onRefresh,
  onDownloadPdf,
  webUrl,
  onWebUrlChange,
  onNavigateWeb,
  articleUrlPlaceholder,
}: TitlebarProps) {
  const hasBrowserNav = onNavigateBack || onNavigateForward || onRefresh || onDownloadPdf;

  return (
    <header className="titlebar">
      <div className="titlebar-start">
        <div className="titlebar-brand">
          <span className="titlebar-app-name">{appName}</span>
        </div>
        {onToggleSidebar && sidebarToggleLabel ? (
          <Button
            className="titlebar-btn titlebar-btn-sidebar"
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
          >
            {isSidebarOpen ? <PanelLeftClose size={14} strokeWidth={1.5} /> : <PanelLeftOpen size={14} strokeWidth={1.5} />}
          </Button>
        ) : null}
        {hasBrowserNav ? (
          <div className="titlebar-nav-group">
            {onNavigateBack ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                onClick={onNavigateBack}
                disabled={!browserUrl || !canGoBack}
                aria-label="后退"
                title="后退"
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onNavigateForward ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                onClick={onNavigateForward}
                disabled={!browserUrl || !canGoForward}
                aria-label="前进"
                title="前进"
              >
                <ArrowRight size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onRefresh ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={!browserUrl}
                aria-label="刷新"
                title="刷新"
              >
                <RefreshCcw size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onDownloadPdf ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                onClick={onDownloadPdf}
                disabled={!browserUrl || !canDownload}
                aria-label="下载 PDF"
                title={canDownload ? '下载 PDF' : '仅桌面端可用'}
              >
                <Download size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="titlebar-center">
        {onWebUrlChange && (
          <div className="titlebar-url-bar">
            <Input
              className="titlebar-input-field"
              size="sm"
              value={webUrl}
              onChange={(e) => onWebUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onNavigateWeb?.();
                }
              }}
              placeholder={articleUrlPlaceholder}
            />
          </div>
        )}
      </div>

      <div className="titlebar-controls" role="group" aria-label={labels.controlsAriaLabel}>
        {onToggleSettings && (
          <Button
            className="titlebar-btn titlebar-btn-settings"
            variant="ghost"
            size="sm"
            onClick={onToggleSettings}
            aria-label={labels.settingsLabel}
            title={labels.settingsLabel}
          >
            <Settings size={14} strokeWidth={1.5} />
          </Button>
        )}
        <Button
          className="titlebar-btn titlebar-btn-window"
          variant="ghost"
          size="sm"
          onClick={() => onWindowControl('minimize')}
          aria-label={labels.minimizeLabel}
          title={labels.minimizeLabel}
        >
          <Minus size={14} strokeWidth={1.5} />
        </Button>
        <Button
          className="titlebar-btn titlebar-btn-window"
          variant="ghost"
          size="sm"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
          title={isWindowMaximized ? labels.restoreLabel : labels.maximizeLabel}
        >
          {isWindowMaximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </Button>
        <Button
          className="titlebar-btn titlebar-btn-window titlebar-btn-close"
          variant="ghost"
          size="sm"
          onClick={() => onWindowControl('close')}
          aria-label={labels.closeLabel}
          title={labels.closeLabel}
        >
          <X size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
}

export default Titlebar;
