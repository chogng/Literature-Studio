# AGENTS

## LS Migration Rules
- Migrate `src/ls/**` step by step in small, verifiable slices (one concern per change).
- Align migrated structures with the upstream data model in `C:\Users\lanxi\Desktop\code` unless a deliberate divergence is documented.
- Treat this repository as a reduced mirror of upstream for migrated `src/ls/**` areas: do not introduce project-specific module/file layers when an upstream-aligned placement exists.
- When responsibilities are misplaced, move logic into the upstream-equivalent owning module first (responsibility realignment) instead of creating new local-only files.
- Before adding any new file under migrated `src/ls/**`, verify the equivalent upstream location in `C:\Users\lanxi\Desktop\code`; if no upstream counterpart exists, require explicit justification or user approval.
- Follow Code-OSS style in `src/ls/**`: prefer `.ts` modules and do not introduce `.tsx` files unless explicitly required.
- For this migration line, treat `.tsx` in `src/ls/**` as legacy transition state: do not introduce new `.tsx` files there, and prefer retiring existing ones over adding more.
- The current repository baseline has retired `.tsx` from `src/**`; do not introduce new `.tsx` files back into the app entry or migrated workbench layers unless there is an explicit architectural reason.
- Use `camelCase` naming for newly migrated source files under `src/ls/**` unless the file is intentionally mirroring an upstream entrypoint that already uses another naming pattern.
- For migrated workbench code, treat `src/ls/**` as the source of truth: do not add new wrapper components, CSS files, or compatibility shells under `src/views`, `src/titlebar`, `src/sidebar`, or other outer `src/*` folders unless a temporary compatibility layer is explicitly required.
- For migrated workbench code, keep both part logic and the corresponding view shells inside `src/ls/**`; only shared app-agnostic UI primitives should remain outside.
- For migrated workbench code, place browser-level entry shells, state modules, and controllers in `src/ls/workbench/browser/**` instead of keeping them in outer files like `src/App.tsx` or `src/hooks/**`.
- For migrated workbench code, place workbench-only domain services in `src/ls/workbench/services/**`, shared workbench helpers in `src/ls/workbench/common/**`, and part-local view components beside their owning part instead of leaving them in outer `src/services`, `src/utils`, or generic component folders.
- For title-related migration (`src/ls/workbench/**/titlebar/**`), use `camelCase` naming for new files and symbols (for example: `titlebarPart.ts`).
- Continue applying the same `camelCase` rule for all subsequent title-related migration steps unless explicitly changed.

## Shared UI Rules
- Treat `src/ls/base/browser/ui/**` as the home for long-lived shared UI primitives and infrastructure.
- Keep shared UI primitives out of outer `src/components/**`; workbench-facing shared UI should live in `src/ls/base/**`.
- Keep shared UI filenames in `kebab-case` and keep component symbols in `PascalCase`.
- Current shared UI primitives to preserve in `src/ls/base/browser/ui/**`: `button`, `input`, `dropdown`, `toast`, `modal`.
- If a component is owned by one workbench part or feature, place it beside that owner in `src/ls/**` instead of promoting it into `src/ls/base/**`.

## Build Rules
- The renderer currently builds without `@vitejs/plugin-react`; do not reintroduce that plugin unless JSX/TSX-based compilation or React Fast Refresh is intentionally being restored.
- Keep the app entry at `src/main.ts` and keep `index.html` aligned with that `.ts` entry.

## Commenting Rules
- Add comments only where needed (non-obvious logic, architecture boundaries, state transitions, or important invariants).
- Prefer comments that explain intent and tradeoffs (`why`), not line-by-line narration of obvious code (`what`).
- Keep comments short, accurate, and updated with code changes.
