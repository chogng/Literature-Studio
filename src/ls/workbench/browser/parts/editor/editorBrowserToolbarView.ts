import type { ActionBarItem } from 'ls/base/browser/ui/actionbar/actionbar';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createDropdownMenuActionViewItem } from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { getEditorContentDisplayUrl } from 'ls/workbench/browser/parts/editor/editorUrlPresentation';
import type { EditorBrowserToolbarProps } from 'ls/workbench/browser/parts/editor/editorBrowserToolbarModel';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

export class EditorBrowserToolbarView {
  private props: EditorBrowserToolbarProps;
  private readonly browserToolbarElement = createElement('div', 'editor-browser-toolbar');
  private readonly browserToolbarLeadingHost = createElement(
    'div',
    'editor-browser-toolbar-leading',
  );
  private readonly browserToolbarAddressHost = createElement(
    'div',
    'editor-browser-toolbar-address-host',
  );
  private readonly browserToolbarTrailingHost = createElement(
    'div',
    'editor-browser-toolbar-trailing',
  );
  private readonly browserToolbarLeadingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly browserToolbarTrailingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly pdfToolbarElement = createElement('div', 'editor-pdf-toolbar');
  private readonly pdfToolbarLabel = createElement('span', 'editor-pdf-toolbar-label');
  private readonly addressInput = new InputBox(
    this.browserToolbarAddressHost,
    undefined,
    {
      className: 'editor-browser-toolbar-address-input',
      value: '',
      placeholder: '',
    },
  );

  constructor(props: EditorBrowserToolbarProps) {
    this.props = props;
    this.browserToolbarLeadingHost.append(this.browserToolbarLeadingActionsView.getElement());
    this.browserToolbarTrailingHost.append(this.browserToolbarTrailingActionsView.getElement());
    this.addressInput.inputElement.setAttribute('spellcheck', 'false');
    this.addressInput.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.props.onAddressInputSubmit();
      }
    });
    this.addressInput.onDidChange((value) => {
      this.props.onAddressInputChange(value);
    });
    this.browserToolbarElement.append(
      this.browserToolbarLeadingHost,
      this.browserToolbarAddressHost,
      this.browserToolbarTrailingHost,
    );
    this.pdfToolbarElement.append(this.pdfToolbarLabel);
    this.render();
  }

  getElement() {
    if (this.props.mode === 'browser') {
      return this.browserToolbarElement;
    }

    if (this.props.mode === 'pdf') {
      return this.pdfToolbarElement;
    }

    return null;
  }

  setProps(props: EditorBrowserToolbarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.addressInput.dispose();
    this.browserToolbarLeadingActionsView.dispose();
    this.browserToolbarTrailingActionsView.dispose();
    this.browserToolbarElement.replaceChildren();
    this.pdfToolbarElement.replaceChildren();
  }

  private render() {
    this.browserToolbarLeadingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createLeadingItems(),
    });
    this.browserToolbarTrailingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createTrailingItems(),
    });

    const displayBrowserUrl = getEditorContentDisplayUrl(this.props.browserUrl);
    if (this.addressInput.value !== displayBrowserUrl) {
      this.addressInput.value = displayBrowserUrl;
    }
    this.addressInput.inputElement.setAttribute(
      'aria-label',
      this.props.labels.toolbarAddressBar,
    );
    this.addressInput.setPlaceHolder(this.props.labels.toolbarAddressPlaceholder);
    this.pdfToolbarLabel.textContent = `${this.props.labels.pdfTitle} toolbar coming soon`;
  }

  private createLeadingItems(): ActionBarItem[] {
    return [
      {
        label: this.props.labels.toolbarSources,
        title: this.props.labels.toolbarSources,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('list-unordered'),
        onClick: this.props.onOpenSources,
      },
      {
        label: this.props.labels.toolbarBack,
        title: this.props.labels.toolbarBack,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('arrow-left'),
        disabled: !this.props.browserUrl,
        onClick: this.props.onNavigateBack,
      },
      {
        label: this.props.labels.toolbarForward,
        title: this.props.labels.toolbarForward,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('arrow-right'),
        disabled: false,
        onClick: this.props.onNavigateForward,
      },
      {
        label: this.props.labels.toolbarRefresh,
        title: this.props.labels.toolbarRefresh,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('refresh'),
        disabled: !this.props.browserUrl,
        onClick: this.props.onNavigateRefresh,
      },
      {
        label: this.props.labels.toolbarFavorite,
        title: this.props.labels.toolbarFavorite,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('favorite'),
        disabled: !this.props.browserUrl,
      },
    ];
  }

  private createTrailingItems(): ActionBarItem[] {
    return [
      createDropdownMenuActionViewItem({
        label: this.props.labels.toolbarMore,
        title: this.props.labels.toolbarMore,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('more'),
        menu: [
          {
            label: this.props.labels.toolbarHardReload,
            onClick: () => this.props.onHardReload(),
            disabled: !this.props.browserUrl,
          },
          {
            label: this.props.labels.toolbarCopyCurrentUrl,
            onClick: () => {
              void this.props.onCopyCurrentUrl();
            },
            disabled: !this.props.browserUrl,
          },
          {
            label: this.props.labels.toolbarClearBrowsingHistory,
            onClick: () => this.props.onClearBrowsingHistory(),
            disabled: !this.props.browserUrl,
          },
          {
            label: this.props.labels.toolbarClearCookies,
            onClick: () => {
              void this.props.onClearCookies();
            },
            disabled: !this.props.electronRuntime,
          },
          {
            label: this.props.labels.toolbarClearCache,
            onClick: () => {
              void this.props.onClearCache();
            },
            disabled: !this.props.electronRuntime,
          },
        ],
      }),
    ];
  }
}

export function createEditorBrowserToolbarView(props: EditorBrowserToolbarProps) {
  return new EditorBrowserToolbarView(props);
}
