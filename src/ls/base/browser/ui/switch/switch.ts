import 'ls/base/browser/ui/switch/switch.css';

export interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string | Node;
  className?: string;
  inputName?: string;
  value?: string;
  title?: string;
  onChange?: (checked: boolean, event: Event) => void;
}

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

function setOptionalAttribute(
  element: HTMLElement,
  attribute: string,
  value: string | undefined,
) {
  if (typeof value === 'string' && value.length > 0) {
    element.setAttribute(attribute, value);
    return;
  }

  element.removeAttribute(attribute);
}

function setLabelContent(target: HTMLElement, label: string | Node) {
  target.replaceChildren();
  if (label instanceof Node) {
    target.append(label);
    return;
  }

  target.textContent = label;
}

export class SwitchView {
  private props: SwitchProps;
  private readonly element = createElement('label', 'switch-root');
  private readonly inputElement = createElement('input', 'switch-input');
  private readonly sliderElement = createElement('span', 'switch-slider');
  private readonly labelElement = createElement('span', 'switch-label');
  private disposed = false;

  constructor(props: SwitchProps = {}) {
    this.props = props;
    this.inputElement.type = 'checkbox';
    this.inputElement.addEventListener('change', this.handleChange);
    this.sliderElement.setAttribute('aria-hidden', 'true');
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: SwitchProps = {}) {
    if (this.disposed) {
      return;
    }

    this.props = props;
    this.render();
  }

  focus() {
    if (this.disposed) {
      return;
    }

    this.inputElement.focus();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.inputElement.removeEventListener('change', this.handleChange);
    this.element.replaceChildren();
    this.labelElement.replaceChildren();
  }

  private readonly handleChange = (event: Event) => {
    const checked = this.inputElement.checked;
    this.props = {
      ...this.props,
      checked,
    };
    this.props.onChange?.(checked, event);
    this.render();
  };

  private render() {
    const {
      checked = false,
      disabled = false,
      label,
      className = '',
      inputName,
      value,
      title,
    } = this.props;

    this.element.className = [
      'switch-root',
      disabled ? 'switch-disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    setOptionalAttribute(this.inputElement, 'name', inputName);
    setOptionalAttribute(this.inputElement, 'value', value);

    this.inputElement.checked = checked;
    this.inputElement.disabled = disabled;

    if (title) {
      this.element.title = title;
      this.inputElement.setAttribute('aria-label', title);
    } else {
      this.element.removeAttribute('title');
      if (typeof label === 'string' && label.length > 0) {
        this.inputElement.removeAttribute('aria-label');
      } else {
        this.inputElement.setAttribute('aria-label', 'Toggle');
      }
    }

    const nextChildren: Node[] = [this.inputElement, this.sliderElement];
    if (typeof label === 'string' ? label.length > 0 : Boolean(label)) {
      setLabelContent(this.labelElement, label as string | Node);
      nextChildren.push(this.labelElement);
    } else {
      this.labelElement.replaceChildren();
    }

    this.element.replaceChildren(...nextChildren);
  }
}

export function createSwitchView(props: SwitchProps = {}) {
  return new SwitchView(props);
}
