import { Maximize2, Minimize2, X } from 'lucide-react';
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
          <Minimize2 size={14} />
        </button>
        <button
          className="titlebar-btn"
          type="button"
          onClick={() => onWindowControl('toggle-maximize')}
          aria-label={isWindowMaximized ? '还原窗口' : '最大化'}
          title={isWindowMaximized ? '还原窗口' : '最大化'}
        >
          <Maximize2 size={14} />
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          type="button"
          onClick={() => onWindowControl('close')}
          aria-label="关闭"
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
