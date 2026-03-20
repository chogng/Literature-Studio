import { app } from 'electron';

import {
  configureDevelopmentEnvironmentMain,
  configureEnvironmentMainPaths,
  isDevelopmentEnvironmentMain,
  prepareEnvironmentMain,
  resolveEnvironmentMainLocale,
  resolveEnvironmentMainPaths,
} from '../../platform/environment/electron-main/environmentMainService.js';
import { registerDevShortcuts } from '../../platform/windows/electron-main/devShortcuts.js';
import { registerAppLifecycleHandlers } from '../../platform/lifecycle/electron-main/lifecycleMain.js';
import { registerAppIpc } from './ipc.js';
import { getDefaultBatchSources } from '../../platform/config/common/defaultBatchSources.js';
import { createStorageService } from '../../platform/storage/electron-main/storageService.js';
import { createMainWindow, getMainWindow } from '../../platform/windows/electron-main/window.js';

const environmentMainPaths = resolveEnvironmentMainPaths();
configureDevelopmentEnvironmentMain();
configureEnvironmentMainPaths(environmentMainPaths);
registerAppLifecycleHandlers({ createMainWindow });

app.whenReady().then(async () => {
  await prepareEnvironmentMain(environmentMainPaths);

  const storage = createStorageService(
    {
      historyFile: environmentMainPaths.historyFile,
      configFile: environmentMainPaths.configFile,
    },
    {
      defaultLocale: resolveEnvironmentMainLocale(),
      defaultBatchSources: getDefaultBatchSources(),
    },
  );

  if (isDevelopmentEnvironmentMain()) {
    registerDevShortcuts({ getMainWindow });
  }
  registerAppIpc(storage);
  createMainWindow();
});

