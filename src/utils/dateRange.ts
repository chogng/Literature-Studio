export type BatchDateRange = {
  startDate: string;
  endDate: string;
};

export function formatDateInputValue(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateInputValue(dateValue: string, dayOffset: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return '';

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';

  date.setDate(date.getDate() + dayOffset);
  return formatDateInputValue(date);
}

export function buildDefaultBatchDateRange(referenceDate = new Date()): BatchDateRange {
  const endDate = formatDateInputValue(referenceDate);
  return {
    endDate,
    startDate: shiftDateInputValue(endDate, -7),
  };
}
