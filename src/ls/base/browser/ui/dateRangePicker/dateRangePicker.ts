import { jsx, jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { formatDateInputValue, isDateRangeValid } from '../../../common/date';
import './dateRangePicker.css';

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
};

type PickerField = 'start' | 'end';

type CalendarCell = {
  date: Date;
  value: string;
  inCurrentMonth: boolean;
};

type CalendarPopupConfig = {
  isOpen: boolean;
  label: string;
  popupRef: RefObject<HTMLDivElement | null>;
  monthTitle: string;
  monthCells: CalendarCell[];
  onStepMonth: (offset: number) => void;
  onSelectDate: (value: string) => void;
  isCellDisabled: (cell: CalendarCell) => boolean;
  activeField: PickerField;
  onActivateField: (field: PickerField) => void;
  startDate: string;
  endDate: string;
  startLabel: string;
  endLabel: string;
  showRange: boolean;
  todayValue: string;
  weekdayLabels: string[];
};

type TriggerButtonConfig = {
  label: string;
  isOpen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
};

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

function formatMonthTitle(visibleMonth: Date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return formatter.format(visibleMonth);
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

function createTriggerLabel(labels: DateRangePickerLabels) {
  if (
    labels.startDate.includes('\u65e5\u671f') ||
    labels.endDate.includes('\u65e5\u671f') ||
    /\bdate\b/i.test(labels.startDate) ||
    /\bdate\b/i.test(labels.endDate)
  ) {
    return labels.startDate.includes('\u65e5\u671f') || labels.endDate.includes('\u65e5\u671f')
      ? '\u65e5\u671f'
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

function renderWeekdayRow(weekdayLabels: string[]) {
  return jsx('div', {
    className: 'date-range-weekdays',
    children: weekdayLabels.map((weekday) =>
      jsx('span', { className: 'date-range-weekday', children: weekday }, weekday),
    ),
  });
}

function renderCalendarGrid({
  monthCells,
  startDate,
  endDate,
  showRange,
  todayValue,
  onSelectDate,
  isCellDisabled,
}: Pick<
  CalendarPopupConfig,
  'monthCells' | 'startDate' | 'endDate' | 'showRange' | 'todayValue' | 'onSelectDate' | 'isCellDisabled'
>) {
  return jsx('div', {
    className: 'date-range-grid',
    children: monthCells.map((cell) => {
      const isStart = cell.value === startDate;
      const isEnd = cell.value === endDate;
      const isInRange = showRange && cell.value > startDate && cell.value < endDate;
      const isToday = cell.value === todayValue;
      const isDisabled = isCellDisabled(cell);
      const dayClassName = [
        'date-range-day',
        cell.inCurrentMonth ? '' : 'is-outside',
        isStart ? 'is-start' : '',
        isEnd ? 'is-end' : '',
        isInRange ? 'is-in-range' : '',
        isToday ? 'is-today' : '',
        isDisabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return jsx(
        'button',
        {
          type: 'button',
          className: dayClassName,
          disabled: isDisabled,
          onClick: () => onSelectDate(cell.value),
          'aria-pressed': isStart || isEnd,
          children: cell.date.getDate(),
        },
        cell.value,
      );
    }),
  });
}

function renderSummaryButton({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return jsxs('button', {
    type: 'button',
    className: `date-range-summary-button ${isActive ? 'is-active' : ''}`.trim(),
    onClick,
    children: [
      jsx('span', { className: 'date-range-summary-label', children: label }),
      jsx('span', { className: 'date-range-summary-value', children: formatSelectedDate(value) }),
    ],
  });
}

function renderCalendarPopup(config: CalendarPopupConfig) {
  if (!config.isOpen) {
    return null;
  }

  return jsxs('div', {
    ref: config.popupRef,
    className: 'date-range-popup',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-label': config.label,
    children: [
      jsxs('div', {
        className: 'date-range-popup-summary',
        children: [
          renderSummaryButton({
            label: config.startLabel,
            value: config.startDate,
            isActive: config.activeField === 'start',
            onClick: () => config.onActivateField('start'),
          }),
          renderSummaryButton({
            label: config.endLabel,
            value: config.endDate,
            isActive: config.activeField === 'end',
            onClick: () => config.onActivateField('end'),
          }),
        ],
      }),
      jsxs('div', {
        className: 'date-range-popup-header',
        children: [
          jsx('button', {
            type: 'button',
            className: 'date-range-month-nav',
            onClick: () => config.onStepMonth(-1),
            children: '<',
          }),
          jsx('div', { className: 'date-range-month-title', children: config.monthTitle }),
          jsx('button', {
            type: 'button',
            className: 'date-range-month-nav',
            onClick: () => config.onStepMonth(1),
            children: '>',
          }),
        ],
      }),
      renderWeekdayRow(config.weekdayLabels),
      renderCalendarGrid(config),
    ],
  });
}

function renderTriggerButton(config: TriggerButtonConfig) {
  return jsx('button', {
    ref: config.triggerRef,
    type: 'button',
    className: `date-range-trigger ${config.isOpen ? 'is-active' : ''}`.trim(),
    'aria-label': config.label,
    'aria-expanded': config.isOpen,
    'aria-haspopup': 'dialog',
    onClick: config.onToggle,
    children: jsx('span', { className: 'date-range-trigger-text', children: config.label }),
  });
}

export function DateRangePicker({
  startDate,
  endDate,
  labels,
  onStartDateChange,
  onEndDateChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState<PickerField>('start');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const triggerLabel = createTriggerLabel(labels);
  const monthCells = useMemo(() => createMonthCells(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);
  const weekdayLabels = useMemo(() => createWeekdayLabels(), []);
  const todayValue = useMemo(() => formatDateInputValue(new Date()), []);
  const pickerClassName = ['date-range-picker', className].filter(Boolean).join(' ');
  const showRange = Boolean(startDate && endDate && isDateRangeValid(startDate, endDate));
  const startDateLimit = parseDateValue(startDate) ? startDate : '';
  const endDateLimit = parseDateValue(endDate) ? endDate : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const resolveFieldMonth = (field: PickerField): Date => {
    const value = field === 'start' ? startDate : endDate;
    const fallback = field === 'start' ? endDate : startDate;
    const parsed = parseDateValue(value) ?? parseDateValue(fallback) ?? new Date();
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  };

  const handleToggle = () => {
    setIsOpen((previous) => {
      const next = !previous;
      if (next) {
        setVisibleMonth(resolveFieldMonth(activeField));
      }
      return next;
    });
  };

  const handleActivateField = (field: PickerField) => {
    setActiveField(field);
    setVisibleMonth(resolveFieldMonth(field));
  };

  const handleSelectDate = (value: string) => {
    if (activeField === 'start') {
      onStartDateChange(value);

      if (endDateLimit && value > endDateLimit) {
        onEndDateChange(value);
      }

      handleActivateField('end');
      return;
    }

    onEndDateChange(value);

    if (startDateLimit && value < startDateLimit) {
      onStartDateChange(value);
    }

    setIsOpen(false);
  };

  const stepMonth = (offset: number) => {
    setVisibleMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const popupView = renderCalendarPopup({
    isOpen,
    label: triggerLabel,
    popupRef,
    monthTitle,
    monthCells,
    onStepMonth: stepMonth,
    onSelectDate: handleSelectDate,
    isCellDisabled: (cell) =>
      activeField === 'start'
        ? Boolean((endDateLimit && cell.value > endDateLimit) || cell.value > todayValue)
        : Boolean((startDateLimit && cell.value < startDateLimit) || cell.value > todayValue),
    activeField,
    onActivateField: handleActivateField,
    startDate,
    endDate,
    startLabel: labels.startDate,
    endLabel: labels.endDate,
    showRange,
    todayValue,
    weekdayLabels,
  });

  return jsxs('div', {
    ref: rootRef,
    className: pickerClassName,
    children: [
      renderTriggerButton({
        label: triggerLabel,
        isOpen,
        triggerRef,
        onToggle: handleToggle,
      }),
      popupView,
    ],
  });
}

export default DateRangePicker;
