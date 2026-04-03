import type { NativeMenuCoverage } from 'ls/base/parts/sandbox/common/desktopTypes';
import type {
  DropdownMenuPresenter,
  DropdownMenuRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuPresenter';
import { shouldRefreshDropdownMenuRequest } from 'ls/base/browser/ui/dropdown/dropdownMenuPresenter';
import {
  createElectronOverlayMenuController,
} from 'ls/workbench/browser/contextmenu/electronOverlayMenuController';

export type ElectronOverlayDropdownMenuPresenterOptions = {
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
};

export class ElectronOverlayDropdownMenuPresenter implements DropdownMenuPresenter {
  readonly isDetached = true;
  readonly supportsActiveDescendant = false;
  readonly respondsToViewportChanges = true;
  private readonly electronOverlayMenuController = createElectronOverlayMenuController();
  private activeRequest: DropdownMenuRequest | null = null;
  private closingRequest: DropdownMenuRequest | null = null;
  private activeTriggerRect: DropdownMenuRequest['triggerRect'] | null = null;

  constructor(
    private readonly options: ElectronOverlayDropdownMenuPresenterOptions = {},
  ) {}

  show = (request: DropdownMenuRequest) => {
    if (
      request.source === 'props' &&
      this.activeRequest &&
      !shouldRefreshDropdownMenuRequest(this.activeRequest, request)
    ) {
      this.activeRequest = request;
      return;
    }

    if (!this.activeTriggerRect || request.source === 'open' || request.source === 'viewport') {
      this.activeTriggerRect = request.triggerRect;
    }

    this.activeRequest = request;
    this.electronOverlayMenuController.show({
      anchor: this.activeTriggerRect ?? request.triggerRect,
      options: request.options.map((option) => ({
        value: option.value,
        label: option.label,
        title: option.title,
        disabled: option.disabled,
      })),
      value: request.value,
      align: request.align,
      coverage: this.options.coverage,
      requestIdPrefix: this.options.requestIdPrefix,
      onHide: this.handleHide,
      onSelect: this.handleSelect,
    });
  };

  hide = () => {
    this.activeTriggerRect = null;
    this.electronOverlayMenuController.hide();
  };

  isVisible = () => this.electronOverlayMenuController.isVisible();

  containsTarget = () => false;

  dispose = () => {
    this.activeRequest = null;
    this.closingRequest = null;
    this.activeTriggerRect = null;
    this.electronOverlayMenuController.dispose();
  };

  private readonly handleHide = () => {
    const request = this.activeRequest;
    this.activeRequest = null;
    this.activeTriggerRect = null;
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
    request?.onSelect(value);
  };
}

export function createElectronOverlayDropdownMenuPresenter(
  options?: ElectronOverlayDropdownMenuPresenterOptions,
) {
  return new ElectronOverlayDropdownMenuPresenter(options);
}
