import { applyHover } from 'ls/base/browser/ui/hover/hover';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function setFocusKey<T extends HTMLElement>(node: T, key: string) {
  node.dataset.focusKey = key;
  return node;
}

function buildInput(config: {
  type?: string;
  value: string;
  className: string;
  focusKey: string;
  placeholder?: string;
  onInput?: (value: string) => void;
}) {
  const host = el('div');
  const inputBox = new InputBox(host, undefined, {
    className: `settings-inputbox ${config.className}`.trim(),
    type: config.type ?? 'text',
    value: config.value,
    placeholder: config.placeholder ?? '',
  });
  setFocusKey(inputBox.inputElement, config.focusKey);
  if (config.onInput) {
    inputBox.onDidChange((value) => config.onInput?.(value));
  }
  return inputBox;
}

function buildButton(config: {
  label: string;
  icon?: LxIconName;
  className?: string;
  focusKey: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const extraClasses = (config.className ?? '').trim();
  const isIconButton = extraClasses.includes('settings-native-icon-button');
  const buttonClassName = [
    'settings-native-button',
    'btn-base',
    'btn-secondary',
    isIconButton ? 'btn-mode-icon btn-sm' : 'btn-md',
    extraClasses,
  ]
    .filter(Boolean)
    .join(' ');
  const button = setFocusKey(el('button', buttonClassName), config.focusKey);
  button.type = 'button';
  if (config.icon) {
    button.append(createLxIcon(config.icon));
  } else {
    button.textContent = config.label;
  }
  applyHover(button, config.title ?? config.label);
  button.ariaLabel = config.title ?? config.label;
  button.disabled = Boolean(config.disabled);
  button.addEventListener('click', () => config.onClick());
  return button;
}

export type ApiKeyWidgetProps = {
  title: string;
  value: string;
  placeholder: string;
  show: boolean;
  focusKey: string;
  toggleKey: string;
  toggleLabelShow: string;
  toggleLabelHide: string;
  onToggle: () => void;
  onInput: (value: string) => void;
  testButtonLabel: string;
  testButtonKey: string;
  testButtonDisabled: boolean;
  onTest: () => void;
  className?: string;
};

export class ApiKeyWidget {
  private props: ApiKeyWidgetProps;
  private readonly element = el('div', 'settings-field settings-llm-api-field settings-llm-span-2');
  private readonly titleNode = document.createTextNode('');
  private readonly row = el('div', 'settings-input-row settings-llm-api-row');
  private readonly inputWrap = el('div', 'settings-native-input-wrap settings-api-key-input');
  private readonly inputBox = buildInput({
    value: '',
    className: 'settings-input-control',
    focusKey: '',
    placeholder: '',
    onInput: (value) => this.props.onInput(value),
  });
  private readonly input = this.inputBox.inputElement;
  private readonly toggle = buildButton({ label: '', className: 'settings-password-toggle', focusKey: '', onClick: () => this.props.onToggle() });
  private readonly testButton = buildButton({ label: '', className: 'settings-llm-test-btn', focusKey: '', onClick: () => this.props.onTest() });

  constructor(props: ApiKeyWidgetProps) {
    this.props = props;
    this.inputWrap.append(this.inputBox.element, this.toggle);
    this.row.append(this.inputWrap, this.testButton);
    this.element.append(this.titleNode, this.row);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: ApiKeyWidgetProps) {
    this.props = props;
    this.element.className = props.className ?? 'settings-field settings-llm-api-field settings-llm-span-2';
    this.titleNode.textContent = props.title;
    setFocusKey(this.input, props.focusKey);
    this.input.type = props.show ? 'text' : 'password';
    this.inputBox.value = props.value;
    this.inputBox.setPlaceHolder(props.placeholder);
    setFocusKey(this.toggle, props.toggleKey);
    this.toggle.textContent = props.show ? props.toggleLabelHide : props.toggleLabelShow;
    applyHover(this.toggle, props.show ? props.toggleLabelHide : props.toggleLabelShow);
    this.toggle.ariaLabel = props.show ? props.toggleLabelHide : props.toggleLabelShow;
    setFocusKey(this.testButton, props.testButtonKey);
    this.testButton.textContent = props.testButtonLabel;
    applyHover(this.testButton, props.testButtonLabel);
    this.testButton.ariaLabel = props.testButtonLabel;
    this.testButton.disabled = props.testButtonDisabled;
  }
}
