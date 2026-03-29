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

type WritingEditorNodeLike = WritingEditorNode & {
  content?: WritingEditorNodeLike[];
};

function createNodeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createTextNode(text: string): WritingEditorNode {
  return {
    type: 'text',
    text,
  };
}

function createParagraphNode(text = ''): WritingEditorDocument {
  return {
    type: 'paragraph',
    attrs: {
      blockId: createNodeId('block'),
    },
    content: text ? [createTextNode(text)] : [],
  };
}

function normalizeNode(node: WritingEditorNodeLike): WritingEditorNodeLike {
  const normalizedNode: WritingEditorNodeLike = {
    type: typeof node.type === 'string' && node.type ? node.type : 'paragraph',
  };

  if (node.text !== undefined) {
    normalizedNode.text = String(node.text);
  }

  if (node.attrs && typeof node.attrs === 'object') {
    normalizedNode.attrs = { ...node.attrs };
  }

  if (Array.isArray(node.marks)) {
    normalizedNode.marks = node.marks
      .filter((mark): mark is WritingEditorMark => Boolean(mark) && typeof mark.type === 'string')
      .map((mark) => ({
        type: mark.type,
        attrs: mark.attrs && typeof mark.attrs === 'object' ? { ...mark.attrs } : undefined,
      }));
  }

  if (Array.isArray(node.content)) {
    normalizedNode.content = node.content
      .map((child) => normalizeNode(child as WritingEditorNodeLike))
      .filter(Boolean);
  }

  return normalizedNode;
}

function isNonEmptyTextNode(node: WritingEditorNodeLike) {
  return node.type === 'text' && typeof node.text === 'string' && node.text.trim().length > 0;
}

function createBlockNodesFromPlainText(text: string): WritingEditorDocument[] {
  const normalizedText = text.replace(/\r\n?/g, '\n').trim();
  if (!normalizedText) {
    return [createParagraphNode()];
  }

  return normalizedText
    .split(/\n{2,}/)
    .map((block) => createParagraphNode(block.trim()))
    .filter((node) => Boolean(node.content?.some(isNonEmptyTextNode)));
}

export function createEmptyWritingEditorDocument(): WritingEditorDocument {
  return {
    type: 'doc',
    content: [createParagraphNode()],
  };
}

export function createWritingEditorDocumentFromPlainText(text: string): WritingEditorDocument {
  return {
    type: 'doc',
    content: createBlockNodesFromPlainText(text),
  };
}

export function normalizeWritingEditorDocument(value: unknown): WritingEditorDocument {
  const documentValue = value as WritingEditorNodeLike | null | undefined;
  if (!documentValue || typeof documentValue !== 'object') {
    return createEmptyWritingEditorDocument();
  }

  const normalizedDocument = normalizeNode(documentValue);
  if (normalizedDocument.type !== 'doc') {
    return createEmptyWritingEditorDocument();
  }

  const content = Array.isArray(normalizedDocument.content) && normalizedDocument.content.length > 0
    ? normalizedDocument.content
    : [createParagraphNode()];

  return {
    type: 'doc',
    content: content.map((node) => {
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote' || node.type === 'figure') {
        return node;
      }

      if (node.type === 'text') {
        return createParagraphNode(node.text ?? '');
      }

      return node;
    }),
  };
}

function collectTextFromNode(node: WritingEditorNodeLike): string {
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  const content = Array.isArray(node.content) ? node.content : [];
  return content.map((child) => collectTextFromNode(child)).join('');
}

export function writingEditorDocumentToPlainText(document: WritingEditorDocument) {
  const normalizedDocument = normalizeWritingEditorDocument(document);
  return (normalizedDocument.content ?? [])
    .map((node) => collectTextFromNode(node).trim())
    .filter(Boolean)
    .join('\n\n');
}

export function collectWritingEditorStats(document: WritingEditorDocument) {
  const normalizedDocument = normalizeWritingEditorDocument(document);
  const plainText = writingEditorDocumentToPlainText(normalizedDocument);
  const paragraphCount = normalizedDocument.content?.length ?? 0;

  return {
    characterCount: plainText.replace(/\s+/g, '').length,
    wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : 0,
    paragraphCount,
  };
}
