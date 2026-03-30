import type { PreviewState } from '../../../base/parts/sandbox/common/desktopTypes.js';
import { normalizeUrl } from '../../common/url';

// TODO(migration): rename the shared desktop bridge type in desktopTypes/preload once
// the Electron-side `preview` protocol is migrated. Keep this alias until then.
export type WebContentState = PreviewState;

export const EMPTY_WEB_CONTENT_STATE: WebContentState = {
  url: '',
  canGoBack: false,
  canGoForward: false,
  isLoading: false,
  visible: false,
};

export type WebContentNavigationResult =
  | { kind: 'invalid-url' }
  | { kind: 'content-runtime-unavailable'; normalizedUrl: string }
  | { kind: 'webcontents-content'; normalizedUrl: string };

export type WebContentRefreshMode =
  | 'content-runtime-unavailable'
  | 'webcontents-content';

export type WebContentStateUrlUpdate = {
  browserUrl: string;
  webUrl: string;
  fetchSeedUrl: string;
};

export function resolveWebContentNavigation(
  nextUrl: string,
  electronRuntime: boolean,
  previewRuntime: boolean,
): WebContentNavigationResult {
  const normalizedUrl = normalizeUrl(nextUrl);
  if (!normalizedUrl) {
    return { kind: 'invalid-url' };
  }

  if (!electronRuntime || !previewRuntime) {
    return {
      kind: 'content-runtime-unavailable',
      normalizedUrl,
    };
  }

  return {
    kind: 'webcontents-content',
    normalizedUrl,
  };
}

export function resolveWebContentRefreshMode(
  electronRuntime: boolean,
  previewRuntime: boolean,
): WebContentRefreshMode {
  if (!electronRuntime || !previewRuntime) {
    return 'content-runtime-unavailable';
  }

  return 'webcontents-content';
}

export function resolveWebContentStateUrlUpdate(
  webContentState: WebContentState,
): WebContentStateUrlUpdate | null {
  if (!webContentState.url) {
    return null;
  }

  return {
    browserUrl: webContentState.url,
    webUrl: webContentState.url,
    fetchSeedUrl: webContentState.url,
  };
}
