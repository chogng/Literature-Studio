export type ViewPartLabels = {
  emptyState: string;
  previewUnavailable: string;
  webPreviewTitle: string;
};

export type ViewPartProps = {
  browserUrl: string;
  iframeReloadKey: number;
  electronRuntime: boolean;
  previewRuntime: boolean;
  labels: ViewPartLabels;
};
