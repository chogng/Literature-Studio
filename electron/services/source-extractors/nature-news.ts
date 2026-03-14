import { cleanText, parseDateString } from '../../utils/text.js';

import type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
} from './types.js';

const NATURE_NEWS_LAYOUT_SELECTORS = [
  'section.section__top-new > div.u-container',
  'div.u-container.c-component',
  'section[class*="section__top"] div.u-container',
  'section div.u-container',
] as const;
const NATURE_NEWS_LINK_SELECTOR = 'a[href*="/articles/"]';
const NATURE_NEWS_DATE_SELECTOR =
  'time[datetime], [datetime], [itemprop="datePublished"], span, div';
const NATURE_NEWS_RANK_RE = /Rank:\((\d+)\)/i;
const NATURE_NEWS_TEXT_DATE_RE =
  /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/i;

function parseNatureNewsDateValue(value: unknown) {
  const normalized = cleanText(value);
  if (!normalized) return null;

  const direct = parseDateString(normalized);
  if (direct) return direct;

  const matched = normalized.match(NATURE_NEWS_TEXT_DATE_RE);
  if (!matched) return null;
  return parseDateString(matched[0]);
}

function countArticleLinksWithin({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  return $(root).find(NATURE_NEWS_LINK_SELECTOR).length;
}

function extractNatureNewsDateHint({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const candidateNodes = $(root).find(NATURE_NEWS_DATE_SELECTOR).toArray();
  for (const node of candidateNodes) {
    const dateNode = $(node);
    const candidateValues = [
      dateNode.attr('datetime'),
      dateNode.attr('content'),
      dateNode.attr('aria-label'),
      dateNode.attr('title'),
      dateNode.text(),
    ];
    for (const value of candidateValues) {
      const parsed = parseNatureNewsDateValue(value);
      if (parsed) return parsed;
    }
  }

  return parseNatureNewsDateValue($(root).text());
}

function extractNatureNewsHref({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const link = $(root).find(NATURE_NEWS_LINK_SELECTOR).first();
  return cleanText(link.attr('href'));
}

function extractNatureNewsTitle({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  return cleanText($(root).find('h3').first().text());
}

function parseNatureNewsRankValue(value: unknown) {
  const normalized = cleanText(value);
  if (!normalized) return null;

  const matched = normalized.match(NATURE_NEWS_RANK_RE);
  if (!matched) return null;

  const rank = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(rank) ? rank : null;
}

function extractNatureNewsTrackAction({
  $,
  root,
  linkNode,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
  linkNode: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const candidates = [
    $(linkNode).attr('data-track-action'),
    $(linkNode).closest('[data-track-action]').first().attr('data-track-action'),
    $(root).attr('data-track-action'),
    $(root).find('[data-track-action]').first().attr('data-track-action'),
  ];

  for (const value of candidates) {
    const normalized = cleanText(value);
    if (normalized) return normalized;
  }

  return null;
}

function extractNatureNewsRank({
  $,
  root,
  linkNode,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
  linkNode: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const candidateNodes = [
    $(linkNode),
    $(root).find('[data-track-action]').first(),
    $(root),
  ];

  for (const candidateNode of candidateNodes) {
    const parsed = parseNatureNewsRankValue(candidateNode.attr('data-track-action'));
    if (parsed !== null) return parsed;
  }

  const descendants = $(root).find('[data-track-action]').toArray();
  for (const node of descendants) {
    const parsed = parseNatureNewsRankValue($(node).attr('data-track-action'));
    if (parsed !== null) return parsed;
  }

  return null;
}

function computeNatureNewsCandidateOrder({
  discoveryOrder,
}: {
  discoveryOrder: number;
}) {
  return discoveryOrder;
}

function resolveNatureNewsCandidateRoot({
  $,
  layoutRoot,
  linkNode,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  layoutRoot: Parameters<HomepageCandidateExtractorContext['$']>[0];
  linkNode: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const layoutRootNode = $(layoutRoot).get(0);
  if (!layoutRootNode) return null;

  let current = $(linkNode).parent();
  let bestRoot: Parameters<HomepageCandidateExtractorContext['$']>[0] | null = null;

  while (current.length > 0) {
    const currentNode = current.get(0);
    if (!currentNode) break;

    const title = extractNatureNewsTitle({ $, root: currentNode });
    const linkCount = countArticleLinksWithin({ $, root: currentNode });
    if (linkCount === 1 && title) {
      bestRoot = currentNode;
    }

    if (currentNode === layoutRootNode) {
      break;
    }

    current = current.parent();
  }

  return bestRoot;
}

function collectNatureNewsCandidateRoots({
  $,
}: Pick<HomepageCandidateExtractorContext, '$'>) {
  const candidatesBySelector = NATURE_NEWS_LAYOUT_SELECTORS.map((selector) => {
    const matchedRoots = $(selector).toArray();
    return {
      selector,
      matchedRoots,
      articleLinkCount: matchedRoots.reduce((count, rootNode) => {
        return count + $(rootNode).find(NATURE_NEWS_LINK_SELECTOR).length;
      }, 0),
    };
  });

  const selected = candidatesBySelector
    .filter((item) => item.articleLinkCount > 0)
    .sort((a, b) => b.articleLinkCount - a.articleLinkCount)[0];

  if (!selected || selected.matchedRoots.length === 0) {
    return null;
  }

  const sectionNodes = $('section').toArray();

  const roots = selected.matchedRoots
    .flatMap((layoutRootNode, layoutRootOrder) =>
      $(layoutRootNode)
        .find(NATURE_NEWS_LINK_SELECTOR)
        .toArray()
        .map((linkNode, linkOrderInLayout) => {
          const root = resolveNatureNewsCandidateRoot({ $, layoutRoot: layoutRootNode, linkNode });
          if (!root) return null;
          const sectionNode = $(root).closest('section').first().get(0) ?? null;
          const sectionIndex = sectionNode ? sectionNodes.findIndex((candidate) => candidate === sectionNode) : -1;
          return {
            root,
            linkNode,
            layoutSelector: selected.selector,
            sectionIndex,
            discoveryOrder: layoutRootOrder * 1000 + linkOrderInLayout,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    );

  return {
    layoutSelector: selected.selector,
    layoutRootNodes: selected.matchedRoots,
    roots,
    candidateSelectors: candidatesBySelector.map((item) => ({
      selector: item.selector,
      matchedRootCount: item.matchedRoots.length,
      articleLinkCount: item.articleLinkCount,
    })),
  };
}

function buildNatureNewsDiagnostics({
  $,
  layoutSelector,
  layoutRootNodes,
  selectorCandidates,
  roots,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  layoutSelector: string;
  layoutRootNodes: Array<Parameters<HomepageCandidateExtractorContext['$']>[0]>;
  selectorCandidates: Array<{ selector: string; matchedRootCount: number; articleLinkCount: number }>;
  roots: Array<{
    root: Parameters<HomepageCandidateExtractorContext['$']>[0];
    linkNode: Parameters<HomepageCandidateExtractorContext['$']>[0];
    layoutSelector: string;
    sectionIndex: number;
    discoveryOrder: number;
  }>;
}) {
  const tagCounts = roots.reduce<Record<string, number>>((accumulator, item) => {
    const tagName = cleanText($(item.root).prop('tagName')).toLowerCase() || 'unknown';
    accumulator[tagName] = (accumulator[tagName] ?? 0) + 1;
    return accumulator;
  }, {});
  const ranks = roots
    .map((item) => extractNatureNewsRank({ $, root: item.root, linkNode: item.linkNode }))
    .filter((rank): rank is number => rank !== null);
  const trackActionCounts = roots.reduce<Record<string, number>>((accumulator, item) => {
    const trackAction = extractNatureNewsTrackAction({ $, root: item.root, linkNode: item.linkNode }) ?? 'none';
    accumulator[trackAction] = (accumulator[trackAction] ?? 0) + 1;
    return accumulator;
  }, {});
  const sectionIndexSet = new Set(roots.map((item) => item.sectionIndex).filter((index) => index >= 0));

  return {
    selectedLayoutSelector: layoutSelector,
    selectedLayoutRootCount: layoutRootNodes.length,
    selectorCandidates,
    articleLinkCount: layoutRootNodes.reduce((count, node) => {
      return count + $(node).find(NATURE_NEWS_LINK_SELECTOR).length;
    }, 0),
    resolvedRootCount: roots.length,
    rootTagCounts: tagCounts,
    trackActionCounts,
    sectionCount: sectionIndexSet.size,
    rankedRootCount: ranks.length,
    rankMin: ranks.length > 0 ? Math.min(...ranks) : null,
    rankMax: ranks.length > 0 ? Math.max(...ranks) : null,
  };
}

export const natureNewsCandidateExtractor: HomepageCandidateExtractor = {
  id: 'nature-news',
  matches(homepage) {
    return homepage.host === 'www.nature.com' && homepage.pathname.replace(/\/+$/, '') === '/news';
  },
  extract(context): HomepageCandidateExtraction | null {
    const { $, homepageUrl } = context;
    const resolvedRoots = collectNatureNewsCandidateRoots({ $ });
    if (!resolvedRoots || resolvedRoots.roots.length === 0) {
      return null;
    }

    const seen = new Set<string>();
    const candidates = resolvedRoots.roots
      .map(({ root, discoveryOrder }) => {
        const href = extractNatureNewsHref({ $, root });
        const title = extractNatureNewsTitle({ $, root });
        if (!href || !title) return null;

        let normalized = '';
        try {
          normalized = new URL(href, homepageUrl).toString();
        } catch {
          return null;
        }

        if (seen.has(normalized)) return null;
        seen.add(normalized);

        return {
          href,
          order: computeNatureNewsCandidateOrder({
            discoveryOrder,
          }),
          dateHint: extractNatureNewsDateHint({ $, root }),
          scoreBoost: 100,
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

    return {
      candidates,
      diagnostics: buildNatureNewsDiagnostics({
        $,
        layoutSelector: resolvedRoots.layoutSelector,
        layoutRootNodes: resolvedRoots.layoutRootNodes,
        selectorCandidates: resolvedRoots.candidateSelectors,
        roots: resolvedRoots.roots,
      }),
    };
  },
};
