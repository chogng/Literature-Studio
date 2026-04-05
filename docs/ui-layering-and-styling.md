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
