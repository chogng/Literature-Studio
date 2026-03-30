import { jsx, jsxs } from 'react/jsx-runtime';
import type { EditorStatusItem, EditorStatusState } from './editorStatus';

type EditorStatusViewProps = {
  status: EditorStatusState;
};

function renderStatusItem(item: EditorStatusItem) {
  return jsxs(
    'span',
    {
      className: ['editor-statusbar-item', item.tone ? `is-${item.tone}` : '']
        .filter(Boolean)
        .join(' '),
      children: [
        jsx('span', {
          className: 'editor-statusbar-item-label',
          children: item.label,
        }),
        jsx('span', {
          className: 'editor-statusbar-item-value',
          title: item.value,
          children: item.value,
        }),
      ],
    },
    item.id,
  );
}

export function EditorStatusView({ status }: EditorStatusViewProps) {
  return jsxs('footer', {
    className: ['editor-statusbar', `is-kind-${status.kind}`].join(' '),
    role: 'status',
    'aria-label': status.ariaLabel,
    children: [
      jsxs('div', {
        className: 'editor-statusbar-group is-primary',
        children: [
          status.modeLabel
            ? jsx('span', {
                className: 'editor-statusbar-mode-pill',
                children: status.modeLabel,
              })
            : null,
          status.summary
            ? jsx('span', {
                className: 'editor-statusbar-summary',
                title: status.summary,
                children: status.summary,
              })
            : null,
          ...status.leftItems.map(renderStatusItem),
        ],
      }),
      jsx('div', {
        className: 'editor-statusbar-group is-secondary',
        children: status.rightItems.map(renderStatusItem),
      }),
    ],
  });
}

export default EditorStatusView;
