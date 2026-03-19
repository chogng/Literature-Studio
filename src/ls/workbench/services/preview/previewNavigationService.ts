import { normalizeUrl } from '../../common/url';

export const EMPTY_PREVIEW_STATE: DesktopPreviewState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

export type PreviewNavigationResult =
  | { kind: 'invalid-url' }
  | { kind: 'preview-runtime-unavailable'; normalizedUrl: string }
  | { kind: 'native-preview'; normalizedUrl: string }
  | { kind: 'iframe'; normalizedUrl: string };

export type PreviewRefreshMode = 'preview-runtime-unavailable' | 'native-preview' | 'iframe';

export type PreviewStateUrlUpdate = {
  browserUrl: string;
  webUrl: string;
  fetchSeedUrl: string;
};

export function resolvePreviewNavigation(
  nextUrl: string,
  electronRuntime: boolean,
  previewRuntime: boolean,
): PreviewNavigationResult {
  const normalizedUrl = normalizeUrl(nextUrl);
  if (!normalizedUrl) {
    return { kind: 'invalid-url' };
  }

  if (electronRuntime && !previewRuntime) {
    return {
      kind: 'preview-runtime-unavailable',
      normalizedUrl,
    };
  }

  if (previewRuntime) {
    return {
      kind: 'native-preview',
      normalizedUrl,
    };
  }

  return {
    kind: 'iframe',
    normalizedUrl,
  };
}

export function resolvePreviewRefreshMode(
  electronRuntime: boolean,
  previewRuntime: boolean,
): PreviewRefreshMode {
  if (electronRuntime && !previewRuntime) {
    return 'preview-runtime-unavailable';
  }

  return previewRuntime ? 'native-preview' : 'iframe';
}

export function resolvePreviewStateUrlUpdate(
  previewState: DesktopPreviewState,
): PreviewStateUrlUpdate | null {
  if (!previewState.url) {
    return null;
  }

  return {
    browserUrl: previewState.url,
    webUrl: previewState.url,
    fetchSeedUrl: previewState.url,
  };
}
