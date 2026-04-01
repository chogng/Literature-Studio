import type { TranslationProviderId, TranslationProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import { ApiKeyFieldView } from 'ls/workbench/contrib/preferences/browser/apiKeyField';

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

function setFocusKey<T extends HTMLElement>(node: T, key: string) {
  node.dataset.focusKey = key;
  return node;
}

function buildHint(value: string, className = 'settings-hint') {
  const hint = el('p', className);
  hint.textContent = value;
  return hint;
}

function buildSelect(options: readonly { value: string; label: string }[], value: string, focusKey: string, onChange: (value: string) => void, className: string) {
  const select = setFocusKey(el('select', `settings-native-select ${className}`.trim()), focusKey);
  for (const option of options) {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.text = option.label;
    select.append(optionElement);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

export type TranslationFieldViewProps = {
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

export class TranslationFieldView {
  private props: TranslationFieldViewProps;
  private readonly element = el('div', 'settings-field');
  private readonly apiKeyField = new ApiKeyFieldView({
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

  constructor(props: TranslationFieldViewProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: TranslationFieldViewProps) {
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
    this.apiKeyField.setProps({
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
    grid.append(this.apiKeyField.getElement());
    field.append(title, buildHint(this.props.labels.settingsTranslationHint), grid);
    return field;
  }
}
