import type { EditorModel } from 'ls/workbench/browser/parts/editor/editorModel';
import {
  createUnhandledEditorOpenResult,
  type PdfEditorOpenRequest,
} from 'ls/workbench/services/editor/common/editorOpenTypes';
import type { EditorOpenDelegate } from 'ls/workbench/services/editor/browser/editorOpenRegistry';

type PdfEditorOpenModel = Pick<
  EditorModel,
  'createPdfTab' | 'getSnapshot'
>;

export function createPdfEditorOpenDelegate(
  model: PdfEditorOpenModel,
): EditorOpenDelegate<PdfEditorOpenRequest> {
  return {
    canOpen(request): request is PdfEditorOpenRequest {
      return request.kind === 'pdf';
    },
    open(request) {
      const normalizedUrl = request.url?.trim() ?? '';
      if (!normalizedUrl) {
        return createUnhandledEditorOpenResult();
      }

      model.createPdfTab(normalizedUrl, {}, {
        reuseExisting: request.disposition !== 'new-tab',
      });
      return {
        handled: true,
        activeTabId: model.getSnapshot().activeTabId,
      };
    },
  };
}
