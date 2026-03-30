import { registerWebContentNavigationQuickAccess } from 'ls/workbench/browser/webContentNavigationModel';
import {
  applyQuickAccessUrlInput,
  createQuickAccessSourceOptions,
  findQuickAccessSourceOption,
  resolveNextQuickAccessSourceOption,
  resolveQuickAccessSourceId,
} from 'ls/workbench/services/quickAccess/quickAccessService';

registerWebContentNavigationQuickAccess({
  applyUrlInput: applyQuickAccessUrlInput,
  createSourceOptions: createQuickAccessSourceOptions,
  findSourceOption: findQuickAccessSourceOption,
  resolveNextSourceOption: resolveNextQuickAccessSourceOption,
  resolveSourceId: resolveQuickAccessSourceId,
});
