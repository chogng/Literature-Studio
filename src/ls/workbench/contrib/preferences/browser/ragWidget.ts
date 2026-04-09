import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import type { RagProviderId, RagProviderSettings } from 'ls/base/parts/sandbox/common/desktopTypes';
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
  const host = el('div');
  const inputBox = new InputBox(host, undefined, {
    className: `settings-inputbox ${config.className}`.trim(),
    type: config.type ?? 'text',
    value: String(config.value),
    placeholder: config.placeholder ?? '',
  });
  const input = setFocusKey(inputBox.inputElement, config.focusKey);
  input.readOnly = Boolean(config.readOnly);
  if (config.min !== undefined) { input.min = config.min; }
  if (config.max !== undefined) { input.max = config.max; }
  if (config.inputMode) { input.inputMode = config.inputMode; }
  if (config.onInput) {
    inputBox.onDidChange((value) => config.onInput?.(value));
  }
  return inputBox;
}

function buildNumberStepperInput(config: {
  value: string | number;
  className: string;
  focusKey: string;
  min?: string;
  max?: string;
  inputMode?: HTMLInputElement['inputMode'];
  step?: string;
  onInput?: (value: string) => void;
  disabled?: boolean;
}) {
  const stepper = el('div', `settings-number-stepper ${config.className}`.trim());
  const decrementButton = el('button', 'settings-number-stepper-button settings-number-stepper-button-decrement');
  decrementButton.type = 'button';
  decrementButton.append(createLxIcon(lxIconSemanticMap.settings.decrement, 'settings-number-stepper-button-icon'));
  decrementButton.ariaLabel = 'Decrease value';
  const inputBox = buildInput({
    type: 'number',
    value: config.value,
    className: `${config.className} settings-number-stepper-input`,
    focusKey: config.focusKey,
    min: config.min,
    max: config.max,
    inputMode: config.inputMode ?? 'decimal',
    onInput: config.onInput,
  });
  if (config.step !== undefined) {
    inputBox.inputElement.step = config.step;
  }
  const incrementButton = el('button', 'settings-number-stepper-button settings-number-stepper-button-increment');
  incrementButton.type = 'button';
  incrementButton.append(createLxIcon(lxIconSemanticMap.settings.increment, 'settings-number-stepper-button-icon'));
  incrementButton.ariaLabel = 'Increase value';
  const syncButtonsDisabled = () => {
    const disabled = inputBox.inputElement.disabled || inputBox.inputElement.readOnly;
    decrementButton.disabled = disabled;
    incrementButton.disabled = disabled;
  };
  const nudgeValue = (direction: 'up' | 'down') => {
    const input = inputBox.inputElement;
    if (input.disabled || input.readOnly) {
      return;
    }
    const previous = input.value;
    try {
      if (direction === 'up') {
        input.stepUp();
      } else {
        input.stepDown();
      }
    } catch {
      return;
    }
    if (input.value !== previous) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    input.focus();
  };
  decrementButton.addEventListener('click', () => nudgeValue('down'));
  incrementButton.addEventListener('click', () => nudgeValue('up'));
  stepper.append(decrementButton, inputBox.element, incrementButton);
  const setDisabled = (disabled: boolean) => {
    inputBox.inputElement.disabled = disabled;
    syncButtonsDisabled();
  };
  setDisabled(Boolean(config.disabled));
  return {
    element: stepper,
    inputElement: inputBox.inputElement,
    setDisabled,
  };
}

export type RagWidgetProps = {
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

export class RagWidget {
  private props: RagWidgetProps;
  private readonly element = el('div', 'settings-field');
  private readonly apiKeyWidget = new ApiKeyWidget({
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

  constructor(props: RagWidgetProps) {
    this.props = props;
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: RagWidgetProps) {
    this.props = props;
    this.element.replaceChildren(this.render());
  }

  private renderNumberField(label: string, value: number, focusKey: string, min: string, max: string, onInput: (value: string) => void) {
    const field = el('div', 'settings-field');
    const wrap = el('div', 'settings-limit-input-wrap');
    wrap.append(buildNumberStepperInput({
      value,
      className: 'settings-limit-input',
      focusKey,
      min,
      max,
      inputMode: 'numeric',
      step: '1',
      onInput,
      disabled: this.props.isSettingsSaving,
    }).element);
    field.append(text(label), wrap);
    return field;
  }

  private renderTextField(label: string, value: string, focusKey: string, onInput: (value: string) => void, className = 'settings-field') {
    const field = el('div', className);
    field.append(text(label), buildInput({
      value,
      className: 'settings-input-control',
      focusKey,
      onInput,
    }).element);
    return field;
  }

  private render() {
    const field = el('div', 'settings-field');
    const title = el('span');
    title.textContent = this.props.labels.settingsRagTitle;
    const provider = this.props.ragProviders[this.props.activeRagProvider];
    const grid = el('div', 'settings-llm-grid');
    const providerField = el('div', 'settings-field');
    providerField.append(
      text(this.props.labels.settingsRagProvider),
      buildInput({
        value: this.props.labels.settingsRagProviderMoark,
        className: 'settings-input-control',
        focusKey: 'settings.rag.provider',
        readOnly: true,
      }).element,
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
    this.apiKeyWidget.setProps({
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
    grid.append(this.apiKeyWidget.getElement());
    field.append(title, buildHint(this.props.labels.settingsRagHint), grid);
    return field;
  }
}
