import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from '../../layout';
import './media/view.css';

export type ViewPartLabels = {
  emptyState: string;
  previewUnavailable: string;
};

export type ViewPartProps = {
  browserUrl: string;
  electronRuntime: boolean;
  previewRuntime: boolean;
  labels: ViewPartLabels;
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

export class ViewPartView {
  private props: ViewPartProps;
  private readonly element = createElement('div', 'web-frame-container');
  private readonly contentElement = createElement(
    'div',
    'native-webcontentview-host',
  );

  constructor(props: ViewPartProps) {
    this.props = props;
    this.element.append(this.contentElement);
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.view, this.element);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: ViewPartProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.webContentViewHost, null);
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.view, null);
    this.element.replaceChildren();
  }

  private render() {
    this.contentElement.replaceChildren();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.webContentViewHost, null);

    if (!this.props.browserUrl) {
      const emptyFrame = createElement('div', 'web-frame');
      emptyFrame.setAttribute('aria-hidden', 'true');
      this.contentElement.append(emptyFrame);
      return;
    }

    if (!this.props.electronRuntime || !this.props.previewRuntime) {
      const warning = createElement(
        'div',
        'empty-state preview-runtime-warning',
      );
      warning.textContent = this.props.labels.previewUnavailable;
      this.contentElement.append(warning);
      return;
    }

    const webContentHost = createElement(
      'div',
      'web-frame web-frame-placeholder',
    );
    webContentHost.setAttribute('aria-hidden', 'true');
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.webContentViewHost,
      webContentHost,
    );
    this.contentElement.append(webContentHost);
  }
}

export function createViewPartView(props: ViewPartProps) {
  return new ViewPartView(props);
}

export default ViewPartView;
