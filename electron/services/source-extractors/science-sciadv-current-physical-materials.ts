import { parseDateHintFromText } from '../../utils/date-hint.js';
import { cleanText, uniq } from '../../utils/text.js';

import type {
  ListingCandidateExtraction,
  ListingCandidateExtractor,
  ListingCandidateExtractorContext,
} from './types.js';

const SCIENCE_SCIADV_CURRENT_PATH_RE = /^\/toc\/sciadv\/current\/?$/i;
const SCIENCE_SCIADV_TOC_BODY_SELECTORS = [
  'div.toc > div.toc__body > div.toc__body',
  'div.toc__body > div.toc__body',
  'div.toc__body',
] as const;
const SCIENCE_SCIADV_SECTION_SELECTOR = 'section.toc__section';
const SCIENCE_SCIADV_SECTION_HEADING_SELECTOR = 'h4';
const SCIENCE_SCIADV_TARGET_HEADING = 'physical and materials sciences';
const SCIENCE_SCIADV_FIXED_SECTION_INDEX = 3;
const SCIENCE_SCIADV_CARD_SELECTOR = 'div.card';
const SCIENCE_SCIADV_LINK_SELECTOR =
  'h3.article-title a[href*="/doi/"], h3.article-title a[href], a[href*="/doi/"]';
const SCIENCE_SCIADV_TITLE_SELECTOR = 'h3.article-title';
const SCIENCE_SCIADV_DATE_SELECTOR = '.card-meta time, time[datetime], [datetime]';
const SCIENCE_SCIADV_ABSTRACT_SELECTOR = '.accordion__content, div.card-body';
const SCIENCE_SCIADV_AUTHORS_SELECTOR = 'ul[title="list of authors"] li span';
const SCIENCE_SCIADV_ARTICLE_TYPE = 'Physical and Materials Sciences';
const DOI_PATH_RE = /\/doi\/(?:abs\/|epdf\/|pdf\/)?(10\.\d{4,9}\/[^?#]+)/i;

function normalizeHeading(value: unknown) {
  return cleanText(value).toLowerCase();
}

function matchesTargetHeading(value: unknown) {
  const normalized = normalizeHeading(value);
  if (!normalized) return false;
  return normalized === SCIENCE_SCIADV_TARGET_HEADING || normalized.includes(SCIENCE_SCIADV_TARGET_HEADING);
}

function resolveScienceSciadvTocBodyRoot({
  $,
}: Pick<ListingCandidateExtractorContext, '$'>) {
  for (const selector of SCIENCE_SCIADV_TOC_BODY_SELECTORS) {
    const roots = $(selector).toArray();
    const matchedRoot = roots.find((root) => $(root).children(SCIENCE_SCIADV_SECTION_SELECTOR).length > 0);
    if (!matchedRoot) continue;

    return {
      root: matchedRoot,
      selector,
      matchedRootCount: roots.length,
    };
  }

  return null;
}

function resolveScienceSciadvTargetSection({
  $,
}: Pick<ListingCandidateExtractorContext, '$'>) {
  const tocBody = resolveScienceSciadvTocBodyRoot({ $ });
  if (!tocBody) return null;

  const sections = $(tocBody.root).children(SCIENCE_SCIADV_SECTION_SELECTOR).toArray();
  if (sections.length === 0) return null;

  const fixedSection = sections[SCIENCE_SCIADV_FIXED_SECTION_INDEX] ?? null;
  const fixedSectionHeading = fixedSection
    ? $(fixedSection).find(SCIENCE_SCIADV_SECTION_HEADING_SELECTOR).first().text()
    : '';
  if (fixedSection && matchesTargetHeading(fixedSectionHeading)) {
    return {
      section: fixedSection,
      sectionIndex: SCIENCE_SCIADV_FIXED_SECTION_INDEX,
      sectionCount: sections.length,
      selectedBy: 'toc-body-fixed-index' as const,
      tocBodySelector: tocBody.selector,
      tocBodyMatchedRootCount: tocBody.matchedRootCount,
    };
  }

  const headingMatchedIndex = sections.findIndex((section) =>
    matchesTargetHeading($(section).find(SCIENCE_SCIADV_SECTION_HEADING_SELECTOR).first().text()),
  );
  if (headingMatchedIndex >= 0) {
    return {
      section: sections[headingMatchedIndex],
      sectionIndex: headingMatchedIndex,
      sectionCount: sections.length,
      selectedBy: 'toc-body-heading-fallback' as const,
      tocBodySelector: tocBody.selector,
      tocBodyMatchedRootCount: tocBody.matchedRootCount,
    };
  }

  return null;
}

function extractScienceSciadvCardLink({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  return $(root).find(SCIENCE_SCIADV_LINK_SELECTOR).first();
}

function extractScienceSciadvCardHref({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  return cleanText(extractScienceSciadvCardLink({ $, root }).attr('href'));
}

function extractScienceSciadvCardTitle({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const title = cleanText($(root).find(SCIENCE_SCIADV_TITLE_SELECTOR).first().text());
  if (title) return title;
  return cleanText(extractScienceSciadvCardLink({ $, root }).text());
}

function extractScienceSciadvCardDateHint({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const dateNodes = $(root).find(SCIENCE_SCIADV_DATE_SELECTOR).toArray();
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

function extractScienceSciadvCardDoi(href: string) {
  const matched = cleanText(href).match(DOI_PATH_RE);
  if (!matched?.[1]) return null;

  try {
    return decodeURIComponent(matched[1]);
  } catch {
    return matched[1];
  }
}

function extractScienceSciadvCardAuthors({
  $,
  root,
}: Pick<ListingCandidateExtractorContext, '$'> & {
  root: Parameters<ListingCandidateExtractorContext['$']>[0];
}) {
  const authors = $(root)
    .find(SCIENCE_SCIADV_AUTHORS_SELECTOR)
    .map((_, node) => cleanText($(node).text()))
    .get()
    .filter(Boolean);

  return uniq(authors);
}

function extractScienceSciadvPhysicalMaterialsCards(
  context: ListingCandidateExtractorContext,
): ListingCandidateExtraction | null {
  const { $, pageUrl } = context;
  const resolvedSection = resolveScienceSciadvTargetSection({ $ });
  if (!resolvedSection) return null;

  const sectionHeading = cleanText(
    $(resolvedSection.section).find(SCIENCE_SCIADV_SECTION_HEADING_SELECTOR).first().text(),
  );
  const cards = $(resolvedSection.section).find(SCIENCE_SCIADV_CARD_SELECTOR).toArray();
  if (cards.length === 0) return null;

  let datedCandidateCount = 0;
  let summarizedCandidateCount = 0;
  const seen = new Set<string>();

  const candidates = cards
    .map((card, index) => {
      const href = extractScienceSciadvCardHref({ $, root: card });
      const title = extractScienceSciadvCardTitle({ $, root: card });
      if (!href || !title) return null;

      let normalized = '';
      try {
        normalized = new URL(href, pageUrl).toString();
      } catch {
        return null;
      }

      if (seen.has(normalized)) return null;
      seen.add(normalized);

      const dateHint = extractScienceSciadvCardDateHint({ $, root: card });
      const abstractText = cleanText($(card).find(SCIENCE_SCIADV_ABSTRACT_SELECTOR).first().text()) || null;
      const authors = extractScienceSciadvCardAuthors({ $, root: card });
      const doi = extractScienceSciadvCardDoi(href);

      if (dateHint) datedCandidateCount += 1;
      if (abstractText) summarizedCandidateCount += 1;

      return {
        href,
        order: index,
        dateHint,
        articleType: SCIENCE_SCIADV_ARTICLE_TYPE,
        scoreBoost: 180,
        prefetchedArticle: {
          title,
          doi,
          authors,
          abstractText,
          publishedAt: dateHint ?? null,
        },
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  if (candidates.length === 0) return null;

  return {
    candidates,
    diagnostics: {
      tocBodySelectors: SCIENCE_SCIADV_TOC_BODY_SELECTORS,
      tocBodySelector: resolvedSection.tocBodySelector,
      tocBodyMatchedRootCount: resolvedSection.tocBodyMatchedRootCount,
      sectionSelector: SCIENCE_SCIADV_SECTION_SELECTOR,
      sectionHeadingSelector: SCIENCE_SCIADV_SECTION_HEADING_SELECTOR,
      targetHeading: SCIENCE_SCIADV_TARGET_HEADING,
      fixedSectionIndex: SCIENCE_SCIADV_FIXED_SECTION_INDEX,
      selectedSectionIndex: resolvedSection.sectionIndex,
      selectedBy: resolvedSection.selectedBy,
      sectionCount: resolvedSection.sectionCount,
      selectedSectionHeading: sectionHeading || null,
      cardSelector: SCIENCE_SCIADV_CARD_SELECTOR,
      linkSelector: SCIENCE_SCIADV_LINK_SELECTOR,
      titleSelector: SCIENCE_SCIADV_TITLE_SELECTOR,
      dateSelector: SCIENCE_SCIADV_DATE_SELECTOR,
      abstractSelector: SCIENCE_SCIADV_ABSTRACT_SELECTOR,
      authorsSelector: SCIENCE_SCIADV_AUTHORS_SELECTOR,
      cardCount: cards.length,
      candidateCount: candidates.length,
      datedCandidateCount,
      summarizedCandidateCount,
    },
  };
}

export const scienceSciadvCurrentPhysicalMaterialsCandidateExtractor: ListingCandidateExtractor = {
  id: 'science-sciadv-current-physical-materials',
  matches: isScienceSciadvCurrentListingPage,
  extract(context): ListingCandidateExtraction | null {
    return extractScienceSciadvPhysicalMaterialsCards(context);
  },
};

export function isScienceSciadvCurrentListingPage(page: URL) {
  const host = page.host.toLowerCase();
  if (host !== 'www.science.org' && host !== 'science.org') {
    return false;
  }

  return SCIENCE_SCIADV_CURRENT_PATH_RE.test(page.pathname);
}
