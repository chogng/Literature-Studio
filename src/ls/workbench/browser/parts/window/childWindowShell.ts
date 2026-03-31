import {
  createWindowControlsView,
  type WindowControlsAction,
  type WindowControlsLabels,
} from '../titlebar/windowControls';
import { getWindowChromeLayout } from '../../../../platform/window/common/window.js';
import './media/childWindowShell.css';

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();

export type ChildWindowShellClassNames = {
  root?: string;
  header?: string;
  heading?: string;
  title?: string;
  controls?: string;
  content?: string;
  footer?: string;
};

export type ChildWindowShellProps = {
  title: string;
  titleId?: string;
  role?: string;
  ariaLabelledBy?: string;
  classNames?: ChildWindowShellClassNames;
  controlLabels?: WindowControlsLabels;
  isWindowMaximized?: boolean;
  onWindowControl: (action: WindowControlsAction) => void;
  content: Node | Node[];
  footer?: Node | Node[] | null;
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

function normalizeChildren(children: Node | Node[] | null | undefined) {
  if (!children) {
    return [];
  }

  return Array.isArray(children) ? children : [children];
}

export class ChildWindowShellView {
  private props: ChildWindowShellProps;
  private readonly element = createElement('section');
  private controlsView: ReturnType<typeof createWindowControlsView> | null = null;

  constructor(props: ChildWindowShellProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: ChildWindowShellProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.controlsView?.dispose();
    this.controlsView = null;
    this.element.replaceChildren();
  }

  private render() {
    const {
      title,
      titleId,
      role = 'document',
      ariaLabelledBy,
      classNames,
      controlLabels,
      isWindowMaximized = false,
      onWindowControl,
      content,
      footer,
    } = this.props;
    const resolvedClassNames = {
      root: classNames?.root ?? 'child-window-shell',
      header: classNames?.header ?? 'child-window-shell-header',
      heading: classNames?.heading ?? 'child-window-shell-heading',
      title: classNames?.title ?? 'child-window-shell-title',
      controls: classNames?.controls ?? 'child-window-shell-controls',
      content: classNames?.content ?? 'child-window-shell-content',
      footer: classNames?.footer ?? 'child-window-shell-footer',
    };

    this.element.className = resolvedClassNames.root;
    this.element.setAttribute('role', role);
    if (ariaLabelledBy ?? titleId) {
      this.element.setAttribute('aria-labelledby', ariaLabelledBy ?? titleId!);
    } else {
      this.element.removeAttribute('aria-labelledby');
    }

    const header = createElement('header', resolvedClassNames.header);
    if (WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx > 0) {
      const spacer = createElement(
        'div',
        'child-window-shell-window-controls-container',
      );
      spacer.style.setProperty(
        '--window-controls-width',
        `${WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx}px`,
      );
      header.append(spacer);
    }

    const heading = createElement('div', resolvedClassNames.heading);
    const titleElement = createElement('h1', resolvedClassNames.title);
    if (titleId) {
      titleElement.id = titleId;
    }
    titleElement.textContent = title;
    heading.append(titleElement);
    header.append(heading);

    if (WINDOW_CHROME_LAYOUT.renderCustomWindowControls) {
      if (!this.controlsView) {
        this.controlsView = createWindowControlsView({
          className: resolvedClassNames.controls,
          labels: controlLabels,
          isWindowMaximized,
          onWindowControl,
        });
      } else {
        this.controlsView.setProps({
          className: resolvedClassNames.controls,
          labels: controlLabels,
          isWindowMaximized,
          onWindowControl,
        });
      }
      header.append(this.controlsView.getElement());
    } else {
      this.controlsView?.dispose();
      this.controlsView = null;
    }

    const contentElement = createElement('div', resolvedClassNames.content);
    contentElement.replaceChildren(...normalizeChildren(content));

    const nextChildren: Node[] = [header, contentElement];
    const footerChildren = normalizeChildren(footer ?? null);
    if (footerChildren.length > 0) {
      const footerElement = createElement('footer', resolvedClassNames.footer);
      footerElement.replaceChildren(...footerChildren);
      nextChildren.push(footerElement);
    }

    this.element.replaceChildren(...nextChildren);
  }
}

export function createChildWindowShellView(props: ChildWindowShellProps) {
  return new ChildWindowShellView(props);
}
