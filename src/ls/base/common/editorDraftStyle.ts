import {
  DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE,
  getEditorTypographySpec,
  resolveEditorFontSize,
} from 'ls/base/common/editorFormat';

export type EditorDraftInlineStyleDefaults = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export type EditorDraftDefaultBodyStyle = {
  fontFamilyValue: string;
  fontSizeValue: string;
  lineHeight: number;
  color: string;
  inlineStyleDefaults: EditorDraftInlineStyleDefaults;
};

export type EditorDraftStyleSettings = {
  defaultBodyStyle: EditorDraftDefaultBodyStyle;
};

export const DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE =
  '"等线", "DengXian", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", sans-serif';
const DEFAULT_EDITOR_DRAFT_PARAGRAPH_TYPOGRAPHY = getEditorTypographySpec('paragraph');
export const DEFAULT_EDITOR_DRAFT_BODY_COLOR = `#${DEFAULT_EDITOR_DRAFT_PARAGRAPH_TYPOGRAPHY.color}`;

function normalizeEditorDraftFontFamilyValue(value: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE;
}

function normalizeEditorDraftFontSizeValue(value: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  const resolvedFontSize = resolveEditorFontSize(normalized);

  if (!resolvedFontSize) {
    return DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE;
  }

  return `${resolvedFontSize.cssPx}px`;
}

function normalizeEditorDraftLineHeight(value: number) {
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_EDITOR_DRAFT_PARAGRAPH_TYPOGRAPHY.lineHeight;
}

function normalizeEditorDraftColor(value: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || DEFAULT_EDITOR_DRAFT_BODY_COLOR;
}

export function createDefaultEditorDraftStyleSettings(): EditorDraftStyleSettings {
  return {
    defaultBodyStyle: {
      fontFamilyValue: DEFAULT_EDITOR_DRAFT_FONT_FAMILY_VALUE,
      fontSizeValue: DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE,
      lineHeight: DEFAULT_EDITOR_DRAFT_PARAGRAPH_TYPOGRAPHY.lineHeight,
      color: DEFAULT_EDITOR_DRAFT_BODY_COLOR,
      inlineStyleDefaults: {
        bold: false,
        italic: false,
        underline: false,
      },
    },
  };
}

export function cloneEditorDraftStyleSettings(
  settings: EditorDraftStyleSettings,
): EditorDraftStyleSettings {
  return {
    defaultBodyStyle: {
      fontFamilyValue: settings.defaultBodyStyle.fontFamilyValue,
      fontSizeValue: settings.defaultBodyStyle.fontSizeValue,
      lineHeight: settings.defaultBodyStyle.lineHeight,
      color: settings.defaultBodyStyle.color,
      inlineStyleDefaults: {
        bold: settings.defaultBodyStyle.inlineStyleDefaults.bold,
        italic: settings.defaultBodyStyle.inlineStyleDefaults.italic,
        underline: settings.defaultBodyStyle.inlineStyleDefaults.underline,
      },
    },
  };
}

export function normalizeEditorDraftStyleSettings(
  settings: EditorDraftStyleSettings | null | undefined,
): EditorDraftStyleSettings {
  const fallbackSettings = createDefaultEditorDraftStyleSettings();
  const baseSettings = settings && typeof settings === 'object' ? settings : fallbackSettings;
  const defaultBodyStyle =
    baseSettings.defaultBodyStyle && typeof baseSettings.defaultBodyStyle === 'object'
      ? baseSettings.defaultBodyStyle
      : fallbackSettings.defaultBodyStyle;
  const inlineStyleDefaults =
    defaultBodyStyle.inlineStyleDefaults && typeof defaultBodyStyle.inlineStyleDefaults === 'object'
      ? defaultBodyStyle.inlineStyleDefaults
      : fallbackSettings.defaultBodyStyle.inlineStyleDefaults;

  return {
    defaultBodyStyle: {
      fontFamilyValue: normalizeEditorDraftFontFamilyValue(defaultBodyStyle.fontFamilyValue),
      fontSizeValue: normalizeEditorDraftFontSizeValue(defaultBodyStyle.fontSizeValue),
      lineHeight: normalizeEditorDraftLineHeight(defaultBodyStyle.lineHeight),
      color: normalizeEditorDraftColor(defaultBodyStyle.color),
      inlineStyleDefaults: {
        bold: Boolean(inlineStyleDefaults?.bold),
        italic: Boolean(inlineStyleDefaults?.italic),
        underline: Boolean(inlineStyleDefaults?.underline),
      },
    },
  };
}

export function areEditorDraftStyleSettingsEqual(
  previous: EditorDraftStyleSettings,
  next: EditorDraftStyleSettings,
) {
  return (
    previous.defaultBodyStyle.fontFamilyValue === next.defaultBodyStyle.fontFamilyValue &&
    previous.defaultBodyStyle.fontSizeValue === next.defaultBodyStyle.fontSizeValue &&
    previous.defaultBodyStyle.lineHeight === next.defaultBodyStyle.lineHeight &&
    previous.defaultBodyStyle.color === next.defaultBodyStyle.color &&
    previous.defaultBodyStyle.inlineStyleDefaults.bold === next.defaultBodyStyle.inlineStyleDefaults.bold &&
    previous.defaultBodyStyle.inlineStyleDefaults.italic === next.defaultBodyStyle.inlineStyleDefaults.italic &&
    previous.defaultBodyStyle.inlineStyleDefaults.underline === next.defaultBodyStyle.inlineStyleDefaults.underline
  );
}
