import { applyHover } from 'ls/base/browser/ui/hover/hover';
import type { EditorStatusState } from 'ls/workbench/browser/parts/editor/editorStatus';
import { createStatusbarItemElement } from 'ls/workbench/browser/parts/statusbar/statusbarItem';
import 'ls/workbench/browser/parts/statusbar/media/statusbar.css';

function createTextElement(className: string, text: string, title?: string) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  if (title) {
    applyHover(element, title);
  }

  return element;
}

export class StatusbarPart {
  private readonly container: HTMLElement;
  private readonly statusbarElement: HTMLElement;
  private readonly primaryGroupElement: HTMLDivElement;
  private readonly secondaryGroupElement: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add('statusbar-part');

    this.statusbarElement = document.createElement('footer');
    this.statusbarElement.className = 'editor-statusbar is-pane-mode-empty';
    this.statusbarElement.setAttribute('role', 'status');
    this.statusbarElement.setAttribute('aria-label', '');

    this.primaryGroupElement = document.createElement('div');
    this.primaryGroupElement.className = 'editor-statusbar-group is-primary';
    this.secondaryGroupElement = document.createElement('div');
    this.secondaryGroupElement.className = 'editor-statusbar-group is-secondary';

    this.statusbarElement.append(
      this.primaryGroupElement,
      this.secondaryGroupElement,
    );
    this.container.replaceChildren(this.statusbarElement);
  }

  render(status: EditorStatusState) {
    this.statusbarElement.className = [
      'editor-statusbar',
      `is-pane-mode-${status.paneMode}`,
    ].join(' ');
    this.statusbarElement.setAttribute('aria-label', status.ariaLabel);
    this.primaryGroupElement.replaceChildren();
    this.secondaryGroupElement.replaceChildren();

    if (status.modeLabel) {
      this.primaryGroupElement.append(
        createTextElement('editor-statusbar-mode-pill', status.modeLabel),
      );
    }

    if (status.summary) {
      this.primaryGroupElement.append(
        createTextElement('editor-statusbar-summary', status.summary, status.summary),
      );
    }

    for (const item of status.leftItems) {
      this.primaryGroupElement.append(createStatusbarItemElement(item));
    }

    for (const item of status.rightItems) {
      this.secondaryGroupElement.append(createStatusbarItemElement(item));
    }
  }

  dispose() {
    this.container.replaceChildren();
    this.container.classList.remove('statusbar-part');
  }
}

export default StatusbarPart;
