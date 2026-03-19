import type { EditorPartProps } from './editorModel';
import type { ViewPartProps } from '../view/viewPartView';

export type EditorPartState = {
  viewPartProps: ViewPartProps;
};

type CreateEditorPartPropsParams = {
  state: EditorPartState;
};

export function createEditorPartProps({
  state: {
    viewPartProps,
  },
}: CreateEditorPartPropsParams): EditorPartProps {
  return {
    viewPartProps,
  };
}
