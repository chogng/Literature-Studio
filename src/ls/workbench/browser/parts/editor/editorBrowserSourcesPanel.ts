const EDITOR_BROWSER_SOURCES_STORAGE_KEY = 'ls.editor.browser.sources.v1';
const MAX_RECENT_BROWSER_SOURCES = 25;
const MAX_FAVORITE_BROWSER_SOURCES = 25;

type StoredBrowserSourcesState = {
  recentUrls: string[];
  favoriteUrls: string[];
};

type BrowserSourcesSectionKind = 'recent' | 'favorites';

export type EditorBrowserSourcesPanelLabels = {
  toolbarSources: string;
  toolbarSourcesRecent: string;
  toolbarSourcesFavorites: string;
  toolbarSourcesEmpty: string;
};

export type EditorBrowserSourcesPanelContext = {
  browserUrl: string;
  labels: EditorBrowserSourcesPanelLabels;
  onNavigateToUrl: (url: string) => void;
};

type EditorBrowserSourcesPanelOptions = {
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

  return updateStoredBrowserSourcesState((state) => {
    const alreadyFavorite = state.favoriteUrls.includes(normalizedUrl);
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

export class EditorBrowserSourcesPanel {
  private context: EditorBrowserSourcesPanelContext;
  private isInteractionWithin?: (target: Node) => boolean;
  private onDidChangeOpenState?: (isOpen: boolean) => void;
  private readonly element = createElement('div', 'editor-browser-sources-panel');
  private readonly panelId = `editor-browser-sources-panel-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  private isOpen = false;
  private isGlobalListenersBound = false;
  private hostElement: HTMLElement | null = null;

  constructor(
    context: EditorBrowserSourcesPanelContext,
    options: EditorBrowserSourcesPanelOptions = {},
  ) {
    this.context = context;
    this.isInteractionWithin = options.isInteractionWithin;
    this.onDidChangeOpenState = options.onDidChangeOpenState;
    this.element.id = this.panelId;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-label', this.context.labels.toolbarSources);
    this.trackCurrentBrowserSource();
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

  setContext(context: EditorBrowserSourcesPanelContext) {
    this.context = context;
    this.trackCurrentBrowserSource();
    this.render();
  }

  setOpen(isOpen: boolean) {
    if (this.isOpen === isOpen) {
      return;
    }

    this.isOpen = isOpen;
    if (isOpen) {
      this.bindGlobalListeners();
    } else {
      this.unbindGlobalListeners();
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
    return Boolean(toTrackableBrowserSourceUrl(this.context.browserUrl));
  }

  isCurrentBrowserUrlFavorited() {
    const sourceUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    return sourceUrl ? isFavoriteBrowserSource(sourceUrl) : false;
  }

  toggleCurrentBrowserUrlFavorite() {
    const sourceUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    if (!sourceUrl) {
      return false;
    }

    const changed = toggleFavoriteBrowserSource(sourceUrl);
    if (changed) {
      this.render();
    }
    return changed;
  }

  clearRecentSources() {
    const changed = clearRecentBrowserSources();
    if (changed) {
      this.render();
    }
    return changed;
  }

  dispose() {
    this.unbindGlobalListeners();
    this.hostElement = null;
    this.element.remove();
    this.element.replaceChildren();
  }

  private trackCurrentBrowserSource() {
    const sourceUrl = toTrackableBrowserSourceUrl(this.context.browserUrl);
    if (!sourceUrl) {
      return;
    }

    recordRecentBrowserSource(sourceUrl);
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

  private readonly handleSourceItemClick = (url: string) => {
    this.context.onNavigateToUrl(url);
    this.setOpen(false);
  };

  private render() {
    const recentUrls = getRecentBrowserSources();
    const favoriteUrls = getFavoriteBrowserSources();
    this.element.classList.toggle('is-open', this.isOpen);
    this.element.setAttribute('aria-hidden', String(!this.isOpen));
    this.element.setAttribute('aria-label', this.context.labels.toolbarSources);
    this.element.replaceChildren(
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
    const section = createElement('section', 'editor-browser-sources-section');
    const heading = createElement(
      'h3',
      'editor-browser-sources-section-title',
      title,
    );
    const list = createElement('div', 'editor-browser-sources-list');

    if (urls.length === 0) {
      const emptyState = createElement(
        'p',
        'editor-browser-sources-empty',
        this.context.labels.toolbarSourcesEmpty,
      );
      emptyState.setAttribute('data-section-kind', sectionKind);
      list.append(emptyState);
      section.append(heading, list);
      return section;
    }

    for (const url of urls) {
      const item = createElement('button', 'editor-browser-sources-item');
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
        'editor-browser-sources-item-title',
        resolveBrowserSourceTitle(url),
      );
      const metaElement = createElement(
        'span',
        'editor-browser-sources-item-meta',
        url,
      );
      item.append(titleElement, metaElement);
      list.append(item);
    }

    section.append(heading, list);
    return section;
  }
}
