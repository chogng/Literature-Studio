import './input.css';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputAppearance = 'default' | 'flat';
export type InputIcon = Node | string;

export interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: InputIcon;
  rightIcon?: InputIcon;
  clearable?: boolean;
  onClear?: () => void;
  size?: InputSize;
  appearance?: InputAppearance;
  hidePlaceholderOnFocus?: boolean;
  disabled?: boolean;
  value?: string;
  placeholder?: string;
  name?: string;
  type?: HTMLInputElement['type'];
  autocomplete?: HTMLInputElement['autocomplete'];
  className?: string;
  title?: string;
  onInput?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

function createRenderableNode(content: InputIcon) {
  if (typeof content === 'string') {
    return document.createTextNode(content);
  }

  return content.cloneNode(true);
}

function createClearIcon(size: number) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');

  const circle = document.createElementNS(namespace, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '10');
  circle.setAttribute('fill', 'currentColor');
  circle.setAttribute('opacity', '0.18');

  const lineOne = document.createElementNS(namespace, 'path');
  lineOne.setAttribute('d', 'M8 8L16 16');
  lineOne.setAttribute('stroke', 'currentColor');
  lineOne.setAttribute('stroke-width', '1.8');
  lineOne.setAttribute('stroke-linecap', 'round');

  const lineTwo = document.createElementNS(namespace, 'path');
  lineTwo.setAttribute('d', 'M16 8L8 16');
  lineTwo.setAttribute('stroke', 'currentColor');
  lineTwo.setAttribute('stroke-width', '1.8');
  lineTwo.setAttribute('stroke-linecap', 'round');

  svg.append(circle, lineOne, lineTwo);
  return svg;
}

const DEFAULT_INPUT_PROPS: Required<
  Pick<InputProps, 'size' | 'appearance' | 'hidePlaceholderOnFocus' | 'disabled'>
> = {
  size: 'md',
  appearance: 'default',
  hidePlaceholderOnFocus: false,
  disabled: false,
};

export class InputView {
  private props: InputProps;
  private value = '';
  private isFocused = false;

  private readonly element = createElement('div', 'input-container');
  private readonly labelElement = createElement('label', 'input-label');
  private readonly wrapperElement = createElement('div', 'input-wrapper');
  private readonly inputElement = createElement('input', 'input-field') as HTMLInputElement;

  constructor(props: InputProps = {}) {
    this.props = { ...DEFAULT_INPUT_PROPS, ...props };
    this.value = typeof props.value === 'string' ? props.value : '';

    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('change', this.handleChange);
    this.inputElement.addEventListener('focus', this.handleFocus);
    this.inputElement.addEventListener('blur', this.handleBlur);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: InputProps) {
    this.props = { ...this.props, ...props };
    if (typeof props.value === 'string') {
      this.value = props.value;
    }
    this.render();
  }

  focus() {
    this.inputElement.focus();
  }

  setValue(value: string) {
    this.value = value;
    this.render();
  }

  getValue() {
    return this.inputElement.value;
  }

  dispose() {
    this.inputElement.removeEventListener('input', this.handleInput);
    this.inputElement.removeEventListener('change', this.handleChange);
    this.inputElement.removeEventListener('focus', this.handleFocus);
    this.inputElement.removeEventListener('blur', this.handleBlur);
    this.element.replaceChildren();
  }

  private readonly handleInput = (event: Event) => {
    this.value = this.inputElement.value;
    this.props.onInput?.(event);
    this.render();
  };

  private readonly handleChange = (event: Event) => {
    this.value = this.inputElement.value;
    this.props.onChange?.(event);
  };

  private readonly handleFocus = (event: FocusEvent) => {
    this.isFocused = true;
    this.props.onFocus?.(event);
    this.render();
  };

  private readonly handleBlur = (event: FocusEvent) => {
    this.isFocused = false;
    this.props.onBlur?.(event);
    this.render();
  };

  private readonly handleClearClick = () => {
    if (this.props.disabled) {
      return;
    }

    this.value = '';
    this.inputElement.value = '';

    if (this.props.onClear) {
      this.props.onClear();
    }

    this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    this.inputElement.focus();
  };

  private renderIcon(icon: InputIcon, className: string) {
    const iconElement = createElement('div', className);
    iconElement.append(createRenderableNode(icon));
    return iconElement;
  }

  private render() {
    const {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      clearable,
      size = DEFAULT_INPUT_PROPS.size,
      appearance = DEFAULT_INPUT_PROPS.appearance,
      hidePlaceholderOnFocus = DEFAULT_INPUT_PROPS.hidePlaceholderOnFocus,
      disabled = DEFAULT_INPUT_PROPS.disabled,
      placeholder,
      name,
      type = 'text',
      autocomplete,
      className = '',
      title,
    } = this.props;

    const wrapperClassName = [
      'input-wrapper',
      `input-${size}`,
      appearance === 'flat' ? 'input-appearance-flat' : '',
      this.isFocused ? 'input-focused' : '',
      error ? 'input-error' : '',
      disabled ? 'input-disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    this.wrapperElement.className = wrapperClassName;
    this.wrapperElement.title = title ?? '';

    this.inputElement.disabled = Boolean(disabled);
    this.inputElement.name = name ?? '';
    this.inputElement.type = type;
    this.inputElement.placeholder =
      hidePlaceholderOnFocus && this.isFocused ? '' : (placeholder ?? '');
    if (autocomplete) {
      this.inputElement.setAttribute('autocomplete', autocomplete);
    } else {
      this.inputElement.removeAttribute('autocomplete');
    }
    this.inputElement.title = title ?? '';
    if (this.inputElement.value !== this.value) {
      this.inputElement.value = this.value;
    }

    const wrapperChildren: Node[] = [];
    if (leftIcon) {
      wrapperChildren.push(this.renderIcon(leftIcon, 'input-icon-left'));
    }

    wrapperChildren.push(this.inputElement);

    const showClearButton = Boolean(clearable && this.value && !disabled);
    if (showClearButton) {
      const clearButton = createElement(
        'button',
        'input-clear-btn btn-base btn-ghost btn-mode-icon btn-sm',
      ) as HTMLButtonElement;
      clearButton.type = 'button';
      clearButton.setAttribute('aria-label', 'Clear input');
      clearButton.append(createClearIcon(size === 'sm' ? 14 : 16));
      clearButton.addEventListener('click', this.handleClearClick);
      wrapperChildren.push(clearButton);
    }

    if (rightIcon) {
      wrapperChildren.push(this.renderIcon(rightIcon, 'input-icon-right'));
    }

    this.wrapperElement.replaceChildren(...wrapperChildren);

    const rootChildren: Node[] = [];
    if (label) {
      this.labelElement.textContent = label;
      rootChildren.push(this.labelElement);
    }

    rootChildren.push(this.wrapperElement);

    if (error) {
      rootChildren.push(createElement('span', 'input-error-msg', error));
    } else if (helperText) {
      rootChildren.push(createElement('span', 'input-helper-msg', helperText));
    }

    this.element.replaceChildren(...rootChildren);
  }
}

export function createInputView(props?: InputProps) {
  return new InputView(props);
}
