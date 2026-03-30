import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import { getBrowserWindowChromeLayout } from '../../../../platform/windows/common/windowChrome.js';
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
import type { WindowControlsAction } from './windowControls';
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

const WINDOW_CHROME_LAYOUT = getBrowserWindowChromeLayout();
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

function createIconButton(params: {
  className: string;
  label: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const button = createElement('button', params.className);
  button.type = 'button';
  button.textContent = params.text;
  button.disabled = Boolean(params.disabled);
  button.setAttribute('aria-label', params.label);
  button.title = params.title ?? params.label;
  button.addEventListener('click', params.onClick);
  return button;
}

export class TitlebarView {
  private props: TitlebarProps;
  private readonly element = createElement('header');
  private readonly leadingWindowControlsContainer = createElement('div');
  private readonly startElement = createElement('div', 'titlebar-start');
  private readonly centerElement = createElement('div', 'titlebar-center');
  private readonly controlsElement = createElement('div', 'titlebar-controls');
  private sourceSelector: HTMLSelectElement | null = null;
  private webUrlInput: HTMLInputElement | null = null;
  private readonly unsubscribeUiActions: () => void;

  constructor(props: TitlebarProps) {
    this.props = props;
    this.element.append(
      this.leadingWindowControlsContainer,
      this.startElement,
      this.centerElement,
      this.controlsElement,
    );
    this.unsubscribeUiActions = subscribeTitlebarUiActions((action) => {
      if (action.type === 'OPEN_ADDRESS_BAR_SOURCE_MENU') {
        this.sourceSelector?.focus();
        this.sourceSelector?.click();
        return;
      }

      if (action.type === 'FOCUS_WEB_URL_INPUT') {
        this.webUrlInput?.focus();
        this.webUrlInput?.select();
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

    this.renderStart(props);
    this.renderCenter(props);
    this.renderControls(props);
  }

  private renderStart(props: TitlebarProps) {
    this.startElement.replaceChildren();
    if (!props.onToggleSidebar || !props.sidebarToggleLabel) {
      return;
    }

    this.startElement.append(
      createIconButton({
        className: 'titlebar-btn titlebar-btn-sidebar',
        label: props.sidebarToggleLabel,
        text: props.isSidebarOpen ? '<' : '>',
        onClick: requestToggleTitlebarSidebar,
      }),
    );
  }

  private renderCenter(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.centerElement.replaceChildren();

    const navGroup = createElement('div', 'titlebar-nav-group');
    navGroup.append(
      createIconButton({
        className: 'titlebar-btn titlebar-btn-nav',
        label: props.labels.backLabel,
        text: '<',
        onClick: requestTitlebarNavigateBack,
        disabled: !props.browserUrl || !props.canGoBack,
      }),
      createIconButton({
        className: 'titlebar-btn titlebar-btn-nav',
        label: props.labels.forwardLabel,
        text: '>',
        onClick: requestTitlebarNavigateForward,
        disabled: !props.browserUrl || !props.canGoForward,
      }),
    );
    this.centerElement.append(navGroup);

    if (props.onWebUrlChange) {
      const urlBar = createElement('div', 'titlebar-url-bar');
      const input = createElement('input', 'titlebar-input-field titlebar-field-base');
      input.value = props.webUrl ?? '';
      input.placeholder = props.articleUrlPlaceholder ?? '';
      input.addEventListener('input', () => props.onWebUrlChange?.(input.value));
      input.addEventListener('keydown', (event) => {
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
      this.webUrlInput = input;
      urlBar.append(input);
      this.centerElement.append(urlBar);
    } else {
      this.webUrlInput = null;
    }
  }

  private renderControls(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.controlsElement.replaceChildren();

    if (props.onSelectAddressBarSource) {
      const sourceOptions = createSourceOptions(
        props.addressBarSourcePlaceholder,
        props.addressBarSourceOptions ?? [],
      );
      const selectedOption =
        sourceOptions.find((option) => option.value === props.selectedAddressBarSourceId) ??
        sourceOptions[0];
      const selectorWrap = createElement('div', 'titlebar-journal-bar');
      const selector = createElement(
        'select',
        `titlebar-source-select ${props.selectedAddressBarSourceId ? '' : 'is-placeholder'}`.trim(),
      );
      selector.value = props.selectedAddressBarSourceId ?? '';
      selector.setAttribute(
        'aria-label',
        props.addressBarSourceAriaLabel ?? props.addressBarSourcePlaceholder ?? '',
      );
      selector.title =
        props.addressBarSourceAriaLabel ?? props.addressBarSourcePlaceholder ?? '';
      selector.style.setProperty(
        '--titlebar-source-width',
        `${measureSourceTriggerWidth(selectedOption?.label ?? '')}px`,
      );
      for (const option of sourceOptions) {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (option.title) {
          optionElement.title = option.title;
        }
        selector.append(optionElement);
      }
      selector.addEventListener('change', () =>
        props.onSelectAddressBarSource?.(selector.value),
      );
      selector.addEventListener('keydown', (event) => {
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
      selectorWrap.append(selector);
      this.controlsElement.append(selectorWrap);
    } else {
      this.sourceSelector = null;
    }

    if (props.onToggleAuxiliarySidebar && props.auxiliarySidebarToggleLabel) {
      this.controlsElement.append(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-auxiliary',
          label: props.auxiliarySidebarToggleLabel,
          text: props.isAuxiliarySidebarOpen ? ']' : '[',
          onClick: requestToggleTitlebarAuxiliarySidebar,
        }),
      );
    }

    this.controlsElement.append(
      createIconButton({
        className: 'titlebar-btn titlebar-btn-export',
        label: props.labels.exportDocxLabel,
        text: 'Doc',
        onClick: requestExportTitlebarDocx,
        disabled: !props.canExportDocx,
        title: props.canExportDocx
          ? props.labels.exportDocxLabel
          : props.labels.noExportableArticlesLabel,
      }),
      createIconButton({
        className: 'titlebar-btn titlebar-btn-settings',
        label: props.labels.settingsLabel,
        text: 'Set',
        onClick: requestToggleTitlebarSettings,
      }),
    );

    if (WINDOW_CHROME_LAYOUT.renderCustomWindowControls) {
      const windowControls = createElement('div', 'titlebar-window-controls');
      windowControls.setAttribute('role', 'group');
      windowControls.setAttribute('aria-label', props.labels.controlsAriaLabel);
      windowControls.append(
        createIconButton({
          className: 'titlebar-btn titlebar-btn-window',
          label: props.labels.minimizeLabel,
          text: '-',
          onClick: () => props.onWindowControl('minimize'),
        }),
        createIconButton({
          className: 'titlebar-btn titlebar-btn-window',
          label: props.isWindowMaximized
            ? props.labels.restoreLabel
            : props.labels.maximizeLabel,
          text: props.isWindowMaximized ? 'o' : '[]',
          onClick: () => props.onWindowControl('toggle-maximize'),
        }),
        createIconButton({
          className: 'titlebar-btn titlebar-btn-window titlebar-btn-close',
          label: props.labels.closeLabel,
          text: 'x',
          onClick: () => props.onWindowControl('close'),
        }),
      );
      this.controlsElement.append(windowControls);
    }
  }
}

export function createTitlebarView(props: TitlebarProps) {
  return new TitlebarView(props);
}

export default TitlebarView;
