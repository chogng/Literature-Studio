import type { Session } from 'electron';

export const READER_SHARED_WEB_PARTITION = 'persist:reader-web';

const defaultReaderSharedSessionStorages = [
  'cookies',
  'localstorage',
  'indexdb',
  'cachestorage',
  'serviceworkers',
] as const;

export type ReaderSharedSessionStorage = typeof defaultReaderSharedSessionStorages[number];

export async function resolveReaderSharedSession(): Promise<Session | null> {
  try {
    const electronModule = (await import('electron')) as {
      app?: { isReady?: () => boolean };
      session?: {
        fromPartition?: (partition: string) => Session;
      };
    };

    const electronApp = electronModule.app;
    const electronSession = electronModule.session;
    if (!electronApp || typeof electronApp.isReady !== 'function' || !electronApp.isReady()) {
      return null;
    }
    if (!electronSession || typeof electronSession.fromPartition !== 'function') {
      return null;
    }

    return electronSession.fromPartition(READER_SHARED_WEB_PARTITION);
  } catch {
    return null;
  }
}

export async function clearReaderSharedSessionOrigins(
  origins: readonly string[],
  storages: readonly ReaderSharedSessionStorage[] = defaultReaderSharedSessionStorages,
) {
  const readerSession = await resolveReaderSharedSession();
  if (!readerSession) {
    return false;
  }

  try {
    for (const origin of origins) {
      await readerSession.clearStorageData({
        origin,
        storages: [...storages],
      });
    }
  } catch {
    // Ignore partial cleanup failures and continue with best-effort reset.
  }

  try {
    await readerSession.clearAuthCache();
  } catch {
    // Ignore auth-cache cleanup failures.
  }

  try {
    await readerSession.clearCache();
  } catch {
    // Ignore HTTP cache cleanup failures.
  }

  return true;
}
