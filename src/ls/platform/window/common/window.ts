import {
  getRuntimeMode,
  getRuntimePlatform,
  type RuntimeMode,
  type RuntimePlatform,
} from '../../../base/common/platform.js';

export type WindowChromeTitleBarStyle = 'native' | 'custom';
export type WindowControlsContainerMode = 'none' | 'native';

export type WindowChromeLayout = {
  mode: RuntimeMode;
  platform: RuntimePlatform;
  titleBarStyle: WindowChromeTitleBarStyle;
  renderCustomWindowControls: boolean;
  windowControlsContainerMode: WindowControlsContainerMode;
  leadingWindowControlsWidthPx: number;
};

const MACOS_WINDOW_CONTROLS_WIDTH_PX = 70;

export function getWindowChromeLayout(): WindowChromeLayout {
  const mode = getRuntimeMode();
  const platform = getRuntimePlatform();
  const titleBarStyle: WindowChromeTitleBarStyle =
    platform === 'linux' ? 'native' : 'custom';
  const renderCustomWindowControls =
    mode === 'desktop' &&
    titleBarStyle === 'custom' &&
    platform === 'windows';
  const windowControlsContainerMode: WindowControlsContainerMode =
    mode === 'desktop' &&
    titleBarStyle === 'custom' &&
    platform === 'macos'
      ? 'native'
      : 'none';

  return {
    mode,
    platform,
    titleBarStyle,
    renderCustomWindowControls,
    windowControlsContainerMode,
    leadingWindowControlsWidthPx:
      windowControlsContainerMode === 'native' ? MACOS_WINDOW_CONTROLS_WIDTH_PX : 0,
  };
}
