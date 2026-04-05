import {
  asCssVariableName,
  getRegisteredColors,
  type ColorIdentifier,
} from 'ls/platform/theme/common/colorRegistry';
import {
  createColorThemeData,
  resolveThemeDefaultColor,
  type ColorThemeData,
  type ThemeKind,
} from 'ls/platform/theme/common/theme';

export interface IThemeService {
  applyTheme(theme?: ColorThemeData, target?: CSSStyleDeclaration): void;
  setTheme(theme: ColorThemeData): void;
  getTheme(): ColorThemeData;
  getColor(colorId: ColorIdentifier): string | null;
}

const DEFAULT_THEME: ColorThemeData = createColorThemeData({
  kind: 'light',
});

export class ThemeService implements IThemeService {
  private theme = DEFAULT_THEME;

  applyTheme(
    theme: ColorThemeData = this.theme,
    target: CSSStyleDeclaration = document.documentElement.style,
  ) {
    const nextTheme = createColorThemeData(theme);
    this.theme = nextTheme;

    for (const color of getRegisteredColors()) {
      const value =
        nextTheme.colors?.[color.id] ??
        resolveThemeDefaultColor(color.defaults, nextTheme.kind);
      target.setProperty(asCssVariableName(color.id), value);
    }

    for (const [name, value] of Object.entries(nextTheme.variables ?? {})) {
      target.setProperty(name, value);
    }
  }

  setTheme(theme: ColorThemeData) {
    this.theme = createColorThemeData(theme);
  }

  getTheme() {
    return createColorThemeData(this.theme);
  }

  getColor(colorId: ColorIdentifier) {
    const registered = getRegisteredColors().find((color) => color.id === colorId);
    if (!registered) {
      return null;
    }

    return (
      this.theme.colors?.[colorId] ??
      resolveThemeDefaultColor(registered.defaults, this.theme.kind)
    );
  }
}

export const themeService = new ThemeService();

export function createThemeData(
  kind: ThemeKind,
  colors?: Partial<Record<ColorIdentifier, string>>,
  variables?: Record<string, string>,
): ColorThemeData {
  return createColorThemeData({
    kind,
    colors,
    variables,
  });
}
