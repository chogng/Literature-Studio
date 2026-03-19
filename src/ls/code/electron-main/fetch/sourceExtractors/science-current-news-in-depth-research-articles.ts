import { parseDateHintFromText } from '../../../../base/common/date.js';
import { cleanText, uniq } from '../../../../base/common/strings.js';
import {
  extractScienceDoiFromPathLike,
  isScienceCurrentTocUrl,
} from '../../../../base/common/url.js';

import type {
  ListingCandidateExtraction,
  ListingCandidateExtractor,
  ListingCandidateExtractorContext,
  ListingCandidateSeed,
} from './types.js';
import { normalizeListingCandidateSeed } from './types.js';

const SCIENCE_CURRENT_TOC_BODY_SELECTORS = [
  'div.toc > div.toc__body > div.toc__body',
  'div.toc__body > div.toc__body',
  'div.toc__body',
] as const;
const SCIENCE_CURRENT_SECTION_SELECTOR = 'section.toc__section';
const SCIENCE_CURRENT_SECTION_HEADING_SELECTOR = 'h4';
const SCIENCE_CURRENT_SUBSECTION_HEADING_SELECTOR = 'h5';
const SCIENCE_CURRENT_CARD_SELECTOR = 'div.card';
const SCIENCE_CURRENT_LINK_SELECTOR =
  'h3.article-title a[href*="/doi/"], h3.article-title a[href], a[href*="/doi/"]';
const SCIENCE_CURRENT_TITLE_SELECTOR = 'h3.article-title';
const SCIENCE_CURRENT_DATE_SELECTOR = '.card-meta time, time[datetime], [datetime]';
const SCIENCE_CURRENT_ABSTRACT_SELECTOR = '.accordion__content, div.card-body';
const SCIENCE_CURRENT_AUTHORS_SELECTOR = 'ul[title="list of authors"] li span';

const SCIENCE_CURRENT_TARGET_SUBSECTIONS = [
  {
    sectionHeading: 'news',
    subsectionHeading: 'in depth',
    articleType: 'In Depth',
  },
  {
    sectionHeading: 'research',
    subsectionHeading: 'research articles',
    articleType: 'Research Articles',
  },
] as const;

type ScienceCurrentTargetSubsection =
  (typeof SCIENCE_CURRENT_TARGET_SUBSECTIONS)[number];

function normalizeHeading(value: unknown) {
  return cleanText(value).toLowerCase();
}

function buildTargetKey(sectionHeading: string, subsectionHeading: string) {
  return `${normalizeHeading(sectionHeading)}::${normalizeHeading(subsectionHeading)}`;
}

function resolveScienceCurrentTocBodyRoot({
  $,
}: Pick<ListingCandidateExtractorContext, '$'>) {
  for (const selector of SCIENCE_CURRENT_TOC_BODY_SELECTORS) {
    const roots = $(selector).toArray();
    const matchedRoot = roots.find((root) => $(root).children(SCIENCE_CURRENT_SECTION_SELECTOR).length > 0);
    if (!matchedRoot) continue;

    return {
      root: matchedRoot,
      selector,
      matchedRootCount: roots.length,
    };
  }

  return null;
}

function resolveScienceCurrentTargetSubsection(
  sectionHeading: string,
  subsectionHeading: string,
): ScienceCurrentTargetSubsection | null {
  const normalizedSectionHeading = normalizeHeading(sectionHeading);
  const normalizedSubsectionHeading = normalizeHeading(subsectionHeading);
  return (
    SCIENCE_CURRENT_TARGET_SUBSECTIONS.find(
      (target) =>
        target.sectionHeading === normalizedSectionHeading &&
        target.subsectionHeading === normalizedSubsectionHeading,
    ) ?? null
  );
}

function extractScienceCurrentCardLink({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  return $(root).find(SCIENCE_CURRENT_LINK_SELECTOR).first();
}

function extractScienceCurrentCardHref({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  return cleanText(extractScienceCurrentCardLink({ $, root }).attr('href'));
}

function extractScienceCurrentCardTitle({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const title = cleanText($(root).find(SCIENCE_CURRENT_TITLE_SELECTOR).first().text());
  if (title) return title;
  return cleanText(extractScienceCurrentCardLink({ $, root }).text());
}

function extractScienceCurrentCardDateHint({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const dateNodes = $(root).find(SCIENCE_CURRENT_DATE_SELECTOR).toArray();
  for (const node of dateNodes) {
    const current = $(node);
    const values = [
      current.attr('datetime'),
      current.attr('content'),
      current.attr('aria-label'),
      current.attr('title'),
      current.text(),
    ];
    for (const value of values) {
      const parsed = parseDateHintFromText(value);
      if (parsed) return parsed;
    }
  }

  return parseDateHintFromText($(root).text());
}

function extractScienceCurrentCardDoi(href: string) {
  return extractScienceDoiFromPathLike(href);
}

function extractScienceCurrentCardAuthors({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const authors = $(root)
    .find(SCIENCE_CURRENT_AUTHORS_SELECTOR)
    .map((_, node) => cleanText($(node).text()))
    .get()
    .filter(Boolean);

  return uniq(authors);
}

function extractScienceCurrentTargetedSubsections(
  context: ListingCandidateExtractorContext,
): ListingCandidateExtraction | null {
  const { $, pageUrl } = context;
  const tocBody = resolveScienceCurrentTocBodyRoot({ $ });
  if (!tocBody) return null;

  const sections = $(tocBody.root).children(SCIENCE_CURRENT_SECTION_SELECTOR).toArray();
  if (sections.length === 0) return null;

  const targetState = new Map(
    SCIENCE_CURRENT_TARGET_SUBSECTIONS.map((target) => [
      buildTargetKey(target.sectionHeading, target.subsectionHeading),
      {
        ...target,
        matched: false,
        sectionIndex: null as number | null,
        sectionHeadingText: '',
        subsectionHeadingText: '',
        cardCount: 0,
        candidateCount: 0,
      },
    ]),
  );

  const seen = new Set<string>();
  const candidates: ListingCandidateSeed[] = [];
  let datedCandidateCount = 0;
  let summarizedCandidateCount = 0;
  let totalCardCount = 0;
  let order = 0;

  for (const [sectionIndex, section] of sections.entries()) {
    const sectionHeading = cleanText($(section).children(SCIENCE_CURRENT_SECTION_HEADING_SELECTOR).first().text());
    let currentTargetKey = '';

    const children = $(section).children().toArray();
    for (const child of children) {
      const current = $(child);
      if (current.is(SCIENCE_CURRENT_SUBSECTION_HEADING_SELECTOR)) {
        const subsectionHeading = cleanText(current.text());
        const matchedTarget = resolveScienceCurrentTargetSubsection(sectionHeading, subsectionHeading);
        currentTargetKey = matchedTarget
          ? buildTargetKey(matchedTarget.sectionHeading, matchedTarget.subsectionHeading)
          : '';

        if (currentTargetKey) {
          const state = targetState.get(currentTargetKey);
          if (state) {
            state.matched = true;
            state.sectionIndex = sectionIndex;
            state.sectionHeadingText = sectionHeading;
            state.subsectionHeadingText = subsectionHeading;
          }
        }
        continue;
      }

      if (!current.is(SCIENCE_CURRENT_CARD_SELECTOR) || !currentTargetKey) {
        continue;
      }

      const state = targetState.get(currentTargetKey);
      if (!state) {
        continue;
      }

      state.cardCount += 1;
      totalCardCount += 1;

      const href = extractScienceCurrentCardHref({ $, root: child });
      const title = extractScienceCurrentCardTitle({ $, root: child });
      if (!href || !title) continue;

      let normalized = '';
      try {
        normalized = new URL(href, pageUrl).toString();
      } catch {
        continue;
      }

      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const dateHint = extractScienceCurrentCardDateHint({ $, root: child });
      const abstractText =
        cleanText($(child).find(SCIENCE_CURRENT_ABSTRACT_SELECTOR).first().text()) || null;
      const authors = extractScienceCurrentCardAuthors({ $, root: child });
      const doi = extractScienceCurrentCardDoi(href);

      if (dateHint) datedCandidateCount += 1;
      if (abstractText) summarizedCandidateCount += 1;

      const candidate = normalizeListingCandidateSeed({
        href,
        order,
        dateHint,
        articleType: state.articleType,
        title,
        doi,
        authors,
        abstractText,
        publishedAt: dateHint ?? null,
        scoreBoost: 180,
      });
      if (!candidate) continue;
      candidates.push(candidate);
      order += 1;
      state.candidateCount += 1;
    }
  }

  const targetSummaries = [...targetState.values()].map((target) => ({
    sectionHeading: target.sectionHeadingText || target.sectionHeading,
    subsectionHeading: target.subsectionHeadingText || target.subsectionHeading,
    matched: target.matched,
    sectionIndex: target.sectionIndex,
    cardCount: target.cardCount,
    candidateCount: target.candidateCount,
    articleType: target.articleType,
  }));

  const allTargetsReady = targetSummaries.every((target) => target.matched && target.candidateCount > 0);
  if (!allTargetsReady || candidates.length === 0) {
    return null;
  }

  const selectedSectionIndices = targetSummaries
    .map((target) => target.sectionIndex)
    .filter((value): value is number => typeof value === 'number');

  return {
    candidates,
    diagnostics: {
      tocBodySelectors: SCIENCE_CURRENT_TOC_BODY_SELECTORS,
      tocBodySelector: tocBody.selector,
      tocBodyMatchedRootCount: tocBody.matchedRootCount,
      sectionSelector: SCIENCE_CURRENT_SECTION_SELECTOR,
      sectionHeadingSelector: SCIENCE_CURRENT_SECTION_HEADING_SELECTOR,
      subsectionHeadingSelector: SCIENCE_CURRENT_SUBSECTION_HEADING_SELECTOR,
      selectedSectionIndex:
        selectedSectionIndices.length > 0 ? Math.max(...selectedSectionIndices) : null,
      selectedSectionIndices,
      selectedBy: 'toc-body-target-section-subsection-pairs',
      sectionCount: sections.length,
      targetSubsections: targetSummaries,
      targetSubsectionCount: targetSummaries.length,
      matchedTargetSubsectionCount: targetSummaries.filter((target) => target.matched).length,
      cardSelector: SCIENCE_CURRENT_CARD_SELECTOR,
      linkSelector: SCIENCE_CURRENT_LINK_SELECTOR,
      titleSelector: SCIENCE_CURRENT_TITLE_SELECTOR,
      dateSelector: SCIENCE_CURRENT_DATE_SELECTOR,
      abstractSelector: SCIENCE_CURRENT_ABSTRACT_SELECTOR,
      authorsSelector: SCIENCE_CURRENT_AUTHORS_SELECTOR,
      cardCount: totalCardCount,
      candidateCount: candidates.length,
      datedCandidateCount,
      summarizedCandidateCount,
    },
  };
}

export const scienceCurrentNewsInDepthResearchArticlesCandidateExtractor: ListingCandidateExtractor = {
  id: 'science-current-news-in-depth-research-articles',
  matches: isScienceCurrentListingPage,
  extract(context): ListingCandidateExtraction | null {
    return extractScienceCurrentTargetedSubsections(context);
  },
};

export function isScienceCurrentListingPage(page: URL) {
  return isScienceCurrentTocUrl(page.toString());
}
