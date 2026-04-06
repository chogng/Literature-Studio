import type {
  EditorModeToolbarContribution,
  EditorModeToolbarContributionContext,
} from 'ls/workbench/browser/parts/editor/editorModeToolbarContribution';

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

export class EditorPdfModeToolbarContribution
implements EditorModeToolbarContribution {
  readonly mode = 'pdf' as const;

  private context: EditorModeToolbarContributionContext;
  private readonly element = createElement('div', 'editor-pdf-toolbar');
  private readonly labelElement = createElement('span', 'editor-pdf-toolbar-label');

  constructor(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.element.append(this.labelElement);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setContext(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.render();
  }

  dispose() {
    this.element.replaceChildren();
  }

  private render() {
    this.labelElement.textContent = `${this.context.labels.pdfTitle} toolbar coming soon`;
  }
}

export function createEditorPdfModeToolbarContribution(
  context: EditorModeToolbarContributionContext,
) {
  return new EditorPdfModeToolbarContribution(context);
}

