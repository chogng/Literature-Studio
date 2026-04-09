import { applyHover } from 'ls/base/browser/ui/hover/hover';
import {
  buildSettingsButton as buildButton,
  buildSettingsInput as buildInput,
  createSettingsElement as el,
  setSettingsFocusKey as setFocusKey,
} from 'ls/workbench/contrib/preferences/browser/settingsUiPrimitives';

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
