import type { StatusbarModeRenderer } from 'ls/workbench/browser/parts/statusbar/statusbarModeRendererTypes';
import { renderCommonStatusbarMode } from 'ls/workbench/browser/parts/statusbar/renderers/common';

export const renderBrowserStatusbarMode: StatusbarModeRenderer = (status, context) => {
  renderCommonStatusbarMode(status, context);
};
