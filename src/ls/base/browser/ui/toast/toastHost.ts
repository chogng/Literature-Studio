import { createToastContainerView } from 'ls/base/browser/ui/toast/toast';
import type { ToastContainerView } from 'ls/base/browser/ui/toast/toast';
import { LifecycleOwner, MutableLifecycle } from 'ls/base/common/lifecycle';

export type ToastHost = {
  render: (closeLabel: string) => void;
  dispose: () => void;
};

class ToastHostController extends LifecycleOwner implements ToastHost {
  private readonly view = new MutableLifecycle<ToastContainerView>();
  private disposed = false;

  constructor(private readonly mount: HTMLElement) {
    super();
    this.register(this.view);
  }

  render(closeLabel: string) {
    if (this.disposed) {
      return;
    }

    let currentView = this.view.value;
    if (!currentView) {
      currentView = createToastContainerView({ closeLabel });
      this.view.value = currentView;
      this.mount.replaceChildren(currentView.getElement());
      return;
    }

    currentView.setCloseLabel(closeLabel);
    if (this.mount.firstChild !== currentView.getElement()) {
      this.mount.replaceChildren(currentView.getElement());
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    super.dispose();
    this.mount.replaceChildren();
  }
}

export function createToastHost(mount: HTMLElement): ToastHost {
  return new ToastHostController(mount);
}
