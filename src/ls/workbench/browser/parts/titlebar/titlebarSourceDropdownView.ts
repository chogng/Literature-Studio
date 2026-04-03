import { createDropdownView } from 'ls/base/browser/ui/dropdown/dropdown';
import type { DropdownProps } from 'ls/base/browser/ui/dropdown/dropdown';
import { createWorkbenchDropdownMenuPresenter } from 'ls/workbench/services/contextmenu/electron-sandbox/contextmenuService';

// Keep this wrapper in the titlebar layer: it owns titlebar-specific wiring while
// delegating reusable menu backend routing to the workbench context menu layer.
export type TitlebarSourceDropdownView = {
  getElement: () => HTMLElement;
  setProps: (props: DropdownProps) => void;
  focus: () => void;
  dismiss: () => void;
  open: () => void;
  close: () => void;
  dispose: () => void;
};

export function createTitlebarSourceDropdownView(
  props: DropdownProps,
): TitlebarSourceDropdownView {
  const menuPresenter = createWorkbenchDropdownMenuPresenter({
    backend: 'electron-overlay',
    electronOverlay: {
      coverage: 'trigger-band',
      requestIdPrefix: 'electron-overlay-titlebar-dropdown',
    },
  });

  const applyProps = (nextProps: DropdownProps) => {
    view.setProps({
      ...nextProps,
      menuAlign: 'end',
      menuPresenter,
    });
  };

  const view = createDropdownView({
    ...props,
    menuAlign: 'end',
    menuPresenter,
  });

  return {
    getElement: () => view.getElement(),
    setProps: applyProps,
    focus: () => view.focus(),
    dismiss: () => view.dismiss(),
    open: () => view.open(),
    close: () => view.close(),
    dispose: () => {
      view.dispose();
      menuPresenter.dispose();
    },
  };
}
