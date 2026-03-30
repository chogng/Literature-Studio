import type { Node as ProseMirrorNode } from 'prosemirror-model';
import {
  type BlockNodeAttrs,
  type CitationNodeAttrs,
  type FigureRefNodeAttrs,
  createEditorNodeId,
  writingEditorSchema,
} from './schema';

export type WritingEditorMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type WritingEditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: WritingEditorNode[];
  marks?: WritingEditorMark[];
  text?: string;
};

export type WritingEditorDocument = WritingEditorNode;

export type WritingEditorDerivedLabels = {
  citationOrder: Map<string, number>;
  figureOrder: Map<string, number>;
};

function createTextNode(text: string): WritingEditorNode {
  return {
    type: 'text',
    text,
  };
}

export function createParagraphNode(text = ''): WritingEditorNode {
  return {
    type: 'paragraph',
    attrs: {
      blockId: createEditorNodeId('block'),
    },
    content: text ? [createTextNode(text)] : [],
  };
}

export function createEmptyWritingEditorDocument(): WritingEditorDocument {
  return {
    type: 'doc',
    content: [createParagraphNode()],
  };
}

export function createWritingEditorDocumentFromPlainText(text: string): WritingEditorDocument {
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  if (!normalizedText) {
    return createEmptyWritingEditorDocument();
  }

  return {
    type: 'doc',
    content: normalizedText
      .split(/\n{2,}/)
      .map((block) => createParagraphNode(block.trim()))
      .filter((node) => node.content && node.content.length > 0),
  };
}

export function normalizeWritingEditorDocument(value: unknown): WritingEditorDocument {
  try {
    const node = writingEditorSchema.nodeFromJSON(value);
    return node.toJSON() as WritingEditorDocument;
  } catch {
    return createEmptyWritingEditorDocument();
  }
}

export function collectWritingEditorDerivedLabels(node: ProseMirrorNode): WritingEditorDerivedLabels {
  const citationOrder = new Map<string, number>();
  const figureOrder = new Map<string, number>();
  let nextCitationNumber = 1;
  let nextFigureNumber = 1;

  node.descendants((child) => {
    if (child.type.name === 'figure') {
      const figureId = typeof child.attrs.figureId === 'string' ? child.attrs.figureId.trim() : '';
      if (figureId && !figureOrder.has(figureId)) {
        figureOrder.set(figureId, nextFigureNumber);
        nextFigureNumber += 1;
      }
    }

    if (child.type.name === 'citation') {
      const attrs = child.attrs as CitationNodeAttrs;
      for (const citationId of attrs.citationIds) {
        const normalizedCitationId = citationId.trim();
        if (!normalizedCitationId || citationOrder.has(normalizedCitationId)) {
          continue;
        }

        citationOrder.set(normalizedCitationId, nextCitationNumber);
        nextCitationNumber += 1;
      }
    }
  });

  return {
    citationOrder,
    figureOrder,
  };
}

function formatCitationLeafText(
  attrs: CitationNodeAttrs,
  derivedLabels: WritingEditorDerivedLabels,
) {
  if (attrs.citationIds.length === 0) {
    return attrs.displayText ?? '[?]';
  }

  return `[${attrs.citationIds
    .map((citationId) => derivedLabels.citationOrder.get(citationId.trim()) ?? '?')
    .join(', ')}]`;
}

function formatFigureRefLeafText(
  attrs: FigureRefNodeAttrs,
  derivedLabels: WritingEditorDerivedLabels,
) {
  const normalizedTargetId = attrs.targetId?.trim() ?? '';
  if (!normalizedTargetId) {
    return attrs.label;
  }

  return `${attrs.label} ${derivedLabels.figureOrder.get(normalizedTargetId) ?? '?'}`;
}

export function getWritingEditorLeafText(
  node: ProseMirrorNode,
  derivedLabels: WritingEditorDerivedLabels,
) {
  if (node.type.name === 'citation') {
    const attrs = node.attrs as CitationNodeAttrs;
    return formatCitationLeafText(attrs, derivedLabels);
  }

  if (node.type.name === 'figure_ref') {
    const attrs = node.attrs as FigureRefNodeAttrs;
    return formatFigureRefLeafText(attrs, derivedLabels);
  }

  if (node.type.name === 'hard_break') {
    return '\n';
  }

  return '';
}

export function getWritingEditorNodeText(
  node: ProseMirrorNode,
  derivedLabels: WritingEditorDerivedLabels,
  from = 0,
  to = node.content.size,
) {
  return node.textBetween(from, to, '\n\n', (child) =>
    getWritingEditorLeafText(child, derivedLabels),
  );
}

export function writingEditorDocumentToPlainText(document: WritingEditorDocument) {
  const node = writingEditorSchema.nodeFromJSON(normalizeWritingEditorDocument(document));
  const derivedLabels = collectWritingEditorDerivedLabels(node);

  return getWritingEditorNodeText(node, derivedLabels).trim();
}

export function collectWritingEditorStats(document: WritingEditorDocument) {
  const node = writingEditorSchema.nodeFromJSON(normalizeWritingEditorDocument(document));
  const plainText = writingEditorDocumentToPlainText(document);
  const characterCount = plainText.replace(/\s+/g, '').length;
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  let paragraphCount = 0;

  node.descendants((child) => {
    if (
      child.type.name === 'paragraph' ||
      child.type.name === 'heading' ||
      child.type.name === 'blockquote' ||
      child.type.name === 'figure'
    ) {
      paragraphCount += 1;
    }
  });

  return {
    characterCount,
    wordCount,
    paragraphCount,
  };
}

export function syncWritingEditorDerivedLabels(root: ParentNode, documentNode: ProseMirrorNode) {
  const derivedLabels = collectWritingEditorDerivedLabels(documentNode);

  root.querySelectorAll<HTMLElement>('[data-citation-ids]').forEach((element) => {
    const citationIds = (element.getAttribute('data-citation-ids') ?? '')
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    element.textContent = formatCitationLeafText(
      {
        citationIds,
        displayText: null,
      },
      derivedLabels,
    );
  });

  root.querySelectorAll<HTMLElement>('[data-target-id]').forEach((element) => {
    const targetId = element.getAttribute('data-target-id');
    const label = element.textContent?.split(/\s+/)[0] || 'Figure';

    element.textContent = formatFigureRefLeafText(
      {
        targetId,
        label,
      },
      derivedLabels,
    );
  });
}

export function withParagraphBlockId(attrs: Record<string, unknown> | null | undefined) {
  return {
    ...(attrs ?? {}),
    blockId: (attrs as BlockNodeAttrs | null | undefined)?.blockId ?? createEditorNodeId('block'),
  };
}
