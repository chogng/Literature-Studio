import assert from 'node:assert/strict';
import test from 'node:test';

import { Orientation } from 'ls/base/browser/ui/grid/gridview';
import {
  cloneReaderLayoutTree,
  createReaderLayoutTree,
  findLeafPath,
  getNodeAtPath,
  insertLeaf,
  reconcileReaderLayoutTree,
  removeLeaf,
  serializeReaderLayoutTree,
  splitLeaf,
  updateNodeAtPath,
  updateLeaf,
} from 'ls/workbench/browser/readerLayoutTree';

function createDefaultTree() {
  return createReaderLayoutTree({
    orientation: Orientation.VERTICAL,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    isAuxiliarySidebarVisible: true,
    fetchSidebarSize: 280,
    primarySidebarSize: 320,
    auxiliarySidebarSize: 260,
    editorSize: 640,
  });
}

test('reader layout tree creates the current reader shell topology', () => {
  const tree = createDefaultTree();

  assert.equal(tree.type, 'branch');
  assert.equal(tree.orientation, Orientation.VERTICAL);
  assert.equal(tree.size, 1530);
  assert.equal(tree.children.length, 4);
  assert.equal(tree.children[0]?.type, 'leaf');
  assert.equal(tree.children[1]?.type, 'leaf');
  assert.equal(tree.children[2]?.type, 'leaf');
  assert.equal(tree.children[3]?.type, 'leaf');
  assert.deepEqual(findLeafPath(tree, 'primarySidebar'), [0]);
  assert.deepEqual(findLeafPath(tree, 'editor'), [1]);
  assert.deepEqual(findLeafPath(tree, 'auxiliarySidebar'), [2]);
  assert.deepEqual(findLeafPath(tree, 'fetchSidebar'), [3]);
});

test('reader layout tree clone and serialize do not mutate the source tree', () => {
  const tree = createDefaultTree();
  const clonedTree = cloneReaderLayoutTree(tree);
  const serializedTree = serializeReaderLayoutTree(tree);

  assert.deepEqual(clonedTree, tree);
  assert.deepEqual(serializedTree, tree);
  assert.notEqual(clonedTree, tree);
  assert.notEqual(serializedTree, tree);

  const updatedTree = updateLeaf(clonedTree, 'primarySidebar', {
    size: 360,
    visible: false,
  });

  assert.deepEqual(findLeafPath(updatedTree, 'primarySidebar'), [0]);
  assert.equal(tree.type, 'branch');
  assert.equal(tree.children[0]?.type, 'leaf');
  assert.equal(tree.children[0].size, 320);
  assert.equal(tree.children[0].visible, true);
});

test('reader layout tree can split a leaf into a new branch', () => {
  const tree = removeLeaf(createDefaultTree(), 'auxiliarySidebar');
  assert(tree);

  const splitTree = splitLeaf(tree, {
    targetId: 'editor',
    orientation: Orientation.HORIZONTAL,
    side: 'before',
    targetSize: 420,
    newLeaf: {
      type: 'leaf',
      id: 'auxiliarySidebar',
      size: 220,
      visible: true,
    },
  });

  assert.equal(splitTree.type, 'branch');
  assert.equal(splitTree.children[1]?.type, 'branch');
  if (splitTree.children[1]?.type !== 'branch') {
    throw new Error('Expected editor split branch');
  }
  assert.equal(splitTree.children[1].orientation, Orientation.HORIZONTAL);
  assert.equal(splitTree.children[1].children.length, 2);
  assert.equal(splitTree.children[1].children[0]?.type, 'leaf');
  assert.equal(splitTree.children[1].children[1]?.type, 'leaf');
  assert.equal(splitTree.children[1].children[0].id, 'auxiliarySidebar');
  assert.equal(splitTree.children[1].children[0].size, 220);
  assert.equal(splitTree.children[1].children[1].id, 'editor');
  assert.equal(splitTree.children[1].children[1].size, 420);
  assert.deepEqual(findLeafPath(splitTree, 'editor'), [1, 1]);
});

test('reader layout tree removes leaves and collapses redundant branches', () => {
  const tree = createDefaultTree();
  const withoutFetch = removeLeaf(tree, 'fetchSidebar');

  assert(withoutFetch);
  assert.equal(withoutFetch.type, 'branch');
  assert.equal(withoutFetch.children[0]?.type, 'leaf');
  assert.equal(withoutFetch.children[0].id, 'primarySidebar');
  assert.equal(withoutFetch.children[0].size, 320);
  assert.deepEqual(findLeafPath(withoutFetch, 'primarySidebar'), [0]);
  assert.equal(findLeafPath(withoutFetch, 'fetchSidebar'), null);

  const treeWithoutFetch = removeLeaf(
    createReaderLayoutTree({
      orientation: Orientation.VERTICAL,
      isFetchSidebarVisible: false,
      isPrimarySidebarVisible: false,
      isAuxiliarySidebarVisible: false,
      fetchSidebarSize: 0,
      primarySidebarSize: 0,
      auxiliarySidebarSize: 0,
      editorSize: 640,
    }),
    'fetchSidebar',
  );
  assert(treeWithoutFetch);
  const treeWithoutPrimary = removeLeaf(treeWithoutFetch, 'primarySidebar');
  assert(treeWithoutPrimary);
  const onlyEditor = removeLeaf(treeWithoutPrimary, 'auxiliarySidebar');

  assert(onlyEditor);
  assert.equal(onlyEditor.type, 'leaf');
  assert.equal(onlyEditor.id, 'editor');
});

test('reader layout tree updates leaf data immutably', () => {
  const tree = createDefaultTree();
  assert.equal(tree.type, 'branch');
  const updatedTree = updateLeaf(tree, 'auxiliarySidebar', {
    size: 300,
    visible: false,
    flex: true,
  });

  assert.equal(updatedTree.type, 'branch');
  const updatedAuxiliary = updatedTree.children[2];
  assert(updatedAuxiliary);
  assert.equal(updatedAuxiliary.type, 'leaf');
  assert.equal(updatedAuxiliary.size, 300);
  assert.equal(updatedAuxiliary.visible, false);
  assert.equal(updatedAuxiliary.flex, true);

  const originalAuxiliary = tree.children[2];
  assert(originalAuxiliary);
  assert.equal(originalAuxiliary.type, 'leaf');
  assert.equal(originalAuxiliary.size, 260);
  assert.equal(originalAuxiliary.visible, true);
  assert.equal(originalAuxiliary.flex, undefined);
});

test('reader layout tree can read and update the root branch by path', () => {
  const tree = createDefaultTree();
  const rootBranch = getNodeAtPath(tree, []);

  assert(rootBranch);
  assert.equal(rootBranch.type, 'branch');
  assert.equal(rootBranch.size, 1530);

  const updatedTree = updateNodeAtPath(tree, [], (node) => {
    assert.equal(node.type, 'branch');
    return {
      ...node,
      size: 1600,
    };
  });

  const updatedRootBranch = getNodeAtPath(updatedTree, []);
  assert(updatedRootBranch);
  assert.equal(updatedRootBranch.type, 'branch');
  assert.equal(updatedRootBranch.size, 1600);

  const originalRootBranch = getNodeAtPath(tree, []);
  assert(originalRootBranch);
  assert.equal(originalRootBranch.type, 'branch');
  assert.equal(originalRootBranch.size, 1530);
});

test('reader layout tree can insert a sibling leaf next to editor without wrapping a new branch', () => {
  const tree = removeLeaf(createDefaultTree(), 'auxiliarySidebar');
  assert(tree);

  const nextTree = insertLeaf(
    tree,
    'editor',
    {
      type: 'leaf',
      id: 'auxiliarySidebar',
      size: 280,
      visible: true,
    },
    'after',
  );

  assert.equal(nextTree.type, 'branch');
  assert.deepEqual(findLeafPath(nextTree, 'editor'), [1]);
  assert.deepEqual(findLeafPath(nextTree, 'auxiliarySidebar'), [2]);
});

test('reader layout tree reconcile keeps four top-level panes and updates visibility', () => {
  const baseTree = createDefaultTree();
  const hiddenTree = reconcileReaderLayoutTree(baseTree, {
    orientation: Orientation.VERTICAL,
    isFetchSidebarVisible: false,
    isPrimarySidebarVisible: true,
    isAuxiliarySidebarVisible: false,
    fetchSidebarSize: 280,
    primarySidebarSize: 320,
    auxiliarySidebarSize: 260,
    editorSize: 640,
  });

  assert.equal(hiddenTree.type, 'branch');
  assert.equal(hiddenTree.children.length, 4);
  assert.deepEqual(findLeafPath(hiddenTree, 'primarySidebar'), [0]);
  assert.deepEqual(findLeafPath(hiddenTree, 'editor'), [1]);
  assert.deepEqual(findLeafPath(hiddenTree, 'auxiliarySidebar'), [2]);
  assert.deepEqual(findLeafPath(hiddenTree, 'fetchSidebar'), [3]);
  assert.equal(hiddenTree.children[0]?.type, 'leaf');
  assert.equal(hiddenTree.children[2]?.type, 'leaf');
  assert.equal(hiddenTree.children[3]?.type, 'leaf');
  assert.equal(hiddenTree.children[0].visible, true);
  assert.equal(hiddenTree.children[2].visible, false);
  assert.equal(hiddenTree.children[3].visible, false);

  const restoredTree = reconcileReaderLayoutTree(hiddenTree, {
    orientation: Orientation.HORIZONTAL,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    isAuxiliarySidebarVisible: true,
    fetchSidebarSize: 300,
    primarySidebarSize: 340,
    auxiliarySidebarSize: 280,
    editorSize: 700,
  });

  assert.deepEqual(findLeafPath(restoredTree, 'primarySidebar'), [0]);
  assert.deepEqual(findLeafPath(restoredTree, 'editor'), [1]);
  assert.deepEqual(findLeafPath(restoredTree, 'auxiliarySidebar'), [2]);
  assert.deepEqual(findLeafPath(restoredTree, 'fetchSidebar'), [3]);
  assert.equal(restoredTree.type, 'branch');
  assert.equal(restoredTree.orientation, Orientation.HORIZONTAL);
  assert.equal(restoredTree.children.length, 4);
  assert.equal(restoredTree.children[0]?.type, 'leaf');
  assert.equal(restoredTree.children[2]?.type, 'leaf');
  assert.equal(restoredTree.children[3]?.type, 'leaf');
  assert.equal(restoredTree.children[0].visible, true);
  assert.equal(restoredTree.children[2].visible, true);
  assert.equal(restoredTree.children[3].visible, true);
});
