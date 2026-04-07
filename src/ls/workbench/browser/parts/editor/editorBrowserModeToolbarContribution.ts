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

const EDITOR_BROWSER_TOOLBAR_MORE_MENU_DATA = 'editor-browser-toolbar-more';

export class EditorBrowserModeToolbarContribution
implements EditorModeToolbarContribution {
  readonly mode = 'browser' as const;

  private context: EditorModeToolbarContributionContext;
  private readonly element = createElement(
    'div',
    'editor-mode-toolbar editor-browser-toolbar',
  );
  private readonly toolbarRow = createElement('div', 'editor-browser-toolbar-row');
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
  private isAddressInputEdited = false;

  constructor(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.leadingHost.append(this.leadingActionsView.getElement());
    this.trailingHost.append(this.trailingActionsView.getElement());
    this.addressInput.inputElement.setAttribute('spellcheck', 'false');
    this.addressInput.inputElement.addEventListener('keydown', this.handleAddressInputKeyDown);
    this.addressInput.inputElement.addEventListener('blur', this.handleAddressInputBlur);
    this.addressInput.onDidChange((value) => {
      this.isAddressInputEdited = true;
      this.context.onAddressInputChange(value);
    });
    this.toolbarRow.append(this.leadingHost, this.addressHost, this.trailingHost);
    this.element.append(this.toolbarRow);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setContext(context: EditorModeToolbarContributionContext) {
    this.context = context;
    if (context.mode !== this.mode) {
      this.getSourcesPanelView()?.close();
    }
    this.render();
  }

  focusPrimaryInput() {
    this.addressInput.focus();
    this.addressInput.select();
  }

  dispose() {
    this.getSourcesPanelView()?.setOnDidChangeOpenState(undefined);
    this.addressInput.inputElement.removeEventListener('keydown', this.handleAddressInputKeyDown);
    this.addressInput.inputElement.removeEventListener('blur', this.handleAddressInputBlur);
    this.addressInput.dispose();
    this.leadingActionsView.dispose();
    this.trailingActionsView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    this.bindSourcesPanelView();
    this.updateLeadingActions();
    this.trailingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createTrailingItems(),
    });

    this.syncAddressInputFromContext();
    this.addressInput.inputElement.setAttribute(
      'aria-label',
      this.context.labels.toolbarAddressBar,
    );
    this.addressInput.setPlaceHolder(this.context.labels.toolbarAddressPlaceholder);
  }

  private bindSourcesPanelView() {
    const panel = this.getSourcesPanelView();
    if (!panel) {
      return;
    }

    panel.setOnDidChangeOpenState(this.handleSourcesPanelOpenStateChange);
    panel.setContext(this.createSourcesPanelContext());
  }

  private updateLeadingActions() {
    this.leadingActionsView.setProps({
      className: 'editor-browser-toolbar-actions',
      ariaRole: 'group',
      items: this.createLeadingItems(),
    });
  }

  private getSourcesPanelView() {
    return this.context.browserSourcesPanel;
  }

  private getSourcesButtonAttributes() {
    return this.getSourcesPanelView()?.getToggleButtonAttributes() ?? {
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
    };
  }

  private createSourcesPanelContext() {
    return {
      browserUrl: this.context.browserUrl,
      labels: this.context.labels,
      onNavigateToUrl: this.handleSourceItemNavigate,
    };
  }

  private readonly handleAddressInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      this.isAddressInputEdited = false;
      this.context.onNavigateToUrl(this.addressInput.value);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.isAddressInputEdited = false;
      this.syncAddressInputFromContext(true);
      this.addressInput.select();
    }
  };

  private readonly handleAddressInputBlur = () => {
    this.isAddressInputEdited = false;
    this.syncAddressInputFromContext(true);
  };

  private readonly handleSourcesPanelOpenStateChange = () => {
    this.updateLeadingActions();
  };

  private readonly handleSourceItemNavigate = (url: string) => {
    this.isAddressInputEdited = false;
    this.context.onNavigateToUrl(url);
  };

  private syncAddressInputFromContext(force = false) {
    const displayBrowserUrl = getEditorContentDisplayUrl(this.context.browserUrl);
    const canSyncValue =
      force ||
      !this.addressInput.hasFocus() ||
      !this.isAddressInputEdited;

    if (canSyncValue && this.addressInput.value !== displayBrowserUrl) {
      this.addressInput.value = displayBrowserUrl;
    }
  }

  private readonly handleSourceButtonClick = () => {
    const panel = this.getSourcesPanelView();
    if (!panel) {
      return;
    }

    panel.toggleOpen();
    this.updateLeadingActions();
  };

  private readonly handleFavoriteButtonClick = () => {
    const panel = this.getSourcesPanelView();
    if (!panel) {
      return;
    }

    const changed = panel.toggleCurrentBrowserUrlFavorite();
    if (!changed) {
      return;
    }

    this.updateLeadingActions();
  };

  private createLeadingItems(): ActionBarItem[] {
    const panel = this.getSourcesPanelView();
    const isCurrentUrlFavorited = panel?.isCurrentBrowserUrlFavorited() ?? false;

    return [
      {
        label: this.context.labels.toolbarSources,
        title: this.context.labels.toolbarSources,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('list-unordered'),
        active: panel?.getIsOpen() ?? false,
        buttonAttributes: this.getSourcesButtonAttributes(),
        onClick: this.handleSourceButtonClick,
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
        disabled: !(panel?.canToggleCurrentBrowserUrlFavorite() ?? false),
        checked: isCurrentUrlFavorited,
        active: isCurrentUrlFavorited,
        onClick: this.handleFavoriteButtonClick,
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
        menuData: EDITOR_BROWSER_TOOLBAR_MORE_MENU_DATA,
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
            onClick: () => {
              this.getSourcesPanelView()?.clearRecentSources();
              this.context.onClearBrowsingHistory();
            },
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
