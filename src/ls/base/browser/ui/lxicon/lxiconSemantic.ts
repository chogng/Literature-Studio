import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

export const lxIconSemanticMap = {
  titlebar: {
    fetchSidebarOpen: 'layout-sidebar-left',
    fetchSidebarClosed: 'layout-sidebar-left-off',
    primarySidebarOpen: 'layout-panel',
    primarySidebarClosed: 'layout-panel-off',
    auxiliaryOpen: 'layout-sidebar-right',
    auxiliaryClosed: 'layout-sidebar-right-off',
    navigateBack: 'arrow-left',
    navigateForward: 'arrow-right',
    refresh: 'refresh',
    exportDocx: 'export',
    settings: 'gear',
  },
  assistant: {
    closeConversation: 'close',
    newConversation: 'add',
    history: 'history',
    more: 'more',
    voice: 'mic',
    image: 'image',
    send: 'enter',
    busy: 'sync',
  },
  articleCard: {
    download: 'download',
    downloaded: 'check',
    details: 'chevron-down',
  },
  editor: {
    closeTab: 'close',
  },
  settings: {
    moveUp: 'arrow-up',
    moveDown: 'arrow-down',
    removeBatchSource: 'close',
    chooseDirectory: 'library',
    openConfigLocation: 'link-external',
  },
  library: {
    refresh: 'library',
    downloadPdf: 'download-2',
    createDraft: 'write',
    folderExpanded: 'chevron-down',
    folderCollapsed: 'chevron-right',
  },
  windowControls: {
    close: 'close',
  },
} as const satisfies Record<string, Record<string, LxIconName>>;
