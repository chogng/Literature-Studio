import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';

const EDITOR_BROWSER_LIBRARY_STORAGE_KEY = 'ls.editor.browser.library.v1';
const MAX_RECENT_BROWSER_LIBRARY_ENTRIES = 25;
const MAX_FAVORITE_BROWSER_LIBRARY_ENTRIES = 25;
const EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS = 'is-desktop-overlay';
const NATIVE_WEBCONTENT_ACTIVE_SELECTOR =
  '.browser-frame-placeholder[data-webcontent-active="true"]';

type StoredBrowserLibraryState = {
  recentUrls: string[];
  favoriteUrls: string[];
  faviconByUrl: Record<string, string>;
  pageTitleByUrl: Record<string, string>;
};

type BrowserLibrarySectionKind = 'recent' | 'favorites';

type BrowserLibraryListItem = {
  url: string;
  title: string;
  faviconUrl: string;
  sectionKind: BrowserLibrarySectionKind;
};

export type EditorBrowserLibraryPanelLabels = {
  title: string;
  recentTitle: string;
  favoritesTitle: string;
  emptyState: string;
  deleteHistoryEntry?: string;
};

export type EditorBrowserLibraryPanelContext = {
  browserUrl: string;
  browserPageTitle?: string;
  browserFaviconUrl?: string;
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
    faviconByUrl: {},
    pageTitleByUrl: {},
  };
}

function sanitizeBrowserLibraryFaviconUrl(value: unknown) {
  return String(value ?? '').trim();
}

function sanitizeBrowserLibraryPageTitle(value: unknown) {
  const normalizedPageTitle = String(value ?? '').trim();
  if (!normalizedPageTitle) {
    return '';
  }

  if (
    /^about:blank$/i.test(normalizedPageTitle) ||
    /^https?:\/\/about:blank$/i.test(normalizedPageTitle)
  ) {
    return '';
  }

  return normalizedPageTitle;
}

function sanitizeStoredBrowserLibraryFaviconByUrl(
  value: unknown,
  validUrls: Set<string>,
) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const faviconByUrl: Record<string, string> = {};
  for (const [url, favicon] of Object.entries(value)) {
    const normalizedUrl = normalizeBrowserLibraryUrl(url);
    if (!validUrls.has(normalizedUrl)) {
      continue;
    }

    const normalizedFavicon = sanitizeBrowserLibraryFaviconUrl(favicon);
    if (!normalizedFavicon) {
      continue;
    }
    faviconByUrl[normalizedUrl] = normalizedFavicon;
  }

  return faviconByUrl;
}

function sanitizeStoredBrowserLibraryPageTitleByUrl(
  value: unknown,
  validUrls: Set<string>,
) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const pageTitleByUrl: Record<string, string> = {};
  for (const [url, pageTitle] of Object.entries(value)) {
    const normalizedUrl = normalizeBrowserLibraryUrl(url);
    if (!validUrls.has(normalizedUrl)) {
      continue;
    }

    const normalizedPageTitle = sanitizeBrowserLibraryPageTitle(pageTitle);
    if (!normalizedPageTitle) {
      continue;
    }
    pageTitleByUrl[normalizedUrl] = normalizedPageTitle;
  }

  return pageTitleByUrl;
}

function areStoredBrowserLibraryStringMapsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
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
  const sanitizedRecentUrls = trimUrlList(
    dedupeUrlList(recentUrls),
    MAX_RECENT_BROWSER_LIBRARY_ENTRIES,
  );
  const sanitizedFavoriteUrls = trimUrlList(
    dedupeUrlList(favoriteUrls),
    MAX_FAVORITE_BROWSER_LIBRARY_ENTRIES,
  );
  const validUrls = new Set<string>([
    ...sanitizedRecentUrls,
    ...sanitizedFavoriteUrls,
  ]);

  return {
    recentUrls: sanitizedRecentUrls,
    favoriteUrls: sanitizedFavoriteUrls,
    faviconByUrl: sanitizeStoredBrowserLibraryFaviconByUrl(
      (value as { faviconByUrl?: unknown }).faviconByUrl,
      validUrls,
    ),
    pageTitleByUrl: sanitizeStoredBrowserLibraryPageTitleByUrl(
      (value as { pageTitleByUrl?: unknown }).pageTitleByUrl,
      validUrls,
    ),
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
    const serialized = storage.getItem(EDITOR_BROWSER_LIBRARY_STORAGE_KEY);
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
    nextState.favoriteUrls.every((url, index) => url === storedBrowserLibraryState.favoriteUrls[index]) &&
    areStoredBrowserLibraryStringMapsEqual(
      nextState.faviconByUrl,
      storedBrowserLibraryState.faviconByUrl,
    ) &&
    areStoredBrowserLibraryStringMapsEqual(
      nextState.pageTitleByUrl,
      storedBrowserLibraryState.pageTitleByUrl,
    )
  ) {
    return false;
  }

  storedBrowserLibraryState = nextState;
  writeStoredBrowserLibraryStateToStorage(nextState);
  return true;
}

function recordBrowserLibraryEntryVisit({
  url,
  faviconUrl,
  pageTitle,
}: {
  url: string;
  faviconUrl?: string;
  pageTitle?: string;
}) {
  const normalizedUrl = toTrackableBrowserLibraryUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  const normalizedFaviconUrl = sanitizeBrowserLibraryFaviconUrl(faviconUrl);
  const normalizedPageTitle = sanitizeBrowserLibraryPageTitle(pageTitle);

  return updateStoredBrowserLibraryState((state) => {
    const recentUrls = trimUrlList(
      [normalizedUrl, ...state.recentUrls.filter((entry) => entry !== normalizedUrl)],
      MAX_RECENT_BROWSER_LIBRARY_ENTRIES,
    );

    let faviconByUrl = state.faviconByUrl;
    if (normalizedFaviconUrl) {
      faviconByUrl = {
        ...faviconByUrl,
        [normalizedUrl]: normalizedFaviconUrl,
      };
    }

    let pageTitleByUrl = state.pageTitleByUrl;
    if (normalizedPageTitle) {
      pageTitleByUrl = {
        ...pageTitleByUrl,
        [normalizedUrl]: normalizedPageTitle,
      };
    }

    return {
      ...state,
      recentUrls,
      faviconByUrl,
      pageTitleByUrl,
    };
  });
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
  return updateStoredBrowserLibraryState((state) => {
    const favoriteUrlSet = new Set(state.favoriteUrls);
    const nextFaviconByUrl: Record<string, string> = {};
    const nextPageTitleByUrl: Record<string, string> = {};
    for (const [url, faviconUrl] of Object.entries(state.faviconByUrl)) {
      if (favoriteUrlSet.has(url)) {
        nextFaviconByUrl[url] = faviconUrl;
      }
    }
    for (const [url, pageTitle] of Object.entries(state.pageTitleByUrl)) {
      if (favoriteUrlSet.has(url)) {
        nextPageTitleByUrl[url] = pageTitle;
      }
    }

    return {
      ...state,
      recentUrls: [],
      faviconByUrl: nextFaviconByUrl,
      pageTitleByUrl: nextPageTitleByUrl,
    };
  });
}

function removeRecentBrowserLibraryEntry(url: string) {
  const normalizedUrl = toTrackableBrowserLibraryUrl(url);
  if (!normalizedUrl) {
    return false;
  }

  return updateStoredBrowserLibraryState((state) => {
    if (!state.recentUrls.includes(normalizedUrl)) {
      return state;
    }

    const recentUrls = state.recentUrls.filter((entry) => entry !== normalizedUrl);
    if (state.favoriteUrls.includes(normalizedUrl)) {
      return {
        ...state,
        recentUrls,
      };
    }

    const faviconByUrl = { ...state.faviconByUrl };
    const pageTitleByUrl = { ...state.pageTitleByUrl };
    delete faviconByUrl[normalizedUrl];
    delete pageTitleByUrl[normalizedUrl];

    return {
      ...state,
      recentUrls,
      faviconByUrl,
      pageTitleByUrl,
    };
  });
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

function getBrowserLibraryEntryFavicon(url: string) {
  return storedBrowserLibraryState.faviconByUrl[url] ?? '';
}

function getBrowserLibraryEntryPageTitle(url: string) {
  return storedBrowserLibraryState.pageTitleByUrl[url] ?? '';
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
  private readonly backdropElement = createElement(
    'div',
    'editor-browser-library-panel-backdrop',
  );
  private readonly element = createElement('div', 'editor-browser-library-panel');
  private readonly desktopOverlayContainer = createElement(
    'div',
    'editor-browser-library-panel-overlay',
  );
  private readonly headerElement = createElement('header', 'editor-browser-library-header');
  private readonly searchInputHost = createElement('div', 'editor-browser-library-search-host');
  private readonly bodyElement = createElement('div', 'editor-browser-library-body');
  private listElement: HTMLElement | null = null;
  private emptyStateElement: HTMLElement | null = null;
  private readonly searchInput: InputBox;
  private readonly panelId = `editor-browser-library-panel-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  private isOpen = false;
  private searchQuery = '';
  private isGlobalListenersBound = false;
  private hostElement: HTMLElement | null = null;
  private overlayPositionFrame = 0;

  constructor(
    context: EditorBrowserLibraryPanelContext,
    options: EditorBrowserLibraryPanelOptions = {},
  ) {
    this.context = context;
    this.isInteractionWithin = options.isInteractionWithin;
    this.onDidChangeOpenState = options.onDidChangeOpenState;
    this.searchInput = new InputBox(this.searchInputHost, undefined, {
      className: 'editor-browser-library-search-input',
      type: 'text',
      value: '',
      placeholder: 'Search',
      ariaLabel: '',
    });
    this.searchInput.onDidChange(this.handleSearchInputChange);
    this.backdropElement.setAttribute('aria-hidden', 'true');
    this.element.id = this.panelId;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-label', this.context.labels.title);
    this.headerElement.append(this.searchInputHost);
    this.element.append(this.headerElement, this.bodyElement);
    this.trackCurrentBrowserLibraryEntry();
    this.render();
  }

  getElement() {
    return this.element;
  }

  mountTo(hostElement: HTMLElement | null) {
    if (this.hostElement === hostElement) {
      this.mountElementToHost();
      return;
    }

    this.hostElement = hostElement;
    this.mountElementToHost();
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
    this.stopOverlayPositionSync();
    this.clearDesktopOverlayPosition();
    this.removeDesktopOverlayContainer();
    this.backdropElement.remove();
    this.element.classList.remove(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS);
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

    // Persist visit metadata in a single state update to avoid redundant storage writes.
    recordBrowserLibraryEntryVisit({
      url: libraryUrl,
      faviconUrl: this.context.browserFaviconUrl,
      pageTitle: this.context.browserPageTitle,
    });
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

  private readonly handleLibraryItemDelete = (url: string) => {
    const changed = removeRecentBrowserLibraryEntry(url);
    if (!changed) {
      return;
    }

    this.renderLibraryList();
  };

  private readonly handleSearchInputChange = (value: string) => {
    this.searchQuery = value;
    this.renderLibraryList();
  };

  private getDeleteHistoryEntryLabel() {
    const configuredLabel = String(this.context.labels.deleteHistoryEntry ?? '').trim();
    return configuredLabel || 'Delete history entry';
  }

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
      const pageTitle = sanitizeBrowserLibraryPageTitle(
        getBrowserLibraryEntryPageTitle(url),
      );
      listItems.push({
        url,
        title: pageTitle || resolveBrowserLibraryTitle(url),
        faviconUrl: getBrowserLibraryEntryFavicon(url),
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
    this.mountElementToHost();
    this.backdropElement.classList.toggle('is-open', this.isOpen);
    this.element.classList.toggle('is-open', this.isOpen);
    this.element.setAttribute('aria-hidden', String(!this.isOpen));
    this.element.setAttribute('aria-label', this.context.labels.title);
    this.searchInput.inputElement.setAttribute('aria-label', this.context.labels.title);
    this.searchInput.setPlaceHolder('Search');
    if (this.isOpen) {
      this.startOverlayPositionSync();
    } else {
      this.stopOverlayPositionSync();
    }
    this.renderLibraryList();
  }

  private mountElementToHost() {
    const hostElement = this.hostElement;
    if (!hostElement) {
      this.stopOverlayPositionSync();
      this.clearDesktopOverlayPosition();
      this.removeDesktopOverlayContainer();
      this.backdropElement.remove();
      this.element.classList.remove(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS);
      this.element.remove();
      return;
    }

    const useDesktopOverlay = this.hasActiveNativeWebContent(hostElement);
    const mountAsDesktopOverlay = useDesktopOverlay;
    if (mountAsDesktopOverlay) {
      const overlayContainer = this.getOrCreateDesktopOverlayContainer();
      this.appendPanelSurface(overlayContainer);
      this.element.classList.add(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS);
      this.syncDesktopOverlayPosition();
      return;
    }

    this.removeDesktopOverlayContainer();
    this.appendPanelSurface(hostElement);
    this.element.classList.remove(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS);
    this.stopOverlayPositionSync();
    this.clearDesktopOverlayPosition();
  }

  private appendPanelSurface(target: HTMLElement) {
    target.append(this.backdropElement);
    target.append(this.element);
  }

  private getOrCreateDesktopOverlayContainer() {
    if (typeof document === 'undefined') {
      return this.desktopOverlayContainer;
    }

    if (this.desktopOverlayContainer.parentElement !== document.body) {
      document.body.append(this.desktopOverlayContainer);
    }
    return this.desktopOverlayContainer;
  }

  private removeDesktopOverlayContainer() {
    this.desktopOverlayContainer.remove();
  }

  private hasActiveNativeWebContent(hostElement: HTMLElement) {
    return Boolean(hostElement.querySelector(NATIVE_WEBCONTENT_ACTIVE_SELECTOR));
  }

  private syncDesktopOverlayPosition() {
    if (
      !this.hostElement ||
      !this.element.classList.contains(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS) ||
      this.element.parentElement !== this.desktopOverlayContainer
    ) {
      return;
    }

    const hostRect = this.hostElement.getBoundingClientRect();
    this.desktopOverlayContainer.style.left = `${Math.round(hostRect.left)}px`;
    this.desktopOverlayContainer.style.top = `${Math.round(hostRect.top)}px`;
    this.desktopOverlayContainer.style.width = `${Math.max(0, Math.round(hostRect.width))}px`;
    this.desktopOverlayContainer.style.height = `${Math.max(0, Math.round(hostRect.height))}px`;
  }

  private clearDesktopOverlayPosition() {
    this.desktopOverlayContainer.style.removeProperty('left');
    this.desktopOverlayContainer.style.removeProperty('top');
    this.desktopOverlayContainer.style.removeProperty('width');
    this.desktopOverlayContainer.style.removeProperty('height');
    this.element.style.removeProperty('left');
    this.element.style.removeProperty('top');
    this.element.style.removeProperty('height');
  }

  private startOverlayPositionSync() {
    if (
      this.overlayPositionFrame ||
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function' ||
      !this.element.classList.contains(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS)
    ) {
      return;
    }

    const schedule = () => {
      this.overlayPositionFrame = window.requestAnimationFrame(() => {
        this.overlayPositionFrame = 0;
        if (
          !this.isOpen ||
          !this.element.classList.contains(EDITOR_BROWSER_LIBRARY_DESKTOP_OVERLAY_CLASS)
        ) {
          return;
        }
        this.syncDesktopOverlayPosition();
        schedule();
      });
    };

    schedule();
  }

  private stopOverlayPositionSync() {
    if (
      !this.overlayPositionFrame ||
      typeof window === 'undefined' ||
      typeof window.cancelAnimationFrame !== 'function'
    ) {
      this.overlayPositionFrame = 0;
      return;
    }

    window.cancelAnimationFrame(this.overlayPositionFrame);
    this.overlayPositionFrame = 0;
  }

  private renderLibraryList() {
    const listItems = this.getFilteredLibraryListItems();
    if (listItems.length === 0) {
      if (this.listElement) {
        this.listElement.remove();
        this.listElement = null;
      }
      this.renderEmptyState(normalizeSearchQuery(this.searchQuery).length > 0);
      return;
    }

    if (this.emptyStateElement) {
      this.emptyStateElement.remove();
      this.emptyStateElement = null;
    }

    const listElement = this.getOrCreateListElement();
    const fragment = document.createDocumentFragment();
    const listItemsBySection: Record<BrowserLibrarySectionKind, BrowserLibraryListItem[]> = {
      favorites: [],
      recent: [],
    };
    for (const itemState of listItems) {
      listItemsBySection[itemState.sectionKind].push(itemState);
    }

    const orderedSections: Array<{
      kind: BrowserLibrarySectionKind;
      title: string;
    }> = [
      {
        kind: 'favorites',
        title: this.context.labels.favoritesTitle,
      },
      {
        kind: 'recent',
        title: this.context.labels.recentTitle,
      },
    ];

    for (const section of orderedSections) {
      const sectionItems = listItemsBySection[section.kind];
      if (!sectionItems || sectionItems.length === 0) {
        continue;
      }

      const sectionElement = createElement('section', 'editor-browser-library-section');
      const sectionTitleElement = createElement(
        'p',
        'editor-browser-library-section-title',
        section.title,
      );
      const sectionListElement = createElement('div', 'editor-browser-library-section-list');
      sectionElement.append(sectionTitleElement, sectionListElement);

      for (const itemState of sectionItems) {
        const { url, title, faviconUrl, sectionKind } = itemState;
        const canDeleteHistory = sectionKind === 'recent';
        const itemRow = createElement('div', 'editor-browser-library-item-row');
        itemRow.classList.toggle('is-deletable', canDeleteHistory);
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
        const headerElement = createElement(
          'span',
          'editor-browser-library-item-header',
        );
        const faviconElement = this.createLibraryItemFaviconElement(faviconUrl);
        const titleElement = createElement(
          'span',
          'editor-browser-library-item-title',
          title,
        );
        headerElement.append(faviconElement, titleElement);
        item.append(headerElement);
        itemRow.append(item);
        if (canDeleteHistory) {
          const deleteButton = createElement(
            'button',
            'editor-browser-library-item-delete-btn btn-base btn-md',
          ) as HTMLButtonElement;
          const deleteLabel = this.getDeleteHistoryEntryLabel();
          deleteButton.type = 'button';
          deleteButton.title = deleteLabel;
          deleteButton.setAttribute('aria-label', deleteLabel);
          deleteButton.append(createLxIcon('trash'));
          deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleLibraryItemDelete(url);
          });
          itemRow.append(deleteButton);
        }
        sectionListElement.append(itemRow);
      }

      fragment.append(sectionElement);
    }

    listElement.replaceChildren(fragment);
  }

  private createLibraryItemFaviconElement(faviconUrl: string) {
    const normalizedFaviconUrl = sanitizeBrowserLibraryFaviconUrl(faviconUrl);
    if (!normalizedFaviconUrl) {
      return createLxIcon(
        'browser-1',
        'editor-browser-library-item-favicon is-fallback',
      );
    }

    const image = createElement(
      'img',
      'editor-browser-library-item-favicon',
    ) as HTMLImageElement;
    image.alt = '';
    image.src = normalizedFaviconUrl;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      if (!image.parentElement) {
        return;
      }
      const fallback = createLxIcon(
        'browser-1',
        'editor-browser-library-item-favicon is-fallback',
      );
      image.replaceWith(fallback);
    });
    return image;
  }

  private getOrCreateListElement() {
    if (this.listElement) {
      return this.listElement;
    }

    const listElement = createElement('div', 'editor-browser-library-list');
    this.listElement = listElement;
    this.bodyElement.append(listElement);
    return listElement;
  }

  private getOrCreateEmptyStateElement() {
    if (this.emptyStateElement) {
      return this.emptyStateElement;
    }

    this.emptyStateElement = createElement('div', 'editor-browser-library-empty');
    this.bodyElement.append(this.emptyStateElement);
    return this.emptyStateElement;
  }

  private renderEmptyState(isNoMatch: boolean) {
    const emptyStateElement = this.getOrCreateEmptyStateElement();
    const query = this.searchQuery.trim();
    const iconName = isNoMatch ? 'search' : 'favorite';
    const label = isNoMatch
      ? `No matches for “${query}”`
      : this.context.labels.emptyState;

    const nextStateSignature = `${iconName}:${label}`;
    if (emptyStateElement.dataset.state === nextStateSignature) {
      return;
    }

    const emptyIconElement = createLxIcon(iconName, 'editor-browser-library-empty-icon');
    const emptyLabelElement = createElement('p', 'editor-browser-library-empty-label', label);
    emptyStateElement.replaceChildren(emptyIconElement, emptyLabelElement);
    emptyStateElement.dataset.state = nextStateSignature;
  }
}
