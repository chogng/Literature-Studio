import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createDropdownMenuActionViewItem } from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';

const EDITOR_TOPBAR_ADD_MENU_DATA = 'editor-topbar-add';

export type EditorTopbarActionsViewProps = {
  isEditorCollapsed: boolean;
  labels: Pick<
    EditorPartLabels,
    | 'topbarAddAction'
    | 'createDraft'
    | 'createBrowser'
    | 'createFile'
    | 'expandEditor'
    | 'collapseEditor'
  >;
  onCreateDraftTab: () => void;
  onCreateBrowserTab: () => void;
  onCreatePdfTab: () => void;
  onToggleEditorCollapse: () => void;
};

export class EditorTopbarActionsView {
  private props: EditorTopbarActionsViewProps;
  private readonly actionsView = createActionBarView({
    className: 'sidebar-topbar-actions',
    ariaRole: 'group',
  });

  constructor(props: EditorTopbarActionsViewProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.actionsView.getElement();
  }

  setProps(props: EditorTopbarActionsViewProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.actionsView.dispose();
  }

  private render() {
    this.actionsView.setProps({
      className: 'sidebar-topbar-actions',
      ariaRole: 'group',
      items: [
        createDropdownMenuActionViewItem({
          label: this.props.labels.topbarAddAction,
          title: this.props.labels.topbarAddAction,
          content: createLxIcon('add'),
          buttonClassName: 'editor-topbar-add-btn',
          overlayAlignment: 'end',
          menuData: EDITOR_TOPBAR_ADD_MENU_DATA,
          menu: [
            {
              label: this.props.labels.createDraft,
              icon: 'draft',
              onClick: () => this.props.onCreateDraftTab(),
            },
            {
              label: this.props.labels.createBrowser,
              icon: 'link-external',
              onClick: () => this.props.onCreateBrowserTab(),
            },
            {
              label: this.props.labels.createFile,
              icon: 'file',
              onClick: () => this.props.onCreatePdfTab(),
            },
          ],
        }),
        {
          label: this.props.isEditorCollapsed
            ? this.props.labels.expandEditor
            : this.props.labels.collapseEditor,
          title: this.props.isEditorCollapsed
            ? this.props.labels.expandEditor
            : this.props.labels.collapseEditor,
          mode: 'icon',
          buttonClassName: 'editor-topbar-toggle-editor-btn',
          content: createLxIcon(
            this.props.isEditorCollapsed
              ? 'layout-sidebar-right-off'
              : 'layout-sidebar-right',
          ),
          onClick: this.props.onToggleEditorCollapse,
        },
      ],
    });
  }
}

export function createEditorTopbarActionsView(props: EditorTopbarActionsViewProps) {
  return new EditorTopbarActionsView(props);
}
