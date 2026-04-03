import { createContextViewController } from 'ls/base/browser/ui/contextview/contextview';
import type {
  ContextViewAnchor,
  ContextViewDelegate,
  ContextViewDisposable,
  ContextViewRenderResult,
  ContextViewService,
} from 'ls/platform/contextview/browser/contextView';

function normalizeDisposable(result: ContextViewRenderResult): (() => void) | null {
  if (!result) {
    return null;
  }

  if (typeof result === 'function') {
    return result;
  }

  return () => {
    result.dispose();
  };
}

function createTransientAnchor(anchor: Exclude<ContextViewAnchor, HTMLElement>) {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.style.position = 'fixed';
  element.style.left = `${anchor.x}px`;
  element.style.top = `${anchor.y}px`;
  element.style.width = `${anchor.width ?? 0}px`;
  element.style.height = `${anchor.height ?? 0}px`;
  element.style.pointerEvents = 'none';
  element.style.opacity = '0';
  document.body.append(element);
  return element;
}

class PlatformContextViewService implements ContextViewService {
  private readonly contextView = createContextViewController();
  private currentDelegate: ContextViewDelegate | null = null;
  private currentRenderDispose: (() => void) | null = null;
  private transientAnchor: HTMLElement | null = null;

  showContextView(delegate: ContextViewDelegate): ContextViewDisposable {
    this.hideContextView();

    this.currentDelegate = delegate;

    const container = document.createElement('div');
    const renderResult = delegate.render(container);
    this.currentRenderDispose = normalizeDisposable(renderResult);

    const anchor = delegate.getAnchor();
    const anchorElement =
      anchor instanceof HTMLElement
        ? anchor
        : (this.transientAnchor = createTransientAnchor(anchor));

    this.contextView.show({
      anchor: anchorElement,
      className: delegate.className,
      render: () => container,
      onHide: this.handleHide,
      alignment: delegate.alignment,
      position: delegate.position,
      offset: delegate.offset,
      matchAnchorWidth: delegate.matchAnchorWidth,
      minWidth: delegate.minWidth,
    });

    return {
      dispose: () => {
        if (this.currentDelegate === delegate) {
          this.hideContextView();
        }
      },
    };
  }

  hideContextView(data?: unknown) {
    if (!this.contextView.isVisible()) {
      this.cleanupCurrentView();
      return;
    }

    this.contextView.hide(data);
  }

  getContextViewElement = () => this.contextView.getViewElement();

  layout = () => {
    if (this.currentDelegate?.canRelayout === false) {
      return;
    }

    this.contextView.layout();
  };

  isVisible = () => this.contextView.isVisible();

  dispose = () => {
    this.hideContextView();
    this.contextView.dispose();
  };

  private cleanupCurrentView() {
    this.currentRenderDispose?.();
    this.currentRenderDispose = null;
    this.currentDelegate = null;
    this.transientAnchor?.remove();
    this.transientAnchor = null;
  }

  private readonly handleHide = (data?: unknown) => {
    const delegate = this.currentDelegate;
    this.cleanupCurrentView();
    delegate?.onHide?.(data);
  };
}

export function createContextViewService(): ContextViewService {
  return new PlatformContextViewService();
}
