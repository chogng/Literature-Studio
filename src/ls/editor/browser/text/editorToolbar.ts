import {
  createActionBarView,
  type ActionBarItem,
  type ActionView,
} from 'ls/base/browser/ui/actionbar/actionbar';
import {
  createDomDropdownMenuPresenter,
  createDropdownView,
  type DropdownOption,
} from 'ls/base/browser/ui/dropdown/dropdown';
import { getHoverService } from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { EDITOR_NAMED_FONT_SIZE_PRESETS } from 'ls/base/common/editorFormat';

import type { WritingEditorToolbarState } from 'ls/editor/browser/text/commands';
import {
  createWritingEditorToolbarButtonGroups,
  type WritingEditorToolbarActions,
  type WritingEditorToolbarButtonConfig,
  type WritingEditorToolbarDropdownConfig,
  type WritingEditorToolbarItemConfig,
  type WritingEditorToolbarSplitButtonConfig,
} from 'ls/editor/browser/text/editorCommandRegistry';
import type { WritingEditorSurfaceLabels } from 'ls/editor/browser/text/editor';

export type DraftEditorToolbarActions = WritingEditorToolbarActions;

export type DraftEditorToolbarProps = {
  labels: WritingEditorSurfaceLabels;
  toolbarState: WritingEditorToolbarState;
  actions: DraftEditorToolbarActions;
};

type ToolbarGroupConfig = {
  title: string;
  items: readonly WritingEditorToolbarItemConfig[];
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

const hoverService = getHoverService();

function normalizeFontFamilyValue(value: string) {
  return value
    .split(',')
    .map((family) => family.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean)
    .join(',');
}

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'math',
  'emoji',
  'fangsong',
]);

const fontAvailabilityCache = new Map<string, boolean>();
let cachedFontSetReference: object | null = null;

function getPrimaryFontFamily(value: string) {
  const [firstFamily] = value.split(',');
  const normalized = firstFamily?.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
  if (!normalized) {
    return null;
  }

  return GENERIC_FONT_FAMILIES.has(normalized.toLowerCase()) ? null : normalized;
}

function isPrimaryFontAvailable(value: string) {
  const primaryFamily = getPrimaryFontFamily(value);
  if (!primaryFamily) {
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

const FONT_SIZE_PRESETS: readonly DropdownOption[] = [
  ...EDITOR_NAMED_FONT_SIZE_PRESETS.map((preset) => ({
    value: `${preset.cssPx}px`,
    label: preset.name,
    title: `${preset.name} / ${preset.pointSize}pt / ${preset.cssPx}px`,
  })),
];

export class DraftEditorToolbar {
  private props: DraftEditorToolbarProps;
  private readonly element = createElement('div', 'editor-draft-toolbar');
  private toolbarViews: Array<{ dispose: () => void }> = [];

  constructor(props: DraftEditorToolbarProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: DraftEditorToolbarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.disposeToolbarViews();
    this.element.replaceChildren();
  }

  private render() {
    this.disposeToolbarViews();
    const fragment = document.createDocumentFragment();
    for (const group of this.createToolbarGroups()) {
      fragment.append(this.createToolbarGroup(group));
    }
    this.element.replaceChildren(fragment);
  }

  private createTextStyleOptions(
    currentValue: string | null,
    presetValues: readonly DropdownOption[],
    defaultLabel: string,
    config?: {
      matchesPresetValue?: (currentValue: string, presetValue: string) => boolean;
    },
  ) {
    const options: DropdownOption[] = [
      {
        value: '',
        label: defaultLabel,
      },
    ];

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

  private createToolbarGroups(): readonly ToolbarGroupConfig[] {
    const { labels, toolbarState, actions } = this.props;
    const fontFamilyPresets: DropdownOption[] = [
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
    ];
    const fontFamilyOptions = this.createTextStyleOptions(
      toolbarState.fontFamily,
      fontFamilyPresets.map(withFontAvailability),
      labels.defaultTextStyle,
      {
        matchesPresetValue: (currentValue, presetValue) =>
          normalizeFontFamilyValue(currentValue) === normalizeFontFamilyValue(presetValue),
      },
    );
    const fontSizeOptions = this.createTextStyleOptions(
      toolbarState.fontSize,
      FONT_SIZE_PRESETS,
      labels.defaultTextStyle,
    );

    const buttonGroups = createWritingEditorToolbarButtonGroups({
      labels,
      toolbarState,
      actions,
      dropdownOptions: {
        setFontFamily: fontFamilyOptions,
        setFontSize: fontSizeOptions,
      },
    });

    return buttonGroups;
  }

  private createToolbarGroup(groupConfig: ToolbarGroupConfig) {
    const actionBarView = createActionBarView({
      className: 'editor-draft-toolbar-group',
      ariaLabel: groupConfig.title,
      items: groupConfig.items.map<ActionBarItem>((itemConfig) => {
        if ('menu' in itemConfig) {
          return this.createToolbarSplitButton(itemConfig);
        }

        if ('options' in itemConfig) {
          return this.createToolbarDropdown(itemConfig);
        }

        return this.createToolbarButton(itemConfig);
      }),
    });
    const group = actionBarView.getElement();

    group.addEventListener('mousedown', (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest('.actionbar-action')) {
        return;
      }

      // Keep the ProseMirror selection alive while toolbar commands run.
      event.preventDefault();
    });

    this.toolbarViews.push(actionBarView);
    return group;
  }

  private createToolbarDropdown(dropdownConfig: WritingEditorToolbarDropdownConfig) {
    const menuPresenter = createDomDropdownMenuPresenter({ layer: 'portal' });
    const dropdown = createDropdownView({
      className: 'editor-draft-toolbar-dropdown',
      menuPresenter,
      title: dropdownConfig.title,
      value: dropdownConfig.value,
      placeholder: dropdownConfig.placeholder,
      options: [...dropdownConfig.options],
      onChange: ({ target }) => {
        dropdownConfig.onChange(target.value);
      },
    });

    return {
      render: (container?: HTMLElement) => {
        if (!container) {
          return;
        }
        container.replaceChildren(dropdown.getElement());
      },
      getElement: () => dropdown.getElement(),
      getFocusableElement: () => dropdown.getElement(),
      focus: () => {
        dropdown.focus();
      },
      blur: () => {
        dropdown.blur();
      },
      dispose: () => {
        menuPresenter.dispose();
        dropdown.dispose();
      },
    } satisfies ActionView;
  }

  private createToolbarSplitButton(splitButtonConfig: WritingEditorToolbarSplitButtonConfig) {
    const primaryContent = createElement('span', 'editor-draft-toolbar-btn-icon');
    if (splitButtonConfig.buttonIcon) {
      primaryContent.append(createLxIcon(splitButtonConfig.buttonIcon));
    }

    if (splitButtonConfig.buttonText) {
      const text = createElement('span', 'editor-draft-toolbar-btn-label');
      text.textContent = splitButtonConfig.buttonText;
      primaryContent.append(text);
    } else if (!splitButtonConfig.buttonIcon) {
      const glyph = createElement('span', 'editor-draft-toolbar-btn-glyph');
      glyph.textContent = splitButtonConfig.buttonGlyph ?? splitButtonConfig.buttonLabel;
      primaryContent.append(glyph);
    }

    return {
      type: 'split',
      className: 'actionbar-split editor-draft-toolbar-split',
      primary: {
        label: splitButtonConfig.buttonLabel,
        hover: splitButtonConfig.buttonLabel,
        content: primaryContent,
        mode: 'custom',
        buttonClassName: 'editor-draft-toolbar-btn editor-draft-toolbar-split-primary',
        onClick: () => {
          splitButtonConfig.onClick();
        },
        hoverService,
      },
      dropdown: {
        label: splitButtonConfig.label,
        title: splitButtonConfig.title,
        content: createLxIcon('chevron-down'),
        mode: 'custom',
        buttonClassName: 'editor-draft-toolbar-btn editor-draft-toolbar-split-dropdown',
        menu: splitButtonConfig.menu.map((item, index) => ({
          id: `${splitButtonConfig.label}-${index}`,
          label: item.label,
          title: item.title,
          checked: item.checked,
          onClick: () => {
            item.onClick();
          },
        })),
        hoverService,
      },
    } satisfies ActionBarItem;
  }

  private createToolbarButton(buttonConfig: WritingEditorToolbarButtonConfig) {
    const iconSlot = createElement('span', 'editor-draft-toolbar-btn-icon');

    if (buttonConfig.icon) {
      iconSlot.append(createLxIcon(buttonConfig.icon));
    } else if (buttonConfig.glyph) {
      const glyph = createElement('span', 'editor-draft-toolbar-btn-glyph');
      glyph.textContent = buttonConfig.glyph;
      iconSlot.append(glyph);
    }

    return {
      id: buttonConfig.label,
      label: buttonConfig.label,
      hover: buttonConfig.label,
      content: iconSlot,
      mode: 'custom',
      active: Boolean(buttonConfig.isActive),
      disabled: Boolean(buttonConfig.disabled),
      buttonClassName: 'editor-draft-toolbar-btn',
      buttonAttributes: buttonConfig.isToggle
        ? { 'aria-pressed': String(Boolean(buttonConfig.isActive)) }
        : undefined,
      hoverService,
      onClick: () => {
        buttonConfig.onClick();
      },
    } satisfies ActionBarItem;
  }

  private disposeToolbarViews() {
    for (const toolbarView of this.toolbarViews) {
      toolbarView.dispose();
    }
    this.toolbarViews = [];
  }
}

export function createDraftEditorToolbar(props: DraftEditorToolbarProps) {
  return new DraftEditorToolbar(props);
}

export default DraftEditorToolbar;
