# Fetch Layering

This document records the current fetch-layer split and the intended direction.

## Current Split

The fetch pipeline is now being separated into two major layers.

### Listing Layer

Files under `src/ls/code/electron-main/fetch/listing/` are responsible for list-page concerns:

- finding candidate article URLs
- scoring and prioritizing candidates
- list-page metadata as lightweight candidate hints
- pagination and date-hint stopping logic

Current listing modules:

- `listing/scoring.ts`
- `listing/candidates.ts`
- `listing/planning.ts`

### Article Detail Layer

Files directly under `src/ls/code/electron-main/fetch/` are responsible for article-detail-page concerns:

- parsing article HTML into final `Article`
- metadata extraction
- article acceptance heuristics
- merging list-page candidate hints into parsed article results

Current article modules:

- `parser.ts`
- `metadata.ts`
- `acceptance.ts`
- `merge.ts`
- `rawMetadata.ts`
- `normalize.ts`
- `sites/nature.ts`

## Intended Next Step

The next extraction step should move more list-page responsibilities out of `articleFetcher.ts`, especially:

- pagination policy helpers
- date-hint early-stop helpers

The target shape is:

1. listing layer produces candidate descriptors
2. article layer produces parsed `Article`
3. merge layer decides when list-page hints can safely short-circuit article-page parsing

## Design Rule

List-page metadata is a hint, not the canonical final article record, unless the merge layer explicitly decides the candidate is complete enough to skip article-page parsing.

## Single-Page Parser Debug Entry

Single-page article parsing should be debugged through:

- `src/ls/code/electron-main/fetch/test/parseArticleTest.ts`

This file is the stable local entry for parser validation against saved HTML snapshots.
It is intentionally placed under `fetch/test/` so future article-parser work can reuse the same nearby debug flow instead of creating ad hoc scripts elsewhere.
