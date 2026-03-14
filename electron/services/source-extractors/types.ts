import { load } from 'cheerio';

export type HomepageDom = ReturnType<typeof load>;

export type HomepageCandidateSeed = {
  href: string;
  order: number;
  dateHint?: string | null;
  scoreBoost?: number;
};

export type HomepageCandidateExtraction = {
  candidates: HomepageCandidateSeed[];
  diagnostics?: Record<string, unknown>;
};

export type HomepageCandidateExtractorContext = {
  homepage: URL;
  homepageUrl: string;
  $: HomepageDom;
};

export interface HomepageCandidateExtractor {
  id: string;
  matches(homepage: URL): boolean;
  extract(context: HomepageCandidateExtractorContext): HomepageCandidateExtraction | null;
}
