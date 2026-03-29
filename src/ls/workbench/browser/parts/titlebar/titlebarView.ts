import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Settings,
} from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { WindowControlsGroup, type WindowControlsAction } from './windowControls';
import {
  requestToggleTitlebarAuxiliarySidebar,
  requestTitlebarNavigateBack,
  requestTitlebarNavigateForward,
  requestTitlebarNavigateWeb,
  requestToggleTitlebarSidebar,
  requestExportTitlebarDocx,
  requestToggleTitlebarSettings,
  subscribeTitlebarUiActions,
} from './titlebarActions';
import './media/titlebar.css';

export type TitlebarAction = WindowControlsAction;

export type TitlebarLabels = {
  controlsAriaLabel: string;
  settingsLabel: string;
  minimizeLabel: string;
  maximizeLabel: string;
  restoreLabel: string;
  closeLabel: string;
  backLabel: string;
  forwardLabel: string;
  showAssistantLabel: string;
  hideAssistantLabel: string;
  exportDocxLabel: string;
  noExportableArticlesLabel: string;
};

export type TitlebarProps = {
  appName?: string;
  labels: TitlebarLabels;
  isWindowMaximized: boolean;
  onWindowControl: (action: TitlebarAction) => void;
  isSidebarOpen?: boolean;
  sidebarToggleLabel?: string;
  onToggleSidebar?: () => void;
  isAuxiliarySidebarOpen?: boolean;
  auxiliarySidebarToggleLabel?: string;
  onToggleAuxiliarySidebar?: () => void;
  onToggleSettings?: () => void;
  browserUrl?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  canExportDocx?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  webUrl?: string;
  onWebUrlChange?: (url: string) => void;
  articleUrlPlaceholder?: string;
  addressBarSourceOptions?: QuickAccessSourceOption[];
  selectedAddressBarSourceId?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onCycleAddressBarSource?: (direction: 'prev' | 'next') => void;
  addressBarSourcePlaceholder?: string;
  addressBarSourceAriaLabel?: string;
};

export type TitlebarInputProps = Partial<TitlebarProps>;

const DEFAULT_TITLEBAR_LABELS: TitlebarLabels = {
  controlsAriaLabel: '',
  settingsLabel: '',
  minimizeLabel: '',
  maximizeLabel: '',
  restoreLabel: '',
  closeLabel: '',
  backLabel: '',
  forwardLabel: '',
  showAssistantLabel: '',
  hideAssistantLabel: '',
  exportDocxLabel: '',
  noExportableArticlesLabel: '',
};

const FALLBACK_WINDOW_CONTROL: TitlebarProps['onWindowControl'] = (_action) => undefined;

type TitlebarViewProps = TitlebarInputProps & {
  partRef?: Ref<HTMLElement>;
};

type SourceOptionView = {
  value: string;
  label: string;
  title?: string;
};

type TitlebarIconButtonConfig = {
  key?: string;
  className: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
  title?: string;
};

type NavigationGroupConfig = {
  browserUrl?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  labels: TitlebarLabels;
  isVisible: boolean;
};

type DropdownChangeEvent = {
  target: {
    value: string;
  };
};

const MIN_SOURCE_TRIGGER_WIDTH_PX = 56;
const MAX_SOURCE_TRIGGER_WIDTH_PX = 520;
const SOURCE_TRIGGER_HORIZONTAL_PADDING_PX = 22;
const SOURCE_TRIGGER_FONT = '12px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const IS_MACOS_PLATFORM =
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform);
let sourceTriggerMeasureCanvas: HTMLCanvasElement | null = null;

function measureSourceTriggerWidth(label: string): number {
  const text = label.trim();
  if (!text) {
    return MIN_SOURCE_TRIGGER_WIDTH_PX;
  }

  const fallback = Math.ceil(text.length * 8 + SOURCE_TRIGGER_HORIZONTAL_PADDING_PX);
  if (typeof document === 'undefined') {
    return Math.min(Math.max(fallback, MIN_SOURCE_TRIGGER_WIDTH_PX), MAX_SOURCE_TRIGGER_WIDTH_PX);
  }

  if (!sourceTriggerMeasureCanvas) {
    sourceTriggerMeasureCanvas = document.createElement('canvas');
  }

  const context = sourceTriggerMeasureCanvas.getContext('2d');
  if (!context) {
    return Math.min(Math.max(fallback, MIN_SOURCE_TRIGGER_WIDTH_PX), MAX_SOURCE_TRIGGER_WIDTH_PX);
  }

  context.font = SOURCE_TRIGGER_FONT;
  const measured = Math.ceil(context.measureText(text).width + SOURCE_TRIGGER_HORIZONTAL_PADDING_PX);
  return Math.min(Math.max(measured, MIN_SOURCE_TRIGGER_WIDTH_PX), MAX_SOURCE_TRIGGER_WIDTH_PX);
}

function createSourceOptions(
  addressBarSourcePlaceholder: string | undefined,
  addressBarSourceOptions: QuickAccessSourceOption[],
): SourceOptionView[] {
  return [
    {
      value: '',
      label: addressBarSourcePlaceholder ?? '',
    },
    ...addressBarSourceOptions.map((option) => ({
      value: option.id,
      label: option.label,
      title: `${option.journalTitle} | ${option.url}`,
    })),
  ];
}

function renderIconButton({
  key,
  className,
  label,
  onClick,
  icon,
  disabled = false,
  title,
}: TitlebarIconButtonConfig) {
  return jsx(
    Button,
    {
      className,
      variant: 'ghost',
      size: 'sm',
      mode: 'icon',
      iconMode: 'with',
      textMode: 'without',
      onClick,
      disabled,
      'aria-label': label,
      title: title ?? label,
      children: icon,
    },
    key,
  );
}

function renderSidebarToggle({
  isSidebarOpen,
  sidebarToggleLabel,
  isVisible,
}: {
  isSidebarOpen: boolean;
  sidebarToggleLabel?: string;
  isVisible: boolean;
}) {
  if (!isVisible || !sidebarToggleLabel) {
    return null;
  }

  return renderIconButton({
    className: 'titlebar-btn titlebar-btn-sidebar',
    label: sidebarToggleLabel,
    onClick: requestToggleTitlebarSidebar,
    icon: isSidebarOpen
      ? jsx(PanelLeftClose, { size: 16, strokeWidth: 2 })
      : jsx(PanelLeftOpen, { size: 16, strokeWidth: 2 }),
  });
}

function renderAuxiliarySidebarToggle({
  isAuxiliarySidebarOpen,
  auxiliarySidebarToggleLabel,
  isVisible,
}: {
  isAuxiliarySidebarOpen: boolean;
  auxiliarySidebarToggleLabel?: string;
  isVisible: boolean;
}) {
  if (!isVisible || !auxiliarySidebarToggleLabel) {
    return null;
  }

  return renderIconButton({
    className: 'titlebar-btn titlebar-btn-auxiliary',
    label: auxiliarySidebarToggleLabel,
    onClick: requestToggleTitlebarAuxiliarySidebar,
    icon: isAuxiliarySidebarOpen
      ? jsx(PanelRightClose, { size: 16, strokeWidth: 2 })
      : jsx(PanelRightOpen, { size: 16, strokeWidth: 2 }),
  });
}

function renderNavigationGroup({
  browserUrl,
  canGoBack,
  canGoForward,
  labels,
  isVisible,
}: NavigationGroupConfig) {
  if (!isVisible) {
    return null;
  }

  return jsxs('div', {
    className: 'titlebar-nav-group',
    children: [
      renderIconButton({
        className: 'titlebar-btn titlebar-btn-nav',
        label: labels.backLabel,
        onClick: requestTitlebarNavigateBack,
        disabled: !browserUrl || !canGoBack,
        icon: jsx(ArrowLeft, { size: 16, strokeWidth: 2 }),
      }),
      renderIconButton({
        className: 'titlebar-btn titlebar-btn-nav',
        label: labels.forwardLabel,
        onClick: requestTitlebarNavigateForward,
        disabled: !browserUrl || !canGoForward,
        icon: jsx(ArrowRight, { size: 16, strokeWidth: 2 }),
      }),
    ],
  });
}

function renderWebUrlBar({
  webUrl,
  articleUrlPlaceholder,
  onWebUrlChange,
  onKeyDown,
  inputRef,
}: {
  webUrl?: string;
  articleUrlPlaceholder?: string;
  onWebUrlChange?: (url: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  if (!onWebUrlChange) {
    return null;
  }

  return jsx('div', {
    className: 'titlebar-url-bar',
    children: jsx(Input, {
      ref: inputRef,
      className: 'titlebar-input-field titlebar-field-base',
      size: 'sm',
      appearance: 'flat',
      hidePlaceholderOnFocus: true,
      value: webUrl,
      onChange: (event: ChangeEvent<HTMLInputElement>) => onWebUrlChange(event.target.value),
      onKeyDown,
      placeholder: articleUrlPlaceholder,
    }),
  });
}

function renderSourceSelector({
  sourceOptions,
  selectedAddressBarSourceId,
  addressBarSourceAriaLabel,
  addressBarSourcePlaceholder,
  onSelectAddressBarSource,
  onKeyDown,
  sourceSelectorRef,
}: {
  sourceOptions: SourceOptionView[];
  selectedAddressBarSourceId: string;
  addressBarSourceAriaLabel?: string;
  addressBarSourcePlaceholder?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  sourceSelectorRef?: Ref<HTMLDivElement>;
}) {
  if (!onSelectAddressBarSource) {
    return null;
  }

  const selectedOption =
    sourceOptions.find((option) => option.value === selectedAddressBarSourceId) || sourceOptions[0];
  const selectedLabel = selectedOption?.label?.trim() || addressBarSourcePlaceholder || '';
  const selectorWidthPx = measureSourceTriggerWidth(selectedLabel);

  return jsx('div', {
    className: 'titlebar-journal-bar',
    children: jsx(Dropdown, {
      ref: sourceSelectorRef,
      className: `titlebar-source-select ${selectedAddressBarSourceId ? '' : 'is-placeholder'}`.trim(),
      style: { '--titlebar-source-width': `${selectorWidthPx}px` },
      value: selectedAddressBarSourceId,
      onChange: (event: DropdownChangeEvent) => onSelectAddressBarSource(event.target.value),
      'aria-label': addressBarSourceAriaLabel || addressBarSourcePlaceholder,
      title: addressBarSourceAriaLabel || addressBarSourcePlaceholder,
      onKeyDown,
      options: sourceOptions,
    }),
  });
}

export function TitlebarView(inputProps: TitlebarViewProps = {}) {
  const sourceSelectorRef = useRef<HTMLDivElement | null>(null);
  const webUrlInputRef = useRef<HTMLInputElement | null>(null);

  const {
    partRef,
    labels = DEFAULT_TITLEBAR_LABELS,
    isWindowMaximized = false,
    onWindowControl = FALLBACK_WINDOW_CONTROL,
    isSidebarOpen = true,
    sidebarToggleLabel,
    onToggleSidebar,
    isAuxiliarySidebarOpen = false,
    auxiliarySidebarToggleLabel,
    onToggleAuxiliarySidebar,
    browserUrl,
    canGoBack = false,
    canGoForward = false,
    canExportDocx = false,
    onNavigateBack,
    onNavigateForward,
    webUrl,
    onWebUrlChange,
    articleUrlPlaceholder,
    addressBarSourceOptions = [],
    selectedAddressBarSourceId = '',
    onSelectAddressBarSource,
    onCycleAddressBarSource,
    addressBarSourcePlaceholder,
    addressBarSourceAriaLabel,
  } = inputProps;

  const sourceOptions = createSourceOptions(addressBarSourcePlaceholder, addressBarSourceOptions);

  useEffect(() => {
    return subscribeTitlebarUiActions((action) => {
      if (action.type === 'OPEN_ADDRESS_BAR_SOURCE_MENU') {
        const sourceSelector = sourceSelectorRef.current;
        if (!sourceSelector) {
          return;
        }

        sourceSelector.focus();
        sourceSelector.click();
        return;
      }

      if (action.type === 'FOCUS_WEB_URL_INPUT') {
        const webUrlInput = webUrlInputRef.current;
        if (!webUrlInput) {
          return;
        }

        webUrlInput.focus();
        webUrlInput.select();
      }
    });
  }, []);

  const handleAddressBarKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.altKey && onCycleAddressBarSource) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onCycleAddressBarSource('prev');
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onCycleAddressBarSource('next');
        return;
      }
    }

    if (event.key === 'Enter') {
      requestTitlebarNavigateWeb();
    }
  };

  const handleSourceSelectorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onCycleAddressBarSource || !event.altKey) {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onCycleAddressBarSource('prev');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onCycleAddressBarSource('next');
    }
  };

  const sidebarToggleView = renderSidebarToggle({
    isSidebarOpen,
    sidebarToggleLabel,
    isVisible: Boolean(onToggleSidebar),
  });
  const sidebarToggleInStartView = IS_MACOS_PLATFORM ? null : sidebarToggleView;
  const sidebarToggleAfterWindowControlsView = IS_MACOS_PLATFORM ? sidebarToggleView : null;
  const auxiliarySidebarToggleView = renderAuxiliarySidebarToggle({
    isAuxiliarySidebarOpen,
    auxiliarySidebarToggleLabel,
    isVisible: Boolean(onToggleAuxiliarySidebar),
  });
  const navigationView = renderNavigationGroup({
    browserUrl,
    canGoBack,
    canGoForward,
    labels,
    isVisible: Boolean(onNavigateBack || onNavigateForward),
  });
  const webUrlView = renderWebUrlBar({
    webUrl,
    articleUrlPlaceholder,
    onWebUrlChange,
    onKeyDown: handleAddressBarKeyDown,
    inputRef: webUrlInputRef,
  });
  const sourceSelectorView = renderSourceSelector({
    sourceOptions,
    selectedAddressBarSourceId,
    addressBarSourceAriaLabel,
    addressBarSourcePlaceholder,
    onSelectAddressBarSource,
    onKeyDown: handleSourceSelectorKeyDown,
    sourceSelectorRef,
  });
  const exportButtonView =
    renderIconButton({
      className: 'titlebar-btn titlebar-btn-export',
      label: labels.exportDocxLabel,
      title: canExportDocx ? labels.exportDocxLabel : labels.noExportableArticlesLabel,
      onClick: requestExportTitlebarDocx,
      disabled: !canExportDocx,
      icon: jsx(FileText, { size: 16, strokeWidth: 2 }),
    });
  const settingsButtonView =
    renderIconButton({
      className: 'titlebar-btn titlebar-btn-settings',
      label: labels.settingsLabel,
      onClick: requestToggleTitlebarSettings,
      icon: jsx(Settings, { size: 16, strokeWidth: 2 }),
    });
  const windowControls = jsx(WindowControlsGroup, {
    className: 'titlebar-window-controls',
    labels: {
      controlsAriaLabel: labels.controlsAriaLabel,
      minimizeLabel: labels.minimizeLabel,
      maximizeLabel: labels.maximizeLabel,
      restoreLabel: labels.restoreLabel,
      closeLabel: labels.closeLabel,
    },
    isWindowMaximized,
    onWindowControl,
  });

  return jsxs('header', {
    ref: partRef,
    className: 'titlebar',
    children: [
      jsx('div', {
        className: 'titlebar-start',
        children: sidebarToggleInStartView,
      }),
      jsxs('div', {
        className: 'titlebar-center',
        children: [navigationView, webUrlView],
      }),
      jsxs('div', {
        className: 'titlebar-controls',
        role: 'group',
        'aria-label': labels.controlsAriaLabel,
        children: [
          sourceSelectorView,
          auxiliarySidebarToggleView,
          exportButtonView,
          settingsButtonView,
          windowControls,
          sidebarToggleAfterWindowControlsView,
        ],
      }),
    ],
  });
}

export default TitlebarView;
