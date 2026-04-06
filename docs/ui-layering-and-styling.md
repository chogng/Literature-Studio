# UI Layering And Styling

## Purpose

This document defines which layer owns DOM structure, layout, and visual styling for shared UI components and workbench-specific surfaces.

## Ownership

### 1. Base UI layer

Location: `src/ls/base/browser/ui/*`

Responsibilities:
- Own component DOM structure and internal class names.
- Own reusable default layout and visual styles.
- Expose configurable values through stable props or CSS custom properties.
- Avoid hard-coding business-specific spacing, colors, or sizing when a caller may reasonably need to vary them.

Non-responsibilities:
- Do not encode workbench-part-specific spacing or branding decisions.
- Do not require downstream callers to override internal selectors with higher specificity.

### 2. Workbench part layer

Location: `src/ls/workbench/browser/parts/*`

Responsibilities:
- Own business-specific layout and visual decisions for a surface such as `primarybar`, `sidebar`, or `agentbar`.
- Consume base-layer extension points by setting CSS custom properties or explicit component options.
- Add part-specific wrapper classes needed to scope those overrides.

Non-responsibilities:
- Do not restyle shared component internals by depending on incidental DOM structure when a token or prop should exist.

### 3. Assembly layer

Location: `*.ts` files that instantiate shared components

Responsibilities:
- Compose components.
- Pass semantic options, header/body class names, and content slots.
- Bridge business intent into stable base-layer APIs.

Non-responsibilities:
- Do not define visual constants in TypeScript when CSS owns the presentation.

## Rules

1. Shared component internals must have a single source of truth in the base UI layer.
2. Default spacing, sizing, and colors in shared components must be tokenizable when downstream surfaces need variation.
3. Workbench parts must prefer CSS custom properties over selector-specificity overrides.
4. If a workbench part must target a shared component's internal selector directly, treat that as a missing extension point and fix the base component.
5. Use the narrowest stable token scope that matches the business requirement.
6. For multi-row or multi-slot surfaces, bind layout tracks to explicit slots instead of relying on auto-placement after siblings are hidden.
7. Use DOM state such as `hidden` or explicit state classes for visibility changes. Do not mix visibility behavior across `:empty`, inline `style.display`, and implicit grid/flex auto-placement.

## Naming Guidance

- Prefer `*Frame` for bounded workbench surfaces that own slots or layout tracks.
- Reserve `*Shell` for true app-level or window-level orchestration, not routine surface wrappers.
- A `frame` may own slots, top-level track layout, visibility state, and high-level surface chrome.
- Prefer more specific names for inner layers:
  `*Pane` for a mode-specific surface,
  `*Host` for a mounted child root or scroll content host,
  `*Root` for the primary content root,
  `*Toolbar` for command chrome,
  `*Scrollable` for the element that owns scrolling.

## Applied To Editor Frame

The editor surface is a good example of where `frame` is clearer than `shell`.

`EditorGroupView` owns the outer editor frame:
- `editor-frame`
- `editor-topbar`
- `editor-toolbar`
- `editor-content`

That frame may define explicit slots such as:
- `data-editor-frame-slot='topbar'`
- `data-editor-frame-slot='toolbar'`
- `data-editor-frame-slot='content'`

Rules for this frame:
- The frame owns grid rows and slot placement.
- The frame must keep content in the `1fr` track even when the toolbar is hidden.
- Hidden toolbar state must be expressed through `hidden` or an explicit frame-owned class, not by depending on DOM emptiness.
- Mode panes such as draft or source live inside `editor-content`; they do not own the frame grid.

Inside the writing editor, `pm-editor-surface` is the outer writing surface container, while:
- `pm-editor-scrollable` owns the scroll container.
- `pm-editor-host` owns the mounted scroll content host.
- `pm-editor-root` owns the editor content root.
- `.ProseMirror` owns the editable document surface.

This split keeps responsibilities stable:
- surface container: high-level height distribution
- scrollable/host: scrolling and scroll content sizing
- root/document: actual editor content layout

## Applied To `Pane`

`Pane` owns:
- `.pane`
- `.pane-header`
- `.pane-header-toggle`
- `.pane-header-actions`
- `.pane-body`

`Pane` default header spacing belongs in `src/ls/base/browser/ui/splitview/paneview.css`.

Part-specific header spacing, such as the `primarybar` library pane needing `8px` horizontal padding instead of the shared `14px`, belongs in the workbench part layer by setting a `Pane` token on the pane root.

## Review Checklist

- Is the DOM structure owned by the shared component?
- Is the default style defined in the same shared component?
- Is variation expressed through a token or explicit option?
- Is the workbench part only setting tokens or its own surface styles?
- Did we avoid solving the issue with selector escalation alone?

## Related Docs

- `docs/editor-architecture-roadmap.md` defines the long-term editor input, pane, group, and view-state architecture.
- This document stays focused on DOM ownership, slot layout, and styling boundaries.
