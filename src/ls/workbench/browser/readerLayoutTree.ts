import { Orientation } from 'ls/base/browser/ui/grid/gridview';
import { WORKBENCH_SPLITVIEW_SASH_SIZE } from 'ls/workbench/browser/layout';

export type ReaderLayoutLeafId =
  | 'fetchSidebar'
  | 'primarySidebar'
  | 'editor'
  | 'auxiliarySidebar';

export type ReaderLayoutLeafNode = {
  type: 'leaf';
  id: ReaderLayoutLeafId;
  size: number;
  visible: boolean;
  flex?: boolean;
};

export type ReaderLayoutBranchNode = {
  type: 'branch';
  orientation: Orientation;
  size: number;
  children: ReaderLayoutNode[];
};

export type ReaderLayoutNode = ReaderLayoutBranchNode | ReaderLayoutLeafNode;

export type ReaderLayoutTreeParams = {
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
  targetId: ReaderLayoutLeafId;
  orientation: Orientation;
  newLeaf: ReaderLayoutLeafNode;
  side?: 'before' | 'after';
  targetSize?: number;
  newSize?: number;
};

function cloneNode(node: ReaderLayoutNode): ReaderLayoutNode {
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
  node: ReaderLayoutNode,
  visit: (node: ReaderLayoutNode) => ReaderLayoutNode | null,
): ReaderLayoutNode | null {
  const nextNode =
    node.type === 'branch'
      ? {
          type: 'branch' as const,
          orientation: node.orientation,
          size: node.size,
          children: node.children
            .map((child) => mapNode(child, visit))
            .filter((child): child is ReaderLayoutNode => Boolean(child)),
        }
      : { ...node };

  return visit(nextNode);
}

function normalizeNode(node: ReaderLayoutNode | null): ReaderLayoutNode | null {
  if (!node) {
    return null;
  }

  if (node.type === 'leaf') {
    return node;
  }

  const children = node.children
    .map((child) => normalizeNode(child))
    .filter((child): child is ReaderLayoutNode => Boolean(child));
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

export function cloneReaderLayoutTree(tree: ReaderLayoutNode) {
  return cloneNode(tree);
}

export function serializeReaderLayoutTree(tree: ReaderLayoutNode) {
  return JSON.parse(JSON.stringify(tree)) as ReaderLayoutNode;
}

function getRootVisibleChildCount(params: ReaderLayoutTreeParams) {
  return [
    params.isFetchSidebarVisible,
    params.isPrimarySidebarVisible,
    true,
    params.isAuxiliarySidebarVisible,
  ].filter(Boolean).length;
}

function getRootSize(params: ReaderLayoutTreeParams) {
  return (
    (params.isFetchSidebarVisible ? params.fetchSidebarSize : 0) +
    (params.isPrimarySidebarVisible ? params.primarySidebarSize : 0) +
    params.editorSize +
    (params.isAuxiliarySidebarVisible ? params.auxiliarySidebarSize : 0) +
    Math.max(0, getRootVisibleChildCount(params) - 1) * WORKBENCH_SPLITVIEW_SASH_SIZE
  );
}

export function createReaderLayoutTree({
  orientation,
  isFetchSidebarVisible,
  isPrimarySidebarVisible,
  isAuxiliarySidebarVisible,
  fetchSidebarSize,
  primarySidebarSize,
  auxiliarySidebarSize,
  editorSize,
}: ReaderLayoutTreeParams): ReaderLayoutNode {
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
        id: 'editor',
        size: editorSize,
        visible: true,
        flex: true,
      },
      {
        type: 'leaf',
        id: 'auxiliarySidebar',
        size: auxiliarySidebarSize,
        visible: isAuxiliarySidebarVisible,
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
  tree: ReaderLayoutNode,
  targetId: ReaderLayoutLeafId,
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
  tree: ReaderLayoutNode,
  path: readonly number[],
): ReaderLayoutNode | null {
  let current: ReaderLayoutNode = tree;

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
  tree: ReaderLayoutNode,
  path: readonly number[],
  updater: (node: ReaderLayoutNode) => ReaderLayoutNode,
): ReaderLayoutNode {
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
  tree: ReaderLayoutNode,
  targetId: ReaderLayoutLeafId,
  newLeaf: ReaderLayoutLeafNode,
  side: 'before' | 'after',
): ReaderLayoutNode {
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
  tree: ReaderLayoutNode,
  {
    targetId,
    orientation,
    newLeaf,
    side = 'after',
    targetSize,
    newSize,
  }: SplitLeafParams,
): ReaderLayoutNode {
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
  ) as ReaderLayoutNode;
}

export function removeLeaf(
  tree: ReaderLayoutNode,
  targetId: ReaderLayoutLeafId,
): ReaderLayoutNode | null {
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
  tree: ReaderLayoutNode,
  targetId: ReaderLayoutLeafId,
  patch: Partial<Omit<ReaderLayoutLeafNode, 'type' | 'id'>>,
): ReaderLayoutNode {
  return mapNode(tree, (node) => {
    if (node.type === 'leaf' && node.id === targetId) {
      return {
        ...node,
        ...patch,
      };
    }
    return node;
  }) as ReaderLayoutNode;
}

export function reconcileReaderLayoutTree(
  tree: ReaderLayoutNode | null,
  params: ReaderLayoutTreeParams,
): ReaderLayoutNode {
  if (!tree) {
    return createReaderLayoutTree(params);
  }

  return createReaderLayoutTree(params);
}
