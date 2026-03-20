import { jsx } from 'react/jsx-runtime';
import { WORKBENCH_PART_IDS, useWorkbenchPartRef } from '../../layout';
import { useWorkbenchPreviewView } from './viewService';
import './media/view.css';

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

function renderPreviewContent({
  browserUrl,
  iframeReloadKey,
  electronRuntime,
  previewRuntime,
  labels,
  onPreviewHostRef,
}: ViewPartProps & {
  onPreviewHostRef: (node: HTMLDivElement | null) => void;
}) {
  if (!browserUrl) {
    return jsx('div', { className: 'web-frame', 'aria-hidden': 'true' });
  }

  if (electronRuntime) {
    if (previewRuntime) {
      return jsx('div', {
        ref: onPreviewHostRef,
        className: 'web-frame web-frame-placeholder',
        'aria-hidden': 'true',
      });
    }

    return jsx('div', {
      className: 'empty-state preview-runtime-warning',
      children: labels.previewUnavailable,
    });
  }

  return jsx('iframe', {
    key: `${browserUrl}-${iframeReloadKey}`,
    className: 'web-frame',
    src: browserUrl,
    title: labels.webPreviewTitle,
    sandbox: 'allow-forms allow-scripts allow-same-origin',
    scrolling: 'yes',
  });
}

export default function ViewPartView({
  browserUrl,
  iframeReloadKey,
  electronRuntime,
  previewRuntime,
  labels,
}: ViewPartProps) {
  const viewPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.view);
  const { handlePreviewHostRef } = useWorkbenchPreviewView({
    browserUrl,
    previewRuntime,
  });

  const previewContent = renderPreviewContent({
    browserUrl,
    iframeReloadKey,
    electronRuntime,
    previewRuntime,
    labels,
    onPreviewHostRef: handlePreviewHostRef,
  });

  return jsx('div', {
    ref: viewPartRef,
    className: 'web-frame-container',
    children: jsx('div', {
      className: 'native-webview-host',
      children: previewContent,
    }),
  });
}
