import { jsx } from 'react/jsx-runtime';
import { WORKBENCH_PART_IDS, createWorkbenchPartRef } from '../../layout';
import './media/view.css';

export type ViewPartLabels = {
  emptyState: string;
  previewUnavailable: string;
};

export type ViewPartProps = {
  browserUrl: string;
  electronRuntime: boolean;
  previewRuntime: boolean;
  labels: ViewPartLabels;
};

function renderPreviewContent({
  browserUrl,
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

  if (!electronRuntime || !previewRuntime) {
    return jsx('div', {
      className: 'empty-state preview-runtime-warning',
      children: labels.previewUnavailable,
    });
  }

  // This view is only a DOM anchor for the shared Electron webContents preview.
  // Never render iframe/webview here: preview tabs must reuse the existing native surface.
  return jsx('div', {
    ref: onPreviewHostRef,
    className: 'web-frame web-frame-placeholder',
    'aria-hidden': 'true',
  });
}

export default function ViewPartView({
  browserUrl,
  electronRuntime,
  previewRuntime,
  labels,
}: ViewPartProps) {
  const viewPartRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.view);
  const previewHostPartRef = createWorkbenchPartRef(WORKBENCH_PART_IDS.previewHost);

  const previewContent = renderPreviewContent({
    browserUrl,
    electronRuntime,
    previewRuntime,
    labels,
    onPreviewHostRef: previewHostPartRef,
  });

  return jsx('div', {
    ref: viewPartRef,
    className: 'web-frame-container',
    children: jsx('div', {
      className: 'native-preview-host',
      children: previewContent,
    }),
  });
}
