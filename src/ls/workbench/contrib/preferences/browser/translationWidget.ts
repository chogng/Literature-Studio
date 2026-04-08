import type { TranslationProviderId, TranslationProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
import { SelectBox } from 'ls/base/browser/ui/selectbox/selectBox';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import { ApiKeyWidget } from 'ls/workbench/contrib/preferences/browser/apiKeyWidget';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function text(value: string | number) {
  return document.createTextNode(String(value));
}

function buildHint(value: string, className = 'settings-hint') {
  const hint = el('p', className);
  hint.textContent = value;
  return hint;
}

type SelectOption = {
  value: string;
  label: string;
  title?: string;
  isDisabled?: boolean;
};

function buildSelect(options: readonly SelectOption[], value: string, focusKey: string, onChange: (value: string) => void, className: string) {
  const selectBox = new SelectBox(
    options.map((option) => ({
      text: option.label,
      value: option.value,
      title: option.title ?? option.label,
      isDisabled: option.isDisabled,
    })),
    Math.max(0, options.findIndex((option) => option.value === value)),
    undefined,
    {},
    {
      useCustomDrawn: true,
      className: `settings-native-select ${className}`.trim(),
    },
  );
  const host = el('div');
  selectBox.render(host);
  selectBox.onDidSelect(({ selected }) => onChange(selected));
  selectBox.domNode.dataset.focusKey = focusKey;
  return host;
}

export type TranslationWidgetProps = {
  labels: SettingsPartLabels;
  activeTranslationProvider: TranslationProviderId;
  translationProviders: Record<TranslationProviderId, TranslationProviderSettings>;
  isSettingsSaving: boolean;
  isTestingTranslationConnection: boolean;
  showApiKey: boolean;
  onToggleShowApiKey: () => void;
  onActiveTranslationProviderChange: (provider: TranslationProviderId) => void;
  onTranslationProviderApiKeyChange: (provider: TranslationProviderId, apiKey: string) => void;
  onTestTranslationConnection: () => void;
};

export class TranslationWidget {
  private props: TranslationWidgetProps;
  private readonly element = el('div', 'settings-field');
  private readonly apiKeyWidget = new ApiKeyWidget({
    title: '',
    value: '',
    placeholder: '',
    show: false,
    focusKey: 'settings.translation.apiKey',
    toggleKey: 'settings.translation.apiKey.toggle',
    toggleLabelShow: '',
    toggleLabelHide: '',
    onToggle: () => this.props.onToggleShowApiKey(),
    onInput: (value) => this.props.onTranslationProviderApiKeyChange(this.props.activeTranslationProvider, value),
    testButtonLabel: '',
    testButtonKey: 'settings.translation.test',
    testButtonDisabled: false,
    onTest: () => this.props.onTestTranslationConnection(),
  });

  constructor(props: TranslationWidgetProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: TranslationWidgetProps) {
    this.props = props;
    this.element.replaceChildren(this.render());
  }

  private render() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsTranslationTitle;
    const grid = el('div', 'settings-llm-grid');
    const providerField = el('label', 'settings-field');
    providerField.append(
      text(this.props.labels.settingsTranslationProvider),
      buildSelect([{ value: 'deepl', label: this.props.labels.settingsTranslationProviderDeepL }], this.props.activeTranslationProvider, 'settings.translation.provider', (value) => this.props.onActiveTranslationProviderChange(value as TranslationProviderId), 'settings-llm-provider'),
    );
    grid.append(providerField);
    this.apiKeyWidget.setProps({
      title: this.props.labels.settingsTranslationApiKey,
      value: this.props.translationProviders[this.props.activeTranslationProvider].apiKey,
      placeholder: this.props.labels.settingsTranslationApiKeyPlaceholder,
      show: this.props.showApiKey,
      focusKey: 'settings.translation.apiKey',
      toggleKey: 'settings.translation.apiKey.toggle',
      toggleLabelShow: this.props.labels.settingsTranslationShowApiKey,
      toggleLabelHide: this.props.labels.settingsTranslationHideApiKey,
      onToggle: () => this.props.onToggleShowApiKey(),
      onInput: (value) => this.props.onTranslationProviderApiKeyChange(this.props.activeTranslationProvider, value),
      testButtonLabel: this.props.labels.settingsTranslationTestConnection,
      testButtonKey: 'settings.translation.test',
      testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingTranslationConnection,
      onTest: () => this.props.onTestTranslationConnection(),
    });
    grid.append(this.apiKeyWidget.getElement());
    field.append(title, buildHint(this.props.labels.settingsTranslationHint), grid);
    return field;
  }
}
