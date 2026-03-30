import {
  createToastContainerView,
  type ToastContainerView,
} from './toast';

export type ToastHost = {
  render: (closeLabel: string) => void;
  dispose: () => void;
};

export function createToastHost(mount: HTMLElement): ToastHost {
  let view: ToastContainerView | null = null;

  return {
    render(closeLabel: string) {
      if (!view) {
        view = createToastContainerView({ closeLabel });
        mount.replaceChildren(view.getElement());
        return;
      }

      view.setCloseLabel(closeLabel);
      if (mount.firstChild !== view.getElement()) {
        mount.replaceChildren(view.getElement());
      }
    },
    dispose() {
      view?.dispose();
      view = null;
      mount.replaceChildren();
    },
  };
}
