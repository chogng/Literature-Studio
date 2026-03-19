import { jsx } from 'react/jsx-runtime';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ls/workbench/workbench.common.main';
import WorkbenchView from './ls/workbench/browser/workbenchView';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

createRoot(rootElement).render(jsx(StrictMode, { children: jsx(WorkbenchView, {}) }));
