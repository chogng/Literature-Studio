import 'ls/base/browser/ui/inputbox/inputBox.css';
import {
  getHoverService,
  type HoverHandle,
} from 'ls/base/browser/ui/hover/hover';
import { EventEmitter } from 'ls/base/common/event';
import { LifecycleOwner, toDisposable } from 'ls/base/common/lifecycle';

export interface IInputBoxOptions {
  readonly placeholder?: string;
  readonly tooltip?: string;
  readonly ariaLabel?: string;
  readonly type?: HTMLInputElement['type'];
  readonly value?: string;
  readonly className?: string;
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

export class InputBox extends LifecycleOwner {
  readonly element: HTMLElement;
  readonly inputElement: HTMLInputElement;
  private readonly hoverController: HoverHandle;
  private readonly changeEmitter = new EventEmitter<string>();
  private placeholder = '';
  private tooltip = '';
  private disposed = false;

  constructor(container: HTMLElement, _contextViewProvider: unknown, options: IInputBoxOptions = {}) {
    super();
    this.element = document.createElement('div');
    this.element.className = ['inputbox', 'idle', options.className ?? '']
      .filter(Boolean)
      .join(' ');

    const wrapper = document.createElement('div');
    wrapper.className = 'ibwrapper';

    this.inputElement = document.createElement('input');
    this.inputElement.className = 'input';
    this.inputElement.type = options.type ?? 'text';
    this.inputElement.value = options.value ?? '';
    this.inputElement.autocomplete = 'off';
    this.inputElement.spellcheck = false;
    this.inputElement.setAttribute('autocorrect', 'off');
    this.inputElement.setAttribute('autocapitalize', 'off');

    wrapper.append(this.inputElement);
    this.element.append(wrapper);
    container.append(this.element);
    this.hoverController = getHoverService().createHover(this.element, null);
    this.register(this.hoverController);
    this.register(this.changeEmitter);

    if (options.ariaLabel) {
      this.inputElement.setAttribute('aria-label', options.ariaLabel);
    }

    this.setPlaceHolder(options.placeholder ?? '');
    this.setTooltip(options.tooltip ?? options.placeholder ?? '');

    this.register(addDisposableListener(this.inputElement, 'input', this.handleInput));
    this.register(addDisposableListener(this.inputElement, 'focus', this.handleFocus));
    this.register(addDisposableListener(this.inputElement, 'blur', this.handleBlur));
  }

  get value() {
    return this.inputElement.value;
  }

  set value(value: string) {
    this.inputElement.value = value;
    this.syncEmptyState();
  }

  onDidChange(listener: (value: string) => void) {
    return this.changeEmitter.event(listener);
  }

  focus() {
    if (!this.disposed) {
      this.inputElement.focus();
    }
  }

  blur() {
    if (!this.disposed) {
      this.inputElement.blur();
    }
  }

  setPlaceHolder(placeholder: string) {
    this.placeholder = placeholder;
    this.inputElement.placeholder = placeholder;
    this.syncHover();
  }

  setTooltip(tooltip: string) {
    this.tooltip = tooltip;
    this.syncHover();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    super.dispose();
    this.element.remove();
  }

  private readonly handleInput = () => {
    this.syncEmptyState();
    this.changeEmitter.fire(this.inputElement.value);
  };

  private readonly handleFocus = () => {
    this.element.classList.add('synthetic-focus');
  };

  private readonly handleBlur = () => {
    this.element.classList.remove('synthetic-focus');
  };

  private syncEmptyState() {
    this.element.classList.toggle('empty', this.inputElement.value.length === 0);
    this.inputElement.classList.toggle('empty', this.inputElement.value.length === 0);
  }

  private syncHover() {
    this.hoverController.update(this.tooltip || this.placeholder || null);
    this.element.removeAttribute('title');
  }
}
