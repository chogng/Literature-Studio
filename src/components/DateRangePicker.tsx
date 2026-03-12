import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDateInputValue, isDateRangeValid } from '../utils/dateRange';
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
  className?: string;
};

type PickerField = 'start' | 'end';

type CalendarCell = {
  date: Date;
  value: string;
  inCurrentMonth: boolean;
};

function findClippingAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    const canClipX = overflowX !== 'visible';
    const canClipY = overflowY !== 'visible';
    if (canClipX || canClipY) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

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
  className = '',
}: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [startPopupOffsetX, setStartPopupOffsetX] = useState<number | null>(null);
  const [endPopupOffsetX, setEndPopupOffsetX] = useState<number | null>(null);
  const [startVisibleMonth, setStartVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endVisibleMonth, setEndVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startPopupRef = useRef<HTMLDivElement | null>(null);
  const endPopupRef = useRef<HTMLDivElement | null>(null);
  const startTriggerRef = useRef<HTMLButtonElement | null>(null);
  const endTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isAnyPopupOpen = isStartOpen || isEndOpen;

  const startTriggerLabel = toTriggerLabel(labels.startDate, 'Start');
  const endTriggerLabel = toTriggerLabel(labels.endDate, 'End');

  useEffect(() => {
    if (!isAnyPopupOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setIsStartOpen(false);
        setIsEndOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStartOpen(false);
        setIsEndOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAnyPopupOpen]);

  const startMonthCells = useMemo(() => createMonthCells(startVisibleMonth), [startVisibleMonth]);
  const endMonthCells = useMemo(() => createMonthCells(endVisibleMonth), [endVisibleMonth]);

  const startMonthTitle = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
    });
    return formatter.format(startVisibleMonth);
  }, [startVisibleMonth]);

  const endMonthTitle = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
    });
    return formatter.format(endVisibleMonth);
  }, [endVisibleMonth]);

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

  const resolveFieldMonth = (field: PickerField): Date => {
    const value = field === 'start' ? startDate : endDate;
    const fallback = field === 'start' ? endDate : startDate;
    const parsed = parseDateValue(value) ?? parseDateValue(fallback) ?? new Date();
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  };

  const toggleStartPicker = () => {
    setIsStartOpen((previous) => {
      const next = !previous;
      if (next) {
        setStartVisibleMonth(resolveFieldMonth('start'));
        setIsEndOpen(false);
      }
      return next;
    });
  };

  const toggleEndPicker = () => {
    setIsEndOpen((previous) => {
      const next = !previous;
      if (next) {
        setEndVisibleMonth(resolveFieldMonth('end'));
        setIsStartOpen(false);
      }
      return next;
    });
  };

  const selectStartDate = (value: string) => {
    onStartDateChange(value);
    setIsStartOpen(false);
  };

  const selectEndDate = (value: string) => {
    onEndDateChange(value);
    setIsEndOpen(false);
  };

  const stepStartMonth = (offset: number) => {
    setStartVisibleMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const stepEndMonth = (offset: number) => {
    setEndVisibleMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const showRange = Boolean(startDate && endDate && isDateRangeValid(startDate, endDate));
  const startDateLimit = parseDateValue(startDate) ? startDate : '';
  const endDateLimit = parseDateValue(endDate) ? endDate : '';

  const updatePopupPosition = useCallback((field: PickerField) => {
    const root = rootRef.current;
    const popup = field === 'start' ? startPopupRef.current : endPopupRef.current;
    const anchor = field === 'start' ? startTriggerRef.current : endTriggerRef.current;
    if (!root || !popup || !anchor) return;

    const rootRect = root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const popupWidth = popup.getBoundingClientRect().width || 280;
    const desiredLeft =
      field === 'start'
        ? anchorRect.left - rootRect.left
        : anchorRect.right - rootRect.left - popupWidth;

    const clippingAncestor = findClippingAncestor(root);
    const boundaryLeft = clippingAncestor ? clippingAncestor.getBoundingClientRect().left : 0;
    const boundaryRight = clippingAncestor
      ? clippingAncestor.getBoundingClientRect().right
      : window.innerWidth;

    const edgePadding = 4;
    const minLeft = boundaryLeft - rootRect.left + edgePadding;
    const maxLeft = boundaryRight - rootRect.left - popupWidth - edgePadding;

    let nextLeft = desiredLeft;
    if (minLeft <= maxLeft) {
      nextLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
    } else {
      nextLeft = minLeft;
    }

    const setOffset = field === 'start' ? setStartPopupOffsetX : setEndPopupOffsetX;
    setOffset((previous) => {
      if (previous !== null && Math.abs(previous - nextLeft) < 0.5) {
        return previous;
      }
      return nextLeft;
    });
  }, []);

  useEffect(() => {
    if (!isStartOpen) {
      setStartPopupOffsetX(null);
      return;
    }

    let frameId = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => updatePopupPosition('start'));
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    const observer = new ResizeObserver(scheduleUpdate);
    if (rootRef.current) observer.observe(rootRef.current);
    if (startPopupRef.current) observer.observe(startPopupRef.current);
    const clippingAncestor = findClippingAncestor(rootRef.current);
    if (clippingAncestor) observer.observe(clippingAncestor);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [isStartOpen, updatePopupPosition]);

  useEffect(() => {
    if (!isEndOpen) {
      setEndPopupOffsetX(null);
      return;
    }

    let frameId = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => updatePopupPosition('end'));
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    const observer = new ResizeObserver(scheduleUpdate);
    if (rootRef.current) observer.observe(rootRef.current);
    if (endPopupRef.current) observer.observe(endPopupRef.current);
    const clippingAncestor = findClippingAncestor(rootRef.current);
    if (clippingAncestor) observer.observe(clippingAncestor);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [isEndOpen, updatePopupPosition]);

  return (
    <div ref={rootRef} className={pickerClassName}>
      <button
        ref={startTriggerRef}
        type="button"
        className={`date-range-trigger ${isStartOpen ? 'is-active' : ''}`.trim()}
        aria-label={startTriggerLabel}
        aria-expanded={isStartOpen}
        aria-haspopup="dialog"
        onClick={toggleStartPicker}
      >
        <span className="date-range-trigger-text">{startTriggerLabel}</span>
      </button>

      <button
        ref={endTriggerRef}
        type="button"
        className={`date-range-trigger ${isEndOpen ? 'is-active' : ''}`.trim()}
        aria-label={endTriggerLabel}
        aria-expanded={isEndOpen}
        aria-haspopup="dialog"
        onClick={toggleEndPicker}
      >
        <span className="date-range-trigger-text">{endTriggerLabel}</span>
      </button>

      {isStartOpen ? (
        <div
          ref={startPopupRef}
          className="date-range-popup is-start"
          role="dialog"
          aria-modal="false"
          aria-label={startTriggerLabel}
          style={startPopupOffsetX === null ? undefined : { left: `${startPopupOffsetX}px`, right: 'auto' }}
        >
          <div className="date-range-popup-header">
            <button type="button" className="date-range-month-nav" onClick={() => stepStartMonth(-1)}>
              {'<'}
            </button>
            <div className="date-range-month-title">{startMonthTitle}</div>
            <button type="button" className="date-range-month-nav" onClick={() => stepStartMonth(1)}>
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
            {startMonthCells.map((cell) => {
              const isStart = cell.value === startDate;
              const isEnd = cell.value === endDate;
              const isInRange = showRange && cell.value > startDate && cell.value < endDate;
              const isToday = cell.value === todayValue;
              const isDisabled = Boolean(endDateLimit && cell.value > endDateLimit);
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

              return (
                <button
                  key={cell.value}
                  type="button"
                  className={dayClassName}
                  disabled={isDisabled}
                  onClick={() => selectStartDate(cell.value)}
                  aria-pressed={isStart || isEnd}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isEndOpen ? (
        <div
          ref={endPopupRef}
          className="date-range-popup is-end"
          role="dialog"
          aria-modal="false"
          aria-label={endTriggerLabel}
          style={endPopupOffsetX === null ? undefined : { left: `${endPopupOffsetX}px`, right: 'auto' }}
        >
          <div className="date-range-popup-header">
            <button type="button" className="date-range-month-nav" onClick={() => stepEndMonth(-1)}>
              {'<'}
            </button>
            <div className="date-range-month-title">{endMonthTitle}</div>
            <button type="button" className="date-range-month-nav" onClick={() => stepEndMonth(1)}>
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
            {endMonthCells.map((cell) => {
              const isStart = cell.value === startDate;
              const isEnd = cell.value === endDate;
              const isInRange = showRange && cell.value > startDate && cell.value < endDate;
              const isToday = cell.value === todayValue;
              const isDisabled = Boolean(
                (startDateLimit && cell.value < startDateLimit) || cell.value > todayValue,
              );
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

              return (
                <button
                  key={cell.value}
                  type="button"
                  className={dayClassName}
                  disabled={isDisabled}
                  onClick={() => selectEndDate(cell.value)}
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

