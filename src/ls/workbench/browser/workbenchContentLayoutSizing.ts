import { Orientation } from 'ls/base/browser/ui/splitview/splitview';
import { WORKBENCH_SPLITVIEW_LIMITS } from 'ls/workbench/browser/layout';

export type SplitViewConstraints = {
  minimum: number;
  maximum: number;
};

export type WorkbenchContentSplitConstraints = {
  primarySidebar: SplitViewConstraints;
  editor: SplitViewConstraints;
  agentSidebar: SplitViewConstraints;
};

const MOBILE_SPLITVIEW_LIMITS = {
  primaryBar: {
    minimum: 160,
    maximum: Number.POSITIVE_INFINITY,
  },
  editor: {
    minimum: 180,
    maximum: Number.POSITIVE_INFINITY,
  },
  agentSidebar: {
    minimum: 160,
    maximum: Number.POSITIVE_INFINITY,
  },
} as const;

export function getWorkbenchContentSplitConstraints(
  orientation: Orientation,
): WorkbenchContentSplitConstraints {
  const desktop = WORKBENCH_SPLITVIEW_LIMITS;
  const isHorizontal = orientation === Orientation.HORIZONTAL;

  return {
    primarySidebar: {
      minimum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.primaryBar.minimum
        : desktop.primaryBar.minimum,
      maximum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.primaryBar.maximum
        : desktop.primaryBar.maximum,
    },
    editor: {
      minimum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.editor.minimum
        : desktop.editor.minimum,
      maximum: desktop.editor.maximum,
    },
    agentSidebar: {
      minimum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.agentSidebar.minimum
        : desktop.agentSidebar.minimum,
      maximum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.agentSidebar.maximum
        : desktop.agentSidebar.maximum,
    },
  };
}
