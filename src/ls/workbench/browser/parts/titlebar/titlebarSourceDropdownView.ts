import { getHoverService } from 'ls/base/browser/ui/hover/hover';
import {
  canUseElectronOverlayContextMenus,
  createElectronOverlayDropdownMenuPresenter,
} from 'ls/base/parts/contextmenu/electron-sandbox/overlayContextmenu';
import {
  createDomDropdownMenuPresenter,
  createDropdownView,
  type DropdownMenuPresenter,
  type DropdownProps,
} from 'ls/base/browser/ui/dropdown/dropdown';

export type TitlebarSourceDropdownView = {
  getElement: () => HTMLElement;
  setProps: (props: DropdownProps) => void;
  focus: () => void;
  dismiss: () => void;
  open: () => void;
  close: () => void;
  dispose: () => void;
};

function createTitlebarDropdownMenuPresenter(): DropdownMenuPresenter {
  if (canUseElectronOverlayContextMenus()) {
    return createElectronOverlayDropdownMenuPresenter({
      coverage: 'trigger-band',
      requestIdPrefix: 'electron-overlay-titlebar-dropdown',
    });
  }

  return createDomDropdownMenuPresenter({ layer: 'inline' });
}

export function createTitlebarSourceDropdownView(
  props: DropdownProps,
): TitlebarSourceDropdownView {
  const hoverService = getHoverService();
  const menuPresenter = createTitlebarDropdownMenuPresenter();

  const applyProps = (nextProps: DropdownProps) => {
    view.setProps({
      ...nextProps,
      hoverService: nextProps.hoverService ?? hoverService,
      menuAlign: 'end',
      menuPresenter,
    });
  };

  const view = createDropdownView({
    ...props,
    hoverService: props.hoverService ?? hoverService,
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
