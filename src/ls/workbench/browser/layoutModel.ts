import { Orientation } from 'ls/base/browser/ui/grid/gridview';

export type LayoutLeafId =
  | 'primarySidebar'
  | 'editor'
  | 'agentSidebar';

export type LayoutLeafNode = {
  type: 'leaf';
  id: LayoutLeafId;
  size: number;
  visible: boolean;
  flex?: boolean;
};

export type LayoutBranchNode = {
  type: 'branch';
  orientation: Orientation;
  size: number;
  children: LayoutNode[];
};

export type LayoutNode =
  | LayoutBranchNode
  | LayoutLeafNode;

export type LayoutTreeParams = {
  orientation: Orientation;
  isPrimarySidebarVisible: boolean;
  isEditorVisible: boolean;
  isAgentSidebarVisible: boolean;
  primarySidebarSize: number;
  agentSidebarSize: number;
  editorSize: number;
};

export type LayoutFlexState = {
  agentSidebarFlex: boolean;
  editorFlex: boolean;
};

export type SplitLeafParams = {
  targetId: LayoutLeafId;
  orientation: Orientation;
  newLeaf: LayoutLeafNode;
  side?: 'before' | 'after';
  targetSize?: number;
  newSize?: number;
};

function cloneNode(node: LayoutNode): LayoutNode {
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
  node: LayoutNode,
  visit: (node: LayoutNode) => LayoutNode | null,
): LayoutNode | null {
  const nextNode =
    node.type === 'branch'
      ? {
          type: 'branch' as const,
          orientation: node.orientation,
          size: node.size,
          children: node.children
            .map((child) => mapNode(child, visit))
            .filter((child): child is LayoutNode => Boolean(child)),
        }
      : { ...node };

  return visit(nextNode);
}

function normalizeNode(
  node: LayoutNode | null,
): LayoutNode | null {
  if (!node) {
    return null;
  }

  if (node.type === 'leaf') {
    return node;
  }

  const children = node.children
    .map((child) => normalizeNode(child))
    .filter((child): child is LayoutNode => Boolean(child));
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

export function cloneLayoutTree(tree: LayoutNode) {
  return cloneNode(tree);
}

export function serializeLayoutTree(tree: LayoutNode) {
  return JSON.parse(JSON.stringify(tree)) as LayoutNode;
}

function getRootSize(params: LayoutTreeParams) {
  return (
    (params.isPrimarySidebarVisible ? params.primarySidebarSize : 0) +
    (params.isEditorVisible ? params.editorSize : 0) +
    (params.isAgentSidebarVisible ? params.agentSidebarSize : 0)
  );
}

export function resolveFlexState(params: {
  isAgentSidebarVisible: boolean;
  isEditorVisible: boolean;
}): LayoutFlexState {
  const agentSidebarFlex = params.isAgentSidebarVisible;
  const editorFlex = params.isEditorVisible && !params.isAgentSidebarVisible;
  return {
    agentSidebarFlex,
    editorFlex,
  };
}

export function createLayoutTree({
  orientation,
  isPrimarySidebarVisible,
  isEditorVisible,
  isAgentSidebarVisible,
  primarySidebarSize,
  agentSidebarSize,
  editorSize,
}: LayoutTreeParams): LayoutNode {
  const flexState = resolveFlexState({
    isAgentSidebarVisible,
    isEditorVisible,
  });

  return {
    type: 'branch',
    orientation,
    size: getRootSize({
      orientation,
      isPrimarySidebarVisible,
      isEditorVisible,
      isAgentSidebarVisible,
      primarySidebarSize,
      agentSidebarSize,
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
        id: 'agentSidebar',
        size: agentSidebarSize,
        visible: isAgentSidebarVisible,
        flex: flexState.agentSidebarFlex,
      },
      {
        type: 'leaf',
        id: 'editor',
        size: editorSize,
        visible: isEditorVisible,
        flex: flexState.editorFlex,
      },
    ],
  };
}

export function findLeafPath(
  tree: LayoutNode,
  targetId: LayoutLeafId,
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
  tree: LayoutNode,
  path: readonly number[],
): LayoutNode | null {
  let current: LayoutNode = tree;

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
  tree: LayoutNode,
  path: readonly number[],
  updater: (node: LayoutNode) => LayoutNode,
): LayoutNode {
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
  tree: LayoutNode,
  targetId: LayoutLeafId,
  newLeaf: LayoutLeafNode,
  side: 'before' | 'after',
): LayoutNode {
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
  tree: LayoutNode,
  {
    targetId,
    orientation,
    newLeaf,
    side = 'after',
    targetSize,
    newSize,
  }: SplitLeafParams,
): LayoutNode {
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
  ) as LayoutNode;
}

export function removeLeaf(
  tree: LayoutNode,
  targetId: LayoutLeafId,
): LayoutNode | null {
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
  tree: LayoutNode,
  targetId: LayoutLeafId,
  patch: Partial<Omit<LayoutLeafNode, 'type' | 'id'>>,
): LayoutNode {
  return mapNode(tree, (node) => {
    if (node.type === 'leaf' && node.id === targetId) {
      return {
        ...node,
        ...patch,
      };
    }
    return node;
  }) as LayoutNode;
}

export function reconcileLayoutTree(
  tree: LayoutNode | null,
  params: LayoutTreeParams,
): LayoutNode {
  if (!tree) {
    return createLayoutTree(params);
  }

  return createLayoutTree(params);
}
