import { ArrowLeft, ArrowRight, Copy, Download, FileText, Minus, PanelLeftClose, PanelLeftOpen, RefreshCcw, Settings, Square, X } from 'lucide-react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import './titlebar.css';

export type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';
export type TitlebarFetchChannel = 'network' | 'preview';
export type TitlebarPreviewReuseMode = 'snapshot' | 'live-extract';

type TitlebarLabels = {
  controlsAriaLabel: string;
  settingsLabel: string;
  minimizeLabel: string;
  maximizeLabel: string;
  restoreLabel: string;
  closeLabel: string;
  backLabel: string;
  forwardLabel: string;
  refreshLabel: string;
  downloadPdfLabel: string;
  exportDocxLabel: string;
  noExportableArticlesLabel: string;
  desktopOnlyLabel: string;
  downloadPdfUnavailableLabel?: string;
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
  isDownloadingPdf?: boolean;
  isDownloadedPdf?: boolean;
  canExportDocx?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onDownloadPdf?: () => void;
  onExportDocx?: () => void;
  // URL Bar
  webUrl?: string;
  onWebUrlChange?: (url: string) => void;
  onNavigateWeb?: () => void;
  articleUrlPlaceholder?: string;
  addressBarJournalTitle?: string;
  onAddressBarJournalTitleChange?: (journalTitle: string) => void;
  addressBarJournalTitlePlaceholder?: string;
  addressBarJournalTitleAriaLabel?: string;
  fetchChannel?: TitlebarFetchChannel | null;
  previewReuseMode?: TitlebarPreviewReuseMode | null;
  fetchSourceText?: string;
  fetchSourceTitle?: string;
  fetchStopText?: string;
  fetchStopTitle?: string;
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
  isDownloadingPdf = false,
  isDownloadedPdf = false,
  canExportDocx = false,
  onNavigateBack,
  onNavigateForward,
  onRefresh,
  onDownloadPdf,
  onExportDocx,
  webUrl,
  onWebUrlChange,
  onNavigateWeb,
  articleUrlPlaceholder,
  addressBarJournalTitle,
  onAddressBarJournalTitleChange,
  addressBarJournalTitlePlaceholder,
  addressBarJournalTitleAriaLabel,
  fetchChannel = null,
  previewReuseMode = null,
  fetchSourceText,
  fetchSourceTitle,
  fetchStopText,
  fetchStopTitle,
}: TitlebarProps) {
  const hasBrowserNav = onNavigateBack || onNavigateForward || onRefresh || onDownloadPdf || onExportDocx;

  return (
    <header className="titlebar">
      <div className="titlebar-start">
        <div className="titlebar-brand">
          <span className="titlebar-app-name">{appName}</span>
          {fetchChannel && fetchSourceText ? (
            <span
              className="titlebar-fetch-source"
              data-mode={fetchChannel}
              data-preview-reuse={fetchChannel === 'preview' ? previewReuseMode ?? 'snapshot' : undefined}
              title={fetchSourceTitle || fetchSourceText}
            >
              {fetchSourceText}
            </span>
          ) : null}
          {fetchStopText ? (
            <span className="titlebar-fetch-stop" title={fetchStopTitle || fetchStopText}>
              {fetchStopText}
            </span>
          ) : null}
        </div>
        {onToggleSidebar && sidebarToggleLabel ? (
          <Button
            className="titlebar-btn titlebar-btn-sidebar"
            variant="ghost"
            size="sm"
            mode="icon"
            iconMode="with"
            textMode="without"
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
                className={`titlebar-btn titlebar-btn-nav ${isDownloadedPdf ? 'is-downloaded' : ''}`.trim()}
                variant="ghost"
                size="sm"
                mode="icon"
                iconMode="with"
                textMode="without"
                onClick={onNavigateBack}
                disabled={!browserUrl || !canGoBack}
                aria-label={labels.backLabel}
                title={labels.backLabel}
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onNavigateForward ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                mode="icon"
                iconMode="with"
                textMode="without"
                onClick={onNavigateForward}
                disabled={!browserUrl || !canGoForward}
                aria-label={labels.forwardLabel}
                title={labels.forwardLabel}
              >
                <ArrowRight size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onRefresh ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                mode="icon"
                iconMode="with"
                textMode="without"
                onClick={onRefresh}
                disabled={!browserUrl}
                aria-label={labels.refreshLabel}
                title={labels.refreshLabel}
              >
                <RefreshCcw size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onDownloadPdf ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                mode="icon"
                iconMode="with"
                textMode="without"
                isLoading={isDownloadingPdf}
                onClick={onDownloadPdf}
                disabled={!browserUrl || !canDownload}
                aria-label={labels.downloadPdfLabel}
                title={
                  canDownload
                    ? labels.downloadPdfLabel
                    : labels.downloadPdfUnavailableLabel || labels.desktopOnlyLabel
                }
              >
                <Download size={14} strokeWidth={1.5} />
              </Button>
            ) : null}
            {onExportDocx ? (
              <Button
                className="titlebar-btn titlebar-btn-nav"
                variant="ghost"
                size="sm"
                mode="icon"
                iconMode="with"
                textMode="without"
                onClick={onExportDocx}
                disabled={!canExportDocx}
                aria-label={labels.exportDocxLabel}
                title={canExportDocx ? labels.exportDocxLabel : labels.noExportableArticlesLabel}
              >
                <FileText size={14} strokeWidth={1.5} />
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
        {onAddressBarJournalTitleChange && (
          <div className="titlebar-journal-bar">
            <Input
              className="titlebar-input-field titlebar-journal-input-field"
              size="sm"
              value={addressBarJournalTitle}
              onChange={(e) => onAddressBarJournalTitleChange(e.target.value)}
              placeholder={addressBarJournalTitlePlaceholder}
              aria-label={addressBarJournalTitleAriaLabel}
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
            mode="icon"
            iconMode="with"
            textMode="without"
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
          mode="icon"
          iconMode="with"
          textMode="without"
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
          mode="icon"
          iconMode="with"
          textMode="without"
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
          mode="icon"
          iconMode="with"
          textMode="without"
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
