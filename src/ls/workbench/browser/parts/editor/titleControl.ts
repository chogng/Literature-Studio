import type { EditorGroupModel } from 'ls/workbench/browser/parts/editor/editorGroupModel';

export type TitleControlCallbacks = {
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenKind: (kind: EditorGroupModel['tabs'][number]['kind']) => void;
};

export type TitleControlLabels = {
  close: string;
};

export type TitleControlProps = {
  group: EditorGroupModel;
  labels: TitleControlLabels;
} & TitleControlCallbacks;

export abstract class TitleControl {
  private element: HTMLElement | null = null;

  constructor(protected props: TitleControlProps) {}

  getElement() {
    if (!this.element) {
      this.element = this.create();
    }

    return this.element;
  }

  setProps(props: TitleControlProps) {
    this.props = props;
    if (!this.element) {
      return;
    }

    this.update();
  }

  dispose() {
    this.element = null;
  }

  protected abstract create(): HTMLElement;

  protected abstract update(): void;
}
