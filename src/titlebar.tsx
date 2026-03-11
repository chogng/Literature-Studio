import { Copy, Minus, Square, X } from 'lucide-react';
import './titlebar.css';

export type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';

type TitlebarProps = {
  appName?: string;
  isWindowMaximized: boolean;
  onWindowControl: (action: TitlebarAction) => void;
};

export default function Titlebar({
  appName = 'Journal Reader',
  isWindowMaximized,
  onWindowControl,
}: TitlebarProps) {
  return (
    <header className="titlebar">
      <div className="titlebar-drag-region">
        <span className="titlebar-app-name">{appName}</span>
      </div>
      <div className="titlebar-controls" role="group" aria-label="窗口控制">
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('minimize')}
          aria-label="最小化"
          title="最小化"
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? '还原窗口' : '最大化'}
          title={isWindowMaximized ? '还原窗口' : '最大化'}
        >
          {isWindowMaximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          type="button"
          onClick={() => onWindowControl('close')}
          aria-label="关闭"
          title="关闭"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
