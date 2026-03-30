import { jsx, jsxs } from 'react/jsx-runtime';
import {
  WindowControlsGroup,
  type WindowControlsAction,
  type WindowControlsLabels,
} from '../titlebar/windowControls';
import { getBrowserWindowChromeLayout } from '../../../../platform/windows/common/windowChrome.js';
import './media/childWindowShell.css';

const WINDOW_CHROME_LAYOUT = getBrowserWindowChromeLayout();

type ChildWindowShellClassNames = {
  root?: string;
  header?: string;
  heading?: string;
  title?: string;
  controls?: string;
  content?: string;
  footer?: string;
};

type ChildWindowShellView = ReturnType<typeof jsx>;
type ChildWindowShellContent =
  | ChildWindowShellView
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (
      | ChildWindowShellView
      | string
      | number
      | boolean
      | null
      | undefined
    )[];

type ChildWindowShellProps = {
  title: string;
  titleId?: string;
  role?: string;
  ariaLabelledBy?: string;
  classNames?: ChildWindowShellClassNames;
  controlLabels?: WindowControlsLabels;
  isWindowMaximized?: boolean;
  onWindowControl: (action: WindowControlsAction) => void;
  children: ChildWindowShellContent;
  footer?: ChildWindowShellContent;
};

export default function ChildWindowShell({
  title,
  titleId,
  role = 'document',
  ariaLabelledBy,
  classNames,
  controlLabels,
  isWindowMaximized = false,
  onWindowControl,
  children,
  footer,
}: ChildWindowShellProps) {
  const resolvedClassNames = {
    root: classNames?.root ?? 'child-window-shell',
    header: classNames?.header ?? 'child-window-shell-header',
    heading: classNames?.heading ?? 'child-window-shell-heading',
    title: classNames?.title ?? 'child-window-shell-title',
    controls: classNames?.controls ?? 'child-window-shell-controls',
    content: classNames?.content ?? 'child-window-shell-content',
    footer: classNames?.footer ?? 'child-window-shell-footer',
  };
  const controlsView = WINDOW_CHROME_LAYOUT.renderCustomWindowControls
    ? jsx(WindowControlsGroup, {
        className: resolvedClassNames.controls,
        labels: controlLabels,
        isWindowMaximized,
        onWindowControl,
      })
    : null;
  const windowControlsContainerView =
    WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx > 0
      ? jsx('div', {
          className: 'child-window-shell-window-controls-container',
          style: {
            '--window-controls-width': `${WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx}px`,
          },
        })
      : null;

  return jsxs('section', {
    className: resolvedClassNames.root,
    role,
    'aria-labelledby': ariaLabelledBy ?? titleId,
    children: [
      jsxs('header', {
        className: resolvedClassNames.header,
        children: [
          windowControlsContainerView,
          jsx('div', {
            className: resolvedClassNames.heading,
            children: jsx('h1', {
              id: titleId,
              className: resolvedClassNames.title,
              children: title,
            }),
          }),
          controlsView,
        ],
      }),
      jsx('div', {
        className: resolvedClassNames.content,
        children,
      }),
      footer
        ? jsx('footer', {
            className: resolvedClassNames.footer,
            children: footer,
          })
        : null,
    ],
  });
}
