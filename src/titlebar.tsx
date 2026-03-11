import { Copy, Languages, Minus, Settings, Square, X } from 'lucide-react';
import './titlebar.css';

export type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';
export type TitlebarLocale = 'zh' | 'en';

type TitlebarProps = {
  appName?: string;
  locale?: TitlebarLocale;
  isWindowMaximized: boolean;
  onWindowControl: (action: TitlebarAction) => void;
  onToggleLocale?: () => void;
  onToggleSettings?: () => void;
};

export default function Titlebar({
  appName = 'Journal Reader',
  locale = 'zh',
  isWindowMaximized,
  onWindowControl,
  onToggleLocale,
  onToggleSettings,
}: TitlebarProps) {
  const isZh = locale === 'zh';
  const controlsAriaLabel = isZh ? '窗口控制' : 'Window controls';
  const settingsLabel = isZh ? '设置' : 'Settings';
  const minimizeLabel = isZh ? '最小化' : 'Minimize';
  const maximizeLabel = isZh ? '最大化' : 'Maximize';
  const restoreLabel = isZh ? '还原窗口' : 'Restore window';
  const closeLabel = isZh ? '关闭' : 'Close';
  const languageLabel = isZh ? '切换为 English' : 'Switch to 中文';

  return (
    <header className="titlebar">
      <div className="titlebar-drag-region">
        <span className="titlebar-app-name">{appName}</span>
      </div>
      <div className="titlebar-controls" role="group" aria-label={controlsAriaLabel}>
        {onToggleLocale && (
          <button
            className="titlebar-btn titlebar-btn-lang"
            type="button"
            onClick={onToggleLocale}
            aria-label={languageLabel}
            title={languageLabel}
          >
            <Languages size={13} strokeWidth={1.6} />
            <span className="titlebar-lang-text">{isZh ? 'EN' : '中'}</span>
          </button>
        )}
        {onToggleSettings && (
          <button
            className="titlebar-btn titlebar-btn-settings"
            type="button"
            onClick={onToggleSettings}
            aria-label={settingsLabel}
            title={settingsLabel}
          >
            <Settings size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('minimize')}
          aria-label={minimizeLabel}
          title={minimizeLabel}
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? restoreLabel : maximizeLabel}
          title={isWindowMaximized ? restoreLabel : maximizeLabel}
        >
          {isWindowMaximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          type="button"
          onClick={() => onWindowControl('close')}
          aria-label={closeLabel}
          title={closeLabel}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
