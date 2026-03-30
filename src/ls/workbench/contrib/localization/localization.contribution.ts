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

function createLocaleServiceContext() {
  return {
    desktopRuntime: typeof window.electronAPI?.invoke === 'function',
    invokeDesktop: async <T>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      if (!window.electronAPI?.invoke) {
        throw new Error('Desktop invoke bridge is unavailable.');
      }

      return window.electronAPI.invoke<T>(command, args);
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
