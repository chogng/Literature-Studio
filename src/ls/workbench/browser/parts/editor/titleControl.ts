import type { EditorGroupModel } from './editorGroupModel';

export type TitleControlCallbacks = {
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
};

export type TitleControlLabels = {
  close: string;
};

export type TitleControlProps = {
  group: EditorGroupModel;
  labels: TitleControlLabels;
} & TitleControlCallbacks;

export abstract class TitleControl {
  constructor(protected readonly props: TitleControlProps) {}

  abstract render(): HTMLElement;
}
