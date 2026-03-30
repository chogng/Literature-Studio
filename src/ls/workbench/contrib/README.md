# `src/ls/workbench/contrib`

This directory is reserved for workbench contributions grouped by feature.

Use this directory when a contribution does one or more of the following:

- wires multiple workbench parts together
- is shared across several features
- is imported directly by a workbench entry point
- no longer fits naturally inside a single feature folder

Keep feature-local contribution files close to their feature until they need broader ownership.

## Rule of thumb

- `contrib/workbench/**`
  - Workbench runtime and global lifecycle contributions.
- `contrib/<feature>/**`
  - Feature-specific integration entry points.
