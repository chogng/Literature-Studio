import { useMemo, useSyncExternalStore } from 'react';
import type { TitlebarProps } from './titlebar';
import {
  getTitlebarSnapshot,
  subscribeTitlebarStore,
  toTitlebarProps,
} from './titlebar-store';

export function useTitlebarState() {
  const snapshot = useSyncExternalStore(
    subscribeTitlebarStore,
    getTitlebarSnapshot,
    getTitlebarSnapshot,
  );

  const titlebarProps = useMemo<TitlebarProps>(() => {
    return toTitlebarProps(snapshot);
  }, [snapshot]);

  return {
    snapshot,
    titlebarProps,
  };
}
