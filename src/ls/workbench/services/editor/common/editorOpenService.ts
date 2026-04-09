import type {
  EditorOpenRequest,
  EditorOpenResult,
} from 'ls/workbench/services/editor/common/editorOpenTypes';

export interface EditorOpenService {
  open(request: EditorOpenRequest): EditorOpenResult;
}
