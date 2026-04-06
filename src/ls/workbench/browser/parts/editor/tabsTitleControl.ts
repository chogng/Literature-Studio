import {
  getHoverService,
  type HoverHandle,
} from 'ls/base/browser/ui/hover/hover';
import { createLxIcon, type LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';
import {
  LifecycleStore,
  MutableLifecycle,
  toDisposable,
  type DisposableLike,
} from 'ls/base/common/lifecycle';
import type { EditorGroupTabItem } from 'ls/workbench/browser/parts/editor/editorGroupModel';
import { TitleControl } from 'ls/workbench/browser/parts/editor/titleControl';

type TabView = {
  element: HTMLDivElement;
  mainButton: HTMLButtonElement;
  mainHover: HoverHandle;
  icon: HTMLSpanElement;
  labelText: HTMLSpanElement;
  dispose: () => void;
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

function addDisposableListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

function getTabPaneModeIconName(
  paneMode: EditorGroupTabItem['paneMode'],
  isActive: boolean,
): LxIconName {
  if (paneMode === 'draft') {
    return 'write';
  }

  if (paneMode === 'pdf') {
    return isActive ? 'pdf' : 'file-pdf';
  }

  return 'broswer-1';
}

export class TabsTitleControl extends TitleControl {
  private readonly disposables = new LifecycleStore();
  private readonly resizeObserver = new MutableLifecycle<DisposableLike>();
  private readonly layoutAnimationFrame = new MutableLifecycle<DisposableLike>();
  private container: HTMLDivElement | null = null;
  private readonly tabViews = new Map<string, TabView>();
  private shouldRevealActiveTab = false;
  private readonly hoverService = getHoverService();

  protected override create() {
    this.container = createElement('div', 'editor-tabs-container');
    this.container.setAttribute('role', 'tablist');
    this.disposables.add(addDisposableListener(this.container, 'scroll', this.handleContainerScroll, {
      passive: true,
    }));
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        this.scheduleLayoutSync(false);
      });
      resizeObserver.observe(this.container);
      this.resizeObserver.value = toDisposable(() => {
        resizeObserver.disconnect();
      });
    } else {
      this.disposables.add(addDisposableListener(window, 'resize', this.handleWindowResize));
    }
    this.redraw();

    return this.container;
  }

  protected override update() {
    this.redraw();
  }

  override dispose() {
    this.layoutAnimationFrame.dispose();
    this.resizeObserver.dispose();
    this.disposables.dispose();
    for (const tabView of this.tabViews.values()) {
      tabView.dispose();
    }
    this.tabViews.clear();
    this.container = null;

    super.dispose();
  }

  private redraw() {
    if (!this.container) {
      return;
    }

    const nextTabElements: HTMLDivElement[] = [];
    const nextTabIds = new Set<string>();
    const totalTabs = this.props.group.tabs.length;

    for (const [index, tab] of this.props.group.tabs.entries()) {
      let tabView = this.tabViews.get(tab.id);
      if (!tabView) {
        tabView = this.createTabView();
        this.tabViews.set(tab.id, tabView);
      }

      this.updateTabView(tabView, tab, index, totalTabs);
      nextTabElements.push(tabView.element);
      nextTabIds.add(tab.id);
    }

    for (const [tabId, tabView] of [...this.tabViews.entries()]) {
      if (nextTabIds.has(tabId)) {
        continue;
      }

      tabView.dispose();
      this.tabViews.delete(tabId);
    }

    this.syncTabOrder(nextTabElements);
    this.scheduleLayoutSync();
  }

  private createTabView(): TabView {
    const tabElement = createElement('div', 'editor-tab');
    const mainButton = createElement(
      'button',
      'editor-tab-main btn-base btn-ghost btn-md',
    );
    mainButton.type = 'button';
    mainButton.setAttribute('role', 'tab');

    const label = createElement('span', 'editor-tab-label');
    const icon = createElement('span', 'editor-tab-icon');
    const labelText = createElement('span', 'editor-tab-label-text');
    label.append(icon, labelText);
    mainButton.append(label);
    const mainHover = this.hoverService.createHover(mainButton, null);
    tabElement.append(mainButton);

    return {
      element: tabElement,
      mainButton,
      mainHover,
      icon,
      labelText,
      dispose: () => {
        mainHover.dispose();
        tabElement.remove();
      },
    };
  }

  private updateTabView(
    tabView: TabView,
    tab: EditorGroupTabItem,
    index: number,
    totalTabs: number,
  ) {
    tabView.element.classList.toggle('is-active', tab.state.isActive);
    tabView.element.classList.toggle(
      'has-local-history',
      tab.state.hasLocalHistory,
    );
    tabView.element.classList.toggle('has-title', Boolean(tab.label.trim()));
    tabView.element.classList.toggle('is-available', Boolean(tab.targetTabId));
    tabView.element.dataset.paneMode = tab.paneMode;
    tabView.element.dataset.hasLocalHistory = String(tab.state.hasLocalHistory);
    tabView.element.dataset.tabId = tab.id;

    tabView.mainButton.setAttribute('aria-selected', String(tab.state.isActive));
    tabView.mainButton.setAttribute('aria-posinset', String(index + 1));
    tabView.mainButton.setAttribute('aria-setsize', String(totalTabs));
    tabView.mainButton.tabIndex = tab.state.isActive ? 0 : 0;
    tabView.mainHover.update(tab.title);
    tabView.mainButton.disabled = false;
    tabView.mainButton.onclick = () => {
      if (tab.targetTabId) {
        this.props.onActivateTab(tab.targetTabId);
        return;
      }

      this.props.onOpenPaneMode(tab.paneMode);
    };

    tabView.icon.replaceChildren(
      createLxIcon(getTabPaneModeIconName(tab.paneMode, tab.state.isActive)),
    );
    tabView.labelText.textContent = tab.label;
  }

  private syncTabOrder(nextTabElements: HTMLDivElement[]) {
    if (!this.container) {
      return;
    }

    let currentNode = this.container.firstChild;
    for (const nextTabElement of nextTabElements) {
      if (nextTabElement === currentNode) {
        currentNode = currentNode?.nextSibling ?? null;
        continue;
      }

      this.container.insertBefore(nextTabElement, currentNode);
    }

    while (currentNode) {
      const nextSibling = currentNode.nextSibling;
      this.container.removeChild(currentNode);
      currentNode = nextSibling;
    }
  }

  private scheduleLayoutSync(revealActiveTab = true) {
    this.shouldRevealActiveTab = this.shouldRevealActiveTab || revealActiveTab;
    if (this.layoutAnimationFrame.value) {
      return;
    }

    let animationFrameHandle = 0;
    const animationFrameDisposable = toDisposable(() => {
      window.cancelAnimationFrame(animationFrameHandle);
    });
    this.layoutAnimationFrame.value = animationFrameDisposable;
    animationFrameHandle = window.requestAnimationFrame(() => {
      if (this.layoutAnimationFrame.value === animationFrameDisposable) {
        this.layoutAnimationFrame.clearAndLeak();
      }
      this.syncOverflowState();
      if (this.shouldRevealActiveTab) {
        this.revealActiveTab();
      }
      this.shouldRevealActiveTab = false;
      this.syncOverflowState();
    });
  }

  private syncOverflowState() {
    if (!this.container) {
      return;
    }

    const lastTab = this.container.lastElementChild as HTMLElement | null;
    const contentRight = lastTab
      ? lastTab.offsetLeft + lastTab.offsetWidth
      : this.container.scrollWidth;
    const maxScrollLeft = Math.max(
      0,
      contentRight - this.container.clientWidth,
    );
    const isOverflowing =
      this.container.clientWidth > 0 && maxScrollLeft > 1;
    const scrollLeft = this.container.scrollLeft;

    this.container.classList.toggle('is-overflowing', isOverflowing);
    this.container.classList.toggle(
      'is-scroll-start',
      !isOverflowing || scrollLeft <= 1,
    );
    this.container.classList.toggle(
      'is-scroll-end',
      !isOverflowing || scrollLeft >= maxScrollLeft - 1,
    );
  }

  private revealActiveTab() {
    if (!this.container) {
      return;
    }

    const activeTab = this.container.querySelector(
      '.editor-tab.is-active',
    ) as HTMLElement | null;
    if (!activeTab) {
      return;
    }

    const visibleLeft = this.container.scrollLeft;
    const visibleRight = visibleLeft + this.container.clientWidth;
    const activeLeft = activeTab.offsetLeft;
    const activeRight = activeLeft + activeTab.offsetWidth;

    if (activeLeft < visibleLeft) {
      this.container.scrollLeft = activeLeft;
      return;
    }

    if (activeRight > visibleRight) {
      this.container.scrollLeft = Math.max(
        0,
        activeRight - this.container.clientWidth,
      );
    }
  }

  private readonly handleContainerScroll = () => {
    this.syncOverflowState();
  };

  private readonly handleWindowResize = () => {
    this.scheduleLayoutSync(false);
  };
}
