import { jsx } from 'react/jsx-runtime';
import type { EditorGroupModel } from './editorGroupModel';

export type TitleControlView = ReturnType<typeof jsx>;

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

  // Mirror upstream structure: the group view selects one concrete title control
  // and delegates title-area rendering to it.
  abstract render(): TitleControlView;
}
