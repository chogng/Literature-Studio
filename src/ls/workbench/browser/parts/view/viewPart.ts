import type { LocaleMessages } from '../../../../../language/locales';
import type { ViewPartLabels, ViewPartProps } from './viewModel';

export type ViewPartState = {
  ui: LocaleMessages;
  browserUrl: string;
  iframeReloadKey: number;
  electronRuntime: boolean;
  previewRuntime: boolean;
};

type CreateViewPartLabelsParams = {
  ui: LocaleMessages;
};

type CreateViewPartPropsParams = {
  state: ViewPartState;
};

export function createViewPartLabels({
  ui,
}: CreateViewPartLabelsParams): ViewPartLabels {
  return {
    emptyState: ui.emptyState,
    previewUnavailable: ui.previewUnavailable,
    webPreviewTitle: ui.webPreviewTitle,
  };
}

// Keep preview/view mapping in the part layer so the workbench shell only wires parts together.
export function createViewPartProps({
  state: {
    ui,
    browserUrl,
    iframeReloadKey,
    electronRuntime,
    previewRuntime,
  },
}: CreateViewPartPropsParams): ViewPartProps {
  return {
    browserUrl,
    iframeReloadKey,
    electronRuntime,
    previewRuntime,
    labels: createViewPartLabels({ ui }),
  };
}
