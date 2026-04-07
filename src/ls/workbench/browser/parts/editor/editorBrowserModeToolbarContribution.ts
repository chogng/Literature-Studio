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
  textContent?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

const EDITOR_BROWSER_TOOLBAR_MORE_MENU_DATA = 'editor-browser-toolbar-more';
const EDITOR_BROWSER_SOURCES_STORAGE_KEY = 'ls.editor.browser.sources.v1';
const MAX_RECENT_BROWSER_SOURCES = 25;
const MAX_FAVORITE_BROWSER_SOURCES = 25;

type StoredBrowserSourcesState = {
  recentUrls: string[];
  favoriteUrls: string[];
};

type BrowserSourcesSectionKind = 'recent' | 'favorites';

function normalizeBrowserSourceUrl(url: string) {
  return String(url).trim();
}

function isTrackableBrowserSourceUrl(url: string) {
  return Boolean(url) && url !== 'about:blank';
}

function toTrackableBrowserSourceUrl(url: string) {
  const normalizedUrl = normalizeBrowserSourceUrl(url);
  return isTrackableBrowserSourceUrl(normalizedUrl) ? normalizedUrl : '';
}

function dedupeUrlList(urls: string[]) {
  const normalizedUrls: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const normalizedUrl = normalizeBrowserSourceUrl(url);
    if (!isTrackableBrowserSourceUrl(normalizedUrl) || seen.has(normalizedUrl)) {
      continue;
    }

    seen.add(normalizedUrl);
    normalizedUrls.push(normalizedUrl);
  }

  return normalizedUrls;
}

function trimUrlList(urls: string[], maxCount: number) {
  return urls.slice(0, maxCount);
}

function createStoredBrowserSourcesState(): StoredBrowserSourcesState {
  return {
    recentUrls: [],
    favoriteUrls: [],
  };
}

function sanitizeStoredBrowserSourcesState(
  value: Partial<StoredBrowserSourcesState> | null | undefined,
): StoredBrowserSourcesState {
  if (!value) {
    return createStoredBrowserSourcesState();
  }

  const recentUrls = Array.isArray(value.recentUrls)
    ? value.recentUrls.map((url) => String(url))
    : [];
  const favoriteUrls = Array.isArray(value.favoriteUrls)
    ? value.favoriteUrls.map((url) => String(url))
    : [];

  return {
    recentUrls: trimUrlList(dedupeUrlList(recentUrls), MAX_RECENT_BROWSER_SOURCES),
    favoriteUrls: trimUrlList(dedupeUrlList(favoriteUrls), MAX_FAVORITE_BROWSER_SOURCES),
  };
}

function getBrowserSourcesStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStoredBrowserSourcesStateFromStorage() {
  const storage = getBrowserSourcesStorage();
  if (!storage) {
    return createStoredBrowserSourcesState();
  }

  try {
    const serialized = storage.getItem(EDITOR_BROWSER_SOURCES_STORAGE_KEY);
    if (!serialized) {
      return createStoredBrowserSourcesState();
    }

    const parsed = JSON.parse(serialized) as Partial<StoredBrowserSourcesState>;
    return sanitizeStoredBrowserSourcesState(parsed);
  } catch {
    return createStoredBrowserSourcesState();
  }
}

function writeStoredBrowserSourcesStateToStorage(state: StoredBrowserSourcesState) {
  const storage = getBrowserSourcesStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      EDITOR_BROWSER_SOURCES_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Storage can fail in restricted contexts; keep in-memory state only.
  }
}

let storedBrowserSourcesState = readStoredBrowserSourcesStateFromStorage();

function updateStoredBrowserSourcesState(
  reducer: (state: StoredBrowserSourcesState) => StoredBrowserSourcesState,
) {
  const nextState = sanitizeStoredBrowserSourcesState(reducer(storedBrowserSourcesState));
  if (
    nextState.recentUrls.length === storedBrowserSourcesState.recentUrls.length &&
    nextState.favoriteUrls.length === storedBrowserSourcesState.favoriteUrls.length &&
    nextState.recentUrls.every((url, index) => url === storedBrowserSourcesState.recentUrls[index]) &&
    nextState.favoriteUrls.every((url, index) => url === storedBrowserSourcesState.favoriteUrls[index])
  ) {
    return false;
  }

  storedBrowserSourcesState = nextState;
  writeStoredBrowserSourcesStateToStorage(nextState);
  return true;
}

function recordRecentBrowserSource(url: string) {
  const normalizedUrl = toTrackableBrowserSourceUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return updateStoredBrowserSourcesState((state) => ({
    ...state,
    recentUrls: trimUrlList(
      [normalizedUrl, ...state.recentUrls.filter((entry) => entry !== normalizedUrl)],
      MAX_RECENT_BROWSER_SOURCES,
    ),
  }));
}

function toggleFavoriteBrowserSource(url: string) {
  const normalizedUrl = toTrackableBrowserSourceUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  let nextFavoriteState = false;
  updateStoredBrowserSourcesState((state) => {
    const alreadyFavorite = state.favoriteUrls.includes(normalizedUrl);
    nextFavoriteState = !alreadyFavorite;
    const favoriteUrls = alreadyFavorite
      ? state.favoriteUrls.filter((entry) => entry !== normalizedUrl)
      : trimUrlList(
        [normalizedUrl, ...state.favoriteUrls.filter((entry) => entry !== normalizedUrl)],
        MAX_FAVORITE_BROWSER_SOURCES,
      );

    const recentUrls = trimUrlList(
      [normalizedUrl, ...state.recentUrls.filter((entry) => entry !== normalizedUrl)],
      MAX_RECENT_BROWSER_SOURCES,
    );

    return {
      ...state,
      recentUrls,
      favoriteUrls,
    };
  });

  return nextFavoriteState;
}

function clearRecentBrowserSources() {
  return updateStoredBrowserSourcesState((state) => ({
    ...state,
    recentUrls: [],
  }));
}

function isFavoriteBrowserSource(url: string) {
  const normalizedUrl = toTrackableBrowserSourceUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return storedBrowserSourcesState.favoriteUrls.includes(normalizedUrl);
}

function getRecentBrowserSources() {
  return [...storedBrowserSourcesState.recentUrls];
}

function getFavoriteBrowserSources() {
  return [...storedBrowserSourcesState.favoriteUrls];
}

function resolveBrowserSourceTitle(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    const search = parsed.search || '';
    const hash = parsed.hash || '';
    const suffix = `${pathname}${search}${hash}`;
    return suffix ? `${parsed.hostname}${suffix}` : parsed.hostname;
  } catch {
    return url;
  }
}

function buildSourcesButtonAttributes(
  panelId: string,
  isExpanded: boolean,
) {
  return {
    'aria-haspopup': 'dialog',
    'aria-expanded': String(isExpanded),
    'aria-controls': panelId,
  };
}

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
  private readonly sourcesPanel = createElement('div', 'editor-browser-toolbar-sources-panel');
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
  private readonly sourcesPanelId = `editor-browser-toolbar-sources-panel-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  private isAddressInputEdited = false;
  private isSourcesPanelOpen = false;
  private isSourcesPanelGlobalListenersBound = false;

  constructor(context: EditorModeToolbarContributionContext) {
    this.context = context;
    this.leadingHost.append(this.leadingActionsView.getElement());
    this.trailingHost.append(this.trailingActionsView.getElement());
    this.sourcesPanel.id = this.sourcesPanelId;
    this.sourcesPanel.setAttribute('role', 'dialog');
    this.sourcesPanel.setAttribute('aria-hidden', 'true');
    this.sourcesPanel.setAttribute('aria-label', this.context.labels.toolbarSources);
    this.addressInput.inputElement.setAttribute('spellcheck', 'false');
    this.addressInput.inputElement.addEventListener('keydown', this.handleAddressInputKeyDown);
    this.addressInput.inputElement.addEventListener('blur', this.handleAddressInputBlur);
    this.addressInput.onDidChange((value) => {
      this.isAddressInputEdited = true;
      this.context.onAddressInputChange(value);
    });
    this.toolbarRow.append(this.leadingHost, this.addressHost, this.trailingHost);
    this.element.append(this.toolbarRow, this.sourcesPanel);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setContext(context: EditorModeToolbarContributionContext) {
    this.context = context;
    if (context.mode !== this.mode) {
      this.setSourcesPanelOpen(false);
    }
    this.render();
  }

  focusPrimaryInput() {
    this.addressInput.focus();
    this.addressInput.select();
  }

  dispose() {
    this.unbindSourcesPanelGlobalListeners();
    this.addressInput.inputElement.removeEventListener('keydown', this.handleAddressInputKeyDown);
    this.addressInput.inputElement.removeEventListener('blur', this.handleAddressInputBlur);
    this.addressInput.dispose();
    this.leadingActionsView.dispose();
    this.trailingActionsView.dispose();
    this.element.replaceChildren();
  }

  private render() {
    this.trackCurrentBrowserSource();
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

    this.syncAddressInputFromContext();
    this.renderSourcesPanel();
    this.addressInput.inputElement.setAttribute(
      'aria-label',
      this.context.labels.toolbarAddressBar,
    );
    this.addressInput.setPlaceHolder(this.context.labels.toolbarAddressPlaceholder);
    this.sourcesPanel.setAttribute('aria-label', this.context.labels.toolbarSources);
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

  private trackCurrentBrowserSource() {
    const sourceUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    if (!sourceUrl) {
      return;
    }

    recordRecentBrowserSource(sourceUrl);
  }

  private setSourcesPanelOpen(isOpen: boolean) {
    if (this.isSourcesPanelOpen === isOpen) {
      return;
    }

    this.isSourcesPanelOpen = isOpen;
    if (isOpen) {
      this.bindSourcesPanelGlobalListeners();
    } else {
      this.unbindSourcesPanelGlobalListeners();
    }
    this.render();
  }

  private bindSourcesPanelGlobalListeners() {
    if (this.isSourcesPanelGlobalListenersBound || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
    document.addEventListener('keydown', this.handleGlobalKeyDown, true);
    this.isSourcesPanelGlobalListenersBound = true;
  }

  private unbindSourcesPanelGlobalListeners() {
    if (!this.isSourcesPanelGlobalListenersBound || typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('pointerdown', this.handleGlobalPointerDown, true);
    document.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    this.isSourcesPanelGlobalListenersBound = false;
  }

  private readonly handleGlobalPointerDown = (event: PointerEvent) => {
    if (!this.isSourcesPanelOpen) {
      return;
    }

    if (!this.element.isConnected) {
      this.setSourcesPanelOpen(false);
      return;
    }

    if (!(event.target instanceof Node)) {
      return;
    }

    if (this.element.contains(event.target)) {
      return;
    }

    this.setSourcesPanelOpen(false);
  };

  private readonly handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (!this.isSourcesPanelOpen || event.key !== 'Escape') {
      return;
    }

    event.stopPropagation();
    this.setSourcesPanelOpen(false);
  };

  private readonly handleSourceButtonClick = () => {
    this.setSourcesPanelOpen(!this.isSourcesPanelOpen);
  };

  private readonly handleFavoriteButtonClick = () => {
    const sourceUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    if (!sourceUrl) {
      return;
    }

    toggleFavoriteBrowserSource(sourceUrl);
    this.render();
  };

  private readonly handleSourceItemClick = (url: string) => {
    this.isAddressInputEdited = false;
    this.context.onNavigateToUrl(url);
    this.setSourcesPanelOpen(false);
  };

  private renderSourcesPanel() {
    const recentUrls = getRecentBrowserSources();
    const favoriteUrls = getFavoriteBrowserSources();
    this.sourcesPanel.classList.toggle('is-open', this.isSourcesPanelOpen);
    this.sourcesPanel.setAttribute('aria-hidden', String(!this.isSourcesPanelOpen));
    this.sourcesPanel.replaceChildren(
      this.renderSourcesPanelSection(
        this.context.labels.toolbarSourcesRecent,
        recentUrls,
        'recent',
      ),
      this.renderSourcesPanelSection(
        this.context.labels.toolbarSourcesFavorites,
        favoriteUrls,
        'favorites',
      ),
    );
  }

  private renderSourcesPanelSection(
    title: string,
    urls: string[],
    sectionKind: BrowserSourcesSectionKind,
  ) {
    const section = createElement('section', 'editor-browser-toolbar-sources-section');
    const heading = createElement(
      'h3',
      'editor-browser-toolbar-sources-section-title',
      title,
    );
    const list = createElement('div', 'editor-browser-toolbar-sources-list');

    if (urls.length === 0) {
      const emptyState = createElement(
        'p',
        'editor-browser-toolbar-sources-empty',
        this.context.labels.toolbarSourcesEmpty,
      );
      emptyState.setAttribute('data-section-kind', sectionKind);
      list.append(emptyState);
      section.append(heading, list);
      return section;
    }

    for (const url of urls) {
      const item = createElement('button', 'editor-browser-toolbar-sources-item');
      item.type = 'button';
      item.title = url;
      if (sectionKind === 'favorites') {
        item.classList.add('is-favorite');
      }
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleSourceItemClick(url);
      });
      const titleElement = createElement(
        'span',
        'editor-browser-toolbar-sources-item-title',
        resolveBrowserSourceTitle(url),
      );
      const metaElement = createElement(
        'span',
        'editor-browser-toolbar-sources-item-meta',
        url,
      );
      item.append(titleElement, metaElement);
      list.append(item);
    }

    section.append(heading, list);
    return section;
  }

  private createLeadingItems(): ActionBarItem[] {
    const trackableBrowserUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    const isCurrentUrlFavorited = trackableBrowserUrl
      ? isFavoriteBrowserSource(trackableBrowserUrl)
      : false;

    return [
      {
        label: this.context.labels.toolbarSources,
        title: this.context.labels.toolbarSources,
        mode: 'icon',
        buttonClassName: 'editor-browser-toolbar-btn',
        content: createLxIcon('list-unordered'),
        active: this.isSourcesPanelOpen,
        buttonAttributes: buildSourcesButtonAttributes(
          this.sourcesPanelId,
          this.isSourcesPanelOpen,
        ),
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
        disabled: !trackableBrowserUrl,
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
              clearRecentBrowserSources();
              this.context.onClearBrowsingHistory();
              this.renderSourcesPanel();
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
