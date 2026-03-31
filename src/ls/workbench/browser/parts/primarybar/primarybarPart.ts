import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from '../../layout';
import { PrimaryBar, type PrimaryBarProps } from './primarybar';

export type { PrimaryBarLabels, PrimaryBarProps } from './primarybar';

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
    'panel sidebar-panel sidebar-panel-primary',
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
