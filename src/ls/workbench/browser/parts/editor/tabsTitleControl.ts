import { jsx, jsxs } from 'react/jsx-runtime';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { FilePenLine, FileText, Globe, X } from 'lucide-react';
import { TitleControl } from './titleControl';

function renderTabIcon(kind: 'draft' | 'web' | 'pdf') {
  if (kind === 'draft') {
    return jsx(FilePenLine, { size: 14, strokeWidth: 1.8 });
  }

  if (kind === 'pdf') {
    return jsx(FileText, { size: 14, strokeWidth: 1.8 });
  }

  return jsx(Globe, { size: 14, strokeWidth: 1.8 });
}

export class TabsTitleControl extends TitleControl {
  override render() {
    const { group, labels, onActivateTab, onCloseTab } = this.props;

    // This class owns tab-strip rendering and interaction only. Tab state and
    // label derivation stay outside in the group/editor models.
    return jsx('div', {
      className: 'editor-tabs-container',
      role: 'tablist',
      children: group.tabs.map((tab) =>
        jsxs(
          'div',
          {
            className: ['editor-tab', tab.isActive ? 'is-active' : '']
              .filter(Boolean)
              .join(' '),
            children: [
              jsx('button', {
                type: 'button',
                role: 'tab',
                className: 'editor-tab-main',
                'aria-selected': tab.isActive,
                title: tab.title,
                onClick: () => onActivateTab(tab.id),
                children: jsxs('span', {
                  className: 'editor-tab-label',
                  children: [
                    renderTabIcon(tab.kind),
                    jsx('span', {
                      className: 'editor-tab-label-text',
                      children: tab.label,
                    }),
                  ],
                }),
              }),
              jsx('button', {
                type: 'button',
                className: 'editor-tab-close',
                title: labels.close,
                onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                },
                children: jsx(X, { size: 14, strokeWidth: 1.8 }),
              }),
            ],
          },
          tab.id,
        ),
      ),
    });
  }
}
