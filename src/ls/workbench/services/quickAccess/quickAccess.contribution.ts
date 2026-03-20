import { registerPreviewNavigationQuickAccess } from 'ls/workbench/browser/previewNavigationModel';
import {
  applyQuickAccessUrlInput,
  createQuickAccessSourceOptions,
  findQuickAccessSourceOption,
  resolveNextQuickAccessSourceOption,
  resolveQuickAccessSourceId,
} from 'ls/workbench/services/quickAccess/quickAccessService';

registerPreviewNavigationQuickAccess({
  applyUrlInput: applyQuickAccessUrlInput,
  createSourceOptions: createQuickAccessSourceOptions,
  findSourceOption: findQuickAccessSourceOption,
  resolveNextSourceOption: resolveNextQuickAccessSourceOption,
  resolveSourceId: resolveQuickAccessSourceId,
});
