import { ScrollbarVisibility } from 'ls/base/browser/ui/scrollbar/scrollableElementOptions';

function splitClassNames(className: string) {
  return className.split(/\s+/).filter(Boolean);
}

export class ScrollbarVisibilityController {
  private static readonly HIDING_CLASS_NAME = 'is-scrollbar-hiding';
  private readonly visibleClassNames: readonly string[];
  private readonly invisibleClassNames: readonly string[];
  private visibility: ScrollbarVisibility;
  private domNode: HTMLElement | null = null;
  private rawShouldBeVisible = false;
  private shouldBeVisible = false;
  private isNeeded = false;
  private isVisible = false;
  private revealTimer: number | null = null;

  constructor(
    visibility: ScrollbarVisibility,
    visibleClassName: string,
    invisibleClassName: string,
  ) {
    this.visibility = visibility;
    this.visibleClassNames = splitClassNames(visibleClassName);
    this.invisibleClassNames = splitClassNames(invisibleClassName);
  }

  setVisibility(visibility: ScrollbarVisibility) {
    if (this.visibility === visibility) {
      return;
    }

    this.visibility = visibility;
    this.updateShouldBeVisible();
  }

  setShouldBeVisible(rawShouldBeVisible: boolean) {
    this.rawShouldBeVisible = rawShouldBeVisible;
    this.updateShouldBeVisible();
  }

  setIsNeeded(isNeeded: boolean) {
    if (this.isNeeded === isNeeded) {
      return;
    }

    this.isNeeded = isNeeded;
    this.ensureVisibility();
  }

  setDomNode(domNode: HTMLElement) {
    this.domNode = domNode;
    this.applyClassNames(this.invisibleClassNames);
    this.setShouldBeVisible(false);
  }

  ensureVisibility() {
    if (!this.isNeeded) {
      this.hide(false);
      return;
    }

    if (this.shouldBeVisible) {
      this.reveal();
      return;
    }

    this.hide(true);
  }

  dispose() {
    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
  }

  private applyVisibilitySetting() {
    if (this.visibility === ScrollbarVisibility.Hidden) {
      return false;
    }
    if (this.visibility === ScrollbarVisibility.Visible) {
      return true;
    }
    return this.rawShouldBeVisible;
  }

  private updateShouldBeVisible() {
    const shouldBeVisible = this.applyVisibilitySetting();
    if (this.shouldBeVisible === shouldBeVisible) {
      return;
    }

    this.shouldBeVisible = shouldBeVisible;
    this.ensureVisibility();
  }

  private reveal() {
    if (this.isVisible) {
      return;
    }

    this.isVisible = true;
    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
    }
    this.revealTimer = window.setTimeout(() => {
      this.revealTimer = null;
      this.applyClassNames(this.visibleClassNames);
    }, 0);
  }

  private hide(withFadeAway: boolean) {
    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
    if (!this.isVisible) {
      this.applyClassNames(this.invisibleClassNames, withFadeAway);
      return;
    }

    this.isVisible = false;
    this.applyClassNames(this.invisibleClassNames, withFadeAway);
  }

  private applyClassNames(classNames: readonly string[], withFadeAway = false) {
    if (!this.domNode) {
      return;
    }

    for (const className of this.visibleClassNames) {
      this.domNode.classList.remove(className);
    }
    for (const className of this.invisibleClassNames) {
      this.domNode.classList.remove(className);
    }
    this.domNode.classList.remove(ScrollbarVisibilityController.HIDING_CLASS_NAME);

    for (const className of classNames) {
      this.domNode.classList.add(className);
    }
    if (withFadeAway) {
      this.domNode.classList.add(ScrollbarVisibilityController.HIDING_CLASS_NAME);
    }
  }
}

export default ScrollbarVisibilityController;
