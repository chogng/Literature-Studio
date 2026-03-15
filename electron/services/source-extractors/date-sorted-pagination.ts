import type {
  HomepagePaginationStopContext,
  HomepagePaginationStopEvaluation,
} from './types.js';

const DEFAULT_TAIL_WINDOW = 3;
const DEFAULT_MIN_DATED_COVERAGE = 0.5;

type DateSortedPaginationStopOptions = {
  tailWindow?: number;
  minTailCount?: number;
  minDatedCoverage?: number;
  reason?: string;
};

function isNonIncreasing(values: string[]) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[index - 1]) {
      return false;
    }
  }

  return true;
}

export function createDateSortedPaginationStopEvaluator({
  tailWindow = DEFAULT_TAIL_WINDOW,
  minTailCount = tailWindow,
  minDatedCoverage = DEFAULT_MIN_DATED_COVERAGE,
  reason = 'tail_dates_before_start_date',
}: DateSortedPaginationStopOptions = {}) {
  return function evaluateDateSortedPaginationStop({
    pageNumber,
    dateRange,
    extraction,
  }: HomepagePaginationStopContext): HomepagePaginationStopEvaluation | null {
    if (!dateRange.start) {
      return null;
    }

    const candidates = Array.isArray(extraction.candidates) ? extraction.candidates : [];
    if (candidates.length === 0) {
      return null;
    }

    const orderedDateHints = candidates
      .filter((candidate) => Boolean(candidate.dateHint))
      .sort((left, right) => left.order - right.order)
      .map((candidate) => candidate.dateHint as string);

    if (orderedDateHints.length < minTailCount) {
      return null;
    }

    const datedCoverage =
      candidates.length > 0 ? orderedDateHints.length / candidates.length : 0;
    const tailDateHints = orderedDateHints.slice(-Math.max(tailWindow, minTailCount));
    const tailIsDescending = isNonIncreasing(tailDateHints);
    const tailAllOlderThanStartDate = tailDateHints.every((value) => value < dateRange.start);

    if (!tailIsDescending || !tailAllOlderThanStartDate || datedCoverage < minDatedCoverage) {
      return {
        shouldStop: false,
        diagnostics: {
          pageNumber,
          startDate: dateRange.start,
          candidateCount: candidates.length,
          datedCandidateCount: orderedDateHints.length,
          datedCoverage,
          tailDateHints,
          tailIsDescending,
          tailAllOlderThanStartDate,
          minDatedCoverage,
        },
      };
    }

    return {
      shouldStop: true,
      reason,
      diagnostics: {
        pageNumber,
        startDate: dateRange.start,
        candidateCount: candidates.length,
        datedCandidateCount: orderedDateHints.length,
        datedCoverage,
        tailDateHints,
        tailWindow: tailDateHints.length,
        minDatedCoverage,
      },
    };
  };
}
