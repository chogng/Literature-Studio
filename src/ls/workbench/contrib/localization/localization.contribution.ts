import {
  localeService,
} from './browser/localeService';
import {
  subscribeLocalizationUiActions,
} from './browser/localizationsActions';
import {
  registerWorkbenchContribution,
  type Disposable,
} from '../workbench/workbench.contribution';
import { hasDesktopRuntime } from '../../../base/common/platform';
import { nativeHostService } from '../../../platform/native/browser/nativeHostService';

function createLocaleServiceContext() {
  return {
    desktopRuntime: hasDesktopRuntime(),
    invokeDesktop: async <T>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      return nativeHostService.invoke(command as never, args as never) as Promise<T>;
    },
  };
}

export function createWorkbenchLocalizationContribution(): Disposable {
  const context = createLocaleServiceContext();
  void localeService.initialize(context).catch((error) => {
    console.error('Failed to initialize locale service.', error);
  });

  const unsubscribeLocalizationUiActions = subscribeLocalizationUiActions(
    (action) => {
      if (action.type !== 'SET_DISPLAY_LANGUAGE') {
        return;
      }

      void localeService
        .updateLocalePreference(action.locale, context)
        .catch((error) => {
          console.error('Failed to update display language.', error);
        });
    },
  );

  return {
    dispose: () => {
      unsubscribeLocalizationUiActions();
    },
  };
}

registerWorkbenchContribution(createWorkbenchLocalizationContribution);
