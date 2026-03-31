import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from '../../layout';
import './media/view.css';

export type ViewPartLabels = {
  emptyState: string;
  contentUnavailable: string;
};

export type ViewPartProps = {
  browserUrl: string;
  electronRuntime: boolean;
  webContentRuntime: boolean;
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
  private readonly webContentHost = createElement(
    'div',
    'web-frame web-frame-placeholder',
  );
  private isWebContentHostRegistered = false;

  constructor(props: ViewPartProps) {
    this.props = props;
    this.webContentHost.setAttribute('aria-hidden', 'true');
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
    this.setWebContentHostRegistered(false);
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.view, null);
    this.element.replaceChildren();
  }

  private render() {
    this.contentElement.replaceChildren();

    if (!this.props.browserUrl) {
      this.setWebContentHostRegistered(false);
      const emptyFrame = createElement('div', 'web-frame');
      emptyFrame.setAttribute('aria-hidden', 'true');
      this.contentElement.append(emptyFrame);
      return;
    }

    if (!this.props.electronRuntime || !this.props.webContentRuntime) {
      this.setWebContentHostRegistered(false);
      const warning = createElement(
        'div',
        'empty-state webcontent-runtime-warning',
      );
      warning.textContent = this.props.labels.contentUnavailable;
      this.contentElement.append(warning);
      return;
    }

    this.setWebContentHostRegistered(true);
    this.contentElement.append(this.webContentHost);
  }

  private setWebContentHostRegistered(registered: boolean) {
    if (this.isWebContentHostRegistered === registered) {
      return;
    }

    this.isWebContentHostRegistered = registered;
    registerWorkbenchPartDomNode(
      WORKBENCH_PART_IDS.webContentViewHost,
      registered ? this.webContentHost : null,
    );
  }
}

export function createViewPartView(props: ViewPartProps) {
  return new ViewPartView(props);
}

export default ViewPartView;
