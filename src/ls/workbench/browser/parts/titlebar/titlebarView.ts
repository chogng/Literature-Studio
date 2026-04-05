import type { QuickAccessSourceOption } from 'ls/workbench/services/quickAccess/quickAccessService';
import {
  createActionBarView,
  type ActionBarItem,
  type ActionBarMenuItem,
} from 'ls/base/browser/ui/actionbar/actionbar';
import {
  createDropdownMenuActionViewItem,
  type DropdownMenuActionOverlayContext,
} from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import { getHoverService } from 'ls/base/browser/ui/hover/hover';
import { InputBox } from 'ls/base/browser/ui/inputbox/inputBox';
import { getWindowChromeLayout } from 'ls/platform/window/common/window';
import { createTitlebarSourceDropdownView } from 'ls/workbench/browser/parts/titlebar/titlebarSourceDropdownView';
import type { TitlebarSourceDropdownView } from 'ls/workbench/browser/parts/titlebar/titlebarSourceDropdownView';
import { createContextMenuService } from 'ls/workbench/services/contextmenu/electron-sandbox/contextmenuService';

import {
  requestExportTitlebarDocx,
  requestTitlebarNavigateBack,
  requestTitlebarNavigateForward,
  requestTitlebarNavigateWeb,
  requestToggleTitlebarPrimarySidebar,
  requestToggleTitlebarAgentSidebar,
  requestToggleTitlebarSettings,
  subscribeTitlebarUiActions,
} from 'ls/workbench/browser/parts/titlebar/titlebarActions';
import { createWindowControlsView } from 'ls/workbench/browser/parts/titlebar/windowControls';
import type { WindowControlsAction } from 'ls/workbench/browser/parts/titlebar/windowControls';

import 'ls/workbench/browser/parts/titlebar/media/titlebar.css';

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
  showPrimarySidebarLabel: string;
  hidePrimarySidebarLabel: string;
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
  isPrimarySidebarOpen?: boolean;
  primarySidebarToggleLabel?: string;
  onTogglePrimarySidebar?: () => void;
  isAgentSidebarOpen?: boolean;
  agentSidebarToggleLabel?: string;
  onToggleAgentSidebar?: () => void;
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
  showPrimarySidebarLabel: '',
  hidePrimarySidebarLabel: '',
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

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
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

type TitlebarIconActionItem = {
  className: string;
  label: string;
  icon: LxIconName;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  menu?: readonly ActionBarMenuItem[];
  renderOverlay?: (context: DropdownMenuActionOverlayContext) => HTMLElement;
  overlayRole?: string;
  menuClassName?: string;
  minWidth?: number;
};

function createTitlebarActionBar(params: {
  className: string;
  ariaLabel?: string;
  items: readonly TitlebarIconActionItem[];
}) {
  const hoverService = getHoverService();
  const shouldUseContextMenuService = params.items.some(
    (item) => item.menu && !item.renderOverlay,
  );
  const electronOverlayContextMenuService = shouldUseContextMenuService
    ? createContextMenuService({
        backend: 'electron-overlay',
        coverage: 'trigger-band',
        requestIdPrefix: 'electron-overlay-titlebar-action-menu',
      })
    : null;

  const actionBarView = createActionBarView({
    className: composeClassName(['titlebar-actionbar', params.className]),
    ariaRole: 'group',
    ariaLabel: params.ariaLabel,
    hoverService,
    items: params.items.map<ActionBarItem>((item) => {
      const baseOptions = {
        label: item.label,
        title: item.title ?? item.label,
        content: createLxIcon(item.icon),
        disabled: item.disabled,
        buttonClassName: composeClassName(['titlebar-btn', item.className]),
      };

      if (item.menu || item.renderOverlay) {
        return createDropdownMenuActionViewItem({
          ...baseOptions,
          menu: item.menu,
          renderOverlay: item.renderOverlay,
          overlayRole: item.overlayRole,
          menuClassName: item.menuClassName,
          minWidth: item.minWidth,
          contextMenuService: electronOverlayContextMenuService ?? undefined,
          hoverService,
        });
      }

      return {
        ...baseOptions,
        onClick: item.onClick ? () => item.onClick?.() : undefined,
      };
    }),
  });

  return {
    getElement: () => actionBarView.getElement(),
    dispose: () => {
      actionBarView.dispose();
      electronOverlayContextMenuService?.dispose();
    },
  };
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
  private readonly sourceSelectorWrap = createElement('div', 'titlebar-journal-bar');
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
    this.sourceSelector?.dispose();
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
      isPrimarySidebarOpen: this.props.isPrimarySidebarOpen ?? false,
      isAgentSidebarOpen: this.props.isAgentSidebarOpen ?? false,
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
  }

  private renderCenter(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.centerElement.replaceChildren();

    const navItems: TitlebarIconActionItem[] = [
      {
        className: 'titlebar-btn-nav',
        label: props.labels.backLabel,
        icon: lxIconSemanticMap.titlebar.navigateBack,
        onClick: requestTitlebarNavigateBack,
        disabled: !props.browserUrl || !props.canGoBack,
      },
      {
        className: 'titlebar-btn-nav',
        label: props.labels.forwardLabel,
        icon: lxIconSemanticMap.titlebar.navigateForward,
        onClick: requestTitlebarNavigateForward,
        disabled: !props.browserUrl || !props.canGoForward,
      },
    ];

    if (props.onNavigateRefresh) {
      navItems.push({
        className: 'titlebar-btn-nav titlebar-btn-refresh',
        label: props.labels.refreshLabel,
        icon: lxIconSemanticMap.titlebar.refresh,
        onClick: () => props.onNavigateRefresh?.(),
        disabled: !props.browserUrl,
      });
    }

    const navGroup = this.trackView(
      createTitlebarActionBar({
        className: 'titlebar-nav-group',
        items: navItems,
      }),
    );

    this.centerElement.append(navGroup.getElement());

    if (props.onWebUrlChange) {
      const urlBar = createElement('div', 'titlebar-url-bar');
      const inputBox = new InputBox(urlBar, undefined, {
        className: 'titlebar-input-field titlebar-field-base',
        value: props.webUrl ?? '',
        placeholder: props.articleUrlPlaceholder ?? '',
      });
      const changeListener = inputBox.onDidChange((value) => {
        props.onWebUrlChange?.(value);
      });
      const inputElement = inputBox.inputElement;
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
      this.trackView({
        dispose: () => {
          changeListener.dispose();
          inputBox.dispose();
        },
      });
      this.webUrlInput = inputElement;
      this.centerElement.append(urlBar);
    } else {
      this.webUrlInput = null;
    }
  }

  private renderControls(props: TitlebarProps & { labels: TitlebarLabels }) {
    this.controlsElement.replaceChildren();
    const actionItems: TitlebarIconActionItem[] = [];

    if (props.onSelectAddressBarSource) {
      const sourceOptions = createSourceOptions(
        props.addressBarSourceOptions ?? [],
      );
      const selectedOption =
        sourceOptions.find((option) => option.value === props.selectedAddressBarSourceId) ?? null;
      const selectorProps = {
        options: sourceOptions,
        value: props.selectedAddressBarSourceId ?? '',
        placeholder: props.addressBarSourcePlaceholder ?? '',
        className: `titlebar-source-select ${props.selectedAddressBarSourceId ? '' : 'is-placeholder'}`.trim(),
        title:
          props.addressBarSourceAriaLabel ?? props.addressBarSourcePlaceholder ?? '',
        onChange: (event: { target: { value: string } }) =>
          props.onSelectAddressBarSource?.(event.target.value),
      };
      const selector = this.sourceSelector ?? createTitlebarSourceDropdownView(selectorProps);
      const selectorElement = selector.getElement();
      this.sourceSelectorWrap.replaceChildren(selectorElement);
      this.controlsElement.append(this.sourceSelectorWrap);
      selector.setProps(selectorProps);
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
      selectorElement.onkeydown = (event) => {
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
      };
      this.sourceSelector = selector;
    } else {
      this.sourceSelector?.dispose();
      this.sourceSelector = null;
      this.sourceSelectorWrap.replaceChildren();
    }

    if (props.onTogglePrimarySidebar && props.primarySidebarToggleLabel) {
      actionItems.push({
        className: 'titlebar-btn-primary',
        label: props.primarySidebarToggleLabel,
        icon: props.isPrimarySidebarOpen
          ? lxIconSemanticMap.titlebar.primarySidebarOpen
          : lxIconSemanticMap.titlebar.primarySidebarClosed,
        onClick: requestToggleTitlebarPrimarySidebar,
      });
    }

    if (props.onToggleAgentSidebar && props.agentSidebarToggleLabel) {
      actionItems.push({
        className: 'titlebar-btn-agent',
        label: props.agentSidebarToggleLabel,
        icon: props.isAgentSidebarOpen
          ? lxIconSemanticMap.titlebar.agentSidebarOpen
          : lxIconSemanticMap.titlebar.agentSidebarClosed,
        onClick: requestToggleTitlebarAgentSidebar,
      });
    }

    actionItems.push(
      {
        className: 'titlebar-btn-export',
        label: props.labels.exportDocxLabel,
        icon: lxIconSemanticMap.titlebar.exportDocx,
        onClick: requestExportTitlebarDocx,
        disabled: !props.canExportDocx,
        title: props.canExportDocx
          ? props.labels.exportDocxLabel
          : props.labels.noExportableArticlesLabel,
      },
      {
        className: 'titlebar-btn-settings',
        label: props.labels.settingsLabel,
        icon: lxIconSemanticMap.titlebar.settings,
        onClick: requestToggleTitlebarSettings,
      },
    );

    const actionGroup = this.trackView(
      createTitlebarActionBar({
        className: 'titlebar-controls-group',
        ariaLabel: props.labels.controlsAriaLabel,
        items: actionItems,
      }),
    );

    this.controlsElement.append(actionGroup.getElement());

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
    this.webUrlInput = null;
  }
}

export function createTitlebarView(props: TitlebarProps) {
  return new TitlebarView(props);
}

export default TitlebarView;
