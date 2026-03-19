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
  handleNavigateWeb: () => void;
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
    handleNavigateWeb,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  },
}: CreateTitlebarQuickAccessPropsParams): Pick<
  TitlebarProps,
  | 'webUrl'
  | 'onWebUrlChange'
  | 'onNavigateWeb'
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
    onNavigateWeb: handleNavigateWeb,
    articleUrlPlaceholder: ui.pageUrlPlaceholder,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    onSelectAddressBarSource: handleSelectAddressBarSource,
    onCycleAddressBarSource: handleCycleAddressBarSource,
    addressBarSourcePlaceholder: ui.addressBarSourcePlaceholder,
    addressBarSourceAriaLabel: ui.addressBarSourceAriaLabel,
  };
}
