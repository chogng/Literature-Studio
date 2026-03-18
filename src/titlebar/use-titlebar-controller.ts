import { useLayoutEffect } from 'react';
import {
  resetTitlebarStore,
  setTitlebarActions,
  setTitlebarState,
  type TitlebarActionHandlers,
  type TitlebarViewState,
} from './titlebar-store';

export type UseTitlebarControllerParams = {
  state: TitlebarViewState;
  actions: TitlebarActionHandlers;
};

export function useTitlebarController({ state, actions }: UseTitlebarControllerParams) {
  useLayoutEffect(() => {
    setTitlebarState(state);
  }, [state]);

  useLayoutEffect(() => {
    setTitlebarActions(actions);
  }, [actions]);

  useLayoutEffect(() => {
    return () => {
      resetTitlebarStore();
    };
  }, []);
}
