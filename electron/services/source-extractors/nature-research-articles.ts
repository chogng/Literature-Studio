import { parseDateString } from '../../utils/date.js';
import { cleanText } from '../../utils/text.js';
import { createDateSortedPaginationStopEvaluator } from './date-sorted-pagination.js';
import { findNatureListingNextPageUrl } from './nature-listing-shared.js';

import type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepagePaginationContext,
} from './types.js';

const NATURE_RESEARCH_ARTICLES_PATH_RE = /^\/[^/]+\/research-articles\/?$/i;
const NATURE_RESEARCH_CARD_SELECTOR = 'main li article';
const NATURE_RESEARCH_LINK_SELECTOR = 'h3 a[href*="/articles/"], a[href*="/articles/"]';
const evaluateNatureResearchPaginationStop = createDateSortedPaginationStopEvaluator();

function extractNatureResearchDateHint({
  $,
  root,
}: Pick<HomepageCandidateExtractorContext, '$'> & {
  root: Parameters<HomepageCandidateExtractorContext['$']>[0];
}) {
  const timeElement = $(root).find('time').first();
  const candidates = [
    timeElement.attr('datetime'),
    timeElement.attr('content'),
    timeElement.attr('title'),
    timeElement.text(),
  ];

  for (const value of candidates) {
    const parsed = parseDateString(value);
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

export const natureResearchArticlesCandidateExtractor: HomepageCandidateExtractor = {
  id: 'nature-research-articles',
  matches: isNatureResearchArticlesHomepage,
  findNextPageUrl: findNatureResearchArticlesNextPageUrl,
  evaluatePaginationStop: evaluateNatureResearchPaginationStop,
  extract(context): HomepageCandidateExtraction | null {
    const { $, homepageUrl } = context;
    const roots = $(NATURE_RESEARCH_CARD_SELECTOR).toArray();
    if (roots.length === 0) return null;

    const seen = new Set<string>();
    const candidates = roots
      .map((root, index) => {
        const link = extractNatureResearchLink({ $, root });
        if (link.length === 0) return null;

        const href = cleanText(link.attr('href'));
        const title = cleanText(link.text());
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
          order: index,
          dateHint: extractNatureResearchDateHint({ $, root }),
          scoreBoost: 120,
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

    if (candidates.length === 0) return null;

    return {
      candidates,
      diagnostics: {
        cardCount: roots.length,
        candidateCount: candidates.length,
        datedCandidateCount: candidates.filter((candidate) => Boolean(candidate.dateHint)).length,
      },
    };
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
