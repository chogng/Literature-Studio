import 'ls/base/browser/ui/switch/switch.css';
import {
  getHoverService,
  type HoverHandle,
} from 'ls/base/browser/ui/hover/hover';
import { LifecycleOwner, toDisposable } from 'ls/base/common/lifecycle';

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

function addDisposableListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

export class SwitchView extends LifecycleOwner {
  private props: SwitchProps;
  private readonly element = createElement('label', 'switch-root');
  private readonly inputElement = createElement('input', 'switch-input');
  private readonly sliderElement = createElement('span', 'switch-slider');
  private readonly labelElement = createElement('span', 'switch-label');
  private readonly hoverController: HoverHandle;
  private disposed = false;

  constructor(props: SwitchProps = {}) {
    super();
    this.props = props;
    this.hoverController = getHoverService().createHover(this.element, null);
    this.register(this.hoverController);
    this.inputElement.type = 'checkbox';
    this.register(addDisposableListener(this.inputElement, 'change', this.handleChange));
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
    super.dispose();
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
      this.hoverController.update(title);
      this.element.removeAttribute('title');
      this.inputElement.setAttribute('aria-label', title);
    } else {
      this.hoverController.update(null);
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
