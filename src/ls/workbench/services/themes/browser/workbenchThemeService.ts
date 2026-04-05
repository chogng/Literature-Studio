import {
  themeService,
} from 'ls/platform/theme/browser/themeService';
import { loadWorkbenchTheme } from 'ls/workbench/services/themes/common/themeLoader';

export type WorkbenchThemeKind = 'light' | 'dark';

export function applyWorkbenchTheme(
  themeKind: WorkbenchThemeKind = 'light',
  target: CSSStyleDeclaration = document.documentElement.style,
) {
  themeService.applyTheme(loadWorkbenchTheme(themeKind), target);
}
