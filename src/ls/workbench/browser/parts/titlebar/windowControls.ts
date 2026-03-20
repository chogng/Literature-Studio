import { jsx } from 'react/jsx-runtime';
import { Copy, Minus, Square, X } from 'lucide-react';
import type { WindowControlAction } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import './media/titlebar.css';

export type WindowControlsAction = Extract<
  WindowControlAction,
  'minimize' | 'toggle-maximize' | 'close'
>;

export type WindowControlsItem = WindowControlsAction;

export type WindowControlsLabels = {
  controlsAriaLabel?: string;
  minimizeLabel?: string;
  maximizeLabel?: string;
  restoreLabel?: string;
  closeLabel?: string;
};

type WindowControlsGroupProps = {
  labels?: WindowControlsLabels;
  isWindowMaximized?: boolean;
  controls?: ReadonlyArray<WindowControlsItem>;
  className?: string;
  buttonClassName?: string;
  closeButtonClassName?: string;
  onWindowControl: (action: WindowControlsAction) => void;
};

const DEFAULT_CONTROLS: ReadonlyArray<WindowControlsItem> = ['minimize', 'toggle-maximize', 'close'];
const DEFAULT_CONTROL_LABELS: Required<Omit<WindowControlsLabels, 'controlsAriaLabel'>> = {
  minimizeLabel: 'Minimize',
  maximizeLabel: 'Maximize',
  restoreLabel: 'Restore',
  closeLabel: 'Close',
};

function renderWindowControlButton({
  key,
  className,
  label,
  onClick,
  icon,
}: {
  key: string;
  className: string;
  label: string;
  onClick: () => void;
  icon: ReturnType<typeof jsx>;
}) {
  return jsx(
    Button,
    {
      className,
      variant: 'ghost',
      size: 'sm',
      mode: 'icon',
      iconMode: 'with',
      textMode: 'without',
      onClick,
      'aria-label': label,
      title: label,
      children: icon,
    },
    key,
  );
}

export function WindowControlsGroup({
  labels,
  isWindowMaximized = false,
  controls = DEFAULT_CONTROLS,
  className = 'titlebar-window-controls',
  buttonClassName = 'titlebar-btn titlebar-btn-window',
  closeButtonClassName = 'titlebar-btn titlebar-btn-window titlebar-btn-close',
  onWindowControl,
}: WindowControlsGroupProps) {
  const resolvedLabels = {
    ...DEFAULT_CONTROL_LABELS,
    ...labels,
  };

  return jsx('div', {
    className,
    role: 'group',
    'aria-label': labels?.controlsAriaLabel ?? resolvedLabels.closeLabel,
    children: controls.map((control) => {
      if (control === 'minimize') {
        return renderWindowControlButton({
          key: `window-control-${control}`,
          className: buttonClassName,
          label: resolvedLabels.minimizeLabel,
          onClick: () => onWindowControl('minimize'),
          icon: jsx(Minus, { size: 14, strokeWidth: 1.5 }),
        });
      }

      if (control === 'toggle-maximize') {
        return renderWindowControlButton({
          key: `window-control-${control}`,
          className: buttonClassName,
          label: isWindowMaximized ? resolvedLabels.restoreLabel : resolvedLabels.maximizeLabel,
          onClick: () => onWindowControl('toggle-maximize'),
          icon: isWindowMaximized
            ? jsx(Copy, { size: 12, strokeWidth: 1.5 })
            : jsx(Square, { size: 12, strokeWidth: 1.5 }),
        });
      }

      return renderWindowControlButton({
        key: `window-control-${control}`,
        className: closeButtonClassName,
        label: resolvedLabels.closeLabel,
        onClick: () => onWindowControl('close'),
        icon: jsx(X, { size: 14, strokeWidth: 1.5 }),
      });
    }),
  });
}

export default WindowControlsGroup;
