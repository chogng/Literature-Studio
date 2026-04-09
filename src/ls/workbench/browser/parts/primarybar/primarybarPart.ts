import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import { PrimaryBar } from 'ls/workbench/browser/parts/primarybar/primarybar';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybar';
import { getWindowChromeLayout } from 'ls/platform/window/common/window';

export type { PrimaryBarLabels, PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybar';

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();

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

export class PrimaryBarPartView {
  private readonly element = createElement(
    'section',
    [
      'panel',
      'sidebar-panel',
      'primarybar-panel',
      `primarybar-platform-${WINDOW_CHROME_LAYOUT.platform}`,
    ].join(' '),
  );
  private readonly bar: PrimaryBar;

  constructor(props: PrimaryBarProps) {
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.primaryBar, this.element);
    this.bar = new PrimaryBar(props);
    this.element.append(this.bar.getElement());
  }

  getElement() {
    return this.element;
  }

  setProps(props: PrimaryBarProps) {
    this.bar.setProps(props);
  }

  dispose() {
    this.bar.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.primaryBar, null);
    this.element.replaceChildren();
  }
}

export function createPrimaryBarPartView(props: PrimaryBarProps) {
  return new PrimaryBarPartView(props);
}
