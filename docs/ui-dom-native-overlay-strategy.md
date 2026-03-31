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
- External-menu mode must treat an opened menu session as stable state:
  - `open` creates the session.
  - `viewport` updates may refresh anchor geometry.
  - `props` updates must not reopen the native menu unless menu content, selection, alignment, or trigger rect actually changed.

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

## Native Overlay Failure Modes

These issues tend to look like random rendering bugs, but they are usually state or lifecycle bugs across DOM, workbench state, and Electron native views.

### 1. Reopen-on-props churn

Symptom:

- A native menu is visibly open.
- Some unrelated state update happens, such as web content loading completing.
- Hover, focus, or pointer behavior suddenly feels stale or stuck.

Cause:

- The trigger component re-renders.
- The wrapper re-emits an external menu `open` request for an already-open native menu.
- The native overlay renderer gets new state even though nothing meaningful about the menu changed.

Policy:

- Treat an opened external menu as a session.
- During that session, ignore `props`-driven refreshes unless one of these changed:
  - trigger rect
  - menu alignment
  - option list
  - selected value

Current implementation:

- `DropdownView` in [`src/ls/base/browser/ui/dropdown/dropdown.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdown.ts) caches the last external menu request while the menu is open.
- `props` updates only emit a new external request when the request is materially different.

### 2. Unstable native overlay host

Symptom:

- Native overlay position or hover hit testing becomes inconsistent after close/reopen.
- Problems are more likely when another `WebContentsView` is created or re-layered at the same time.

Cause:

- The overlay host itself is repeatedly collapsed to `0x0`, hidden, and expanded again.
- Electron can briefly desynchronize the painted surface and the input hit region during rapid view churn.

Policy:

- Keep the native overlay host stable for the lifetime of the window.
- Prefer toggling visibility over tearing down geometry every time the menu closes.
- Only use hidden zero-bounds when the parent window itself is unavailable.

Current implementation:

- [`src/ls/platform/windows/electron-main/menuOverlayView.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/platform/windows/electron-main/menuOverlayView.ts) keeps the menu overlay sized to the parent content area and hides it without collapsing to `0x0` during normal close flows.

### 3. Hover state lost after DOM rebuild

Symptom:

- The menu is visible and correctly positioned.
- Pointer hover appears on the wrong item or does not show until the pointer moves again.

Cause:

- The overlay renderer rebuilds menu DOM while the pointer is already inside the menu.
- Pure CSS `:hover` state may not immediately realign with the rebuilt DOM tree.

Policy:

- For native overlay renderers, do not rely solely on CSS pseudo-classes after state-driven re-render.
- If the overlay can be rebuilt while open, explicitly resync hover from the current pointer position.

Current implementation:

- [`src/ls/workbench/browser/menuOverlayWindow.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/menuOverlayWindow.ts) tracks the last pointer position and reapplies hover state after render.

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
