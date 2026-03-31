import './media/tree.css';

export type SimpleTreeDataSource<T> = {
  hasChildren(node: T): boolean;
  getChildren(node: T): T[];
};

export type SimpleTreeRenderContext = {
  nodeId: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  toggleExpanded: () => void;
  select: () => void;
  open: () => void;
};

export type SimpleTreeNodeState = {
  loading?: boolean;
  error?: boolean;
};

export type SimpleTreeRenderer<T> = {
  renderElement(node: T, context: SimpleTreeRenderContext): HTMLElement;
};

export type SimpleTreeOptions<T> = {
  getId: (node: T) => string;
  isRoot: (node: T) => boolean;
  getLabel?: (node: T) => string;
  getNodeState?: (node: T) => SimpleTreeNodeState;
  defaultExpandedIds?: Iterable<string>;
  ariaLabel?: string;
  onDidChangeSelection?: (node: T | null) => void;
  onDidOpen?: (node: T) => void;
};

export class SimpleTree<T> {
  private readonly element = document.createElement('div');
  private input: T | null = null;
  private expandedIds: Set<string>;
  private selectedId: string | null = null;
  private focusedId: string | null = null;
  private typeaheadBuffer = '';
  private typeaheadResetHandle: number | null = null;

  constructor(
    private readonly dataSource: SimpleTreeDataSource<T>,
    private readonly renderer: SimpleTreeRenderer<T>,
    private readonly options: SimpleTreeOptions<T>,
  ) {
    this.expandedIds = new Set(options.defaultExpandedIds ?? []);
    this.element.className = 'simple-tree';
    this.element.setAttribute('role', 'tree');
    this.element.tabIndex = 0;
    if (options.ariaLabel) {
      this.element.setAttribute('aria-label', options.ariaLabel);
    }
    this.element.addEventListener('keydown', (event) => {
      this.onKeyDown(event);
    });
    this.element.addEventListener('focus', () => {
      if (!this.focusedId) {
        const firstNode = this.getVisibleNodes()[0];
        if (firstNode) {
          this.focusedId = this.options.getId(firstNode.node);
          this.rerender();
        }
      } else {
        this.focusRenderedNode();
      }
    });
  }

  getElement() {
    return this.element;
  }

  setAriaLabel(label: string) {
    this.element.setAttribute('aria-label', label);
  }

  focus() {
    this.element.focus();
  }

  getSelection() {
    if (!this.input || !this.selectedId) {
      return null;
    }

    return (
      this.getVisibleNodes().find(
        ({ node }) => this.options.getId(node) === this.selectedId,
      )?.node ?? null
    );
  }

  setSelection(node: T | null) {
    const nextSelectedId = node ? this.options.getId(node) : null;
    if (nextSelectedId && !this.hasVisibleNode(nextSelectedId)) {
      return;
    }

    this.selectedId = nextSelectedId;
    this.options.onDidChangeSelection?.(node);
    this.rerender();
  }

  getFocus() {
    if (!this.input || !this.focusedId) {
      return null;
    }

    return (
      this.getVisibleNodes().find(
        ({ node }) => this.options.getId(node) === this.focusedId,
      )?.node ?? null
    );
  }

  setFocus(node: T | null) {
    const nextFocusedId = node ? this.options.getId(node) : null;
    if (nextFocusedId && !this.hasVisibleNode(nextFocusedId)) {
      return;
    }

    this.focusedId = nextFocusedId;
    this.rerender();
  }

  setInput(input: T | null) {
    this.input = input;
    if (!input) {
      const hadSelection = this.selectedId !== null;
      this.selectedId = null;
      this.focusedId = null;
      if (hadSelection) {
        this.options.onDidChangeSelection?.(null);
      }
      this.render();
      return;
    }

    const visibleNodes = this.getVisibleNodes(input);
    if (!this.focusedId && visibleNodes[0]) {
      this.focusedId = this.options.getId(visibleNodes[0].node);
    }
    if (
      this.selectedId &&
      !visibleNodes.some(({ node }) => this.options.getId(node) === this.selectedId)
    ) {
      this.selectedId = null;
      this.options.onDidChangeSelection?.(null);
    }
    if (
      this.focusedId &&
      !visibleNodes.some(({ node }) => this.options.getId(node) === this.focusedId)
    ) {
      this.focusedId = visibleNodes[0]
        ? this.options.getId(visibleNodes[0].node)
        : null;
    }
    this.render();
  }

  rerender() {
    this.render();
  }

  private render() {
    if (!this.input) {
      this.element.replaceChildren();
      return;
    }

    const list = document.createElement('ul');
    list.className = 'simple-tree-list';
    list.append(this.renderNode(this.input, 0));
    this.element.replaceChildren(list);
    this.focusRenderedNode();
  }

  private renderNode(node: T, depth: number): HTMLLIElement {
    const item = document.createElement('li');
    const nodeId = this.options.getId(node);
    const isRoot = this.options.isRoot(node);
    const hasChildren = this.dataSource.hasChildren(node);
    const isExpanded = isRoot || (hasChildren && this.expandedIds.has(nodeId));
    const nodeState = this.options.getNodeState?.(node) ?? {};
    const isSelected = this.selectedId === nodeId;
    const isFocused = this.focusedId === nodeId;
    const rendered = this.renderer.renderElement(node, {
      nodeId,
      depth,
      hasChildren,
      isExpanded,
      isSelected,
      isFocused,
      toggleExpanded: () => {
        if (!hasChildren || isRoot) {
          return;
        }

        if (this.expandedIds.has(nodeId)) {
          this.expandedIds.delete(nodeId);
        } else {
          this.expandedIds.add(nodeId);
        }

        this.rerender();
      },
      select: () => {
        this.selectedId = nodeId;
        this.focusedId = nodeId;
        this.options.onDidChangeSelection?.(node);
        this.rerender();
      },
      open: () => {
        this.options.onDidOpen?.(node);
      },
    });
    rendered.dataset['simpleTreeNodeId'] = nodeId;
    rendered.tabIndex = isFocused ? 0 : -1;
    rendered.classList.add('simple-tree-node');
    rendered.setAttribute('aria-selected', String(isSelected));
    rendered.setAttribute('aria-level', String(depth + 1));
    rendered.toggleAttribute('aria-busy', Boolean(nodeState.loading));
    rendered.dataset['treeState'] = nodeState.error
      ? 'error'
      : nodeState.loading
        ? 'loading'
        : 'idle';
    if (hasChildren) {
      rendered.setAttribute('aria-expanded', String(isExpanded));
    } else {
      rendered.removeAttribute('aria-expanded');
    }
    rendered.classList.toggle('is-selected', isSelected);
    rendered.classList.toggle('is-focused', isFocused);
    rendered.classList.toggle('is-loading', Boolean(nodeState.loading));
    rendered.classList.toggle('has-error', Boolean(nodeState.error));
    rendered.addEventListener('mousedown', () => {
      this.focusedId = nodeId;
    });
    rendered.addEventListener('click', () => {
      this.selectedId = nodeId;
      this.focusedId = nodeId;
      this.element.focus({ preventScroll: true });
      this.options.onDidChangeSelection?.(node);
      this.rerender();
    });
    item.append(rendered);

    if (hasChildren && isExpanded) {
      const children = document.createElement('ul');
      children.className = 'simple-tree-children';
      children.setAttribute('role', 'group');
      for (const child of this.dataSource.getChildren(node)) {
        children.append(this.renderNode(child, depth + 1));
      }
      item.append(children);
    }

    return item;
  }

  private onKeyDown(event: KeyboardEvent) {
    if (!this.input) {
      return;
    }

    const visibleNodes = this.getVisibleNodes();
    if (visibleNodes.length === 0) {
      return;
    }

    const focusedIndex = visibleNodes.findIndex(
      ({ node }) => this.options.getId(node) === this.focusedId,
    );
    const activeIndex = focusedIndex >= 0 ? focusedIndex : 0;
    const activeEntry = visibleNodes[activeIndex];
    if (!activeEntry) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        const nextEntry = visibleNodes[Math.min(activeIndex + 1, visibleNodes.length - 1)];
        if (nextEntry) {
          this.focusedId = this.options.getId(nextEntry.node);
          this.rerender();
        }
        event.preventDefault();
        break;
      }
      case 'ArrowUp': {
        const previousEntry = visibleNodes[Math.max(activeIndex - 1, 0)];
        if (previousEntry) {
          this.focusedId = this.options.getId(previousEntry.node);
          this.rerender();
        }
        event.preventDefault();
        break;
      }
      case 'Home': {
        const firstEntry = visibleNodes[0];
        if (firstEntry) {
          this.focusedId = this.options.getId(firstEntry.node);
          this.rerender();
        }
        event.preventDefault();
        break;
      }
      case 'End': {
        const lastEntry = visibleNodes[visibleNodes.length - 1];
        if (lastEntry) {
          this.focusedId = this.options.getId(lastEntry.node);
          this.rerender();
        }
        event.preventDefault();
        break;
      }
      case 'ArrowRight': {
        if (activeEntry.hasChildren && !activeEntry.isExpanded && !this.options.isRoot(activeEntry.node)) {
          this.expandedIds.add(this.options.getId(activeEntry.node));
          this.rerender();
        } else if (activeEntry.hasChildren) {
          const nextEntry = visibleNodes[activeIndex + 1];
          if (nextEntry) {
            this.focusedId = this.options.getId(nextEntry.node);
            this.rerender();
          }
        }
        event.preventDefault();
        break;
      }
      case 'ArrowLeft': {
        const nodeId = this.options.getId(activeEntry.node);
        if (activeEntry.hasChildren && activeEntry.isExpanded && !this.options.isRoot(activeEntry.node)) {
          this.expandedIds.delete(nodeId);
          this.rerender();
        } else {
          const parentEntry = this.findParentEntry(visibleNodes, activeIndex);
          if (parentEntry) {
            this.focusedId = this.options.getId(parentEntry.node);
            this.rerender();
          }
        }
        event.preventDefault();
        break;
      }
      case 'Enter':
      {
        if (activeEntry.hasChildren && !this.options.isRoot(activeEntry.node)) {
          const nodeId = this.options.getId(activeEntry.node);
          if (this.expandedIds.has(nodeId)) {
            this.expandedIds.delete(nodeId);
          } else {
            this.expandedIds.add(nodeId);
          }
        } else {
          this.selectedId = this.options.getId(activeEntry.node);
          this.focusedId = this.selectedId;
          this.options.onDidChangeSelection?.(activeEntry.node);
          this.options.onDidOpen?.(activeEntry.node);
        }
        this.rerender();
        event.preventDefault();
        break;
      }
      case ' ': {
        this.selectedId = this.options.getId(activeEntry.node);
        this.focusedId = this.selectedId;
        this.options.onDidChangeSelection?.(activeEntry.node);
        this.rerender();
        event.preventDefault();
        break;
      }
      default: {
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          this.handleTypeahead(event.key, visibleNodes, activeIndex);
          event.preventDefault();
        }
        break;
      }
    }
  }

  private getVisibleNodes(input: T | null = this.input): Array<{
    node: T;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
  }> {
    if (!input) {
      return [];
    }

    const nodes: Array<{
      node: T;
      depth: number;
      hasChildren: boolean;
      isExpanded: boolean;
    }> = [];
    const visit = (node: T, depth: number) => {
      const nodeId = this.options.getId(node);
      const hasChildren = this.dataSource.hasChildren(node);
      const isRoot = this.options.isRoot(node);
      const isExpanded = isRoot || (hasChildren && this.expandedIds.has(nodeId));
      nodes.push({ node, depth, hasChildren, isExpanded });
      if (hasChildren && isExpanded) {
        for (const child of this.dataSource.getChildren(node)) {
          visit(child, depth + 1);
        }
      }
    };
    visit(input, 0);
    return nodes;
  }

  private findParentEntry(
    visibleNodes: Array<{ node: T; depth: number }>,
    index: number,
  ) {
    const current = visibleNodes[index];
    if (!current) {
      return null;
    }
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      const candidate = visibleNodes[cursor];
      if (candidate && candidate.depth < current.depth) {
        return candidate;
      }
    }
    return null;
  }

  private focusRenderedNode() {
    if (!this.focusedId) {
      return;
    }

    const activeNode = this.element.querySelector<HTMLElement>(
      `[data-simple-tree-node-id="${CSS.escape(this.focusedId)}"]`,
    );
    if (activeNode && document.activeElement === this.element) {
      activeNode.focus();
    }
  }

  private handleTypeahead(
    key: string,
    visibleNodes: Array<{
      node: T;
      depth: number;
      hasChildren: boolean;
      isExpanded: boolean;
    }>,
    activeIndex: number,
  ) {
    this.typeaheadBuffer += key.toLocaleLowerCase();
    this.scheduleTypeaheadReset();

    const searchOrder = [
      ...visibleNodes.slice(activeIndex + 1),
      ...visibleNodes.slice(0, activeIndex + 1),
    ];
    const matched = searchOrder.find(({ node }) =>
      this.getNodeLabel(node).startsWith(this.typeaheadBuffer),
    );
    if (!matched) {
      return;
    }

    this.focusedId = this.options.getId(matched.node);
    this.rerender();
  }

  private getNodeLabel(node: T) {
    return (this.options.getLabel?.(node) ?? this.options.getId(node))
      .trim()
      .toLocaleLowerCase();
  }

  private scheduleTypeaheadReset() {
    if (this.typeaheadResetHandle !== null) {
      window.clearTimeout(this.typeaheadResetHandle);
    }

    this.typeaheadResetHandle = window.setTimeout(() => {
      this.typeaheadBuffer = '';
      this.typeaheadResetHandle = null;
    }, 700);
  }

  private hasVisibleNode(nodeId: string) {
    return this.getVisibleNodes().some(
      ({ node }) => this.options.getId(node) === nodeId,
    );
  }
}
