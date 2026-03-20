import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  type FetchChannel,
  type PreviewReuseMode,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Settings,
} from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { WindowControlsGroup, type WindowControlsAction } from './windowControls';
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
  refreshLabel: string;
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
  onToggleSettings?: () => void;
  browserUrl?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  canExportDocx?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onExportDocx?: () => void;
  onAddressBarSourceMenuOpenChange?: (isOpen: boolean) => void;
  onAddressBarSourceMenuDispose?: () => void;
  webUrl?: string;
  onWebUrlChange?: (url: string) => void;
  onNavigateWeb?: () => void;
  articleUrlPlaceholder?: string;
  addressBarSourceOptions?: QuickAccessSourceOption[];
  selectedAddressBarSourceId?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onCycleAddressBarSource?: (direction: 'prev' | 'next') => void;
  addressBarSourcePlaceholder?: string;
  addressBarSourceAriaLabel?: string;
  fetchChannel?: FetchChannel | null;
  previewReuseMode?: PreviewReuseMode | null;
  fetchSourceText?: string;
  fetchSourceTitle?: string;
  fetchStopText?: string;
  fetchStopTitle?: string;
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
  refreshLabel: '',
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
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
};

type DropdownChangeEvent = {
  target: {
    value: string;
  };
};

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

function renderFetchIndicator({
  className,
  text,
  title,
  dataMode,
  dataPreviewReuse,
}: {
  className: string;
  text?: string;
  title?: string;
  dataMode?: string;
  dataPreviewReuse?: string;
}) {
  if (!text) {
    return null;
  }

  return jsx('span', {
    className,
    title: title || text,
    ...(dataMode ? { 'data-mode': dataMode } : {}),
    ...(dataPreviewReuse ? { 'data-preview-reuse': dataPreviewReuse } : {}),
    children: text,
  });
}

function renderBrand({
  appName,
  fetchSourceView,
  fetchStopView,
}: {
  appName: string;
  fetchSourceView: ReactNode;
  fetchStopView: ReactNode;
}) {
  return jsxs('div', {
    className: 'titlebar-brand',
    children: [
      jsx('span', { className: 'titlebar-app-name', children: appName }),
      fetchSourceView,
      fetchStopView,
    ],
  });
}

function renderSidebarToggle({
  isSidebarOpen,
  sidebarToggleLabel,
  onToggleSidebar,
}: {
  isSidebarOpen: boolean;
  sidebarToggleLabel?: string;
  onToggleSidebar?: () => void;
}) {
  if (!onToggleSidebar || !sidebarToggleLabel) {
    return null;
  }

  return renderIconButton({
    className: 'titlebar-btn titlebar-btn-sidebar',
    label: sidebarToggleLabel,
    onClick: onToggleSidebar,
    icon: isSidebarOpen
      ? jsx(PanelLeftClose, { size: 14, strokeWidth: 1.5 })
      : jsx(PanelLeftOpen, { size: 14, strokeWidth: 1.5 }),
  });
}

function renderNavigationGroup({
  browserUrl,
  canGoBack,
  canGoForward,
  labels,
  onNavigateBack,
  onNavigateForward,
  onRefresh,
}: NavigationGroupConfig) {
  if (!onNavigateBack && !onNavigateForward && !onRefresh) {
    return null;
  }

  return jsxs('div', {
    className: 'titlebar-nav-group',
    children: [
      onNavigateBack
        ? renderIconButton({
            className: 'titlebar-btn titlebar-btn-nav',
            label: labels.backLabel,
            onClick: onNavigateBack,
            disabled: !browserUrl || !canGoBack,
            icon: jsx(ArrowLeft, { size: 14, strokeWidth: 1.5 }),
          })
        : null,
      onNavigateForward
        ? renderIconButton({
            className: 'titlebar-btn titlebar-btn-nav',
            label: labels.forwardLabel,
            onClick: onNavigateForward,
            disabled: !browserUrl || !canGoForward,
            icon: jsx(ArrowRight, { size: 14, strokeWidth: 1.5 }),
          })
        : null,
      onRefresh
        ? renderIconButton({
            className: 'titlebar-btn titlebar-btn-nav',
            label: labels.refreshLabel,
            onClick: onRefresh,
            disabled: !browserUrl,
            icon: jsx(RefreshCcw, { size: 14, strokeWidth: 1.5 }),
          })
        : null,
    ],
  });
}

function renderWebUrlBar({
  webUrl,
  articleUrlPlaceholder,
  onWebUrlChange,
  onKeyDown,
}: {
  webUrl?: string;
  articleUrlPlaceholder?: string;
  onWebUrlChange?: (url: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  if (!onWebUrlChange) {
    return null;
  }

  return jsx('div', {
    className: 'titlebar-url-bar',
    children: jsx(Input, {
      className: 'titlebar-input-field titlebar-field-base',
      size: 'sm',
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
  onOpenChange,
  onKeyDown,
}: {
  sourceOptions: SourceOptionView[];
  selectedAddressBarSourceId: string;
  addressBarSourceAriaLabel?: string;
  addressBarSourcePlaceholder?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}) {
  if (!onSelectAddressBarSource) {
    return null;
  }

  return jsx('div', {
    className: 'titlebar-journal-bar',
    children: jsx(Dropdown, {
      className: 'titlebar-source-select',
      value: selectedAddressBarSourceId,
      onChange: (event: DropdownChangeEvent) => onSelectAddressBarSource(event.target.value),
      onOpenChange,
      'aria-label': addressBarSourceAriaLabel || addressBarSourcePlaceholder,
      title: addressBarSourceAriaLabel || addressBarSourcePlaceholder,
      onKeyDown,
      options: sourceOptions,
    }),
  });
}

export function TitlebarView(inputProps: TitlebarViewProps = {}) {
  const isSourceMenuOpenRef = useRef(false);

  const {
    partRef,
    appName = 'Journal Reader',
    labels = DEFAULT_TITLEBAR_LABELS,
    isWindowMaximized = false,
    onWindowControl = FALLBACK_WINDOW_CONTROL,
    isSidebarOpen = true,
    sidebarToggleLabel,
    onToggleSidebar,
    onToggleSettings,
    browserUrl,
    canGoBack = false,
    canGoForward = false,
    canExportDocx = false,
    onNavigateBack,
    onNavigateForward,
    onRefresh,
    onExportDocx,
    onAddressBarSourceMenuOpenChange,
    onAddressBarSourceMenuDispose,
    webUrl,
    onWebUrlChange,
    onNavigateWeb,
    articleUrlPlaceholder,
    addressBarSourceOptions = [],
    selectedAddressBarSourceId = '',
    onSelectAddressBarSource,
    onCycleAddressBarSource,
    addressBarSourcePlaceholder,
    addressBarSourceAriaLabel,
    fetchChannel = null,
    previewReuseMode = null,
    fetchSourceText,
    fetchSourceTitle,
    fetchStopText,
    fetchStopTitle,
  } = inputProps;

  const sourceOptions = createSourceOptions(addressBarSourcePlaceholder, addressBarSourceOptions);

  const handleSourceMenuOpenChange = useCallback((isOpen: boolean) => {
    isSourceMenuOpenRef.current = isOpen;
    onAddressBarSourceMenuOpenChange?.(isOpen);
  }, [onAddressBarSourceMenuOpenChange]);

  useEffect(() => {
    return () => {
      if (!isSourceMenuOpenRef.current) {
        return;
      }

      onAddressBarSourceMenuDispose?.();
    };
  }, [onAddressBarSourceMenuDispose]);

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
      onNavigateWeb?.();
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

  const fetchSourceView = renderFetchIndicator({
    className: 'titlebar-fetch-source',
    text: fetchChannel ? fetchSourceText : undefined,
    title: fetchSourceTitle,
    dataMode: fetchChannel ?? undefined,
    dataPreviewReuse:
      fetchChannel === 'preview' ? (previewReuseMode ?? 'snapshot') : undefined,
  });
  const fetchStopView = renderFetchIndicator({
    className: 'titlebar-fetch-stop',
    text: fetchStopText,
    title: fetchStopTitle,
  });
  const sidebarToggleView = renderSidebarToggle({
    isSidebarOpen,
    sidebarToggleLabel,
    onToggleSidebar,
  });
  const navigationView = renderNavigationGroup({
    browserUrl,
    canGoBack,
    canGoForward,
    labels,
    onNavigateBack,
    onNavigateForward,
    onRefresh,
  });
  const webUrlView = renderWebUrlBar({
    webUrl,
    articleUrlPlaceholder,
    onWebUrlChange,
    onKeyDown: handleAddressBarKeyDown,
  });
  const sourceSelectorView = renderSourceSelector({
    sourceOptions,
    selectedAddressBarSourceId,
    addressBarSourceAriaLabel,
    addressBarSourcePlaceholder,
    onSelectAddressBarSource,
    onOpenChange: handleSourceMenuOpenChange,
    onKeyDown: handleSourceSelectorKeyDown,
  });
  const exportButtonView =
    onExportDocx &&
    renderIconButton({
      className: 'titlebar-btn titlebar-btn-export',
      label: labels.exportDocxLabel,
      title: canExportDocx ? labels.exportDocxLabel : labels.noExportableArticlesLabel,
      onClick: onExportDocx,
      disabled: !canExportDocx,
      icon: jsx(FileText, { size: 14, strokeWidth: 1.5 }),
    });
  const settingsButtonView =
    onToggleSettings &&
    renderIconButton({
      className: 'titlebar-btn titlebar-btn-settings',
      label: labels.settingsLabel,
      onClick: onToggleSettings,
      icon: jsx(Settings, { size: 14, strokeWidth: 1.5 }),
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
      jsxs('div', {
        className: 'titlebar-start',
        children: [
          renderBrand({ appName, fetchSourceView, fetchStopView }),
          sidebarToggleView,
          navigationView,
        ],
      }),
      jsxs('div', {
        className: 'titlebar-center',
        children: [webUrlView, sourceSelectorView],
      }),
      jsxs('div', {
        className: 'titlebar-controls',
        role: 'group',
        'aria-label': labels.controlsAriaLabel,
        children: [exportButtonView, settingsButtonView, windowControls],
      }),
    ],
  });
}

export default TitlebarView;
