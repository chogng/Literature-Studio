import type { LlmProviderId, LlmProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';
import { getDefaultModelForProvider, getLlmModelsForProvider } from 'ls/workbench/services/llm/registry';
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

export type LlmFieldViewProps = {
  labels: SettingsPartLabels;
  activeLlmProvider: LlmProviderId;
  llmProviders: Record<LlmProviderId, LlmProviderSettings>;
  isSettingsSaving: boolean;
  isTestingLlmConnection: boolean;
  showApiKey: boolean;
  onToggleShowApiKey: () => void;
  onActiveLlmProviderChange: (provider: LlmProviderId) => void;
  onLlmProviderApiKeyChange: (provider: LlmProviderId, apiKey: string) => void;
  onLlmProviderModelChange: (provider: LlmProviderId, model: string) => void;
  onTestLlmConnection: () => void;
};

export class LlmFieldView {
  private props: LlmFieldViewProps;
  private readonly element = el('div', 'settings-field');
  private readonly apiKeyField = new ApiKeyFieldView({
    title: '',
    value: '',
    placeholder: '',
    show: false,
    focusKey: 'settings.llm.apiKey',
    toggleKey: 'settings.llm.apiKey.toggle',
    toggleLabelShow: '',
    toggleLabelHide: '',
    onToggle: () => this.props.onToggleShowApiKey(),
    onInput: (value) => this.props.onLlmProviderApiKeyChange(this.props.activeLlmProvider, value),
    testButtonLabel: '',
    testButtonKey: 'settings.llm.test',
    testButtonDisabled: false,
    onTest: () => this.props.onTestLlmConnection(),
    className: 'settings-field settings-llm-api-field',
  });

  constructor(props: LlmFieldViewProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: LlmFieldViewProps) {
    this.props = props;
    this.element.replaceChildren(this.render());
  }

  private render() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsLlmTitle;
    const grid = el('div', 'settings-llm-grid');
    const provider = this.props.llmProviders[this.props.activeLlmProvider];
    const models = getLlmModelsForProvider(this.props.activeLlmProvider).map((model) => ({ value: model.id, label: model.label }));
    const selectedModel = models.find((model) => model.value === provider.model)?.value ?? getDefaultModelForProvider(this.props.activeLlmProvider);
    const providerField = el('label', 'settings-field');
    providerField.append(
      text(this.props.labels.settingsLlmProvider),
      buildSelect([
        { value: 'glm', label: this.props.labels.settingsLlmProviderGlm },
        { value: 'kimi', label: this.props.labels.settingsLlmProviderKimi },
        { value: 'deepseek', label: this.props.labels.settingsLlmProviderDeepSeek },
      ], this.props.activeLlmProvider, 'settings.llm.provider', (value) => this.props.onActiveLlmProviderChange(value as LlmProviderId), 'settings-llm-provider'),
    );
    const modelField = el('label', 'settings-field');
    modelField.append(
      text(this.props.labels.settingsLlmModel),
      buildSelect(models, selectedModel, 'settings.llm.model', (value) => this.props.onLlmProviderModelChange(this.props.activeLlmProvider, value), 'settings-llm-provider'),
    );
    grid.append(providerField, modelField);
    this.apiKeyField.setProps({
      title: this.props.labels.settingsLlmApiKey,
      value: provider.apiKey,
      placeholder: this.props.labels.settingsLlmApiKeyPlaceholder,
      show: this.props.showApiKey,
      focusKey: 'settings.llm.apiKey',
      toggleKey: 'settings.llm.apiKey.toggle',
      toggleLabelShow: this.props.labels.settingsLlmShowApiKey,
      toggleLabelHide: this.props.labels.settingsLlmHideApiKey,
      onToggle: () => this.props.onToggleShowApiKey(),
      onInput: (value) => this.props.onLlmProviderApiKeyChange(this.props.activeLlmProvider, value),
      testButtonLabel: this.props.labels.settingsLlmTestConnection,
      testButtonKey: 'settings.llm.test',
      testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingLlmConnection,
      onTest: () => this.props.onTestLlmConnection(),
      className: 'settings-field settings-llm-api-field',
    });
    grid.append(this.apiKeyField.getElement());
    field.append(title, buildHint(this.props.labels.settingsLlmHint), grid);
    return field;
  }
}
