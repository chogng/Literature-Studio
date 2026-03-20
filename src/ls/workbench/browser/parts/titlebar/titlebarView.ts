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
import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import { Dropdown } from '../../../../base/browser/ui/dropdown/dropdown';
import { Input } from '../../../../base/browser/ui/input/input';
import { WindowControlsGroup, type WindowControlsAction } from './windowControls';
import {
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
  onAddressBarSourceMenuOpenChange?: (isOpen: boolean) => void;
  onAddressBarSourceMenuDispose?: () => void;
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

function renderBrand({
  appName,
}: {
  appName: string;
}) {
  return jsx('div', {
    className: 'titlebar-brand',
    children: jsx('span', { className: 'titlebar-app-name', children: appName }),
  });
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
      ? jsx(PanelLeftClose, { size: 14, strokeWidth: 1.5 })
      : jsx(PanelLeftOpen, { size: 14, strokeWidth: 1.5 }),
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
        icon: jsx(ArrowLeft, { size: 14, strokeWidth: 1.5 }),
      }),
      renderIconButton({
        className: 'titlebar-btn titlebar-btn-nav',
        label: labels.forwardLabel,
        onClick: requestTitlebarNavigateForward,
        disabled: !browserUrl || !canGoForward,
        icon: jsx(ArrowRight, { size: 14, strokeWidth: 1.5 }),
      }),
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
  sourceSelectorRef,
}: {
  sourceOptions: SourceOptionView[];
  selectedAddressBarSourceId: string;
  addressBarSourceAriaLabel?: string;
  addressBarSourcePlaceholder?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  sourceSelectorRef?: Ref<HTMLDivElement>;
}) {
  if (!onSelectAddressBarSource) {
    return null;
  }

  const selectedOption =
    sourceOptions.find((option) => option.value === selectedAddressBarSourceId) || sourceOptions[0];
  const selectedLabel = selectedOption?.label?.trim() || addressBarSourcePlaceholder || '';
  const selectorWidthCh = Math.min(Math.max(selectedLabel.length + 4, 16), 30);

  return jsx('div', {
    className: 'titlebar-journal-bar',
    children: jsx(Dropdown, {
      ref: sourceSelectorRef,
      className: `titlebar-source-select ${selectedAddressBarSourceId ? '' : 'is-placeholder'}`.trim(),
      style: { '--titlebar-source-width': `${selectorWidthCh}ch` },
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
  const sourceSelectorRef = useRef<HTMLDivElement | null>(null);

  const {
    partRef,
    appName = 'Journal Reader',
    labels = DEFAULT_TITLEBAR_LABELS,
    isWindowMaximized = false,
    onWindowControl = FALLBACK_WINDOW_CONTROL,
    isSidebarOpen = true,
    sidebarToggleLabel,
    onToggleSidebar,
    browserUrl,
    canGoBack = false,
    canGoForward = false,
    canExportDocx = false,
    onNavigateBack,
    onNavigateForward,
    onAddressBarSourceMenuOpenChange,
    onAddressBarSourceMenuDispose,
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

  useEffect(() => {
    return subscribeTitlebarUiActions((action) => {
      if (action.type !== 'OPEN_ADDRESS_BAR_SOURCE_MENU') {
        return;
      }

      const sourceSelector = sourceSelectorRef.current;
      if (!sourceSelector) {
        return;
      }

      sourceSelector.focus();
      sourceSelector.click();
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
  });
  const sourceSelectorView = renderSourceSelector({
    sourceOptions,
    selectedAddressBarSourceId,
    addressBarSourceAriaLabel,
    addressBarSourcePlaceholder,
    onSelectAddressBarSource,
    onOpenChange: handleSourceMenuOpenChange,
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
      icon: jsx(FileText, { size: 14, strokeWidth: 1.5 }),
    });
  const settingsButtonView =
    renderIconButton({
      className: 'titlebar-btn titlebar-btn-settings',
      label: labels.settingsLabel,
      onClick: requestToggleTitlebarSettings,
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
        children: [renderBrand({ appName }), sidebarToggleView],
      }),
      jsxs('div', {
        className: 'titlebar-center',
        children: [navigationView, webUrlView, sourceSelectorView],
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
