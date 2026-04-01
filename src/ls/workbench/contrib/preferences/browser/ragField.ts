import type { RagProviderId, RagProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
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

function buildInput(config: {
  type?: string;
  value: string | number;
  className: string;
  focusKey: string;
  placeholder?: string;
  readOnly?: boolean;
  min?: string;
  max?: string;
  inputMode?: HTMLInputElement['inputMode'];
  onInput?: (value: string) => void;
}) {
  const input = setFocusKey(el('input', `settings-native-input ${config.className}`.trim()), config.focusKey);
  input.type = config.type ?? 'text';
  input.value = String(config.value);
  input.placeholder = config.placeholder ?? '';
  input.readOnly = Boolean(config.readOnly);
  if (config.min !== undefined) { input.min = config.min; }
  if (config.max !== undefined) { input.max = config.max; }
  if (config.inputMode) { input.inputMode = config.inputMode; }
  if (config.onInput) {
    input.addEventListener('input', () => config.onInput?.(input.value));
  }
  return input;
}

export type RagFieldViewProps = {
  labels: SettingsPartLabels;
  activeRagProvider: RagProviderId;
  ragProviders: Record<RagProviderId, RagProviderSettings>;
  retrievalCandidateCount: number;
  retrievalTopK: number;
  isSettingsSaving: boolean;
  isTestingRagConnection: boolean;
  showApiKey: boolean;
  onToggleShowApiKey: () => void;
  onRagProviderApiKeyChange: (provider: RagProviderId, apiKey: string) => void;
  onRagProviderBaseUrlChange: (provider: RagProviderId, baseUrl: string) => void;
  onRagProviderEmbeddingModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderRerankerModelChange: (provider: RagProviderId, model: string) => void;
  onRagProviderEmbeddingPathChange: (provider: RagProviderId, path: string) => void;
  onRagProviderRerankPathChange: (provider: RagProviderId, path: string) => void;
  onRetrievalCandidateCountChange: (value: string) => void;
  onRetrievalTopKChange: (value: string) => void;
  onTestRagConnection: () => void;
};

export class RagFieldView {
  private props: RagFieldViewProps;
  private readonly element = el('div', 'settings-field');
  private readonly apiKeyField = new ApiKeyFieldView({
    title: '',
    value: '',
    placeholder: '',
    show: false,
    focusKey: 'settings.rag.apiKey',
    toggleKey: 'settings.rag.apiKey.toggle',
    toggleLabelShow: '',
    toggleLabelHide: '',
    onToggle: () => this.props.onToggleShowApiKey(),
    onInput: (value) => this.props.onRagProviderApiKeyChange(this.props.activeRagProvider, value),
    testButtonLabel: '',
    testButtonKey: 'settings.rag.test',
    testButtonDisabled: false,
    onTest: () => this.props.onTestRagConnection(),
  });

  constructor(props: RagFieldViewProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: RagFieldViewProps) {
    this.props = props;
    this.element.replaceChildren(this.render());
  }

  private renderNumberField(label: string, value: number, focusKey: string, min: string, max: string, onInput: (value: string) => void) {
    const field = el('label', 'settings-field');
    const wrap = el('div', 'settings-limit-input-wrap');
    wrap.append(buildInput({ type: 'number', value, className: 'settings-limit-input', focusKey, min, max, inputMode: 'numeric', onInput }));
    field.append(text(label), wrap);
    return field;
  }

  private renderTextField(label: string, value: string, focusKey: string, onInput: (value: string) => void, className = 'settings-field') {
    const field = el('label', className);
    field.append(text(label), buildInput({ value, className: 'settings-input-control', focusKey, onInput }));
    return field;
  }

  private render() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsRagTitle;
    const provider = this.props.ragProviders[this.props.activeRagProvider];
    const grid = el('div', 'settings-llm-grid');
    const providerField = el('label', 'settings-field');
    providerField.append(
      text(this.props.labels.settingsRagProvider),
      buildInput({ value: this.props.labels.settingsRagProviderMoark, className: 'settings-input-control', focusKey: 'settings.rag.provider', readOnly: true }),
      buildHint(this.props.labels.settingsRagProviderHint),
    );
    grid.append(providerField);
    grid.append(this.renderNumberField(this.props.labels.settingsRagCandidateCount, this.props.retrievalCandidateCount, 'settings.rag.candidates', '3', '20', this.props.onRetrievalCandidateCountChange));
    grid.append(this.renderNumberField(this.props.labels.settingsRagTopK, this.props.retrievalTopK, 'settings.rag.topK', '1', String(this.props.retrievalCandidateCount), this.props.onRetrievalTopKChange));
    grid.append(this.renderTextField(this.props.labels.settingsRagBaseUrl, provider.baseUrl, 'settings.rag.baseUrl', (value) => this.props.onRagProviderBaseUrlChange(this.props.activeRagProvider, value), 'settings-field settings-llm-span-2'));
    grid.append(this.renderTextField(this.props.labels.settingsRagEmbeddingModel, provider.embeddingModel, 'settings.rag.embeddingModel', (value) => this.props.onRagProviderEmbeddingModelChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagRerankerModel, provider.rerankerModel, 'settings.rag.rerankerModel', (value) => this.props.onRagProviderRerankerModelChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagEmbeddingPath, provider.embeddingPath, 'settings.rag.embeddingPath', (value) => this.props.onRagProviderEmbeddingPathChange(this.props.activeRagProvider, value)));
    grid.append(this.renderTextField(this.props.labels.settingsRagRerankPath, provider.rerankPath, 'settings.rag.rerankPath', (value) => this.props.onRagProviderRerankPathChange(this.props.activeRagProvider, value)));
    this.apiKeyField.setProps({
      title: this.props.labels.settingsRagApiKey,
      value: provider.apiKey,
      placeholder: this.props.labels.settingsRagApiKeyPlaceholder,
      show: this.props.showApiKey,
      focusKey: 'settings.rag.apiKey',
      toggleKey: 'settings.rag.apiKey.toggle',
      toggleLabelShow: this.props.labels.settingsRagShowApiKey,
      toggleLabelHide: this.props.labels.settingsRagHideApiKey,
      onToggle: () => this.props.onToggleShowApiKey(),
      onInput: (value) => this.props.onRagProviderApiKeyChange(this.props.activeRagProvider, value),
      testButtonLabel: this.props.labels.settingsRagTestConnection,
      testButtonKey: 'settings.rag.test',
      testButtonDisabled: this.props.isSettingsSaving || this.props.isTestingRagConnection,
      onTest: () => this.props.onTestRagConnection(),
    });
    grid.append(this.apiKeyField.getElement());
    field.append(title, buildHint(this.props.labels.settingsRagHint), grid);
    return field;
  }
}
