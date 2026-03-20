import type { LocaleMessages } from '../../../../../language/locales';
import type {
  TitlebarProps,
} from './titlebarView';
import type {
  QuickAccessCycleDirection,
  QuickAccessSourceOption,
} from '../../../services/quickAccess/quickAccessService';

export type { QuickAccessCycleDirection };

type TitlebarQuickAccessState = {
  ui: LocaleMessages;
  webUrl: string;
  addressBarSourceOptions: QuickAccessSourceOption[];
  selectedAddressBarSourceId: string;
};

type TitlebarQuickAccessActions = {
  handleWebUrlChange: (url: string) => void;
  handleSelectAddressBarSource: (sourceId: string) => void;
  handleCycleAddressBarSource: (direction: QuickAccessCycleDirection) => void;
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
    handleWebUrlChange,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
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
    onWebUrlChange: handleWebUrlChange,
    articleUrlPlaceholder: ui.pageUrlPlaceholder,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    onSelectAddressBarSource: handleSelectAddressBarSource,
    onCycleAddressBarSource: handleCycleAddressBarSource,
    addressBarSourcePlaceholder: ui.addressBarSourcePlaceholder,
    addressBarSourceAriaLabel: ui.addressBarSourceAriaLabel,
  };
}
