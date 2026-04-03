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
}) {
  const input = setFocusKey(el('input', `settings-native-input ${config.className}`.trim()), config.focusKey);
  input.type = config.type ?? 'text';
  input.value = config.value;
  input.placeholder = config.placeholder ?? '';
  return input;
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
  button.title = config.title ?? config.label;
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
  private readonly element = el('label', 'settings-field settings-llm-api-field settings-llm-span-2');
  private readonly titleNode = document.createTextNode('');
  private readonly row = el('div', 'settings-input-row settings-llm-api-row');
  private readonly inputWrap = el('div', 'settings-native-input-wrap settings-api-key-input');
  private readonly input = buildInput({ value: '', className: 'settings-input-control', focusKey: '', placeholder: '' });
  private readonly toggle = buildButton({ label: '', className: 'settings-password-toggle', focusKey: '', onClick: () => this.props.onToggle() });
  private readonly testButton = buildButton({ label: '', className: 'settings-llm-test-btn', focusKey: '', onClick: () => this.props.onTest() });

  constructor(props: ApiKeyWidgetProps) {
    this.props = props;
    this.input.addEventListener('input', () => this.props.onInput(this.input.value));
    this.inputWrap.append(this.input, this.toggle);
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
    this.input.value = props.value;
    this.input.placeholder = props.placeholder;
    setFocusKey(this.toggle, props.toggleKey);
    this.toggle.textContent = props.show ? props.toggleLabelHide : props.toggleLabelShow;
    this.toggle.title = props.show ? props.toggleLabelHide : props.toggleLabelShow;
    this.toggle.ariaLabel = props.show ? props.toggleLabelHide : props.toggleLabelShow;
    setFocusKey(this.testButton, props.testButtonKey);
    this.testButton.textContent = props.testButtonLabel;
    this.testButton.title = props.testButtonLabel;
    this.testButton.ariaLabel = props.testButtonLabel;
    this.testButton.disabled = props.testButtonDisabled;
  }
}
