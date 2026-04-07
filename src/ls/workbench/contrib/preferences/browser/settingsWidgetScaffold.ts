function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames
    .map((className) => className?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

export type SettingsPanelListView = {
  element: HTMLElement;
  panel: HTMLDivElement;
  list: HTMLUListElement;
};

export type CreateSettingsPanelListViewOptions = {
  sectionClassName?: string;
  title?: string;
  titleClassName?: string;
  description?: string;
  descriptionClassName?: string;
  panelClassName?: string;
  listClassName?: string;
};

export function createSettingsPanelListView(
  options: CreateSettingsPanelListViewOptions = {},
): SettingsPanelListView {
  const section = el(
    'section',
    joinClassNames('settings-block-section', options.sectionClassName),
  );

  if (options.title) {
    const title = el(
      'h3',
      joinClassNames('settings-block-title', options.titleClassName),
    );
    title.textContent = options.title;
    section.append(title);
  }

  if (options.description) {
    const description = el(
      'p',
      joinClassNames('settings-block-description', options.descriptionClassName),
    );
    description.textContent = options.description;
    section.append(description);
  }

  const panel = el(
    'div',
    joinClassNames('settings-block-panel', options.panelClassName),
  );
  const list = el(
    'ul',
    joinClassNames('settings-block-list', options.listClassName),
  );
  panel.append(list);
  section.append(panel);

  return {
    element: section,
    panel,
    list,
  };
}

export type CreateSettingsToggleListItemOptions = {
  title: string;
  description?: string;
  control: HTMLElement;
  itemClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  controlClassName?: string;
};

export function createSettingsToggleListItem(
  options: CreateSettingsToggleListItemOptions,
): HTMLLIElement {
  const item = el(
    'li',
    joinClassNames('settings-block-list-item', options.itemClassName),
  );
  const content = el(
    'div',
    joinClassNames('settings-block-list-item-content', options.contentClassName),
  );
  const title = el(
    'span',
    joinClassNames('settings-block-list-item-title', options.titleClassName),
  );
  title.textContent = options.title;
  content.append(title);
  if (options.description) {
    const description = el(
      'p',
      joinClassNames(
        'settings-block-list-item-description',
        options.descriptionClassName,
      ),
    );
    description.textContent = options.description;
    content.append(description);
  }
  const control = el(
    'div',
    joinClassNames('settings-block-list-item-control', options.controlClassName),
  );
  control.append(options.control);
  item.append(content, control);
  return item;
}

export type CreateSettingsToggleRowOptions = {
  title: string;
  hint?: string;
  control: HTMLElement;
  rowClassName?: string;
  textBlockClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
};

export function createSettingsToggleRow(
  options: CreateSettingsToggleRowOptions,
): HTMLDivElement {
  const row = el(
    'div',
    joinClassNames('settings-toggle-row', options.rowClassName),
  );
  const textBlock = el('div', options.textBlockClassName);
  const label = el('span', options.labelClassName ?? 'settings-hint');
  label.textContent = options.title;
  textBlock.append(label);
  if (options.hint) {
    const hint = el(
      'p',
      options.hintClassName ?? 'settings-hint settings-toggle-subtitle',
    );
    hint.textContent = options.hint;
    textBlock.append(hint);
  }
  row.append(textBlock, options.control);
  return row;
}
