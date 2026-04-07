import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';

const EDITOR_BROWSER_LIBRARY_STORAGE_KEY = 'ls.editor.browser.library.v1';
const LEGACY_EDITOR_BROWSER_SOURCES_STORAGE_KEY = 'ls.editor.browser.sources.v1';
const MAX_RECENT_BROWSER_LIBRARY_ENTRIES = 25;
const MAX_FAVORITE_BROWSER_LIBRARY_ENTRIES = 25;

type StoredBrowserLibraryState = {
  recentUrls: string[];
  favoriteUrls: string[];
};

type BrowserLibrarySectionKind = 'recent' | 'favorites';

type BrowserLibraryListItem = {
  url: string;
  title: string;
  sectionKind: BrowserLibrarySectionKind;
};

export type EditorBrowserLibraryPanelLabels = {
  title: string;
  recentTitle: string;
  favoritesTitle: string;
  emptyState: string;
};

export type EditorBrowserLibraryPanelContext = {
  browserUrl: string;
  labels: EditorBrowserLibraryPanelLabels;
  onNavigateToUrl: (url: string) => void;
};

type EditorBrowserLibraryPanelOptions = {
  isInteractionWithin?: (target: Node) => boolean;
  onDidChangeOpenState?: (isOpen: boolean) => void;
};

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

function normalizeBrowserLibraryUrl(url: string) {
  return String(url).trim();
}

function isTrackableBrowserLibraryUrl(url: string) {
  return Boolean(url) && url !== 'about:blank';
}

function toTrackableBrowserLibraryUrl(url: string) {
  const normalizedUrl = normalizeBrowserLibraryUrl(url);
  return isTrackableBrowserLibraryUrl(normalizedUrl) ? normalizedUrl : '';
}

function dedupeUrlList(urls: string[]) {
  const normalizedUrls: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const normalizedUrl = normalizeBrowserLibraryUrl(url);
    if (!isTrackableBrowserLibraryUrl(normalizedUrl) || seen.has(normalizedUrl)) {
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

function createStoredBrowserLibraryState(): StoredBrowserLibraryState {
  return {
    recentUrls: [],
    favoriteUrls: [],
  };
}

function sanitizeStoredBrowserLibraryState(
  value: Partial<StoredBrowserLibraryState> | null | undefined,
): StoredBrowserLibraryState {
  if (!value) {
    return createStoredBrowserLibraryState();
  }

  const recentUrls = Array.isArray(value.recentUrls)
    ? value.recentUrls.map((url) => String(url))
    : [];
  const favoriteUrls = Array.isArray(value.favoriteUrls)
    ? value.favoriteUrls.map((url) => String(url))
    : [];

  return {
    recentUrls: trimUrlList(dedupeUrlList(recentUrls), MAX_RECENT_BROWSER_LIBRARY_ENTRIES),
    favoriteUrls: trimUrlList(dedupeUrlList(favoriteUrls), MAX_FAVORITE_BROWSER_LIBRARY_ENTRIES),
  };
}

function getBrowserLibraryStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStoredBrowserLibraryStateFromStorage() {
  const storage = getBrowserLibraryStorage();
  if (!storage) {
    return createStoredBrowserLibraryState();
  }

  try {
    const serialized = (
      storage.getItem(EDITOR_BROWSER_LIBRARY_STORAGE_KEY) ??
      storage.getItem(LEGACY_EDITOR_BROWSER_SOURCES_STORAGE_KEY)
    );
    if (!serialized) {
      return createStoredBrowserLibraryState();
    }

    const parsed = JSON.parse(serialized) as Partial<StoredBrowserLibraryState>;
    return sanitizeStoredBrowserLibraryState(parsed);
  } catch {
    return createStoredBrowserLibraryState();
  }
}

function writeStoredBrowserLibraryStateToStorage(state: StoredBrowserLibraryState) {
  const storage = getBrowserLibraryStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      EDITOR_BROWSER_LIBRARY_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Storage can fail in restricted contexts; keep in-memory state only.
  }
}

let storedBrowserLibraryState = readStoredBrowserLibraryStateFromStorage();

function updateStoredBrowserLibraryState(
  reducer: (state: StoredBrowserLibraryState) => StoredBrowserLibraryState,
) {
  const nextState = sanitizeStoredBrowserLibraryState(reducer(storedBrowserLibraryState));
  if (
    nextState.recentUrls.length === storedBrowserLibraryState.recentUrls.length &&
    nextState.favoriteUrls.length === storedBrowserLibraryState.favoriteUrls.length &&
    nextState.recentUrls.every((url, index) => url === storedBrowserLibraryState.recentUrls[index]) &&
    nextState.favoriteUrls.every((url, index) => url === storedBrowserLibraryState.favoriteUrls[index])
  ) {
    return false;
  }

  storedBrowserLibraryState = nextState;
  writeStoredBrowserLibraryStateToStorage(nextState);
  return true;
}

function recordRecentBrowserLibraryEntry(url: string) {
  const normalizedUrl = toTrackableBrowserLibraryUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return updateStoredBrowserLibraryState((state) => ({
    ...state,
    recentUrls: trimUrlList(
      [normalizedUrl, ...state.recentUrls.filter((entry) => entry !== normalizedUrl)],
      MAX_RECENT_BROWSER_LIBRARY_ENTRIES,
    ),
  }));
}

function toggleFavoriteBrowserLibraryEntry(url: string) {
  const normalizedUrl = toTrackableBrowserLibraryUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return updateStoredBrowserLibraryState((state) => {
    const alreadyFavorite = state.favoriteUrls.includes(normalizedUrl);
    const favoriteUrls = alreadyFavorite
      ? state.favoriteUrls.filter((entry) => entry !== normalizedUrl)
      : trimUrlList(
        [normalizedUrl, ...state.favoriteUrls.filter((entry) => entry !== normalizedUrl)],
        MAX_FAVORITE_BROWSER_LIBRARY_ENTRIES,
      );

    const recentUrls = trimUrlList(
      [normalizedUrl, ...state.recentUrls.filter((entry) => entry !== normalizedUrl)],
      MAX_RECENT_BROWSER_LIBRARY_ENTRIES,
    );

    return {
      ...state,
      recentUrls,
      favoriteUrls,
    };
  });
}

function clearRecentBrowserLibraryEntries() {
  return updateStoredBrowserLibraryState((state) => ({
    ...state,
    recentUrls: [],
  }));
}

function isFavoriteBrowserLibraryEntry(url: string) {
  const normalizedUrl = toTrackableBrowserLibraryUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return storedBrowserLibraryState.favoriteUrls.includes(normalizedUrl);
}

function getRecentBrowserLibraryEntries() {
  return [...storedBrowserLibraryState.recentUrls];
}

function getFavoriteBrowserLibraryEntries() {
  return [...storedBrowserLibraryState.favoriteUrls];
}

function resolveBrowserLibraryTitle(url: string) {
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

function normalizeSearchQuery(query: string) {
  return String(query).trim().toLowerCase();
}

export class EditorBrowserLibraryPanel {
  private context: EditorBrowserLibraryPanelContext;
  private isInteractionWithin?: (target: Node) => boolean;
  private onDidChangeOpenState?: (isOpen: boolean) => void;
  private readonly element = createElement('div', 'editor-browser-library-panel');
  private readonly headerElement = createElement('header', 'editor-browser-library-header');
  private readonly headerTitleElement = createElement('h3', 'editor-browser-library-header-title');
  private readonly searchInputHost = createElement('div', 'editor-browser-library-search-host');
  private readonly bodyElement = createElement('div', 'editor-browser-library-body');
  private readonly listElement = createElement('div', 'editor-browser-library-list');
  private readonly searchInput: InputBox;
  private readonly panelId = `editor-browser-library-panel-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  private isOpen = false;
  private searchQuery = '';
  private isGlobalListenersBound = false;
  private hostElement: HTMLElement | null = null;

  constructor(
    context: EditorBrowserLibraryPanelContext,
    options: EditorBrowserLibraryPanelOptions = {},
  ) {
    this.context = context;
    this.isInteractionWithin = options.isInteractionWithin;
    this.onDidChangeOpenState = options.onDidChangeOpenState;
    this.searchInput = new InputBox(this.searchInputHost, undefined, {
      className: 'editor-browser-library-search-input',
      type: 'search',
      value: '',
      placeholder: '',
      ariaLabel: '',
    });
    this.searchInput.onDidChange(this.handleSearchInputChange);
    this.element.id = this.panelId;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-label', this.context.labels.title);
    this.bodyElement.append(this.listElement);
    this.headerElement.append(this.headerTitleElement, this.searchInputHost);
    this.element.append(this.headerElement, this.bodyElement);
    this.trackCurrentBrowserLibraryEntry();
    this.render();
  }

  getElement() {
    return this.element;
  }

  mountTo(hostElement: HTMLElement | null) {
    if (this.hostElement === hostElement) {
      return;
    }

    this.hostElement = hostElement;
    if (!hostElement) {
      this.element.remove();
      return;
    }

    hostElement.append(this.element);
  }

  setInteractionBoundaryResolver(
    resolver: ((target: Node) => boolean) | undefined,
  ) {
    this.isInteractionWithin = resolver;
  }

  setOnDidChangeOpenState(listener: ((isOpen: boolean) => void) | undefined) {
    this.onDidChangeOpenState = listener;
  }

  getPanelId() {
    return this.panelId;
  }

  getToggleButtonAttributes() {
    return {
      'aria-haspopup': 'dialog',
      'aria-expanded': String(this.isOpen),
      'aria-controls': this.panelId,
    };
  }

  getIsOpen() {
    return this.isOpen;
  }

  setContext(context: EditorBrowserLibraryPanelContext) {
    this.context = context;
    this.trackCurrentBrowserLibraryEntry();
    this.render();
  }

  setOpen(isOpen: boolean) {
    if (this.isOpen === isOpen) {
      return;
    }

    this.isOpen = isOpen;
    if (isOpen) {
      this.bindGlobalListeners();
      queueMicrotask(() => {
        if (!this.isOpen) {
          return;
        }
        this.searchInput.focus();
      });
    } else {
      this.unbindGlobalListeners();
      this.resetSearchQuery();
    }
    this.render();
    this.onDidChangeOpenState?.(this.isOpen);
  }

  toggleOpen() {
    this.setOpen(!this.isOpen);
  }

  close() {
    this.setOpen(false);
  }

  canToggleCurrentBrowserUrlFavorite() {
    return Boolean(toTrackableBrowserLibraryUrl(this.context.browserUrl));
  }

  isCurrentBrowserUrlFavorited() {
    const libraryUrl = toTrackableBrowserLibraryUrl(this.context.browserUrl);
    return libraryUrl ? isFavoriteBrowserLibraryEntry(libraryUrl) : false;
  }

  toggleCurrentBrowserUrlFavorite() {
    const libraryUrl = toTrackableBrowserLibraryUrl(this.context.browserUrl);
    if (!libraryUrl) {
      return false;
    }

    const changed = toggleFavoriteBrowserLibraryEntry(libraryUrl);
    if (changed) {
      this.render();
    }
    return changed;
  }

  clearRecentLibraryEntries() {
    const changed = clearRecentBrowserLibraryEntries();
    if (changed) {
      this.render();
    }
    return changed;
  }

  dispose() {
    this.unbindGlobalListeners();
    this.hostElement = null;
    this.searchInput.dispose();
    this.element.remove();
    this.element.replaceChildren();
  }

  private trackCurrentBrowserLibraryEntry() {
    const libraryUrl = toTrackableBrowserLibraryUrl(this.context.browserUrl);
    if (!libraryUrl) {
      return;
    }

    recordRecentBrowserLibraryEntry(libraryUrl);
  }

  private bindGlobalListeners() {
    if (this.isGlobalListenersBound || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
    document.addEventListener('keydown', this.handleGlobalKeyDown, true);
    this.isGlobalListenersBound = true;
  }

  private unbindGlobalListeners() {
    if (!this.isGlobalListenersBound || typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('pointerdown', this.handleGlobalPointerDown, true);
    document.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    this.isGlobalListenersBound = false;
  }

  private readonly handleGlobalPointerDown = (event: PointerEvent) => {
    if (!this.isOpen) {
      return;
    }

    if (!this.element.isConnected) {
      this.setOpen(false);
      return;
    }

    if (!(event.target instanceof Node)) {
      return;
    }

    if (this.element.contains(event.target)) {
      return;
    }

    if (this.isInteractionWithin?.(event.target)) {
      return;
    }

    this.setOpen(false);
  };

  private readonly handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (!this.isOpen || event.key !== 'Escape') {
      return;
    }

    event.stopPropagation();
    this.setOpen(false);
  };

  private readonly handleLibraryItemClick = (url: string) => {
    this.context.onNavigateToUrl(url);
    this.setOpen(false);
  };

  private readonly handleSearchInputChange = (value: string) => {
    this.searchQuery = value;
    this.renderLibraryList();
  };

  private resetSearchQuery() {
    if (!this.searchQuery && this.searchInput.value.length === 0) {
      return;
    }

    this.searchQuery = '';
    this.searchInput.value = '';
  }

  private createLibraryListItems(): BrowserLibraryListItem[] {
    const favoriteUrls = getFavoriteBrowserLibraryEntries();
    const recentUrls = getRecentBrowserLibraryEntries();
    const listItems: BrowserLibraryListItem[] = [];
    const seenUrls = new Set<string>();

    const appendUrl = (url: string, sectionKind: BrowserLibrarySectionKind) => {
      if (!url || seenUrls.has(url)) {
        return;
      }

      seenUrls.add(url);
      listItems.push({
        url,
        title: resolveBrowserLibraryTitle(url),
        sectionKind,
      });
    };

    for (const url of favoriteUrls) {
      appendUrl(url, 'favorites');
    }

    for (const url of recentUrls) {
      appendUrl(url, 'recent');
    }

    return listItems;
  }

  private getFilteredLibraryListItems() {
    const normalizedQuery = normalizeSearchQuery(this.searchQuery);
    const listItems = this.createLibraryListItems();
    if (!normalizedQuery) {
      return listItems;
    }

    return listItems.filter((item) => {
      const normalizedTitle = normalizeSearchQuery(item.title);
      const normalizedUrl = normalizeSearchQuery(item.url);
      return (
        normalizedTitle.includes(normalizedQuery) ||
        normalizedUrl.includes(normalizedQuery)
      );
    });
  }

  private render() {
    this.element.classList.toggle('is-open', this.isOpen);
    this.element.setAttribute('aria-hidden', String(!this.isOpen));
    this.element.setAttribute('aria-label', this.context.labels.title);
    this.headerTitleElement.textContent = this.context.labels.title;
    this.searchInput.inputElement.setAttribute('aria-label', this.context.labels.title);
    this.searchInput.setPlaceHolder('');
    this.renderLibraryList();
  }

  private renderLibraryList() {
    const listItems = this.getFilteredLibraryListItems();
    if (listItems.length === 0) {
      const emptyState = createElement(
        'p',
        'editor-browser-library-empty',
        this.context.labels.emptyState,
      );
      this.listElement.replaceChildren(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const itemState of listItems) {
      const { url, title, sectionKind } = itemState;
      const item = createElement('button', 'editor-browser-library-item');
      item.type = 'button';
      item.title = url;
      if (sectionKind === 'favorites') {
        item.classList.add('is-favorite');
      }
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleLibraryItemClick(url);
      });
      const titleElement = createElement(
        'span',
        'editor-browser-library-item-title',
        title,
      );
      const metaElement = createElement(
        'span',
        'editor-browser-library-item-meta',
        url,
      );
      const kindElement = createElement(
        'span',
        'editor-browser-library-item-kind',
        sectionKind === 'favorites'
          ? this.context.labels.favoritesTitle
          : this.context.labels.recentTitle,
      );
      item.append(titleElement, metaElement, kindElement);
      fragment.append(item);
    }

    this.listElement.replaceChildren(fragment);
  }
}
