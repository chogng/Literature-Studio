export function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanNullable(value: unknown) {
  const normalized = cleanText(value);
  return normalized ? normalized : null;
}

export function uniq(values: string[]) {
  return [...new Set(values)];
}

export function pickFirstNonEmpty(values: unknown[]) {
  for (const value of values) {
    const normalized = cleanText(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}
