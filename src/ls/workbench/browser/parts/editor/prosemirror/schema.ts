import { inputRules, smartQuotes, emDash, ellipsis, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { Decoration, DecorationSet } from 'prosemirror-view';

export type BlockNodeAttrs = {
  blockId: string | null;
};

export type FigureNodeAttrs = BlockNodeAttrs & {
  figureId: string | null;
  src: string | null;
  alt: string;
  title: string;
  width: number | null;
};

export type CitationNodeAttrs = {
  citationIds: string[];
  displayText: string | null;
};

export type FigureRefNodeAttrs = {
  targetId: string | null;
  label: string;
};

const trackedBlockNodeNames = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bullet_list',
  'ordered_list',
  'figure',
  'figcaption',
]);

function requireNodeSpec(
  nodes: typeof basicSchema.spec.nodes,
  name: string,
): NodeSpec {
  const spec = nodes.get(name);
  if (!spec) {
    throw new Error(`Writing editor node "${name}" is unavailable.`);
  }

  return spec;
}

function withTrackedBlockId(spec: NodeSpec): NodeSpec {
  return {
    ...spec,
    attrs: {
      ...spec.attrs,
      blockId: { default: null },
    },
  };
}

function createFigureSpec(): NodeSpec {
  return {
    group: 'block',
    content: 'figcaption?',
    defining: true,
    isolating: true,
    draggable: true,
    attrs: {
      blockId: { default: null },
      figureId: { default: null },
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      width: { default: null },
    },
    toDOM(node) {
      const attrs = node.attrs as FigureNodeAttrs;
      return [
        'figure',
        {
          class: 'pm-figure',
          'data-editor-figure': 'true',
          'data-block-id': attrs.blockId ?? '',
          'data-figure-id': attrs.figureId ?? '',
        },
        [
          'img',
          {
            class: 'pm-figure-image',
            src: attrs.src ?? '',
            alt: attrs.alt,
            title: attrs.title,
            ...(attrs.width ? { width: String(attrs.width) } : {}),
          },
        ],
        0,
      ];
    },
  };
}

function createFigcaptionSpec(): NodeSpec {
  return {
    content: 'inline*',
    attrs: {
      blockId: { default: null },
    },
    toDOM(node) {
      const attrs = node.attrs as BlockNodeAttrs;
      return [
        'figcaption',
        {
          class: 'pm-figure-caption',
          'data-block-id': attrs.blockId ?? '',
        },
        0,
      ];
    },
  };
}

function createCitationSpec(): NodeSpec {
  return {
    inline: true,
    group: 'inline',
    atom: true,
    selectable: true,
    attrs: {
      citationIds: { default: [] },
      displayText: { default: null },
    },
    toDOM(node) {
      const attrs = node.attrs as CitationNodeAttrs;
      const displayText =
        attrs.displayText ?? `[${attrs.citationIds.length > 0 ? attrs.citationIds.join(', ') : '?'}]`;

      return [
        'span',
        {
          class: 'pm-inline-chip pm-inline-chip-citation',
          'data-citation-ids': attrs.citationIds.join(','),
        },
        displayText,
      ];
    },
  };
}

function createFigureRefSpec(): NodeSpec {
  return {
    inline: true,
    group: 'inline',
    atom: true,
    selectable: true,
    attrs: {
      targetId: { default: null },
      label: { default: 'Figure' },
    },
    toDOM(node) {
      const attrs = node.attrs as FigureRefNodeAttrs;
      const suffix = attrs.targetId ? ` ${attrs.targetId}` : '';

      return [
        'span',
        {
          class: 'pm-inline-chip pm-inline-chip-figure-ref',
          'data-target-id': attrs.targetId ?? '',
        },
        `${attrs.label}${suffix}`,
      ];
    },
  };
}

const baseNodes = basicSchema.spec.nodes
  .remove('image')
  .update('paragraph', withTrackedBlockId(requireNodeSpec(basicSchema.spec.nodes, 'paragraph')))
  .update('heading', withTrackedBlockId(requireNodeSpec(basicSchema.spec.nodes, 'heading')))
  .update('blockquote', withTrackedBlockId(requireNodeSpec(basicSchema.spec.nodes, 'blockquote')))
  .append({
    figure: createFigureSpec(),
    figcaption: createFigcaptionSpec(),
    citation: createCitationSpec(),
    figure_ref: createFigureRefSpec(),
  });

const listNodes = addListNodes(baseNodes, 'paragraph block*', 'block');

const writingEditorNodes = listNodes
  .update('bullet_list', withTrackedBlockId(requireNodeSpec(listNodes, 'bullet_list')))
  .update('ordered_list', withTrackedBlockId(requireNodeSpec(listNodes, 'ordered_list')));

export const writingEditorSchema = new Schema({
  nodes: writingEditorNodes,
  marks: basicSchema.spec.marks,
});

export function createEditorNodeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isTrackedBlockNode(node: ProseMirrorNode) {
  return trackedBlockNodeNames.has(node.type.name);
}

export function createWritingEditorPlaceholderPlugin(placeholder: string) {
  return new Plugin({
    key: new PluginKey(`writing-editor-placeholder:${placeholder}`),
    props: {
      decorations(state) {
        const firstChild = state.doc.firstChild;
        if (
          !firstChild ||
          state.doc.childCount !== 1 ||
          firstChild.type.name !== 'paragraph' ||
          firstChild.content.size > 0
        ) {
          return null;
        }

        return DecorationSet.create(state.doc, [
          Decoration.node(0, firstChild.nodeSize, {
            class: 'pm-empty-paragraph',
            'data-placeholder': placeholder,
          }),
        ]);
      },
    },
  });
}

export function createWritingEditorDocumentIdentityPlugin() {
  return new Plugin({
    key: new PluginKey('writing-editor-document-identity'),
    // Keep structural ids stable so future patch/citation/export work can target nodes safely.
    appendTransaction(_transactions, oldState, newState) {
      if (oldState.doc.eq(newState.doc)) {
        return null;
      }

      const transaction = newState.tr;
      let mutated = false;

      newState.doc.descendants((node, pos) => {
        if (isTrackedBlockNode(node)) {
          const attrs = node.attrs as BlockNodeAttrs;
          if (!attrs.blockId) {
            transaction.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              blockId: createEditorNodeId('block'),
            });
            mutated = true;
          }
        }

        if (node.type.name === 'figure') {
          const attrs = node.attrs as FigureNodeAttrs;
          if (!attrs.figureId) {
            transaction.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              figureId: createEditorNodeId('figure'),
            });
            mutated = true;
          }
        }
      });

      return mutated ? transaction : null;
    },
  });
}

export function createWritingEditorInputRules() {
  const headingType = writingEditorSchema.nodes.heading;
  const blockquoteType = writingEditorSchema.nodes.blockquote;
  const bulletListType = writingEditorSchema.nodes.bullet_list;
  const orderedListType = writingEditorSchema.nodes.ordered_list;

  return inputRules({
    rules: [
      ...smartQuotes,
      emDash,
      ellipsis,
      textblockTypeInputRule(/^(#{1,3})\s$/, headingType, (match) => ({
        level: match[1].length,
      })),
      wrappingInputRule(/^\s*>\s$/, blockquoteType),
      wrappingInputRule(/^\s*([-+*])\s$/, bulletListType),
      wrappingInputRule(
        /^(\d+)\.\s$/,
        orderedListType,
        (match) => ({ order: Number(match[1]) || 1 }),
        (match, node) => node.childCount + node.attrs.order === Number(match[1]),
      ),
    ],
  });
}
