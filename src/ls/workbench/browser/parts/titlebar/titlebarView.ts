import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import { createButtonView } from '../../../../base/browser/ui/button/button.js';
import { createLxIcon, type LxIconName } from '../../../../base/browser/ui/lxicon/lxicon.js';
import { lxIconSemanticMap } from '../../../../base/browser/ui/lxicon/lxiconSemantic.js';
import { createInputView } from '../../../../base/browser/ui/input/input.js';
import { getWindowChromeLayout } from '../../../../platform/window/common/window.js';
import {
  createTitlebarSourceDropdownView,
  type TitlebarSourceDropdownView,
} from './nativeTitlebarSourceDropdown';
import {
  requestExportTitlebarDocx,
  requestTitlebarNavigateBack,
  requestTitlebarNavigateForward,
  requestTitlebarNavigateWeb,
  requestToggleTitlebarAuxiliarySidebar,
  requestToggleTitlebarSettings,
  requestToggleTitlebarSidebar,
  subscribeTitlebarUiActions,
} from './titlebarActions';
import {
  createWindowControlsView,
  type WindowControlsAction,
} from './windowControls';
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
   onNavigateRefresh?: () => void;
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
  showAssistantLabel: '',
  hideAssistantLabel: '',
  exportDocxLabel: '',
  noExportableArticlesLabel: '',
};

const WINDOW_CHROME_LAYOUT = getWindowChromeLayout();
const MIN_SOURCE_TRIGGER_WIDTH_PX = 56;
const MAX_SOURCE_TRIGGER_WIDTH_PX = 520;
const SOURCE_TRIGGER_HORIZONTAL_PADDING_PX = 22;
const SOURCE_TRIGGER_FONT = '12px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
let sourceTriggerMeasureCanvas: HTMLCanvasElement | null = null;

type SourceOptionView = {
  value: string;
  label: string;
  title?: string;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

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
  addressBarSourceOptions: QuickAccessSourceOption[],
): SourceOptionView[] {
  return addressBarSourceOptions.map((option) => ({
    value: option.id,
    label: option.label,
    title: `${option.journalTitle} | ${option.url}`,
  }));
}

function createIconButton(params: {
  className: string;
  label: string;
  icon: LxIconName;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return createButtonView({
    className: params.className,
    variant: 'ghost',
    size: 'md',
    mode: 'icon',
    ariaLabel: params.label,
    title: params.title ?? params.label,
    content: createLxIcon(params.icon),
    disabled: params.disabled,
    onClick: () => params.onClick(),
  });
}

export class TitlebarView {
  private props: TitlebarProps;
  private readonly element = createElement('header');
  private readonly leadingWindowControlsContainer = createElement('div');
  private readonly startViewportElement = createElement('div', 'titlebar-start-viewport');
  private readonly startElement = createElement('div', 'titlebar-start');
  private readonly centerElement = createElement('div', 'titlebar-center');
  private readonly controlsViewportElement = createElement('div', 'titlebar-controls-viewport');
  private readonly controlsElement = createElement('div', 'titlebar-controls');
  private readonly renderedViews: Array<{ dispose: () => void }> = [];
  private sourceSelector: TitlebarSourceDropdownView | null = null;
  private webUrlInput: HTMLInputElement | null = null;
  private readonly unsubscribeUiActions: () => void;

  constructor(props: TitlebarProps) {
    this.props = props;
    this.startViewportElement.append(this.startElement);
    this.controlsViewportElement.append(this.controlsElement);
    this.element.append(
      this.leadingWindowControlsContainer,
      this.startViewportElement,
      this.centerElement,
      this.controlsViewportElement,
    );
    this.unsubscribeUiActions = subscribeTitlebarUiActions((action) => {
      if (action.type === 'OPEN_ADDRESS_BAR_SOURCE_MENU') {
        this.sourceSelector?.focus();
        this.sourceSelector?.open();
        return;
      }

      if (action.type === 'FOCUS_WEB_URL_INPUT') {
        this.webUrlInput?.focus();
        this.webUrlInput?.select();
        return;
      }

      if (action.type === 'NAVIGATE_REFRESH') {
        this.props.onNavigateRefresh?.();
      }
    });
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: TitlebarProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.unsubscribeUiActions();
    this.disposeRenderedViews();
    this.element.replaceChildren();
    this.sourceSelector = null;
    this.webUrlInput = null;
  }

  private render() {
    const props: TitlebarProps = {
      ...this.props,
      labels: {
        ...DEFAULT_TITLEBAR_LABELS,
        ...(this.props.labels ?? {}),
      },
      isWindowMaximized: this.props.isWindowMaximized ?? false,
      canGoBack: this.props.canGoBack ?? false,
      canGoForward: this.props.canGoForward ?? false,
      canExportDocx: this.props.canExportDocx ?? false,
      addressBarSourceOptions: this.props.addressBarSourceOptions ?? [],
      selectedAddressBarSourceId: this.props.selectedAddressBarSourceId ?? '',
      isSidebarOpen: this.props.isSidebarOpen ?? true,
      isAuxiliarySidebarOpen: this.props.isAuxiliarySidebarOpen ?? false,
      onWindowControl: this.props.onWindowControl,
    };

    this.element.className = [
      'titlebar',
      `titlebar-platform-${WINDOW_CHROME_LAYOUT.platform}`,
      `titlebar-style-${WINDOW_CHROME_LAYOUT.titleBarStyle}`,
    ].join(' ');

    this.leadingWindowControlsContainer.className = [
      'titlebar-window-controls-container',
      WINDOW_CHROME_LAYOUT.windowControlsContainerMode === 'native'
        ? 'window-controls-container-native'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx > 0) {
      this.leadingWindowControlsContainer.setAttribute(
        'style',
        `--window-controls-width: ${WINDOW_CHROME_LAYOUT.leadingWindowControlsWidthPx}px`,
      );
    } else {
      this.leadingWindowControlsContainer.removeAttribute('style');
    }

    this.controlsElement.setAttribute('role', 'group');
    this.controlsElement.setAttribute('aria-label', props.labels.controlsAriaLabel);

    this.disposeRenderedViews();
    this.renderStart(props);
    this.renderCenter(props);
    this.renderControls(props);
  }

  private renderStart(props: TitlebarProps) {
    this.startElement.replaceChildren();
    if (!props.onToggleSidebar || !props.sidebarToggleLabel) {
      return;
    }

    const sidebarButton = this.trackView(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-sidebar',
          label: props.sidebarToggleLabel,
          icon: props.isSidebarOpen
            ? lxIconSemanticMap.titlebar.sidebarOpen
            : lxIconSemanticMap.titlebar.sidebarClosed,
          onClick: requestToggleTitlebarSidebar,
        }),
    );

    this.startElement.append(sidebarButton.getElement());
  }

  private renderCenter(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.centerElement.replaceChildren();

    const navGroup = createElement('div', 'titlebar-nav-group');
    const backButton = this.trackView(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-nav',
          label: props.labels.backLabel,
          icon: lxIconSemanticMap.titlebar.navigateBack,
          onClick: requestTitlebarNavigateBack,
          disabled: !props.browserUrl || !props.canGoBack,
        }),
    );
    const forwardButton = this.trackView(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-nav',
          label: props.labels.forwardLabel,
          icon: lxIconSemanticMap.titlebar.navigateForward,
          onClick: requestTitlebarNavigateForward,
          disabled: !props.browserUrl || !props.canGoForward,
        }),
    );
    navGroup.append(backButton.getElement(), forwardButton.getElement());

    if (props.onNavigateRefresh) {
      const refreshButton = this.trackView(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-nav titlebar-btn-refresh',
          label: props.labels.refreshLabel,
          icon: lxIconSemanticMap.titlebar.refresh,
          onClick: () => props.onNavigateRefresh?.(),
          disabled: !props.browserUrl,
        }),
      );
      navGroup.append(refreshButton.getElement());
    }

    this.centerElement.append(navGroup);

    if (props.onWebUrlChange) {
      const urlBar = createElement('div', 'titlebar-url-bar');
      const inputView = this.trackView(
        createInputView({
          className: 'titlebar-input-field titlebar-field-base',
          value: props.webUrl ?? '',
          placeholder: props.articleUrlPlaceholder ?? '',
          size: 'sm',
          onInput: (event) => {
            if (event.target instanceof HTMLInputElement) {
              props.onWebUrlChange?.(event.target.value);
            }
          },
        }),
      );
      const inputElement = inputView.getElement().querySelector('.input-field');
      if (inputElement instanceof HTMLInputElement) {
        inputElement.addEventListener('keydown', (event) => {
          if (props.onCycleAddressBarSource && event.altKey) {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              props.onCycleAddressBarSource('prev');
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              props.onCycleAddressBarSource('next');
              return;
            }
          }

          if (event.key === 'Enter') {
            requestTitlebarNavigateWeb();
          }
        });
        this.webUrlInput = inputElement;
      } else {
        this.webUrlInput = null;
      }
      urlBar.append(inputView.getElement());
      this.centerElement.append(urlBar);
    } else {
      this.webUrlInput = null;
    }
  }

  private renderControls(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.controlsElement.replaceChildren();
    const actionGroup = createElement('div', 'titlebar-controls-group');

    if (props.onSelectAddressBarSource) {
      const sourceOptions = createSourceOptions(
        props.addressBarSourceOptions ?? [],
      );
      const selectedOption =
        sourceOptions.find((option) => option.value === props.selectedAddressBarSourceId) ?? null;
      const selectorWrap = createElement('div', 'titlebar-journal-bar');
      const selector = this.trackView(
        createTitlebarSourceDropdownView({
          options: sourceOptions,
          value: props.selectedAddressBarSourceId ?? '',
          placeholder: props.addressBarSourcePlaceholder ?? '',
          className: `titlebar-source-select ${props.selectedAddressBarSourceId ? '' : 'is-placeholder'}`.trim(),
          title:
            props.addressBarSourceAriaLabel ?? props.addressBarSourcePlaceholder ?? '',
          onChange: (event) => props.onSelectAddressBarSource?.(event.target.value),
        }),
      );
      const selectorElement = selector.getElement();
      selectorElement.setAttribute(
        'aria-label',
        props.addressBarSourceAriaLabel ?? props.addressBarSourcePlaceholder ?? '',
      );
      selectorElement.style.setProperty(
        '--titlebar-source-width',
        `${measureSourceTriggerWidth(
          selectedOption?.label ?? props.addressBarSourcePlaceholder ?? '',
        )}px`,
      );
      selectorElement.addEventListener('keydown', (event) => {
        if (!props.onCycleAddressBarSource || !event.altKey) {
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          props.onCycleAddressBarSource('prev');
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          props.onCycleAddressBarSource('next');
        }
      });
      this.sourceSelector = selector;
      selectorWrap.append(selectorElement);
      this.controlsElement.append(selectorWrap);
    } else {
      this.sourceSelector = null;
    }

    if (props.onToggleAuxiliarySidebar && props.auxiliarySidebarToggleLabel) {
      const auxiliaryButton = this.trackView(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-auxiliary',
          label: props.auxiliarySidebarToggleLabel,
          icon: props.isAuxiliarySidebarOpen
            ? lxIconSemanticMap.titlebar.auxiliaryOpen
            : lxIconSemanticMap.titlebar.auxiliaryClosed,
          onClick: requestToggleTitlebarAuxiliarySidebar,
        }),
      );
      actionGroup.append(auxiliaryButton.getElement());
    }

    const exportButton = this.trackView(
      createIconButton({
        className: 'titlebar-btn titlebar-btn-export',
        label: props.labels.exportDocxLabel,
        icon: lxIconSemanticMap.titlebar.exportDocx,
        onClick: requestExportTitlebarDocx,
        disabled: !props.canExportDocx,
        title: props.canExportDocx
          ? props.labels.exportDocxLabel
          : props.labels.noExportableArticlesLabel,
      }),
    );
    const settingsButton = this.trackView(
      createIconButton({
        className: 'titlebar-btn titlebar-btn-settings',
        label: props.labels.settingsLabel,
        icon: lxIconSemanticMap.titlebar.settings,
        onClick: requestToggleTitlebarSettings,
      }),
    );
    actionGroup.append(exportButton.getElement(), settingsButton.getElement());

    this.controlsElement.append(actionGroup);

    if (WINDOW_CHROME_LAYOUT.renderCustomWindowControls) {
      const windowControls = this.trackView(
        createWindowControlsView({
          className: 'titlebar-window-controls',
          labels: {
            controlsAriaLabel: props.labels.controlsAriaLabel,
            minimizeLabel: props.labels.minimizeLabel,
            maximizeLabel: props.labels.maximizeLabel,
            restoreLabel: props.labels.restoreLabel,
            closeLabel: props.labels.closeLabel,
          },
          isWindowMaximized: props.isWindowMaximized,
          onWindowControl: props.onWindowControl,
        }),
      );
      this.controlsElement.append(windowControls.getElement());
    }
  }

  private trackView<T extends { dispose: () => void }>(view: T) {
    this.renderedViews.push(view);
    return view;
  }

  private disposeRenderedViews() {
    while (this.renderedViews.length > 0) {
      this.renderedViews.pop()?.dispose();
    }
    this.sourceSelector = null;
    this.webUrlInput = null;
  }
}

export function createTitlebarView(props: TitlebarProps) {
  return new TitlebarView(props);
}

export default TitlebarView;
