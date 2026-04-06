import type { DropdownOption } from 'ls/base/browser/ui/dropdown/dropdown';
import { resolvePrimaryFontFamily } from 'ls/base/common/editorFormat';
import type { EditorDraftStyleOption } from 'ls/editor/browser/text/editorDraftStyleCatalog';
import {
  editorDraftStyleStore,
  type EditorDraftStyleStoreSnapshot,
} from 'ls/editor/browser/text/editorDraftStyleStore';

export type EditorDraftToolbarFontModel = {
  currentValue: string;
  currentLabel: string;
  options: readonly DropdownOption[];
};

export type EditorDraftToolbarFontSizeModel = EditorDraftToolbarFontModel & {
  defaultValue: string;
};

export type EditorDraftToolbarStyleModel = {
  fontFamily: EditorDraftToolbarFontModel;
  fontSize: EditorDraftToolbarFontSizeModel;
};

type BuildEditorDraftToolbarStyleModelParams = {
  fontFamilyValue: string | null;
  fontSizeValue: string | null;
  defaultTextStyleLabel: string;
  snapshot?: EditorDraftStyleStoreSnapshot;
};

const fontAvailabilityCache = new Map<string, boolean>();
let cachedFontSetReference: object | null = null;

function normalizeFontFamilyValue(value: string) {
  return value
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean)
    .join(',');
}

function isPrimaryFontAvailable(value: string) {
  const primaryFamily = resolvePrimaryFontFamily(value);
  if (!primaryFamily) {
    return true;
  }

  if (typeof document === 'undefined') {
    return true;
  }

  const fontSet = (document as Document & {
    fonts?: {
      check?: (font: string, text?: string) => boolean;
    };
  }).fonts;
  const fontSetReference = (fontSet ?? null) as object | null;

  if (cachedFontSetReference !== fontSetReference) {
    fontAvailabilityCache.clear();
    cachedFontSetReference = fontSetReference;
  }

  const cachedResult = fontAvailabilityCache.get(primaryFamily);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const isAvailable = typeof fontSet?.check === 'function'
    ? fontSet.check(`12px "${primaryFamily}"`, 'A中')
    : true;

  fontAvailabilityCache.set(primaryFamily, isAvailable);
  return isAvailable;
}

function withFontAvailability(option: DropdownOption) {
  if (!option.value) {
    return option;
  }

  if (isPrimaryFontAvailable(option.value)) {
    return option;
  }

  return {
    ...option,
    label: `${option.label} (未安装)`,
    title: `${option.title ?? option.label} · 当前系统未检测到该字体，实际显示会回退到后备字体`,
    disabled: true,
  } satisfies DropdownOption;
}

function toDropdownOption(option: EditorDraftStyleOption): DropdownOption {
  return {
    value: option.value,
    label: option.label,
    title: option.title,
  };
}

function createTextStyleOptions(
  currentValue: string | null,
  presetValues: readonly DropdownOption[],
  defaultLabel: string,
  config?: {
    matchesPresetValue?: (currentValue: string, presetValue: string) => boolean;
    includeDefaultOption?: boolean;
  },
) {
  const options: DropdownOption[] = [];
  if (config?.includeDefaultOption ?? true) {
    options.push({
      value: '',
      label: defaultLabel,
    });
  }

  const seenValues = new Set<string>();
  const appendOption = (option: DropdownOption) => {
    const normalized = option.value.trim();
    if (!normalized || seenValues.has(normalized)) {
      return;
    }
    seenValues.add(normalized);
    options.push({
      value: normalized,
      label: option.label,
      title: option.title ?? normalized,
      disabled: option.disabled,
    });
  };

  const appendAliasOption = (value: string, option: DropdownOption) => {
    const normalized = value.trim();
    if (!normalized || seenValues.has(normalized)) {
      return;
    }
    seenValues.add(normalized);
    options.push({
      value: normalized,
      label: option.label,
      title: option.title ?? normalized,
      disabled: option.disabled,
    });
  };

  const appendRawValue = (value: string) => {
    const normalized = value.trim();
    if (!normalized || seenValues.has(normalized)) {
      return;
    }
    seenValues.add(normalized);
    options.push({
      value: normalized,
      label: normalized,
      title: normalized,
    });
  };

  const matchedPreset = currentValue
    ? presetValues.find((option) => {
        if (option.value.trim() === currentValue.trim()) {
          return true;
        }

        return config?.matchesPresetValue?.(currentValue, option.value) ?? false;
      }) ?? null
    : null;

  // Keep the current selection visible even when the browser normalizes
  // the value format (for example, quoted/unquoted font-family lists).
  if (currentValue && matchedPreset) {
    appendAliasOption(currentValue, matchedPreset);
  } else if (currentValue) {
    appendRawValue(currentValue);
  }

  for (const presetValue of presetValues) {
    appendOption(presetValue);
  }

  return options;
}

export function createEditorDraftToolbarStyleModel(
  params: BuildEditorDraftToolbarStyleModelParams,
): EditorDraftToolbarStyleModel {
  const snapshot = params.snapshot ?? editorDraftStyleStore.getSnapshot();
  const fontFamilyOptions = createTextStyleOptions(
    params.fontFamilyValue,
    snapshot.fontFamilyPresets.map(toDropdownOption).map(withFontAvailability),
    params.defaultTextStyleLabel,
    {
      matchesPresetValue: (currentValue, presetValue) =>
        normalizeFontFamilyValue(currentValue) === normalizeFontFamilyValue(presetValue),
    },
  );

  const fontSizeOptions = createTextStyleOptions(
    params.fontSizeValue,
    snapshot.fontSizePresets.map(toDropdownOption),
    snapshot.defaultFontSizePresetName,
    {
      includeDefaultOption: false,
    },
  );

  const fontFamilyCurrentValue = params.fontFamilyValue?.trim() ?? '';
  const fontFamilyCurrentOption = fontFamilyOptions.find(
    (option) => option.value === fontFamilyCurrentValue,
  ) ?? null;

  const defaultFontSizeOption = fontSizeOptions.find(
    (option) => option.value === snapshot.defaultFontSizeValue,
  ) ?? fontSizeOptions.find(
    (option) => option.label === snapshot.defaultFontSizePresetName,
  ) ?? null;
  const fontSizeCurrentValue = params.fontSizeValue?.trim() ?? '';
  const fontSizeCurrentOption = fontSizeOptions.find(
    (option) => option.value === fontSizeCurrentValue,
  ) ?? (!fontSizeCurrentValue ? defaultFontSizeOption : null);

  return {
    fontFamily: {
      currentValue: fontFamilyCurrentValue,
      currentLabel:
        (fontFamilyCurrentOption?.label ?? fontFamilyCurrentValue) || params.defaultTextStyleLabel,
      options: fontFamilyOptions,
    },
    fontSize: {
      currentValue: fontSizeCurrentValue,
      currentLabel:
        (fontSizeCurrentOption?.label ?? fontSizeCurrentValue)
        || defaultFontSizeOption?.label
        || params.defaultTextStyleLabel,
      defaultValue: defaultFontSizeOption?.value ?? snapshot.defaultFontSizeValue,
      options: fontSizeOptions,
    },
  };
}
