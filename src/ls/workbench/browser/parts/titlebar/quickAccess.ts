import type { LocaleMessages } from '../../../../../language/locales';
import type {
  TitlebarProps,
} from 'ls/workbench/browser/parts/titlebar/titlebarView';
import type {
  QuickAccessAction,
  QuickAccessCycleDirection,
  QuickAccessSourceOption,
} from 'ls/workbench/services/quickAccess/quickAccessService';

export type { QuickAccessAction, QuickAccessCycleDirection };

type TitlebarQuickAccessState = {
  ui: LocaleMessages;
  webUrl: string;
  addressBarSourceOptions: QuickAccessSourceOption[];
  selectedAddressBarSourceId: string;
};

type TitlebarQuickAccessActions = {
  dispatchQuickAccessAction: (action: QuickAccessAction) => void;
};

type CreateTitlebarQuickAccessPropsParams = {
  state: TitlebarQuickAccessState;
  actions: TitlebarQuickAccessActions;
};

export function createTitlebarQuickAccessProps({
  state: {
    ui,
    webUrl,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
  },
  actions: {
    dispatchQuickAccessAction,
  },
}: CreateTitlebarQuickAccessPropsParams): Pick<
  TitlebarProps,
  | 'webUrl'
  | 'onWebUrlChange'
  | 'articleUrlPlaceholder'
  | 'addressBarSourceOptions'
  | 'selectedAddressBarSourceId'
  | 'onSelectAddressBarSource'
  | 'onCycleAddressBarSource'
  | 'addressBarSourcePlaceholder'
  | 'addressBarSourceAriaLabel'
> {
  return {
    webUrl,
    onWebUrlChange: (url: string) =>
      dispatchQuickAccessAction({
        type: 'UPDATE_URL_INPUT',
        url,
      }),
    articleUrlPlaceholder: ui.pageUrlPlaceholder,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    onSelectAddressBarSource: (sourceId: string) =>
      dispatchQuickAccessAction({
        type: 'SELECT_SOURCE',
        sourceId,
      }),
    onCycleAddressBarSource: (direction: QuickAccessCycleDirection) =>
      dispatchQuickAccessAction({
        type: 'CYCLE_SOURCE',
        direction,
      }),
    addressBarSourcePlaceholder: ui.addressBarSourcePlaceholder,
    addressBarSourceAriaLabel: ui.addressBarSourceAriaLabel,
  };
}
