import { Orientation } from 'ls/base/browser/ui/splitview/splitview';
import {
  WORKBENCH_SPLITVIEW_LIMITS,
  WORKBENCH_SPLITVIEW_SASH_SIZE,
} from 'ls/workbench/browser/layout';

export type SplitViewConstraints = {
  minimum: number;
  maximum: number;
};

export type WorkbenchContentSplitConstraints = {
  fetchSidebar: SplitViewConstraints;
  primarySidebar: SplitViewConstraints;
  editor: SplitViewConstraints;
  auxiliarySidebar: SplitViewConstraints;
};

const MOBILE_SPLITVIEW_LIMITS = {
  fetchSidebar: {
    minimum: 140,
    maximum: Number.POSITIVE_INFINITY,
  },
  primaryBar: {
    minimum: 160,
    maximum: Number.POSITIVE_INFINITY,
  },
  editor: {
    minimum: 180,
    maximum: Number.POSITIVE_INFINITY,
  },
  auxiliarySidebar: {
    minimum: 160,
    maximum: Number.POSITIVE_INFINITY,
  },
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function getLeadingGroupSashSize(
  isFetchSidebarVisible: boolean,
  isPrimarySidebarVisible: boolean,
) {
  return isFetchSidebarVisible && isPrimarySidebarVisible
    ? WORKBENCH_SPLITVIEW_SASH_SIZE
    : 0;
}

export function getWorkbenchContentSplitConstraints(
  orientation: Orientation,
): WorkbenchContentSplitConstraints {
  const desktop = WORKBENCH_SPLITVIEW_LIMITS;
  const isHorizontal = orientation === Orientation.HORIZONTAL;

  return {
    fetchSidebar: {
      minimum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.fetchSidebar.minimum
        : desktop.fetchSidebar.minimum,
      maximum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.fetchSidebar.maximum
        : desktop.fetchSidebar.maximum,
    },
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
    auxiliarySidebar: {
      minimum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.auxiliarySidebar.minimum
        : desktop.auxiliarySidebar.minimum,
      maximum: isHorizontal
        ? MOBILE_SPLITVIEW_LIMITS.auxiliarySidebar.maximum
        : desktop.auxiliarySidebar.maximum,
    },
  };
}

export function resolveWorkbenchLeadingPaneSizes({
  totalSize,
  isFetchSidebarVisible,
  isPrimarySidebarVisible,
  primarySidebarSize,
  fetchSidebarConstraints,
  primarySidebarConstraints,
}: {
  totalSize: number;
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  primarySidebarSize: number;
  fetchSidebarConstraints: SplitViewConstraints;
  primarySidebarConstraints: SplitViewConstraints;
}) {
  if (!isFetchSidebarVisible && !isPrimarySidebarVisible) {
    return { fetchSize: 0, primarySize: 0 };
  }

  const availableSize = Math.max(
    0,
    totalSize - getLeadingGroupSashSize(isFetchSidebarVisible, isPrimarySidebarVisible),
  );

  if (isFetchSidebarVisible && !isPrimarySidebarVisible) {
    return {
      fetchSize: clamp(
        availableSize,
        fetchSidebarConstraints.minimum,
        fetchSidebarConstraints.maximum,
      ),
      primarySize: 0,
    };
  }

  if (!isFetchSidebarVisible && isPrimarySidebarVisible) {
    return {
      fetchSize: 0,
      primarySize: clamp(
        availableSize,
        primarySidebarConstraints.minimum,
        primarySidebarConstraints.maximum,
      ),
    };
  }

  let primarySize = clamp(
    primarySidebarSize,
    primarySidebarConstraints.minimum,
    primarySidebarConstraints.maximum,
  );
  let fetchSize = availableSize - primarySize;

  if (fetchSize < fetchSidebarConstraints.minimum) {
    fetchSize = fetchSidebarConstraints.minimum;
    primarySize = availableSize - fetchSize;
  } else if (fetchSize > fetchSidebarConstraints.maximum) {
    fetchSize = fetchSidebarConstraints.maximum;
    primarySize = availableSize - fetchSize;
  }

  primarySize = clamp(
    primarySize,
    primarySidebarConstraints.minimum,
    primarySidebarConstraints.maximum,
  );
  fetchSize = clamp(
    availableSize - primarySize,
    fetchSidebarConstraints.minimum,
    fetchSidebarConstraints.maximum,
  );

  const normalizedPrimarySize = availableSize - fetchSize;
  if (normalizedPrimarySize !== primarySize) {
    primarySize = clamp(
      normalizedPrimarySize,
      primarySidebarConstraints.minimum,
      primarySidebarConstraints.maximum,
    );
    fetchSize = availableSize - primarySize;
  }

  return {
    fetchSize,
    primarySize,
  };
}
