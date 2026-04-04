import {
  getHoverService,
  type HoverHandle,
} from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import type { EditorGroupTabItem } from 'ls/workbench/browser/parts/editor/editorGroupModel';
import { TitleControl } from 'ls/workbench/browser/parts/editor/titleControl';

type TabView = {
  element: HTMLDivElement;
  mainButton: HTMLButtonElement;
  mainHover: HoverHandle;
  kindLabel: HTMLSpanElement;
  labelText: HTMLSpanElement;
  closeButton: HTMLButtonElement;
  closeHover: HoverHandle;
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

function getTabKindLabel(kind: 'draft' | 'web' | 'pdf') {
  if (kind === 'draft') {
    return 'D';
  }

  if (kind === 'pdf') {
    return 'P';
  }

  return 'W';
}

export class TabsTitleControl extends TitleControl {
  private container: HTMLDivElement | null = null;
  private readonly tabViews = new Map<string, TabView>();
  private resizeObserver?: ResizeObserver;
  private layoutAnimationFrame: number | null = null;
  private shouldRevealActiveTab = false;
  private readonly hoverService = getHoverService();

  protected override create() {
    this.container = createElement('div', 'editor-tabs-container');
    this.container.setAttribute('role', 'tablist');
    this.container.addEventListener('scroll', this.handleContainerScroll, {
      passive: true,
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleLayoutSync(false);
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.handleWindowResize);
    }
    this.redraw();

    return this.container;
  }

  protected override update() {
    this.redraw();
  }

  override dispose() {
    if (this.layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(this.layoutAnimationFrame);
      this.layoutAnimationFrame = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.container?.removeEventListener('scroll', this.handleContainerScroll);
    if (typeof ResizeObserver === 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize);
    }
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
    const kindLabel = createElement('span', 'editor-tab-kind');
    const labelText = createElement('span', 'editor-tab-label-text');
    label.append(kindLabel, labelText);
    mainButton.append(label);
    const mainHover = this.hoverService.createHover(mainButton, null);

    const closeButton = createElement(
      'button',
      'editor-tab-close btn-base btn-ghost btn-mode-icon btn-sm',
    );
    closeButton.type = 'button';
    closeButton.append(createLxIcon(lxIconSemanticMap.editor.closeTab));
    const closeHover = this.hoverService.createHover(closeButton, this.props.labels.close);

    tabElement.append(mainButton, closeButton);

    return {
      element: tabElement,
      mainButton,
      mainHover,
      kindLabel,
      labelText,
      closeButton,
      closeHover,
      dispose: () => {
        mainHover.dispose();
        closeHover.dispose();
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
    tabView.element.classList.toggle('is-closable', tab.state.isClosable);
    tabView.element.dataset.kind = tab.kind;
    tabView.element.dataset.hasLocalHistory = String(tab.state.hasLocalHistory);
    tabView.element.dataset.tabId = tab.id;

    tabView.mainButton.setAttribute('aria-selected', String(tab.state.isActive));
    tabView.mainButton.setAttribute('aria-posinset', String(index + 1));
    tabView.mainButton.setAttribute('aria-setsize', String(totalTabs));
    tabView.mainButton.tabIndex = tab.state.isActive ? 0 : -1;
    tabView.mainHover.update(tab.title);
    tabView.mainButton.onclick = () => {
      this.props.onActivateTab(tab.id);
    };

    tabView.kindLabel.textContent = getTabKindLabel(tab.kind);
    tabView.labelText.textContent = tab.label;

    tabView.closeButton.setAttribute('aria-label', this.props.labels.close);
    tabView.closeButton.disabled = !tab.state.isClosable;
    tabView.closeButton.tabIndex = tab.state.isClosable ? 0 : -1;
    tabView.closeButton.onclick = tab.state.isClosable
      ? (event) => {
          event.stopPropagation();
          this.props.onCloseTab(tab.id);
        }
      : null;
    tabView.closeHover.update(
      tab.state.isClosable ? this.props.labels.close : null,
    );
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
    if (this.layoutAnimationFrame !== null) {
      return;
    }

    this.layoutAnimationFrame = window.requestAnimationFrame(() => {
      this.layoutAnimationFrame = null;
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
