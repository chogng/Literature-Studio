export type WindowChromePlatform = 'macos' | 'windows' | 'linux' | 'web';
export type WindowChromeTitleBarStyle = 'native' | 'custom';
export type WindowControlsContainerMode = 'none' | 'native';

export type WindowChromeLayout = {
  platform: WindowChromePlatform;
  titleBarStyle: WindowChromeTitleBarStyle;
  browserWindowTitleBarStyle: 'default' | 'hidden';
  useNativeWindowFrame: boolean;
  renderCustomWindowControls: boolean;
  windowControlsContainerMode: WindowControlsContainerMode;
  leadingWindowControlsWidthPx: number;
};

const MACOS_WINDOW_CONTROLS_WIDTH_PX = 70;

export function resolveWindowChromePlatform(platform: string | undefined): WindowChromePlatform {
  const normalizedPlatform = String(platform ?? '').toLowerCase();

  if (!normalizedPlatform) {
    return 'web';
  }

  if (
    normalizedPlatform === 'darwin' ||
    normalizedPlatform.includes('mac') ||
    normalizedPlatform.includes('iphone') ||
    normalizedPlatform.includes('ipad') ||
    normalizedPlatform.includes('ipod')
  ) {
    return 'macos';
  }

  if (normalizedPlatform === 'win32' || normalizedPlatform.includes('win')) {
    return 'windows';
  }

  if (normalizedPlatform === 'linux' || normalizedPlatform.includes('linux') || normalizedPlatform.includes('x11')) {
    return 'linux';
  }

  return 'web';
}

export function resolveWindowChromeTitleBarStyle(
  platform: string | undefined,
): WindowChromeTitleBarStyle {
  return resolveWindowChromePlatform(platform) === 'linux' ? 'native' : 'custom';
}

export function resolveWindowChromeLayout(platform: string | undefined): WindowChromeLayout {
  const resolvedPlatform = resolveWindowChromePlatform(platform);
  const titleBarStyle = resolveWindowChromeTitleBarStyle(platform);
  const useCustomTitleBar = titleBarStyle === 'custom';
  const renderCustomWindowControls = useCustomTitleBar && resolvedPlatform === 'windows';
  const windowControlsContainerMode: WindowControlsContainerMode =
    useCustomTitleBar && resolvedPlatform === 'macos' ? 'native' : 'none';

  return {
    platform: resolvedPlatform,
    titleBarStyle,
    browserWindowTitleBarStyle:
      useCustomTitleBar && resolvedPlatform !== 'web' ? 'hidden' : 'default',
    useNativeWindowFrame: !(resolvedPlatform === 'windows' && useCustomTitleBar),
    renderCustomWindowControls,
    windowControlsContainerMode,
    leadingWindowControlsWidthPx:
      windowControlsContainerMode === 'native' ? MACOS_WINDOW_CONTROLS_WIDTH_PX : 0,
  };
}

export function getBrowserWindowChromeLayout(): WindowChromeLayout {
  return resolveWindowChromeLayout(
    typeof navigator !== 'undefined' ? navigator.platform : undefined,
  );
}
