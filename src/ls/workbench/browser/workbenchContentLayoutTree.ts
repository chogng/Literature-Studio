import { Orientation } from 'ls/base/browser/ui/grid/gridview';

export type WorkbenchContentLayoutLeafId =
  | 'fetchSidebar'
  | 'primarySidebar'
  | 'editor'
  | 'auxiliarySidebar';

export type WorkbenchContentLayoutLeafNode = {
  type: 'leaf';
  id: WorkbenchContentLayoutLeafId;
  size: number;
  visible: boolean;
  flex?: boolean;
};

export type WorkbenchContentLayoutBranchNode = {
  type: 'branch';
  orientation: Orientation;
  size: number;
  children: WorkbenchContentLayoutNode[];
};

export type WorkbenchContentLayoutNode =
  | WorkbenchContentLayoutBranchNode
  | WorkbenchContentLayoutLeafNode;

export type WorkbenchContentLayoutTreeParams = {
  orientation: Orientation;
  isFetchSidebarVisible: boolean;
  isPrimarySidebarVisible: boolean;
  isAuxiliarySidebarVisible: boolean;
  fetchSidebarSize: number;
  primarySidebarSize: number;
  auxiliarySidebarSize: number;
  editorSize: number;
};

export type SplitLeafParams = {
  targetId: WorkbenchContentLayoutLeafId;
  orientation: Orientation;
  newLeaf: WorkbenchContentLayoutLeafNode;
  side?: 'before' | 'after';
  targetSize?: number;
  newSize?: number;
};

function cloneNode(node: WorkbenchContentLayoutNode): WorkbenchContentLayoutNode {
  if (node.type === 'leaf') {
    return { ...node };
  }

  return {
    type: 'branch',
    orientation: node.orientation,
    size: node.size,
    children: node.children.map(cloneNode),
  };
}

function mapNode(
  node: WorkbenchContentLayoutNode,
  visit: (node: WorkbenchContentLayoutNode) => WorkbenchContentLayoutNode | null,
): WorkbenchContentLayoutNode | null {
  const nextNode =
    node.type === 'branch'
      ? {
          type: 'branch' as const,
          orientation: node.orientation,
          size: node.size,
          children: node.children
            .map((child) => mapNode(child, visit))
            .filter((child): child is WorkbenchContentLayoutNode => Boolean(child)),
        }
      : { ...node };

  return visit(nextNode);
}

function normalizeNode(
  node: WorkbenchContentLayoutNode | null,
): WorkbenchContentLayoutNode | null {
  if (!node) {
    return null;
  }

  if (node.type === 'leaf') {
    return node;
  }

  const children = node.children
    .map((child) => normalizeNode(child))
    .filter((child): child is WorkbenchContentLayoutNode => Boolean(child));
  if (children.length === 0) {
    return null;
  }
  if (children.length === 1) {
    return {
      ...children[0],
      size: node.size,
    };
  }

  return {
    type: 'branch',
    orientation: node.orientation,
    size: node.size,
    children,
  };
}

export function cloneWorkbenchContentLayoutTree(tree: WorkbenchContentLayoutNode) {
  return cloneNode(tree);
}

export function serializeWorkbenchContentLayoutTree(tree: WorkbenchContentLayoutNode) {
  return JSON.parse(JSON.stringify(tree)) as WorkbenchContentLayoutNode;
}

function getRootSize(params: WorkbenchContentLayoutTreeParams) {
  return (
    (params.isFetchSidebarVisible ? params.fetchSidebarSize : 0) +
    (params.isPrimarySidebarVisible ? params.primarySidebarSize : 0) +
    params.editorSize +
    (params.isAuxiliarySidebarVisible ? params.auxiliarySidebarSize : 0)
  );
}

export function createWorkbenchContentLayoutTree({
  orientation,
  isFetchSidebarVisible,
  isPrimarySidebarVisible,
  isAuxiliarySidebarVisible,
  fetchSidebarSize,
  primarySidebarSize,
  auxiliarySidebarSize,
  editorSize,
}: WorkbenchContentLayoutTreeParams): WorkbenchContentLayoutNode {
  return {
    type: 'branch',
    orientation,
    size: getRootSize({
      orientation,
      isFetchSidebarVisible,
      isPrimarySidebarVisible,
      isAuxiliarySidebarVisible,
      fetchSidebarSize,
      primarySidebarSize,
      auxiliarySidebarSize,
      editorSize,
    }),
    children: [
      {
        type: 'leaf',
        id: 'primarySidebar',
        size: primarySidebarSize,
        visible: isPrimarySidebarVisible,
      },
      {
        type: 'leaf',
        id: 'auxiliarySidebar',
        size: auxiliarySidebarSize,
        visible: isAuxiliarySidebarVisible,
      },
      {
        type: 'leaf',
        id: 'editor',
        size: editorSize,
        visible: true,
        flex: true,
      },
      {
        type: 'leaf',
        id: 'fetchSidebar',
        size: fetchSidebarSize,
        visible: isFetchSidebarVisible,
      },
    ],
  };
}

export function findLeafPath(
  tree: WorkbenchContentLayoutNode,
  targetId: WorkbenchContentLayoutLeafId,
): number[] | null {
  if (tree.type === 'leaf') {
    return tree.id === targetId ? [] : null;
  }

  for (let index = 0; index < tree.children.length; index += 1) {
    const childPath = findLeafPath(tree.children[index], targetId);
    if (childPath) {
      return [index, ...childPath];
    }
  }

  return null;
}

export function getNodeAtPath(
  tree: WorkbenchContentLayoutNode,
  path: readonly number[],
): WorkbenchContentLayoutNode | null {
  let current: WorkbenchContentLayoutNode = tree;

  for (const index of path) {
    if (current.type !== 'branch') {
      return null;
    }

    const child = current.children[index];
    if (!child) {
      return null;
    }
    current = child;
  }

  return current;
}

export function updateNodeAtPath(
  tree: WorkbenchContentLayoutNode,
  path: readonly number[],
  updater: (node: WorkbenchContentLayoutNode) => WorkbenchContentLayoutNode,
): WorkbenchContentLayoutNode {
  if (path.length === 0) {
    return updater(cloneNode(tree));
  }

  const [index, ...rest] = path;
  if (tree.type !== 'branch' || !tree.children[index]) {
    return tree;
  }

  return {
    ...tree,
    children: tree.children.map((child, childIndex) =>
      childIndex === index ? updateNodeAtPath(child, rest, updater) : cloneNode(child),
    ),
  };
}

export function insertLeaf(
  tree: WorkbenchContentLayoutNode,
  targetId: WorkbenchContentLayoutLeafId,
  newLeaf: WorkbenchContentLayoutLeafNode,
  side: 'before' | 'after',
): WorkbenchContentLayoutNode {
  const targetPath = findLeafPath(tree, targetId);
  if (!targetPath || targetPath.length === 0) {
    return tree;
  }

  const parentPath = targetPath.slice(0, -1);
  const targetIndex = targetPath[targetPath.length - 1] ?? 0;

  return updateNodeAtPath(tree, parentPath, (node) => {
    if (node.type !== 'branch') {
      return node;
    }

    const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
    const nextChildren = [...node.children];
    nextChildren.splice(insertIndex, 0, { ...newLeaf });

    return {
      ...node,
      children: nextChildren,
    };
  });
}

export function splitLeaf(
  tree: WorkbenchContentLayoutNode,
  {
    targetId,
    orientation,
    newLeaf,
    side = 'after',
    targetSize,
    newSize,
  }: SplitLeafParams,
): WorkbenchContentLayoutNode {
  return normalizeNode(
    mapNode(tree, (node) => {
      if (node.type !== 'leaf' || node.id !== targetId) {
        return node;
      }

      const currentSize = node.size;
      const nextTargetSize = Math.max(0, Math.round(targetSize ?? currentSize / 2));
      const nextNewSize = Math.max(
        0,
        Math.round(newSize ?? Math.max(0, currentSize - nextTargetSize)),
      );
      const currentLeaf = {
        ...node,
        size: nextTargetSize,
      };
      const insertedLeaf = {
        ...newLeaf,
        size: nextNewSize,
      };

      return {
        type: 'branch',
        orientation,
        size: currentSize,
        children:
          side === 'before'
            ? [insertedLeaf, currentLeaf]
            : [currentLeaf, insertedLeaf],
      };
    }),
  ) as WorkbenchContentLayoutNode;
}

export function removeLeaf(
  tree: WorkbenchContentLayoutNode,
  targetId: WorkbenchContentLayoutLeafId,
): WorkbenchContentLayoutNode | null {
  return normalizeNode(
    mapNode(tree, (node) => {
      if (node.type === 'leaf' && node.id === targetId) {
        return null;
      }
      return node;
    }),
  );
}

export function updateLeaf(
  tree: WorkbenchContentLayoutNode,
  targetId: WorkbenchContentLayoutLeafId,
  patch: Partial<Omit<WorkbenchContentLayoutLeafNode, 'type' | 'id'>>,
): WorkbenchContentLayoutNode {
  return mapNode(tree, (node) => {
    if (node.type === 'leaf' && node.id === targetId) {
      return {
        ...node,
        ...patch,
      };
    }
    return node;
  }) as WorkbenchContentLayoutNode;
}

export function reconcileWorkbenchContentLayoutTree(
  tree: WorkbenchContentLayoutNode | null,
  params: WorkbenchContentLayoutTreeParams,
): WorkbenchContentLayoutNode {
  if (!tree) {
    return createWorkbenchContentLayoutTree(params);
  }

  return createWorkbenchContentLayoutTree(params);
}
