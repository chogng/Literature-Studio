import type { NativeMenuCoverage } from 'ls/base/parts/sandbox/common/desktopTypes';
import type {
  DropdownMenuActionPresenter,
  DropdownMenuActionPresenterRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuActionPresenter';
import {
  createElectronOverlayMenuController,
} from 'ls/workbench/browser/contextmenu/electronOverlayMenuController';

export type ElectronOverlayDropdownMenuActionPresenterOptions = {
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
};

export class ElectronOverlayDropdownMenuActionPresenter
  implements DropdownMenuActionPresenter
{
  readonly isDetached = true;
  private readonly electronOverlayMenuController = createElectronOverlayMenuController();
  private activeRequest: DropdownMenuActionPresenterRequest | null = null;
  private closingRequest: DropdownMenuActionPresenterRequest | null = null;

  constructor(
    private readonly options: ElectronOverlayDropdownMenuActionPresenterOptions = {},
  ) {}

  show = (request: DropdownMenuActionPresenterRequest) => {
    if (!request.options?.length) {
      request.onHide();
      return;
    }

    this.activeRequest = request;
    this.electronOverlayMenuController.show({
      anchor: request.anchor,
      options: request.options.map((option) => ({
        value: option.value,
        label: option.label,
        title: option.title,
        disabled: option.disabled,
      })),
      value: request.options.find((option) => option.checked)?.value,
      align: request.alignment,
      coverage: this.options.coverage,
      requestIdPrefix: this.options.requestIdPrefix,
      onHide: this.handleHide,
      onSelect: this.handleSelect,
    });
  };

  hide = () => {
    this.electronOverlayMenuController.hide();
  };

  isVisible = () => this.electronOverlayMenuController.isVisible();

  containsTarget = () => false;

  dispose = () => {
    this.activeRequest = null;
    this.closingRequest = null;
    this.electronOverlayMenuController.dispose();
  };

  private readonly handleHide = () => {
    const request = this.activeRequest;
    this.activeRequest = null;
    this.closingRequest = request;
    queueMicrotask(() => {
      if (this.closingRequest === request) {
        this.closingRequest = null;
      }
    });
    request?.onHide();
  };

  private readonly handleSelect = ({ value }: { value: string }) => {
    const request = this.closingRequest;
    this.closingRequest = null;
    request?.onSelectOption?.(value);
  };
}

export function createElectronOverlayDropdownMenuActionPresenter(
  options?: ElectronOverlayDropdownMenuActionPresenterOptions,
) {
  return new ElectronOverlayDropdownMenuActionPresenter(options);
}
