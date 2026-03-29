# ProseMirror Writing Editor

This note records the current contract for the writing editor's structured ProseMirror document layer.

## Current scope

- The editor stores `citation`, `figure`, and `figure_ref` as structured nodes instead of plain text.
- Plain-text export and editor stats now flow through `src/ls/workbench/browser/parts/editor/prosemirror/document.ts`.
- `src/ls/workbench/browser/writingEditorDocument.ts` is only a compatibility shim so older imports resolve to the same ProseMirror-aware helpers.

## Regression checks

Run the targeted regression check with:

```bash
npm run test:writing-editor
```

The test entry point is `tests/writing-editor/prosemirrorDocument.test.ts`.

The lightweight runner bundles the test file with `esbuild` and executes it through Node's built-in `node:test` runner, so we do not need an additional test framework for this coverage.

## What is covered

- Citation numbers are derived from first appearance order, not from the raw `citationIds` text.
- Figure references render against figure order and fall back to `?` when the target figure is missing.
- Figure insertion keeps a structured figure node, generates stable ids, and leaves a trailing paragraph so editing can continue naturally.
