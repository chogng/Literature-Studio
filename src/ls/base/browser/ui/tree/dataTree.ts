import { SimpleTree } from 'ls/base/browser/ui/tree/simpleTree';
import type { SimpleTreeOptions, SimpleTreeRenderer } from 'ls/base/browser/ui/tree/simpleTree';

import type { DataTreeDataSource } from 'ls/base/browser/ui/tree/treeTypes';

export class DataTree<TInput, TNode> {
  private input: TInput | null = null;
  private readonly tree: SimpleTree<TNode>;

  constructor(
    private readonly dataSource: DataTreeDataSource<TInput, TNode>,
    renderer: SimpleTreeRenderer<TNode>,
    options: SimpleTreeOptions<TNode>,
  ) {
    this.tree = new SimpleTree(
      {
        hasChildren: (node) => this.dataSource.hasChildren(node),
        getChildren: (node) => this.dataSource.getChildren(node),
      },
      renderer,
      options,
    );
  }

  getElement() {
    return this.tree.getElement();
  }

  setAriaLabel(label: string) {
    this.tree.setAriaLabel(label);
  }

  focus() {
    this.tree.focus();
  }

  getInput() {
    return this.input;
  }

  getSelection() {
    return this.tree.getSelection();
  }

  setSelection(node: TNode | null) {
    this.tree.setSelection(node);
  }

  getFocus() {
    return this.tree.getFocus();
  }

  setFocus(node: TNode | null) {
    this.tree.setFocus(node);
  }

  setInput(input: TInput | null) {
    this.input = input;
    if (input === null) {
      this.tree.setInput(null);
      return;
    }

    this.tree.setInput(this.dataSource.getRoot(input));
  }

  refresh(node?: TNode) {
    void node;
    this.tree.rerender();
  }

  rerender() {
    if (this.input === null) {
      return;
    }

    this.tree.setInput(this.dataSource.getRoot(this.input));
  }
}
