import { BrowserWindow, WebContentsView } from 'electron';

import type { HomepageCandidateExtraction, HomepageCandidateSeed } from './services/source-extractors/types.js';
import { shortenForLog } from './services/fetch-timing.js';
import type { PreviewBounds, PreviewState } from './types.js';
import { appError } from './utils/app-error.js';

const previewPartition = 'persist:reader-preview';
const previewCornerRadius = 10;
const PREVIEW_NETWORK_LOG_ENABLED = process.env.READER_FETCH_TIMING !== '0';

let previewWindow: BrowserWindow | null = null;
let previewView: WebContentsView | null = null;
let previewBounds: PreviewBounds = { x: 0, y: 0, width: 0, height: 0 };
let previewState: PreviewState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

function getHiddenBounds(): PreviewBounds {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function logPreviewLoadFailure({
  currentUrl,
  failedUrl,
  errorCode,
  errorDescription,
  isMainFrame,
}: {
  currentUrl: string;
  failedUrl: string;
  errorCode: number;
  errorDescription: string;
  isMainFrame: boolean;
}) {
  if (!PREVIEW_NETWORK_LOG_ENABLED) return;
  if (errorCode === -3 || /^ERR_ABORTED$/i.test(errorDescription)) return;

  let encodedDetails = '';
  try {
    encodedDetails = JSON.stringify({
      partition: previewPartition,
      currentUrl: shortenForLog(currentUrl),
      failedUrl: shortenForLog(failedUrl),
      errorCode,
      errorDescription,
      isMainFrame,
    });
  } catch {
    encodedDetails = '{"error":"unserializable_log_details"}';
  }

  console.info(`[preview-network] did_fail_load ${encodedDetails}`);
}

export type PreviewDocumentSnapshot = {
  url: string;
  html: string;
  captureMs: number;
  isLoading: boolean;
};

export type PreviewHomepageCandidateSnapshot = {
  previewUrl: string;
  extractorId: string;
  extraction: HomepageCandidateExtraction;
  nextPageUrl: string | null;
  captureMs: number;
  isLoading: boolean;
};

type PreviewDocumentSnapshotOptions = {
  timeoutMs?: number;
};

const previewDocumentSnapshotTimedOut = Symbol('previewDocumentSnapshotTimedOut');
const PREVIEW_HOMEPAGE_CANDIDATE_EXTRACTION_SCRIPT = String.raw`(() => {
  const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalizePathname = (value) => {
    const normalized = String(value ?? '').replace(/\/+$/, '');
    return normalized || '/';
  };
  const parseInteger = (value) => {
    const parsed = Number.parseInt(cleanText(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const monthNameToIndex = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  const normalizeMonthName = (value) => String(value ?? '').toLowerCase().replace(/\.+$/, '');
  const toUtcIsoDate = (year, month, day) => {
    const date = new Date(Date.UTC(year, month, day));
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  };
  const parseDateString = (value) => {
    const source = cleanText(value);
    if (!source) return null;
    const isoDateMatch = source.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (isoDateMatch) {
      const year = Number.parseInt(isoDateMatch[1], 10);
      const month = Number.parseInt(isoDateMatch[2], 10);
      const day = Number.parseInt(isoDateMatch[3], 10);
      return toUtcIsoDate(year, month - 1, day);
    }
    const dayMonthNameMatch = source.match(/\b(\d{1,2})\s+([A-Za-z.]+)\s+(\d{4})\b/);
    if (dayMonthNameMatch) {
      const day = Number.parseInt(dayMonthNameMatch[1], 10);
      const month = monthNameToIndex[normalizeMonthName(dayMonthNameMatch[2])];
      const year = Number.parseInt(dayMonthNameMatch[3], 10);
      if (month !== undefined) {
        return toUtcIsoDate(year, month, day);
      }
    }
    const monthNameDayMatch = source.match(/\b([A-Za-z.]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
    if (monthNameDayMatch) {
      const month = monthNameToIndex[normalizeMonthName(monthNameDayMatch[1])];
      const day = Number.parseInt(monthNameDayMatch[2], 10);
      const year = Number.parseInt(monthNameDayMatch[3], 10);
      if (month !== undefined) {
        return toUtcIsoDate(year, month, day);
      }
    }
    const parsed = new Date(source);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  };
  const parseDateHintFromText = (value) => {
    const normalized = cleanText(value);
    if (!normalized) return null;
    const direct = parseDateString(normalized);
    if (direct) return direct;
    const patterns = [
      /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/i,
      /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/i,
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i,
    ];
    for (const pattern of patterns) {
      const matched = normalized.match(pattern);
      if (!matched) continue;
      const parsed = parseDateString(matched[0]);
      if (parsed) return parsed;
    }
    return null;
  };
  const resolveUrl = (href) => {
    try {
      return new URL(href, location.href).toString();
    } catch {
      return '';
    }
  };
  const parseTrackLabel = (value) => {
    const matched = cleanText(value).match(/^article card\s+(\d+)$/i);
    return matched ? parseInteger(matched[1]) : null;
  };
  const parseRankValue = (value) => {
    const matched = cleanText(value).match(/Rank:\((\d+)\)/i);
    return matched ? parseInteger(matched[1]) : null;
  };
  const parsePageNumber = (value, fallback = 1) => {
    const parsed = parseInteger(value);
    return parsed && parsed > 0 ? parsed : fallback;
  };
  const buildNatureListingNextPageUrl = () => {
    const currentUrl = new URL(location.href);
    const currentPathname = normalizePathname(currentUrl.pathname);
    const currentPageNumber = parsePageNumber(currentUrl.searchParams.get('page'), 1);
    const nextPageNumber = currentPageNumber + 1;
    let fallbackMatch = null;
    for (const node of Array.from(document.querySelectorAll('nav a[href], a[href]'))) {
      const href = cleanText(node.getAttribute('href'));
      if (!href) continue;
      let resolved = null;
      try {
        resolved = new URL(href, location.href);
      } catch {
        resolved = null;
      }
      if (!resolved) continue;
      if (resolved.host !== currentUrl.host || normalizePathname(resolved.pathname) !== currentPathname) {
        continue;
      }
      const pageNumber = parsePageNumber(resolved.searchParams.get('page'), 0);
      if (pageNumber !== nextPageNumber) continue;
      resolved.hash = '';
      const normalized = resolved.toString();
      const linkText = cleanText(node.textContent).toLowerCase();
      const ariaLabel = cleanText(node.getAttribute('aria-label')).toLowerCase();
      const rel = cleanText(node.getAttribute('rel')).toLowerCase();
      if (linkText.includes('next') || ariaLabel.includes('next') || rel.includes('next')) {
        return normalized;
      }
      fallbackMatch = fallbackMatch || normalized;
    }
    return fallbackMatch;
  };
  const extractLatestNewsDateHint = (root) => {
    const footerRoot = root.querySelector('div.c-article-item__footer');
    const fallbackRoot = footerRoot || root;
    for (const node of Array.from(fallbackRoot.querySelectorAll('span.c-article-item__date, time[datetime], [datetime], span, div'))) {
      for (const value of [
        node.getAttribute('datetime'),
        node.getAttribute('content'),
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.textContent,
      ]) {
        const parsed = parseDateHintFromText(value);
        if (parsed) return parsed;
      }
    }
    for (const value of [
      fallbackRoot.getAttribute('datetime'),
      fallbackRoot.getAttribute('content'),
      fallbackRoot.getAttribute('aria-label'),
      fallbackRoot.getAttribute('title'),
      fallbackRoot.textContent,
    ]) {
      const parsed = parseDateHintFromText(value);
      if (parsed) return parsed;
    }
    return null;
  };
  const extractLatestNewsCardOrder = (root) => {
    const link = root.querySelector('a[href*="/articles/"][data-track-label^="article card "]');
    const candidates = [
      link?.getAttribute('data-track-label'),
      link?.closest('[data-track-label]')?.getAttribute('data-track-label'),
      root.getAttribute('data-track-label'),
    ];
    for (const value of candidates) {
      const parsed = parseTrackLabel(value);
      if (parsed !== null) return parsed;
    }
    return null;
  };
  const collectLatestNewsExtraction = () => {
    const roots = Array.from(document.querySelectorAll('div.c-article-item__wrapper'));
    if (roots.length === 0) return null;
    let describedCardCount = 0;
    let footerCardCount = 0;
    let typedCardCount = 0;
    const articleTypeCounts = {};
    const sampleCards = [];
    const seen = new Set();
    const candidates = roots.map((root, index) => {
      const link = root.querySelector('a[href*="/articles/"][data-track-label^="article card "]');
      const href = cleanText(link?.getAttribute('href'));
      const title = cleanText(root.querySelector('h3.c-article-item__title')?.textContent);
      if (!href || !title) return null;
      const normalized = resolveUrl(href);
      if (!normalized || seen.has(normalized)) return null;
      seen.add(normalized);
      const description = cleanText(root.querySelector('div.c-article-item__standfirst')?.textContent);
      const footerText = cleanText(root.querySelector('div.c-article-item__footer')?.textContent);
      const articleType = cleanText(root.querySelector('span.c-article-item__article-type')?.textContent);
      if (description) describedCardCount += 1;
      if (footerText) footerCardCount += 1;
      if (articleType) {
        typedCardCount += 1;
        articleTypeCounts[articleType] = (articleTypeCounts[articleType] || 0) + 1;
      }
      const order = extractLatestNewsCardOrder(root) ?? index;
      const dateHint = extractLatestNewsDateHint(root);
      if (sampleCards.length < 5) {
        sampleCards.push({
          href: normalized,
          title,
          order,
          articleType: articleType || null,
          footerText: footerText || null,
          dateHint,
        });
      }
      return {
        href,
        order,
        dateHint,
        articleType: articleType || null,
        scoreBoost: 140,
      };
    }).filter(Boolean);
    if (candidates.length === 0) return null;
    return {
      previewUrl: location.href,
      extractorId: 'nature-latest-news',
      extraction: {
        candidates,
        diagnostics: {
          layoutSelector: 'div.c-article-item__wrapper',
          linkSelector: 'a[href*="/articles/"][data-track-label^="article card "]',
          titleSelector: 'h3.c-article-item__title',
          descriptionSelector: 'div.c-article-item__standfirst',
          footerSelector: 'div.c-article-item__footer',
          articleTypeSelector: 'span.c-article-item__article-type',
          cardCount: roots.length,
          candidateCount: candidates.length,
          describedCardCount,
          footerCardCount,
          typedCardCount,
          datedCandidateCount: candidates.filter((candidate) => Boolean(candidate.dateHint)).length,
          articleTypeCounts,
          sampleCards,
        },
      },
      nextPageUrl: buildNatureListingNextPageUrl(),
    };
  };
  const collectOpinionExtraction = () => {
    const targeted = collectLatestNewsExtraction();
    if (targeted) {
      return {
        ...targeted,
        extractorId: 'nature-opinion',
      };
    }

    return collectNatureListingExtraction('nature-opinion');
  };
  const natureListingLayoutSelectors = [
    'section.section__top-new > div.u-container',
    'div.u-container.c-component',
    'section[class*="section__top"] div.u-container',
    'section div.u-container',
  ];
  const natureListingLinkSelector = 'a[href*="/articles/"]';
  const natureListingTrackedLinkSelector = 'a[data-track-label]';
  const natureListingDateSelector = 'time[datetime], [datetime], [itemprop="datePublished"], span, div';
  const extractNatureListingTitle = (root) => cleanText(root.querySelector('h3')?.textContent);
  const countNatureListingLinksWithin = (root) => root.querySelectorAll(natureListingLinkSelector).length;
  const extractNatureListingDateHint = (root) => {
    for (const node of Array.from(root.querySelectorAll(natureListingDateSelector))) {
      for (const value of [
        node.getAttribute('datetime'),
        node.getAttribute('content'),
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.textContent,
      ]) {
        const parsed = parseDateHintFromText(value);
        if (parsed) return parsed;
      }
    }
    return parseDateHintFromText(root.textContent);
  };
  const extractNatureListingHref = (root) => cleanText(root.querySelector(natureListingLinkSelector)?.getAttribute('href'));
  const extractNatureListingRank = (root, linkNode) => {
    const candidateNodes = [
      linkNode,
      root.querySelector('[data-track-action]'),
      root,
    ].filter(Boolean);
    for (const node of candidateNodes) {
      const parsed = parseRankValue(node.getAttribute('data-track-action'));
      if (parsed !== null) return parsed;
    }
    for (const node of Array.from(root.querySelectorAll('[data-track-action]'))) {
      const parsed = parseRankValue(node.getAttribute('data-track-action'));
      if (parsed !== null) return parsed;
    }
    return null;
  };
  const extractNatureListingCardOrder = (root, linkNode) => {
    const candidateNodes = [
      linkNode,
      root.querySelector('[data-track-label]'),
      root,
    ].filter(Boolean);
    for (const node of candidateNodes) {
      const parsed = parseTrackLabel(node.getAttribute('data-track-label'));
      if (parsed !== null) return parsed;
    }
    for (const node of Array.from(root.querySelectorAll('[data-track-label]'))) {
      const parsed = parseTrackLabel(node.getAttribute('data-track-label'));
      if (parsed !== null) return parsed;
    }
    return null;
  };
  const computeNatureListingCandidateOrder = ({ discoveryOrder, rank, cardOrder }) => {
    if (cardOrder !== null && cardOrder >= 0) return cardOrder;
    if (rank !== null && rank > 0) return rank - 1;
    return discoveryOrder;
  };
  const resolveNatureListingCandidateRoot = (layoutRoot, linkNode) => {
    let current = linkNode.parentElement;
    let bestRoot = null;
    while (current) {
      const title = extractNatureListingTitle(current);
      const linkCount = countNatureListingLinksWithin(current);
      if (linkCount === 1 && title) {
        bestRoot = current;
      }
      if (current === layoutRoot) {
        break;
      }
      current = current.parentElement;
    }
    return bestRoot;
  };
  const resolveNatureListingFallbackRoot = (linkNode) =>
    linkNode.closest('li, article, div.c-article-item__wrapper, div.c-article-item__container') ||
    linkNode.parentElement ||
    linkNode;
  const collectNatureListingRoots = () => {
    const candidateSelectors = natureListingLayoutSelectors.map((selector) => {
      const matchedRoots = Array.from(document.querySelectorAll(selector));
      return {
        selector,
        matchedRoots,
        articleLinkCount: matchedRoots.reduce((count, root) => count + root.querySelectorAll(natureListingLinkSelector).length, 0),
      };
    });
    const selected = candidateSelectors
      .filter((item) => item.articleLinkCount > 0)
      .sort((a, b) => b.articleLinkCount - a.articleLinkCount)[0];
    const sectionNodes = Array.from(document.querySelectorAll('section'));
    if (!selected || selected.matchedRoots.length === 0) {
      const trackedLinkNodes = Array.from(document.querySelectorAll(natureListingTrackedLinkSelector))
        .filter((linkNode) => parseTrackLabel(linkNode.getAttribute('data-track-label')) !== null);
      const candidateLinkNodes = trackedLinkNodes.length > 0 ? trackedLinkNodes : Array.from(document.querySelectorAll(natureListingLinkSelector));
      const roots = candidateLinkNodes.map((linkNode, discoveryOrder) => {
        const root = resolveNatureListingFallbackRoot(linkNode);
        const sectionNode = root.closest('section');
        return {
          root,
          linkNode,
          discoveryOrder,
          sectionIndex: sectionNode ? sectionNodes.indexOf(sectionNode) : -1,
        };
      });
      if (roots.length === 0) return null;
      return {
        layoutSelector: 'document-link-order',
        layoutRootNodes: [],
        candidateSelectors: candidateSelectors.map((item) => ({
          selector: item.selector,
          matchedRootCount: item.matchedRoots.length,
          articleLinkCount: item.articleLinkCount,
        })),
        roots,
      };
    }
    const roots = selected.matchedRoots.flatMap((layoutRootNode, layoutRootOrder) => {
      const trackedLinks = Array.from(layoutRootNode.querySelectorAll(natureListingTrackedLinkSelector))
        .filter((linkNode) => parseTrackLabel(linkNode.getAttribute('data-track-label')) !== null);
      const candidateLinkNodes = trackedLinks.length > 0 ? trackedLinks : Array.from(layoutRootNode.querySelectorAll(natureListingLinkSelector));
      return candidateLinkNodes.map((linkNode, linkOrderInLayout) => {
        const root = resolveNatureListingCandidateRoot(layoutRootNode, linkNode);
        if (!root) return null;
        const sectionNode = root.closest('section');
        return {
          root,
          linkNode,
          discoveryOrder: layoutRootOrder * 1000 + linkOrderInLayout,
          sectionIndex: sectionNode ? sectionNodes.indexOf(sectionNode) : -1,
        };
      }).filter(Boolean);
    });
    return {
      layoutSelector: selected.selector,
      layoutRootNodes: selected.matchedRoots,
      candidateSelectors: candidateSelectors.map((item) => ({
        selector: item.selector,
        matchedRootCount: item.matchedRoots.length,
        articleLinkCount: item.articleLinkCount,
      })),
      roots,
    };
  };
  const buildNatureListingDiagnostics = ({ layoutSelector, layoutRootNodes, candidateSelectors, roots }) => {
    const rootTagCounts = {};
    const trackActionCounts = {};
    const trackLabelCounts = {};
    const rankValues = [];
    const cardOrderValues = [];
    const sectionIndexSet = new Set();
    for (const item of roots) {
      const tagName = cleanText(item.root.tagName).toLowerCase() || 'unknown';
      rootTagCounts[tagName] = (rootTagCounts[tagName] || 0) + 1;
      const trackAction =
        cleanText(item.linkNode.getAttribute('data-track-action')) ||
        cleanText(item.root.querySelector('[data-track-action]')?.getAttribute('data-track-action')) ||
        cleanText(item.root.getAttribute('data-track-action')) ||
        'none';
      trackActionCounts[trackAction] = (trackActionCounts[trackAction] || 0) + 1;
      const trackLabel =
        cleanText(item.linkNode.getAttribute('data-track-label')) ||
        cleanText(item.root.querySelector('[data-track-label]')?.getAttribute('data-track-label')) ||
        cleanText(item.root.getAttribute('data-track-label')) ||
        'none';
      trackLabelCounts[trackLabel] = (trackLabelCounts[trackLabel] || 0) + 1;
      const rank = extractNatureListingRank(item.root, item.linkNode);
      if (rank !== null) rankValues.push(rank);
      const cardOrder = extractNatureListingCardOrder(item.root, item.linkNode);
      if (cardOrder !== null) cardOrderValues.push(cardOrder);
      if (item.sectionIndex >= 0) {
        sectionIndexSet.add(item.sectionIndex);
      }
    }
    return {
      selectedLayoutSelector: layoutSelector,
      selectedLayoutRootCount: layoutRootNodes.length,
      selectorCandidates: candidateSelectors,
      articleLinkCount: layoutRootNodes.reduce((count, node) => count + node.querySelectorAll(natureListingLinkSelector).length, 0),
      resolvedRootCount: roots.length,
      rootTagCounts,
      trackActionCounts,
      trackLabelCounts,
      sectionCount: sectionIndexSet.size,
      rankedRootCount: rankValues.length,
      rankMin: rankValues.length > 0 ? Math.min(...rankValues) : null,
      rankMax: rankValues.length > 0 ? Math.max(...rankValues) : null,
      cardOrderCount: cardOrderValues.length,
      cardOrderMin: cardOrderValues.length > 0 ? Math.min(...cardOrderValues) : null,
      cardOrderMax: cardOrderValues.length > 0 ? Math.max(...cardOrderValues) : null,
    };
  };
  const collectNatureListingExtraction = (extractorId) => {
    const resolvedRoots = collectNatureListingRoots();
    if (!resolvedRoots || resolvedRoots.roots.length === 0) return null;
    const seen = new Set();
    const candidates = resolvedRoots.roots.map((item) => {
      const href = extractNatureListingHref(item.root);
      const title = extractNatureListingTitle(item.root);
      if (!href || !title) return null;
      const normalized = resolveUrl(href);
      if (!normalized || seen.has(normalized)) return null;
      seen.add(normalized);
      const rank = extractNatureListingRank(item.root, item.linkNode);
      const cardOrder = extractNatureListingCardOrder(item.root, item.linkNode);
      return {
        href,
        order: computeNatureListingCandidateOrder({
          discoveryOrder: item.discoveryOrder,
          rank,
          cardOrder,
        }),
        dateHint: extractNatureListingDateHint(item.root),
        scoreBoost: 100,
      };
    }).filter(Boolean);
    if (candidates.length === 0) return null;
    return {
      previewUrl: location.href,
      extractorId,
      extraction: {
        candidates,
        diagnostics: buildNatureListingDiagnostics(resolvedRoots),
      },
      nextPageUrl: buildNatureListingNextPageUrl(),
    };
  };
  const collectNatureResearchArticlesExtraction = () => {
    const roots = Array.from(document.querySelectorAll('main li article'));
    if (roots.length === 0) return null;
    const seen = new Set();
    const candidates = roots.map((root, index) => {
      const link = root.querySelector('h3 a[href*="/articles/"], a[href*="/articles/"]');
      const href = cleanText(link?.getAttribute('href'));
      const title = cleanText(link?.textContent);
      if (!href || !title) return null;
      const normalized = resolveUrl(href);
      if (!normalized || seen.has(normalized)) return null;
      seen.add(normalized);
      const timeElement = root.querySelector('time');
      const dateHint = [
        timeElement?.getAttribute('datetime'),
        timeElement?.getAttribute('content'),
        timeElement?.getAttribute('title'),
        timeElement?.textContent,
      ].map((value) => parseDateString(value)).find(Boolean) || null;
      return {
        href,
        order: index,
        dateHint,
        scoreBoost: 120,
      };
    }).filter(Boolean);
    if (candidates.length === 0) return null;
    return {
      previewUrl: location.href,
      extractorId: 'nature-research-articles',
      extraction: {
        candidates,
        diagnostics: {
          cardCount: roots.length,
          candidateCount: candidates.length,
          datedCandidateCount: candidates.filter((candidate) => Boolean(candidate.dateHint)).length,
        },
      },
      nextPageUrl: buildNatureListingNextPageUrl(),
    };
  };
  if (location.host !== 'www.nature.com') return null;
  const normalizedPathname = normalizePathname(location.pathname);
  if (normalizedPathname === '/latest-news') {
    return collectLatestNewsExtraction();
  }
  if (normalizedPathname === '/opinion') {
    return collectOpinionExtraction();
  }
  if (/^\/[^/]+\/research-articles\/?$/i.test(location.pathname)) {
    return collectNatureResearchArticlesExtraction();
  }
  return null;
})()`;

function emitPreviewState() {
  if (!previewWindow || previewWindow.isDestroyed()) return;
  previewWindow.webContents.send('app:preview-state', previewState);
}

function updatePreviewState(partial?: Partial<PreviewState>) {
  if (partial) {
    previewState = {
      ...previewState,
      ...partial,
    };
  } else if (previewView && !previewView.webContents.isDestroyed()) {
    const contents = previewView.webContents;
    previewState = {
      ...previewState,
      url: contents.getURL(),
      canGoBack: contents.navigationHistory.canGoBack(),
      canGoForward: contents.navigationHistory.canGoForward(),
      isLoading: contents.isLoading(),
    };
  }

  emitPreviewState();
}

function applyPreviewBounds() {
  if (!previewView) return;

  const visible =
    previewState.visible &&
    previewBounds.width > 0 &&
    previewBounds.height > 0;

  previewView.setVisible(visible);
  previewView.setBounds(visible ? previewBounds : getHiddenBounds());
}

function bindPreviewEvents(view: WebContentsView) {
  const { webContents } = view;

  const syncState = () => {
    updatePreviewState();
  };
  const handleDidFailLoad = (
    _event: unknown,
    errorCode: number,
    errorDescription: string,
    validatedURL: string,
    isMainFrame = false,
  ) => {
    logPreviewLoadFailure({
      currentUrl: webContents.getURL(),
      failedUrl: validatedURL,
      errorCode,
      errorDescription,
      isMainFrame,
    });
  };

  webContents.on('did-start-loading', syncState);
  webContents.on('did-stop-loading', syncState);
  webContents.on('did-finish-load', syncState);
  webContents.on('did-navigate', syncState);
  webContents.on('did-navigate-in-page', syncState);
  webContents.on('page-title-updated', syncState);
  webContents.on('did-fail-load', handleDidFailLoad);
  webContents.on('destroyed', () => {
    if (previewView === view) {
      previewView = null;
      previewState = {
        url: '',
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        visible: false,
      };
      emitPreviewState();
    }
  });
}

export function ensurePreviewView(window: BrowserWindow) {
  if (previewWindow === window && previewView && !previewView.webContents.isDestroyed()) {
    return previewView;
  }

  previewWindow = window;
  previewView = new WebContentsView({
    webPreferences: {
      partition: previewPartition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  previewView.setBorderRadius(previewCornerRadius);

  window.contentView.addChildView(previewView);
  bindPreviewEvents(previewView);
  applyPreviewBounds();
  emitPreviewState();

  return previewView;
}

export function disposePreviewView(window?: BrowserWindow | null) {
  if (!previewView) return;
  if (window && previewWindow && previewWindow !== window) return;

  const view = previewView;
  previewView = null;

  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.contentView.removeChildView(view);
  }

  view.webContents.close({ waitForBeforeUnload: false });
  previewBounds = getHiddenBounds();
  previewState = {
    url: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    visible: false,
  };
  emitPreviewState();
  previewWindow = null;
}

export function setPreviewBounds(bounds: PreviewBounds | null) {
  previewBounds = bounds ?? getHiddenBounds();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    previewState.visible = false;
  }
  applyPreviewBounds();
  emitPreviewState();
}

export function setPreviewVisible(visible: boolean) {
  previewState.visible = visible;
  applyPreviewBounds();
  emitPreviewState();
}

export function getPreviewState(): PreviewState {
  if (previewView && !previewView.webContents.isDestroyed()) {
    updatePreviewState();
  }

  return previewState;
}

function normalizePreviewTimeoutMs(value: unknown) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(Number(value) || 0)) : 0;
}

async function executePreviewScript<T>(
  script: string,
  options: PreviewDocumentSnapshotOptions = {},
): Promise<T | typeof previewDocumentSnapshotTimedOut> {
  if (!previewView || previewView.webContents.isDestroyed()) {
    return previewDocumentSnapshotTimedOut;
  }

  const timeoutMs = normalizePreviewTimeoutMs(options.timeoutMs);
  const execution = previewView.webContents.executeJavaScript(script, true);
  if (timeoutMs <= 0) {
    return execution as Promise<T>;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      execution,
      new Promise<typeof previewDocumentSnapshotTimedOut>((resolve) => {
        timeoutId = setTimeout(() => resolve(previewDocumentSnapshotTimedOut), timeoutMs);
      }),
    ]);
    return result as T | typeof previewDocumentSnapshotTimedOut;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePreviewHomepageCandidateSeeds(value: unknown): HomepageCandidateSeed[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((candidate) => {
      if (!isRecord(candidate)) return null;

      const href = String(candidate.href ?? '').trim();
      const order = Number(candidate.order);
      if (!href || !Number.isFinite(order)) return null;

      const normalized: HomepageCandidateSeed = {
        href,
        order: Math.trunc(order),
      };

      const dateHint = String(candidate.dateHint ?? '').trim();
      if (dateHint) {
        normalized.dateHint = dateHint;
      }

      const articleType = String(candidate.articleType ?? '').trim();
      if (articleType) {
        normalized.articleType = articleType;
      }

      const scoreBoost = Number(candidate.scoreBoost);
      if (Number.isFinite(scoreBoost)) {
        normalized.scoreBoost = scoreBoost;
      }

      return normalized;
    })
    .filter((candidate): candidate is HomepageCandidateSeed => Boolean(candidate));
}

export async function getPreviewDocumentSnapshot(
  options: PreviewDocumentSnapshotOptions = {},
): Promise<PreviewDocumentSnapshot | null> {
  if (!previewView || previewView.webContents.isDestroyed()) {
    return null;
  }

  const startedAt = Date.now();
  const state = getPreviewState();

  try {
    const html = await executePreviewScript<string>(
      `(() => {
        try {
          return document.documentElement ? document.documentElement.outerHTML : '';
        } catch {
          return '';
        }
      })()`,
      options,
    );

    if (html === previewDocumentSnapshotTimedOut) {
      return null;
    }

    if (typeof html !== 'string' || !html.trim()) {
      return null;
    }

    return {
      url: state.url,
      html,
      captureMs: Date.now() - startedAt,
      isLoading: state.isLoading,
    };
  } catch {
    return null;
  }
}

export async function getPreviewDocumentHtml() {
  const snapshot = await getPreviewDocumentSnapshot();
  return snapshot?.html ?? null;
}

export async function getPreviewHomepageCandidateSnapshot(
  options: PreviewDocumentSnapshotOptions = {},
): Promise<PreviewHomepageCandidateSnapshot | null> {
  if (!previewView || previewView.webContents.isDestroyed()) {
    return null;
  }

  const startedAt = Date.now();
  const state = getPreviewState();

  try {
    const result = await executePreviewScript<{
      previewUrl?: unknown;
      extractorId?: unknown;
      extraction?: {
        candidates?: unknown;
        diagnostics?: unknown;
      };
      nextPageUrl?: unknown;
    }>(PREVIEW_HOMEPAGE_CANDIDATE_EXTRACTION_SCRIPT, options);

    if (result === previewDocumentSnapshotTimedOut || !isRecord(result)) {
      return null;
    }

    const previewUrl = String(result.previewUrl ?? '').trim();
    const extractorId = String(result.extractorId ?? '').trim();
    const candidates = normalizePreviewHomepageCandidateSeeds(result.extraction?.candidates);
    if (!previewUrl || !extractorId || candidates.length === 0) {
      return null;
    }

    return {
      previewUrl,
      extractorId,
      extraction: {
        candidates,
        diagnostics: isRecord(result.extraction?.diagnostics) ? result.extraction.diagnostics : undefined,
      },
      nextPageUrl: String(result.nextPageUrl ?? '').trim() || null,
      captureMs: Date.now() - startedAt,
      isLoading: state.isLoading,
    };
  } catch {
    return null;
  }
}

export async function navigatePreview(url: string) {
  if (!previewView || previewView.webContents.isDestroyed()) {
    throw appError('PREVIEW_NOT_READY');
  }

  previewState.visible = true;
  applyPreviewBounds();
  await previewView.webContents.loadURL(url);
  updatePreviewState();
}

export function reloadPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  previewView.webContents.reload();
}

export function goBackPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  if (previewView.webContents.navigationHistory.canGoBack()) {
    previewView.webContents.navigationHistory.goBack();
  }
}

export function goForwardPreview() {
  if (!previewView || previewView.webContents.isDestroyed()) return;
  if (previewView.webContents.navigationHistory.canGoForward()) {
    previewView.webContents.navigationHistory.goForward();
  }
}
