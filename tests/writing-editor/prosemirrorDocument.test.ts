import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from 'prosemirror-state';
import {
  createEmptyWritingEditorDocument,
  writingEditorDocumentToPlainText,
} from 'ls/editor/common/writingEditorDocument';
import { insertFigureCommand } from 'ls/editor/browser/text/commands';
import { writingEditorSchema } from 'ls/editor/browser/text/schema';

test('citations are numbered by first appearance order', () => {
  const document = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { blockId: 'block_intro' },
        content: [
          { type: 'text', text: 'Alpha ' },
          {
            type: 'citation',
            attrs: {
              citationIds: ['cite_b', 'cite_a'],
              displayText: '[cite_b, cite_a]',
            },
          },
          { type: 'text', text: ' then beta ' },
          {
            type: 'citation',
            attrs: {
              citationIds: ['cite_a'],
              displayText: '[cite_a]',
            },
          },
        ],
      },
    ],
  };

  assert.equal(
    writingEditorDocumentToPlainText(document),
    'Alpha [1, 2] then beta [2]',
  );
});

test('figure references resolve by figure order and fall back when missing', () => {
  const document = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { blockId: 'block_intro' },
        content: [{ type: 'text', text: 'See ' }],
      },
      {
        type: 'figure',
        attrs: {
          blockId: 'block_figure_b',
          figureId: 'figure_b',
          src: 'https://example.com/b.png',
          alt: 'B',
          title: '',
          width: null,
        },
      },
      {
        type: 'paragraph',
        attrs: { blockId: 'block_middle' },
        content: [
          {
            type: 'figure_ref',
            attrs: {
              targetId: 'figure_b',
              label: 'Figure',
            },
          },
          { type: 'text', text: ' and ' },
          {
            type: 'figure_ref',
            attrs: {
              targetId: 'figure_missing',
              label: 'Figure',
            },
          },
        ],
      },
      {
        type: 'figure',
        attrs: {
          blockId: 'block_figure_a',
          figureId: 'figure_a',
          src: 'https://example.com/a.png',
          alt: 'A',
          title: '',
          width: null,
        },
      },
    ],
  };

  assert.equal(
    writingEditorDocumentToPlainText(document),
    'See \n\nFigure 1 and Figure ?',
  );
});

test('insertFigureCommand keeps a figure node and trailing paragraph', () => {
  let nextState = EditorState.create({
    schema: writingEditorSchema,
    doc: writingEditorSchema.nodeFromJSON(createEmptyWritingEditorDocument()),
  });

  const handled = insertFigureCommand({
    src: 'https://example.com/figure.png',
    caption: 'Figure caption',
  })(nextState, (transaction) => {
    nextState = nextState.apply(transaction);
  });

  assert.equal(handled, true);

  const document = nextState.doc.toJSON() as {
    type: string;
    content?: Array<{ type: string; attrs?: Record<string, unknown>; content?: unknown[] }>;
  };

  assert.equal(document.type, 'doc');
  assert.equal(document.content?.length, 2);
  assert.equal(document.content?.[0]?.type, 'figure');
  assert.equal(document.content?.[1]?.type, 'paragraph');
  assert.equal(document.content?.[0]?.attrs?.src, 'https://example.com/figure.png');
  assert.equal(typeof document.content?.[0]?.attrs?.figureId, 'string');
  assert.match(String(document.content?.[0]?.attrs?.figureId), /^figure_/);
  assert.equal(document.content?.[1]?.content?.length ?? 0, 0);
});
