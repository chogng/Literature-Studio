import type { EditorOpenService } from 'ls/workbench/services/editor/common/editorOpenService';
import {
  createUnhandledEditorOpenResult,
  type EditorOpenRequest,
  type EditorOpenResult,
} from 'ls/workbench/services/editor/common/editorOpenTypes';

export type EditorOpenDelegate<
  TRequest extends EditorOpenRequest = EditorOpenRequest,
> = {
  canOpen: (request: EditorOpenRequest) => request is TRequest;
  open: (request: TRequest) => EditorOpenResult;
};

export type AnyEditorOpenDelegate = EditorOpenDelegate<any>;

export function createEditorOpenRegistry(
  delegates: readonly AnyEditorOpenDelegate[],
): EditorOpenService {
  return {
    open(request) {
      for (const delegate of delegates) {
        if (!delegate.canOpen(request)) {
          continue;
        }

        return delegate.open(request);
      }

      return createUnhandledEditorOpenResult();
    },
  };
}
