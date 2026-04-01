import { formatDateInputValue, isDateRangeValid } from 'ls/base/common/date';
import 'ls/base/browser/ui/dateRangePicker/dateRangePicker.css';

export type DateRangePickerLabels = {
  startDate: string;
  endDate: string;
};

export type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  labels: DateRangePickerLabels;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  className?: string;
  triggerIcon?: Node | string | number | null;
  triggerMode?: 'default' | 'icon';
};

type PickerField = 'start' | 'end';

type CalendarCell = {
  date: Date;
  value: string;
  inCurrentMonth: boolean;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

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

function createChevronIcon(direction: 'left' | 'right') {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', '16');
  icon.setAttribute('height', '16');
  icon.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    direction === 'left' ? 'M10 3.5L5.5 8 10 12.5' : 'M6 3.5L10.5 8 6 12.5',
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);

  return icon;
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function createMonthCells(visibleMonth: Date): CalendarCell[] {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startWeekday = monthStart.getDay();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const offset = index - startWeekday;
    const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + offset);
    cells.push({
      date: cellDate,
      value: formatDateInputValue(cellDate),
      inCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
    });
  }

  return cells;
}

function createWeekdayLabels() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const sunday = new Date(2024, 0, 7);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(sunday);
    value.setDate(sunday.getDate() + index);
    return formatter.format(value);
  });
}

function formatMonthTitle(visibleMonth: Date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
  });
  return formatter.format(visibleMonth);
}

function createTriggerLabel(labels: DateRangePickerLabels) {
  const chineseDateToken = '\u65e5\u671f';
  if (
    labels.startDate.includes(chineseDateToken) ||
    labels.endDate.includes(chineseDateToken) ||
    /\bdate\b/i.test(labels.startDate) ||
    /\bdate\b/i.test(labels.endDate)
  ) {
    return labels.startDate.includes(chineseDateToken) || labels.endDate.includes(chineseDateToken)
      ? chineseDateToken
      : 'Date';
  }

  return labels.endDate || labels.startDate || 'Date';
}

function formatSelectedDate(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return '--';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function appendTriggerIcon(target: HTMLElement, icon: DateRangePickerProps['triggerIcon']) {
  target.replaceChildren();
  if (icon === null || icon === undefined) {
    return;
  }

  if (icon instanceof Node) {
    target.append(icon.cloneNode(true));
    return;
  }

  target.textContent = String(icon);
}

export class DateRangePickerView {
  private props: DateRangePickerProps;
  private isOpen = false;
  private activeField: PickerField = 'start';
  private visibleMonth: Date;
  private readonly weekdayLabels = createWeekdayLabels();
  private readonly todayValue = formatDateInputValue(new Date());
  private readonly element = createElement('div', 'date-range-picker');
  private readonly trigger = createElement(
    'button',
    'date-range-trigger btn-base btn-secondary btn-md',
  );
  private readonly triggerContent = createElement('span', 'date-range-trigger-content');
  private readonly triggerIcon = createElement('span', 'date-range-trigger-icon');
  private readonly triggerText = createElement('span', 'date-range-trigger-text');
  private popup: HTMLDivElement | null = null;
  private removeOutsideHandlers = () => {};
  private disposed = false;

  constructor(props: DateRangePickerProps) {
    this.props = this.normalizeProps(props);
    const now = new Date();
    this.visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    this.trigger.type = 'button';
    this.trigger.setAttribute('aria-haspopup', 'dialog');
    this.trigger.addEventListener('click', this.handleTriggerClick);
    this.triggerContent.append(this.triggerIcon, this.triggerText);
    this.trigger.append(this.triggerContent);
    this.element.append(this.trigger);

    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: DateRangePickerProps) {
    this.props = this.normalizeProps(props);
    this.render();
  }

  focus() {
    this.trigger.focus();
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.setOpen(false);
    this.trigger.removeEventListener('click', this.handleTriggerClick);
    this.element.replaceChildren();
  }

  private readonly handleTriggerClick = () => {
    this.setOpen(!this.isOpen);
  };

  private readonly handlePointerDown = (event: MouseEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!this.element.contains(event.target)) {
      this.setOpen(false);
    }
  };

  private readonly handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.setOpen(false);
    }
  };

  private normalizeProps(props: DateRangePickerProps): DateRangePickerProps {
    return {
      ...props,
      className: props.className ?? '',
      triggerIcon: props.triggerIcon ?? null,
      triggerMode: props.triggerMode ?? 'default',
    };
  }

  private resolveFieldMonth(field: PickerField) {
    const value = field === 'start' ? this.props.startDate : this.props.endDate;
    const fallback = field === 'start' ? this.props.endDate : this.props.startDate;
    const parsed = parseDateValue(value) ?? parseDateValue(fallback) ?? new Date();
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }

  private setOpen(nextOpen: boolean) {
    if (this.isOpen === nextOpen) {
      return;
    }

    this.isOpen = nextOpen;
    if (nextOpen) {
      this.visibleMonth = this.resolveFieldMonth(this.activeField);
      document.addEventListener('mousedown', this.handlePointerDown);
      document.addEventListener('keydown', this.handleEscape);
      this.removeOutsideHandlers = () => {
        document.removeEventListener('mousedown', this.handlePointerDown);
        document.removeEventListener('keydown', this.handleEscape);
      };
    } else {
      this.removeOutsideHandlers();
      this.removeOutsideHandlers = () => {};
    }

    this.render();
  }

  private stepMonth(offset: number) {
    this.visibleMonth = new Date(
      this.visibleMonth.getFullYear(),
      this.visibleMonth.getMonth() + offset,
      1,
    );
    this.renderPopup();
  }

  private activateField(field: PickerField) {
    this.activeField = field;
    this.visibleMonth = this.resolveFieldMonth(field);
    this.renderPopup();
  }

  private handleSelectDate(value: string) {
    const startDateLimit = parseDateValue(this.props.startDate) ? this.props.startDate : '';
    const endDateLimit = parseDateValue(this.props.endDate) ? this.props.endDate : '';

    if (this.activeField === 'start') {
      this.props.onStartDateChange(value);
      if (endDateLimit && value > endDateLimit) {
        this.props.onEndDateChange(value);
      }
      this.activeField = 'end';
      const parsed = parseDateValue(value);
      if (parsed) {
        this.visibleMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
      this.render();
      return;
    }

    this.props.onEndDateChange(value);
    if (startDateLimit && value < startDateLimit) {
      this.props.onStartDateChange(value);
    }
    this.setOpen(false);
  }

  private isCellDisabled(cell: CalendarCell) {
    const startDateLimit = parseDateValue(this.props.startDate) ? this.props.startDate : '';
    const endDateLimit = parseDateValue(this.props.endDate) ? this.props.endDate : '';

    if (this.activeField === 'start') {
      return Boolean((endDateLimit && cell.value > endDateLimit) || cell.value > this.todayValue);
    }

    return Boolean((startDateLimit && cell.value < startDateLimit) || cell.value > this.todayValue);
  }

  private renderSummaryButton(field: PickerField, label: string, value: string) {
    const button = createElement(
      'button',
      [
        'date-range-summary-button',
        'btn-base',
        'btn-secondary',
        'btn-md',
        this.activeField === field ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    button.type = 'button';
    button.append(
      createElement('span', 'date-range-summary-label', label),
      createElement('span', 'date-range-summary-value', formatSelectedDate(value)),
    );
    button.addEventListener('click', () => this.activateField(field));
    return button;
  }

  private renderPopup() {
    this.popup?.remove();
    this.popup = null;

    if (!this.isOpen) {
      return;
    }

    const popup = createElement('div', 'date-range-popup');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'false');
    popup.setAttribute('aria-label', createTriggerLabel(this.props.labels));

    const summary = createElement('div', 'date-range-popup-summary');
    summary.append(
      this.renderSummaryButton('start', this.props.labels.startDate, this.props.startDate),
      this.renderSummaryButton('end', this.props.labels.endDate, this.props.endDate),
    );

    const header = createElement('div', 'date-range-popup-header');
    const prevButton = createElement(
      'button',
      'date-range-month-nav btn-base btn-ghost btn-mode-icon btn-sm',
    );
    prevButton.type = 'button';
    prevButton.append(createChevronIcon('left'));
    prevButton.addEventListener('click', () => this.stepMonth(-1));

    const title = createElement('div', 'date-range-month-title', formatMonthTitle(this.visibleMonth));

    const nextButton = createElement(
      'button',
      'date-range-month-nav btn-base btn-ghost btn-mode-icon btn-sm',
    );
    nextButton.type = 'button';
    nextButton.append(createChevronIcon('right'));
    nextButton.addEventListener('click', () => this.stepMonth(1));
    header.append(prevButton, title, nextButton);

    const weekdays = createElement('div', 'date-range-weekdays');
    weekdays.append(
      ...this.weekdayLabels.map((weekday) => createElement('span', 'date-range-weekday', weekday)),
    );

    const showRange = Boolean(
      this.props.startDate &&
        this.props.endDate &&
        isDateRangeValid(this.props.startDate, this.props.endDate),
    );
    const grid = createElement('div', 'date-range-grid');
    grid.append(
      ...createMonthCells(this.visibleMonth).map((cell) => {
        const isStart = cell.value === this.props.startDate;
        const isEnd = cell.value === this.props.endDate;
        const isInRange = showRange && cell.value > this.props.startDate && cell.value < this.props.endDate;
        const isToday = cell.value === this.todayValue;
        const disabled = this.isCellDisabled(cell);

        const day = createElement(
          'button',
          [
            'date-range-day',
            'btn-base',
            'btn-ghost',
            'btn-sm',
            cell.inCurrentMonth ? '' : 'is-outside',
            isStart ? 'is-start' : '',
            isEnd ? 'is-end' : '',
            isInRange ? 'is-in-range' : '',
            isToday ? 'is-today' : '',
            disabled ? 'is-disabled' : '',
          ]
            .filter(Boolean)
            .join(' '),
          String(cell.date.getDate()),
        );
        day.type = 'button';
        day.disabled = disabled;
        day.setAttribute('aria-pressed', String(isStart || isEnd));
        day.addEventListener('click', () => this.handleSelectDate(cell.value));
        return day;
      }),
    );

    popup.append(summary, header, weekdays, grid);
    this.popup = popup;
    this.element.append(popup);
  }

  private render() {
    this.element.className = ['date-range-picker', this.props.className].filter(Boolean).join(' ');

    const triggerLabel = createTriggerLabel(this.props.labels);
    this.trigger.className = [
      'date-range-trigger',
      'btn-base',
      'btn-secondary',
      'btn-md',
      this.props.triggerMode === 'icon' ? 'btn-mode-icon' : '',
      this.isOpen ? 'is-active' : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.trigger.setAttribute('aria-label', triggerLabel);
    this.trigger.setAttribute('aria-expanded', String(this.isOpen));

    if (this.props.triggerIcon === null || this.props.triggerIcon === undefined) {
      this.triggerIcon.style.display = 'none';
    } else {
      this.triggerIcon.style.display = '';
      appendTriggerIcon(this.triggerIcon, this.props.triggerIcon);
    }
    this.triggerText.textContent = triggerLabel;
    this.triggerText.style.display = this.props.triggerMode === 'icon' ? 'none' : '';

    this.renderPopup();
  }
}

export function createDateRangePickerView(props: DateRangePickerProps) {
  return new DateRangePickerView(props);
}
