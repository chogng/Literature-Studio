import { jsx } from 'react/jsx-runtime';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WorkbenchView from 'ls/workbench/browser/workbenchView';

export function renderWorkbench() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element #root was not found.');
  }

  createRoot(rootElement).render(
    jsx(StrictMode, { children: jsx(WorkbenchView, {}) }),
  );
}
