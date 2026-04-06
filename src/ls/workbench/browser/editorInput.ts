export type WritingEditorViewMode = 'draft';

export type WritingDraftEditorInput = {
  id: string;
  kind: 'draft';
  title: string;
  viewMode: WritingEditorViewMode;
};

export type WritingBrowserEditorInput = {
  id: string;
  kind: 'browser';
  title: string;
  url: string;
};

export type WritingPdfEditorInput = {
  id: string;
  kind: 'pdf';
  title: string;
  url: string;
};

export type WritingContentEditorInput =
  | WritingBrowserEditorInput
  | WritingPdfEditorInput;

export type WritingEditorInput =
  | WritingDraftEditorInput
  | WritingContentEditorInput;

const DEFAULT_VIEW_MODE: WritingEditorViewMode = 'draft';

export function createWritingEditorInputId(prefix: 'draft' | 'browser' | 'pdf') {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `ls-${prefix}-tab-${Date.now().toString(36)}-${randomPart}`;
}

export function getWritingContentInputTitle(url: string) {
  if (!url.trim()) {
    return '';
  }

  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastPathSegment = pathSegments[pathSegments.length - 1];
    return lastPathSegment
      ? `${parsedUrl.hostname}/${lastPathSegment}`
      : parsedUrl.hostname;
  } catch {
    return url;
  }
}

export function createWritingDraftEditorInput(
  initial?: Partial<Pick<WritingDraftEditorInput, 'id' | 'title' | 'viewMode'>>,
): WritingDraftEditorInput {
  return {
    id: initial?.id ?? createWritingEditorInputId('draft'),
    kind: 'draft',
    title: initial?.title ?? '',
    viewMode: initial?.viewMode === 'draft' ? initial.viewMode : DEFAULT_VIEW_MODE,
  };
}

function createWritingContentEditorInput<K extends WritingContentEditorInput['kind']>(
  kind: K,
  url: string,
  initial?: Partial<Pick<Extract<WritingContentEditorInput, { kind: K }>, 'id' | 'title'>>,
): Extract<WritingContentEditorInput, { kind: K }> {
  const normalizedUrl = url.trim();

  return {
    id: initial?.id ?? createWritingEditorInputId(kind),
    kind,
    title: initial?.title?.trim() || getWritingContentInputTitle(normalizedUrl),
    url: normalizedUrl,
  } as Extract<WritingContentEditorInput, { kind: K }>;
}

export function createWritingBrowserEditorInput(
  url: string,
  initial?: Partial<Pick<WritingBrowserEditorInput, 'id' | 'title'>>,
): WritingBrowserEditorInput {
  return createWritingContentEditorInput('browser', url, initial);
}

export function createWritingPdfEditorInput(
  url: string,
  initial?: Partial<Pick<WritingPdfEditorInput, 'id' | 'title'>>,
): WritingPdfEditorInput {
  return createWritingContentEditorInput('pdf', url, initial);
}

export function isWritingDraftEditorInput(
  input: WritingEditorInput | null | undefined,
): input is WritingDraftEditorInput {
  return input?.kind === 'draft';
}

export function isWritingBrowserEditorInput(
  input: WritingEditorInput | null | undefined,
): input is WritingBrowserEditorInput {
  return input?.kind === 'browser';
}

export function isWritingPdfEditorInput(
  input: WritingEditorInput | null | undefined,
): input is WritingPdfEditorInput {
  return input?.kind === 'pdf';
}

export function isWritingContentEditorInput(
  input: WritingEditorInput | null | undefined,
): input is WritingContentEditorInput {
  return input?.kind === 'browser' || input?.kind === 'pdf';
}

export function normalizeWritingEditorInput(value: unknown): WritingEditorInput | null {
  const candidate = value as Partial<WritingEditorInput> | null | undefined;
  const rawCandidate = value as { kind?: unknown; url?: unknown } | null | undefined;
  const legacyKind = rawCandidate?.kind;
  if (!candidate || typeof candidate !== 'object' || typeof candidate.id !== 'string') {
    return null;
  }

  if (candidate.kind === 'draft') {
    return createWritingDraftEditorInput({
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
      viewMode: candidate.viewMode,
    });
  }

  if (
    (candidate.kind === 'browser' || legacyKind === 'web') &&
    typeof rawCandidate?.url === 'string'
  ) {
    return createWritingBrowserEditorInput(rawCandidate.url, {
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
    });
  }

  if (candidate.kind === 'pdf' && typeof rawCandidate?.url === 'string') {
    return createWritingPdfEditorInput(rawCandidate.url, {
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : '',
    });
  }

  return null;
}

export function toWritingEditorInput(input: WritingEditorInput): WritingEditorInput {
  if (isWritingDraftEditorInput(input)) {
    return createWritingDraftEditorInput(input);
  }

  if (isWritingPdfEditorInput(input)) {
    return createWritingPdfEditorInput(input.url, input);
  }

  return createWritingBrowserEditorInput(input.url, input);
}

export function getWritingEditorInputResourceKey(input: WritingEditorInput) {
  if (isWritingDraftEditorInput(input)) {
    return `draft:${input.id}`;
  }

  return `${input.kind}:${input.url.trim()}`;
}
