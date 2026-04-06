import {
  DEFAULT_EDITOR_BODY_FONT_SIZE_PRESET_NAME,
  DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE,
  EDITOR_NAMED_FONT_SIZE_PRESETS,
} from 'ls/base/common/editorFormat';
import type { EditorNamedFontSizeName } from 'ls/base/common/editorFormat';

export type EditorDraftStyleOption = {
  value: string;
  label: string;
  title?: string;
};

export type EditorDraftStyleCatalogSnapshot = {
  defaultFontSizePresetName: EditorNamedFontSizeName;
  defaultFontSizeValue: string;
  fontFamilyPresets: readonly EditorDraftStyleOption[];
  fontSizePresets: readonly EditorDraftStyleOption[];
};

const EDITOR_DRAFT_FONT_FAMILY_PRESETS: readonly EditorDraftStyleOption[] = Object.freeze([
  {
    value: '"Times New Roman", Times, serif',
    label: 'Times New Roman',
    title: 'Times New Roman',
  },
  {
    value: 'Arial, sans-serif',
    label: 'Arial',
    title: 'Arial',
  },
  {
    value: '"宋体", "SimSun", "Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC", serif',
    label: '宋体',
    title: '宋体 / SimSun / Songti SC',
  },
  {
    value: '"黑体", "SimHei", "Heiti SC", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
    label: '黑体',
    title: '黑体 / SimHei / Heiti SC',
  },
  {
    value: '"楷体", "KaiTi", "Kaiti SC", "STKaiti", serif',
    label: '楷体',
    title: '楷体 / KaiTi / Kaiti SC',
  },
  {
    value: '"Source Han Serif SC", "Noto Serif CJK SC", serif',
    label: '中文衬线',
    title: 'Source Han Serif SC',
  },
  {
    value: '"Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
    label: '中文黑体',
    title: 'Source Han Sans SC',
  },
  {
    value: '"IBM Plex Serif", serif',
    label: 'English Serif',
    title: 'IBM Plex Serif',
  },
  {
    value: '"IBM Plex Sans", sans-serif',
    label: 'English Sans',
    title: 'IBM Plex Sans',
  },
  {
    value: '"JetBrains Mono", monospace',
    label: 'Mono',
    title: 'JetBrains Mono',
  },
]);

const EDITOR_DRAFT_FONT_SIZE_PRESETS: readonly EditorDraftStyleOption[] = Object.freeze(
  EDITOR_NAMED_FONT_SIZE_PRESETS.map((preset) => ({
    value: `${preset.cssPx}px`,
    label: preset.name,
    title: `${preset.name} / ${preset.pointSize}pt / ${preset.cssPx}px`,
  })),
);

const EDITOR_DRAFT_STYLE_CATALOG_SNAPSHOT: EditorDraftStyleCatalogSnapshot = Object.freeze({
  defaultFontSizePresetName: DEFAULT_EDITOR_BODY_FONT_SIZE_PRESET_NAME,
  defaultFontSizeValue: DEFAULT_EDITOR_BODY_FONT_SIZE_VALUE,
  fontFamilyPresets: EDITOR_DRAFT_FONT_FAMILY_PRESETS,
  fontSizePresets: EDITOR_DRAFT_FONT_SIZE_PRESETS,
});

export function getEditorDraftStyleCatalogSnapshot() {
  return EDITOR_DRAFT_STYLE_CATALOG_SNAPSHOT;
}
