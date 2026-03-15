import { parseDateHintFromText } from '../../utils/date-hint.js';
import { parseDateString } from '../../utils/date.js';
import { cleanText } from '../../utils/text.js';
import { createDateSortedPaginationStopEvaluator } from './date-sorted-pagination.js';
import {
  createNatureListingCandidateExtractor,
  findNatureListingNextPageUrl,
} from './nature-listing-shared.js';

import type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepagePaginationContext,
} from './types.js';

const NATURE_RESEARCH_ARTICLES_PATH_RE = /^\/[^/]+\/research-articles\/?$/i;
const NATURE_RESEARCH_CARD_SELECTORS = [
  'section#new-article-list li.app-article-list-row__item article.c-card',
  'section#new-article-list article.c-card',
  'main li.app-article-list-row__item article',
  'main li article',
] as const;
const NATURE_RESEARCH_LINK_SELECTOR =
  'h3.c-card__title a[href*="/articles/"], h3 a[href*="/articles/"], a.c-card__link[href*="/articles/"], a[href*="/articles/"]';
const NATURE_RESEARCH_TITLE_SELECTOR = 'h3.c-card__title, h3';
const NATURE_RESEARCH_ARTICLE_TYPE_SELECTOR =
  'div.c-card__section.c-meta [data-test="article.type"] .c-meta__type, div.c-card__section.c-meta [data-test="article.type"], [data-test="article.type"] .c-meta__type';
const NATURE_RESEARCH_DATE_SELECTOR =
  'time[datetime], .c-meta time[datetime], [itemprop="datePublished"], [datetime], span, div';
const evaluateNatureResearchPaginationStop = createDateSortedPaginationStopEvaluator();
const fallbackNatureResearchCandidateExtractor = createNatureListingCandidateExtractor({
  id: 'nature-research-articles',
  matches: isNatureResearchArticlesHomepage,
  findNextPageUrl: findNatureResearchArticlesNextPageUrl,
  evaluatePaginationStop: evaluateNatureResearchPaginationStop,
});

function resolveNatureResearchCardRoots({ $ }: Pick<HomepageCandidateExtractorContext, '$'>) {
  for (const selector of NATURE_RESEARCH_CARD_SELECTORS) {
    const roots = $(selector).toArray();
    if (roots.length === 0) continue;

    const matchedCount = roots.reduce((count, root) => {
      const href = extractNatureResearchHref({ $, root });
      const title = extractNatureResearchTitle({ $, root });
      return href && title ? count + 1 : count;
    }, 0);

    if (matchedCount === 0) continue;
    return {
      selector,
      roots,
      matchedCount,
    };
  }

  return null;
}

function extractNatureResearchDateHint({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const candidateNodes = $(root).find(NATURE_RESEARCH_DATE_SELECTOR).toArray();
  for (const node of candidateNodes) {
    const dateNode = $(node);
    const values = [
      dateNode.attr('datetime'),
      dateNode.attr('content'),
      dateNode.attr('aria-label'),
      dateNode.attr('title'),
      dateNode.text(),
    ];
    for (const value of values) {
      const parsed = parseDateString(value) ?? parseDateHintFromText(value);
      if (parsed) return parsed;
    }
  }

  const fallbackValues = [$(root).attr('datetime'), $(root).attr('content'), $(root).text()];
  for (const value of fallbackValues) {
    const parsed = parseDateString(value) ?? parseDateHintFromText(value);
    if (parsed) return parsed;
  }

  return null;
}

function extractNatureResearchLink({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  return $(root).find(NATURE_RESEARCH_LINK_SELECTOR).first();
}

function extractNatureResearchHref({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  return cleanText(extractNatureResearchLink({ $, root }).attr('href'));
}

function extractNatureResearchTitle({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const titleFromHeading = cleanText($(root).find(NATURE_RESEARCH_TITLE_SELECTOR).first().text());
  if (titleFromHeading) return titleFromHeading;
  return cleanText(extractNatureResearchLink({ $, root }).text());
}

function extractNatureResearchArticleType({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  return cleanText($(root).find(NATURE_RESEARCH_ARTICLE_TYPE_SELECTOR).first().text());
}

function extractNatureResearchArticleCards(
  context: HomepageCandidateExtractorContext,
): HomepageCandidateExtraction | null {
  const { $, homepageUrl } = context;
  const selected = resolveNatureResearchCardRoots({ $ });
  if (!selected || selected.roots.length === 0) return null;

  let typedCandidateCount = 0;
  const articleTypeCounts: Record<string, number> = {};
  const seen = new Set<string>();

  const candidates = selected.roots
    .map((root, index) => {
      const href = extractNatureResearchHref({ $, root });
      const title = extractNatureResearchTitle({ $, root });
      if (!href || !title) return null;

      let normalized = '';
      try {
        normalized = new URL(href, homepageUrl).toString();
      } catch {
        return null;
      }

      if (seen.has(normalized)) return null;
      seen.add(normalized);

      const articleType = extractNatureResearchArticleType({ $, root }) || null;
      if (articleType) {
        typedCandidateCount += 1;
        articleTypeCounts[articleType] = (articleTypeCounts[articleType] ?? 0) + 1;
      }

      return {
        href,
        order: index,
        dateHint: extractNatureResearchDateHint({ $, root }),
        articleType,
        scoreBoost: 140,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  if (candidates.length === 0) return null;

  return {
    candidates,
    diagnostics: {
      cardSelector: selected.selector,
      cardSelectorCandidates: NATURE_RESEARCH_CARD_SELECTORS,
      cardCount: selected.roots.length,
      cardMatchedCount: selected.matchedCount,
      candidateCount: candidates.length,
      datedCandidateCount: candidates.filter((candidate) => Boolean(candidate.dateHint)).length,
      typedCandidateCount,
      articleTypeCounts,
    },
  };
}

export const natureResearchArticlesCandidateExtractor: HomepageCandidateExtractor = {
  id: 'nature-research-articles',
  matches: isNatureResearchArticlesHomepage,
  findNextPageUrl: findNatureResearchArticlesNextPageUrl,
  evaluatePaginationStop: evaluateNatureResearchPaginationStop,
  extract(context): HomepageCandidateExtraction | null {
    const targeted = extractNatureResearchArticleCards(context);
    if (targeted && targeted.candidates.length > 0) {
      return targeted;
    }

    return fallbackNatureResearchCandidateExtractor.extract(context);
  },
};

export function isNatureResearchArticlesHomepage(homepage: URL) {
  return homepage.host === 'www.nature.com' && NATURE_RESEARCH_ARTICLES_PATH_RE.test(homepage.pathname);
}

function findNatureResearchArticlesNextPageUrl({
  homepage,
  homepageUrl,
  $,
  seenPageUrls,
}: HomepagePaginationContext) {
  if (!isNatureResearchArticlesHomepage(homepage)) return null;
  return findNatureListingNextPageUrl({
    homepage,
    homepageUrl,
    $,
    seenPageUrls,
  });
}
