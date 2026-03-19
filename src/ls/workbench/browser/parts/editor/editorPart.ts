import type { ViewPartProps } from '../views/viewPartView';
import type { EditorPartProps } from './editorPartView';

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
