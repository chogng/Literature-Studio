import 'ls/base/browser/ui/button/button.css';
import { createDropdownView, type DropdownOption, type DropdownView } from 'ls/base/browser/ui/dropdown/dropdown';
import { createHoverController } from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

import type { WritingEditorToolbarState } from 'ls/editor/browser/text/commands';
import type { WritingEditorSurfaceLabels } from 'ls/editor/browser/text/editor';

export type DraftEditorToolbarActions = {
  setParagraph: () => boolean | void;
  toggleHeading: (level: number) => boolean | void;
  toggleBold: () => boolean | void;
  toggleItalic: () => boolean | void;
  setFontFamily: (fontFamily: string | null) => boolean | void;
  setFontSize: (fontSize: string | null) => boolean | void;
  clearInlineStyles: () => boolean | void;
  toggleBulletList: () => boolean | void;
  toggleOrderedList: () => boolean | void;
  toggleBlockquote: () => boolean | void;
  undo: () => boolean | void;
  redo: () => boolean | void;
  insertCitation: () => boolean | void;
  insertFigure: () => boolean | void;
  insertFigureRef: () => boolean | void;
};

export type DraftEditorToolbarProps = {
  labels: WritingEditorSurfaceLabels;
  toolbarState: WritingEditorToolbarState;
  actions: DraftEditorToolbarActions;
};

type ToolbarButtonConfig = {
  label: string;
  onClick: () => void;
  icon?: LxIconName;
  glyph?: string;
  isActive?: boolean;
  disabled?: boolean;
  isToggle?: boolean;
};

type ToolbarDropdownConfig = {
  label: string;
  title?: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
};

type ToolbarGroupConfig = {
  title: string;
  items: readonly (ToolbarButtonConfig | ToolbarDropdownConfig)[];
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

export class DraftEditorToolbar {
  private props: DraftEditorToolbarProps;
  private readonly element = createElement('div', 'pm-toolbar');
  private dropdownViews: DropdownView[] = [];

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
    this.disposeDropdownViews();
    this.element.replaceChildren();
  }

  private render() {
    this.disposeDropdownViews();
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
      [
        { value: '13px', label: '13px' },
        { value: '15px', label: '15px' },
        { value: '16px', label: '16px' },
        { value: '18px', label: '18px' },
        { value: '20px', label: '20px' },
        { value: '24px', label: '24px' },
      ],
      labels.defaultTextStyle,
    );

    return [
      {
        title: labels.textGroup,
        items: [
          {
            label: labels.paragraph,
            glyph: 'Tx',
            onClick: actions.setParagraph,
            isActive: toolbarState.isParagraphActive,
            isToggle: true,
          },
          {
            label: labels.heading1,
            glyph: 'H1',
            onClick: () => actions.toggleHeading(1),
            isActive: toolbarState.activeHeadingLevel === 1,
            isToggle: true,
          },
          {
            label: labels.heading2,
            glyph: 'H2',
            onClick: () => actions.toggleHeading(2),
            isActive: toolbarState.activeHeadingLevel === 2,
            isToggle: true,
          },
          {
            label: labels.heading3,
            glyph: 'H3',
            onClick: () => actions.toggleHeading(3),
            isActive: toolbarState.activeHeadingLevel === 3,
            isToggle: true,
          },
        ],
      },
      {
        title: labels.formatGroup,
        items: [
          {
            label: labels.bold,
            icon: 'bold',
            onClick: actions.toggleBold,
            isActive: toolbarState.isBoldActive,
            isToggle: true,
          },
          {
            label: labels.italic,
            icon: 'italics',
            onClick: actions.toggleItalic,
            isActive: toolbarState.isItalicActive,
            isToggle: true,
          },
          {
            label: labels.fontFamily,
            title: labels.fontFamily,
            value: toolbarState.fontFamily ?? '',
            placeholder: labels.fontFamily,
            options: fontFamilyOptions,
            onChange: (value) => actions.setFontFamily(value || null),
          },
          {
            label: labels.fontSize,
            title: labels.fontSize,
            value: toolbarState.fontSize ?? '',
            placeholder: labels.fontSize,
            options: fontSizeOptions,
            onChange: (value) => actions.setFontSize(value || null),
          },
          {
            label: labels.clearInlineStyles,
            icon: 'circle-slash',
            onClick: actions.clearInlineStyles,
          },
          {
            label: labels.bulletList,
            icon: 'list-unordered',
            onClick: actions.toggleBulletList,
            isActive: toolbarState.isBulletListActive,
            isToggle: true,
          },
          {
            label: labels.orderedList,
            icon: 'list-ordered',
            onClick: actions.toggleOrderedList,
            isActive: toolbarState.isOrderedListActive,
            isToggle: true,
          },
          {
            label: labels.blockquote,
            icon: 'quote',
            onClick: actions.toggleBlockquote,
            isActive: toolbarState.isBlockquoteActive,
            isToggle: true,
          },
        ],
      },
      {
        title: labels.insertGroup,
        items: [
          {
            label: labels.insertCitation,
            icon: 'quotes',
            onClick: actions.insertCitation,
          },
          {
            label: labels.insertFigure,
            icon: 'image',
            onClick: actions.insertFigure,
          },
          {
            label: labels.insertFigureRef,
            icon: 'mention',
            onClick: actions.insertFigureRef,
          },
        ],
      },
      {
        title: labels.historyGroup,
        items: [
          {
            label: labels.undo,
            icon: 'arrow-left',
            onClick: actions.undo,
            disabled: !toolbarState.canUndo,
          },
          {
            label: labels.redo,
            icon: 'arrow-right',
            onClick: actions.redo,
            disabled: !toolbarState.canRedo,
          },
        ],
      },
    ];
  }

  private createToolbarGroup(groupConfig: ToolbarGroupConfig) {
    const group = createElement('section', 'pm-toolbar-group');
    const actions = createElement('div', 'pm-toolbar-group-actions');
    const title = createElement('div', 'pm-toolbar-group-title');

    title.textContent = groupConfig.title;

    for (const itemConfig of groupConfig.items) {
      if ('options' in itemConfig) {
        actions.append(this.createToolbarDropdown(itemConfig));
      } else {
        actions.append(this.createToolbarButton(itemConfig));
      }
    }

    group.append(actions, title);
    return group;
  }

  private createToolbarDropdown(dropdownConfig: ToolbarDropdownConfig) {
    const dropdown = createDropdownView({
      size: 'sm',
      className: 'pm-toolbar-dropdown',
      menuMode: 'dom',
      domMenuLayer: 'portal',
      title: dropdownConfig.title,
      value: dropdownConfig.value,
      placeholder: dropdownConfig.placeholder,
      options: dropdownConfig.options,
      onChange: ({ target }) => {
        dropdownConfig.onChange(target.value);
      },
    });
    this.dropdownViews.push(dropdown);
    return dropdown.getElement();
  }

  private createToolbarButton(buttonConfig: ToolbarButtonConfig) {
    const button = createElement(
      'button',
      [
        'pm-toolbar-btn',
        'btn-base',
        'btn-ghost',
        'btn-mode-icon',
        'btn-sm',
        buttonConfig.isActive ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const iconSlot = createElement('span', 'pm-toolbar-btn-icon');
    button.type = 'button';
    button.disabled = Boolean(buttonConfig.disabled);
    button.setAttribute('aria-label', buttonConfig.label);
    createHoverController(button, buttonConfig.label);
    if (buttonConfig.isToggle) {
      button.setAttribute('aria-pressed', String(Boolean(buttonConfig.isActive)));
    }
    button.addEventListener('mousedown', (event) => {
      // Keep the ProseMirror selection alive while toolbar commands run.
      event.preventDefault();
    });
    button.addEventListener('click', buttonConfig.onClick);

    if (buttonConfig.icon) {
      iconSlot.append(createLxIcon(buttonConfig.icon));
    } else if (buttonConfig.glyph) {
      const glyph = createElement('span', 'pm-toolbar-btn-glyph');
      glyph.textContent = buttonConfig.glyph;
      iconSlot.append(glyph);
    }

    button.append(iconSlot);
    return button;
  }

  private disposeDropdownViews() {
    for (const dropdownView of this.dropdownViews) {
      dropdownView.dispose();
    }
    this.dropdownViews = [];
  }
}

export function createDraftEditorToolbar(props: DraftEditorToolbarProps) {
  return new DraftEditorToolbar(props);
}

export default DraftEditorToolbar;
