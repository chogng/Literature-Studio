import type { WindowControlAction } from '../../../../base/parts/sandbox/common/desktopTypes.js';

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

export type WindowControlsGroupProps = {
  labels?: WindowControlsLabels;
  isWindowMaximized?: boolean;
  className?: string;
  onWindowControl: (action: WindowControlsAction) => void;
};

const DEFAULT_CONTROL_LABELS: Required<
  Omit<WindowControlsLabels, 'controlsAriaLabel'>
> = {
  minimizeLabel: 'Minimize',
  maximizeLabel: 'Maximize',
  restoreLabel: 'Restore',
  closeLabel: 'Close',
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function createButton(params: {
  className: string;
  label: string;
  text: string;
  onClick: () => void;
}) {
  const button = createElement('button', params.className);
  button.type = 'button';
  button.setAttribute('aria-label', params.label);
  button.title = params.label;
  button.textContent = params.text;
  button.addEventListener('click', params.onClick);
  return button;
}

export class WindowControlsView {
  private props: WindowControlsGroupProps;
  private readonly element = createElement('div');

  constructor(props: WindowControlsGroupProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: WindowControlsGroupProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.element.replaceChildren();
  }

  private render() {
    const {
      labels,
      isWindowMaximized = false,
      className = 'titlebar-window-controls',
      onWindowControl,
    } = this.props;
    const resolvedLabels = {
      ...DEFAULT_CONTROL_LABELS,
      ...labels,
    };

    this.element.className = className;
    this.element.setAttribute('role', 'group');
    this.element.setAttribute(
      'aria-label',
      labels?.controlsAriaLabel ?? resolvedLabels.closeLabel,
    );
    this.element.replaceChildren(
      createButton({
        className: 'titlebar-btn titlebar-btn-window',
        label: resolvedLabels.minimizeLabel,
        text: '-',
        onClick: () => onWindowControl('minimize'),
      }),
      createButton({
        className: 'titlebar-btn titlebar-btn-window',
        label: isWindowMaximized
          ? resolvedLabels.restoreLabel
          : resolvedLabels.maximizeLabel,
        text: isWindowMaximized ? 'o' : '[]',
        onClick: () => onWindowControl('toggle-maximize'),
      }),
      createButton({
        className: 'titlebar-btn titlebar-btn-window titlebar-btn-close',
        label: resolvedLabels.closeLabel,
        text: 'x',
        onClick: () => onWindowControl('close'),
      }),
    );
  }
}

export function createWindowControlsView(props: WindowControlsGroupProps) {
  return new WindowControlsView(props);
}
