import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateInputValue } from '../utils/dateRange';
import './DateRangePicker.css';

type DateRangePickerLabels = {
  startDate: string;
  endDate: string;
};

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  labels: DateRangePickerLabels;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
};

type PickerField = 'start' | 'end';

type CalendarCell = {
  date: Date;
  value: string;
  inCurrentMonth: boolean;
};

function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
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

function toTriggerLabel(label: string, fallback: string): string {
  const next = label.replace(/\u65E5\u671F/g, '').replace(/\bdate\b/gi, '').replace(/date/gi, '').trim();
  return next || fallback;
}

export default function DateRangePicker({
  startDate,
  endDate,
  labels,
  onStartDateChange,
  onEndDateChange,
  onOpenChange,
  className = '',
}: DateRangePickerProps) {
  const [activeField, setActiveField] = useState<PickerField | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  const startTriggerLabel = toTriggerLabel(labels.startDate, 'Start');
  const endTriggerLabel = toTriggerLabel(labels.endDate, 'End');

  useEffect(() => {
    onOpenChange?.(activeField !== null);
  }, [activeField, onOpenChange]);

  useEffect(
    () => () => {
      onOpenChange?.(false);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!activeField) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setActiveField(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveField(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeField]);

  const monthCells = useMemo(() => createMonthCells(visibleMonth), [visibleMonth]);

  const monthTitle = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
    });
    return formatter.format(visibleMonth);
  }, [visibleMonth]);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(sunday);
      value.setDate(sunday.getDate() + index);
      return formatter.format(value);
    });
  }, []);

  const todayValue = useMemo(() => formatDateInputValue(new Date()), []);

  const pickerClassName = ['date-range-picker', className].filter(Boolean).join(' ');

  const setFieldMonth = (field: PickerField) => {
    const value = field === 'start' ? startDate : endDate;
    const fallback = field === 'start' ? endDate : startDate;
    const parsed = parseDateValue(value) ?? parseDateValue(fallback) ?? new Date();
    setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  };

  const toggleField = (field: PickerField) => {
    setActiveField((previous) => {
      if (previous === field) return null;
      setFieldMonth(field);
      return field;
    });
  };

  const selectDate = (value: string) => {
    if (activeField === 'start') {
      onStartDateChange(value);
    } else if (activeField === 'end') {
      onEndDateChange(value);
    }
    setActiveField(null);
  };

  const stepMonth = (offset: number) => {
    setVisibleMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const showRange = Boolean(startDate && endDate && startDate <= endDate);
  const popupLabel = activeField === 'start' ? startTriggerLabel : endTriggerLabel;

  return (
    <div ref={rootRef} className={pickerClassName}>
      <button
        type="button"
        className={`date-range-trigger ${activeField === 'start' ? 'is-active' : ''}`.trim()}
        aria-label={startTriggerLabel}
        aria-expanded={activeField === 'start'}
        aria-haspopup="dialog"
        onClick={() => toggleField('start')}
      >
        <span className="date-range-trigger-text">{startTriggerLabel}</span>
      </button>

      <button
        type="button"
        className={`date-range-trigger ${activeField === 'end' ? 'is-active' : ''}`.trim()}
        aria-label={endTriggerLabel}
        aria-expanded={activeField === 'end'}
        aria-haspopup="dialog"
        onClick={() => toggleField('end')}
      >
        <span className="date-range-trigger-text">{endTriggerLabel}</span>
      </button>

      {activeField ? (
        <div
          className={`date-range-popup ${activeField === 'end' ? 'is-end' : 'is-start'}`.trim()}
          role="dialog"
          aria-modal="false"
          aria-label={popupLabel}
        >
          <div className="date-range-popup-header">
            <button type="button" className="date-range-month-nav" onClick={() => stepMonth(-1)}>
              {'<'}
            </button>
            <div className="date-range-month-title">{monthTitle}</div>
            <button type="button" className="date-range-month-nav" onClick={() => stepMonth(1)}>
              {'>'}
            </button>
          </div>

          <div className="date-range-weekdays">
            {weekdayLabels.map((weekday) => (
              <span key={weekday} className="date-range-weekday">
                {weekday}
              </span>
            ))}
          </div>

          <div className="date-range-grid">
            {monthCells.map((cell) => {
              const isStart = cell.value === startDate;
              const isEnd = cell.value === endDate;
              const isInRange = showRange && cell.value > startDate && cell.value < endDate;
              const isToday = cell.value === todayValue;
              const dayClassName = [
                'date-range-day',
                cell.inCurrentMonth ? '' : 'is-outside',
                isStart ? 'is-start' : '',
                isEnd ? 'is-end' : '',
                isInRange ? 'is-in-range' : '',
                isToday ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={cell.value}
                  type="button"
                  className={dayClassName}
                  onClick={() => selectDate(cell.value)}
                  aria-pressed={isStart || isEnd}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

