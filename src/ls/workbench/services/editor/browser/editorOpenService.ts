import type { EditorModel } from 'ls/workbench/browser/parts/editor/editorModel';
import type { EditorOpenService } from 'ls/workbench/services/editor/common/editorOpenService';
import { createDraftEditorOpenDelegate } from 'ls/workbench/services/editor/browser/delegates/draftEditorOpenDelegate';
import { createBrowserEditorOpenDelegate } from 'ls/workbench/services/editor/browser/delegates/browserEditorOpenDelegate';
import { createPdfEditorOpenDelegate } from 'ls/workbench/services/editor/browser/delegates/pdfEditorOpenDelegate';
import { createEditorOpenRegistry } from 'ls/workbench/services/editor/browser/editorOpenRegistry';

export function createEditorOpenService(
  model: EditorModel,
): EditorOpenService {
  return createEditorOpenRegistry([
    createDraftEditorOpenDelegate(model),
    createBrowserEditorOpenDelegate(model),
    createPdfEditorOpenDelegate(model),
  ]);
}
