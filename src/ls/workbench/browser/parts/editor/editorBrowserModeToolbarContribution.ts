import type { ActionBarItem } from 'ls/base/browser/ui/actionbar/actionbar';
import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createDropdownMenuActionViewItem } from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { getEditorContentDisplayUrl } from 'ls/workbench/browser/parts/editor/editorUrlPresentation';
import type {
  EditorModeToolbarContribution,
  EditorModeToolbarContributionContext,
} from 'ls/workbench/browser/parts/editor/editorModeToolbarContribution';

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

export class EditorBrowserModeToolbarContribution
implements EditorModeToolbarContribution {
  readonly mode = 'browser' as const;

  private context: EditorModeToolbarContributionContext;
  private readonly element = createElement('div', 'editor-browser-toolbar');
  private readonly leadingHost = createElement('div', 'editor-browser-toolbar-leading');
  private readonly addressHost = createElement('div', 'editor-browser-toolbar-address-host');
  private readonly trailingHost = createElement('div', 'editor-browser-toolbar-trailing');
  private readonly leadingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly trailingActionsView = createActionBarView({
    className: 'editor-browser-toolbar-actions',
    ariaRole: 'group',
  });
  private readonly addressInput = new InputBox(this.addressHost, undefined, {
    className: 'editor-browser-toolbar-address-input',
    value: '',
    placeholder: '',
  });

  constructor(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.leadingHost.append(this.leadingActionsView.getElement());
    this.trailingHost.append(this.trailingActionsView.getElement());
    this.addressInput.inputElement.setAttribute('spellcheck', 'false');
    this.addressInput.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.context.onAddressInputSubmit();
      }
    });
    this.addressInput.onDidChange((value) => {
      this.context.onAddressInputChange(value);
    });
    this.element.append(this.leadingHost, this.addressHost, this.trailingHost);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setContext(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.render();
  }

  focusPrimaryInput() {
    this.addressInput.focus();
    this.addressInput.select();
  }

  dispose() {
    this.addressInput.dispose();
    this.leadingActionsView.dispose();
    this.trailingActionsView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    this.leadingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createLeadingItems(),
    });
    this.trailingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createTrailingItems(),
    });

    const displayBrowserUrl = getEditorContentDisplayUrl(this.context.browserUrl);
    if (this.addressInput.value !== displayBrowserUrl) {
      this.addressInput.value = displayBrowserUrl;
    }
    this.addressInput.inputElement.setAttribute(
      'aria-label',
      this.context.labels.toolbarAddressBar,
    );
    this.addressInput.setPlaceHolder(this.context.labels.toolbarAddressPlaceholder);
  }

  private createLeadingItems(): ActionBarItem[] {
    return [
      {
        label: this.context.labels.toolbarSources,
        title: this.context.labels.toolbarSources,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('list-unordered'),
        onClick: this.context.onOpenSources,
      },
      {
        label: this.context.labels.toolbarBack,
        title: this.context.labels.toolbarBack,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('arrow-left'),
        disabled: !this.context.browserUrl,
        onClick: this.context.onNavigateBack,
      },
      {
        label: this.context.labels.toolbarForward,
        title: this.context.labels.toolbarForward,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('arrow-right'),
        disabled: false,
        onClick: this.context.onNavigateForward,
      },
      {
        label: this.context.labels.toolbarRefresh,
        title: this.context.labels.toolbarRefresh,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('refresh'),
        disabled: !this.context.browserUrl,
        onClick: this.context.onNavigateRefresh,
      },
      {
        label: this.context.labels.toolbarFavorite,
        title: this.context.labels.toolbarFavorite,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('favorite'),
        disabled: !this.context.browserUrl,
      },
    ];
  }

  private createTrailingItems(): ActionBarItem[] {
    return [
      createDropdownMenuActionViewItem({
        label: this.context.labels.toolbarMore,
        title: this.context.labels.toolbarMore,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('more'),
        overlayAlignment: 'end',
        menu: [
          {
            label: this.context.labels.toolbarHardReload,
            onClick: () => this.context.onHardReload(),
            disabled: !this.context.browserUrl,
          },
          {
            label: this.context.labels.toolbarCopyCurrentUrl,
            onClick: () => {
              void this.context.onCopyCurrentUrl();
            },
            disabled: !this.context.browserUrl,
          },
          {
            label: this.context.labels.toolbarClearBrowsingHistory,
            onClick: () => this.context.onClearBrowsingHistory(),
            disabled: !this.context.browserUrl,
          },
          {
            label: this.context.labels.toolbarClearCookies,
            onClick: () => {
              void this.context.onClearCookies();
            },
            disabled: !this.context.electronRuntime,
          },
          {
            label: this.context.labels.toolbarClearCache,
            onClick: () => {
              void this.context.onClearCache();
            },
            disabled: !this.context.electronRuntime,
          },
        ],
      }),
    ];
  }
}

export function createEditorBrowserModeToolbarContribution(
  context: EditorModeToolbarContributionContext,
) {
  return new EditorBrowserModeToolbarContribution(context);
}
