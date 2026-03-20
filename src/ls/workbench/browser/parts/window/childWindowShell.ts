import { jsx, jsxs } from 'react/jsx-runtime';
import type { ReactNode } from 'react';
import {
  WindowControlsGroup,
  type WindowControlsAction,
  type WindowControlsLabels,
} from '../titlebar/windowControls';
import './media/childWindowShell.css';

type ChildWindowShellClassNames = {
  root?: string;
  header?: string;
  heading?: string;
  title?: string;
  controls?: string;
  content?: string;
  footer?: string;
};

type ChildWindowShellProps = {
  title: string;
  titleId?: string;
  role?: string;
  ariaLabelledBy?: string;
  classNames?: ChildWindowShellClassNames;
  controlLabels?: WindowControlsLabels;
  isWindowMaximized?: boolean;
  onWindowControl: (action: WindowControlsAction) => void;
  children: ReactNode;
  footer?: ReactNode;
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

  return jsxs('section', {
    className: resolvedClassNames.root,
    role,
    'aria-labelledby': ariaLabelledBy ?? titleId,
    children: [
      jsxs('header', {
        className: resolvedClassNames.header,
        children: [
          jsx('div', {
            className: resolvedClassNames.heading,
            children: jsx('h1', {
              id: titleId,
              className: resolvedClassNames.title,
              children: title,
            }),
          }),
          jsx(WindowControlsGroup, {
            className: resolvedClassNames.controls,
            labels: controlLabels,
            isWindowMaximized,
            onWindowControl,
          }),
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
