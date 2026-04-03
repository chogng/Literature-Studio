import 'ls/base/browser/ui/inputbox/inputBox.css';

export interface IInputBoxOptions {
  readonly placeholder?: string;
  readonly tooltip?: string;
  readonly ariaLabel?: string;
  readonly type?: HTMLInputElement['type'];
  readonly value?: string;
  readonly className?: string;
}

export class InputBox {
  readonly element: HTMLElement;
  readonly inputElement: HTMLInputElement;
  private placeholder = '';
  private tooltip = '';
  private disposed = false;
  private readonly changeListeners = new Set<(value: string) => void>();

  constructor(container: HTMLElement, _contextViewProvider: unknown, options: IInputBoxOptions = {}) {
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

    if (options.ariaLabel) {
      this.inputElement.setAttribute('aria-label', options.ariaLabel);
    }

    this.setPlaceHolder(options.placeholder ?? '');
    this.setTooltip(options.tooltip ?? options.placeholder ?? '');

    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('focus', this.handleFocus);
    this.inputElement.addEventListener('blur', this.handleBlur);
  }

  get value() {
    return this.inputElement.value;
  }

  set value(value: string) {
    this.inputElement.value = value;
    this.syncEmptyState();
  }

  onDidChange(listener: (value: string) => void) {
    this.changeListeners.add(listener);
    return {
      dispose: () => {
        this.changeListeners.delete(listener);
      },
    };
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
  }

  setTooltip(tooltip: string) {
    this.tooltip = tooltip;
    if (tooltip) {
      this.element.title = tooltip;
    } else {
      this.element.removeAttribute('title');
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.changeListeners.clear();
    this.inputElement.removeEventListener('input', this.handleInput);
    this.inputElement.removeEventListener('focus', this.handleFocus);
    this.inputElement.removeEventListener('blur', this.handleBlur);
    this.element.remove();
  }

  private readonly handleInput = () => {
    this.syncEmptyState();
    for (const listener of this.changeListeners) {
      listener(this.inputElement.value);
    }
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
    if (!this.tooltip && this.placeholder) {
      this.element.title = this.placeholder;
    }
  }
}
