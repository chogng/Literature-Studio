import type { PreviewState } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { normalizeUrl } from '../../common/url';

export const EMPTY_PREVIEW_STATE: PreviewState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

export type PreviewNavigationResult =
  | { kind: 'invalid-url' }
  | { kind: 'preview-runtime-unavailable'; normalizedUrl: string }
  | { kind: 'webcontents-preview'; normalizedUrl: string };

export type PreviewRefreshMode = 'preview-runtime-unavailable' | 'webcontents-preview';

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

  // This app only supports the native Electron webContents preview surface.
  // Do not fall back to iframe/webview rendering here.
  if (!electronRuntime || !previewRuntime) {
    return {
      kind: 'preview-runtime-unavailable',
      normalizedUrl,
    };
  }

  return {
    kind: 'webcontents-preview',
    normalizedUrl,
  };
}

export function resolvePreviewRefreshMode(
  electronRuntime: boolean,
  previewRuntime: boolean,
): PreviewRefreshMode {
  if (!electronRuntime || !previewRuntime) {
    return 'preview-runtime-unavailable';
  }

  return 'webcontents-preview';
}

export function resolvePreviewStateUrlUpdate(
  previewState: PreviewState,
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
