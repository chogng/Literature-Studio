import type { ThemeColorCustomizations } from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  themeService,
} from 'ls/platform/theme/browser/themeService';
import { loadWorkbenchThemeWithCustomizations } from 'ls/workbench/services/themes/common/themeLoader';

export type WorkbenchThemeKind = 'light' | 'dark';

export function applyWorkbenchTheme(
  themeKind: WorkbenchThemeKind = 'light',
  colorCustomizations: ThemeColorCustomizations = {},
  target: CSSStyleDeclaration = document.documentElement.style,
) {
  themeService.applyTheme(
    loadWorkbenchThemeWithCustomizations(themeKind, colorCustomizations),
    target,
  );
}
