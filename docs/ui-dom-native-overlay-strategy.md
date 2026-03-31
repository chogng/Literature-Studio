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

Use native menu overlay only when all of the following are true:

- Running in desktop runtime.
- The interaction belongs to a workbench-level surface, not a generic reusable control.
- Native overlay provides a concrete UX gain such as titlebar alignment or cross-surface hit area.

Use DOM dropdown for:

- Editor-local controls.
- Sidebar and panel filters.
- Settings forms.
- Any reusable component in `base`.
- Any scene that must behave the same on web and desktop.

Use native dropdown overlay for:

- Titlebar source selector.
- Future top-level window chrome menus that visually belong to the native shell.

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
- Titlebar owns a native-aware wrapper around the base dropdown.
- The wrapper mirrors open/close/focus behavior and forwards selection changes back into titlebar state.

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
