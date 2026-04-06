# UI DOM / Native Overlay Strategy

## Goal

Keep `base/browser/ui/*` as reusable DOM-first primitives, and move all Electron-native overlay decisions into workbench or desktop-specific layers.

This keeps the base layer portable for web usage while still allowing desktop-only UX upgrades where they are actually valuable.

## Layering Rules

### `base/browser/ui/*`

- Only implements DOM behavior.
- Must not import Electron-facing types from `base/parts/sandbox/common/desktopTypes`.
- Must not access `window.electronAPI`.
- Can expose generic state or hooks needed by upper layers.

### `workbench/browser/*`

- Owns product-specific composition.
- May wrap base components with native-aware behavior for specific UI surfaces.
- Chooses whether a given scene uses DOM or native overlay.

### `platform/*` and desktop contributions

- Own Electron window, IPC, preload, and native overlay plumbing.
- Register desktop bridges that upper layers can use.

## Routing Policy

### Dropdowns

Default: DOM.

Current policy:

- All dropdowns and action menus render through DOM primitives.
- Workbench surfaces such as titlebar also use the same DOM menu path.
- Do not add a separate native menu overlay path unless a future requirement proves it is necessary and maintainable.

### Toasts

Default API: always call the shared `toast.show(...)` API.

Implementation routing:

- Web: render DOM toast stack.
- Desktop main workbench window: use native toast overlay through a desktop bridge.
- Native overlay renderer window itself: render DOM for that overlay page and never recurse into another native toast request.

Use DOM toast for:

- Web runtime.
- Test environments.
- Any environment where no desktop bridge is registered.

Use native toast for:

- Desktop workbench notifications that should float above the app shell consistently.

## Implementation Shape

### Dropdown

- `base/browser/ui/dropdown` stays DOM-only.
- Workbench composition should use the shared DOM menu/contextview path directly.

### Toast

- `base/browser/ui/toast` keeps DOM rendering and toast state.
- Native toast is injected through a registered bridge:
  - base knows only a small bridge interface
  - desktop contribution registers the Electron-backed implementation
- If no bridge is present, toast falls back to DOM automatically.

## Management Principle

When adding a new popup surface, decide its mode explicitly:

- If it is a reusable product-agnostic UI primitive, keep it DOM.
- If it is tightly coupled to desktop window chrome or overlay behavior, route it through workbench/platform and keep the primitive DOM-only.

Do not add new `window.electronAPI` calls inside `base/browser/ui/*`.

## Recommended Pattern For Future Native Overlays

When adding another native overlay, keep these boundaries:

- `base/browser/ui/*`
  - owns generic DOM behavior and session semantics
  - may expose generic external-menu/open-session hooks
- `workbench/browser/*`
  - decides whether a given UI surface uses DOM or native overlay
  - maps product state into overlay requests
- `platform/*`
  - owns Electron `WebContentsView`, IPC, z-order, visibility, and window attachment

Use this checklist:

1. Keep a stable native host instead of recreating or zero-sizing it on every close.
2. Treat open overlays as sessions, not as stateless redraws.
3. Ignore unrelated `props` churn while a session is open.
4. Refresh only on meaningful deltas: geometry, options, selected value, alignment.
5. Decouple ownership/content state from visibility/bounds state.
6. Add an explicit renderer-side hover/focus resync if the overlay DOM can rebuild while open.
