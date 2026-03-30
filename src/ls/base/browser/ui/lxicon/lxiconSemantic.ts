import type { LxIconName } from './lxicon.js';

export const lxIconSemanticMap = {
  titlebar: {
    sidebarOpen: 'layout-sidebar-left',
    sidebarClosed: 'layout-sidebar-left-off',
    auxiliaryOpen: 'layout-sidebar-right',
    auxiliaryClosed: 'layout-sidebar-right-off',
    navigateBack: 'arrow-left',
    navigateForward: 'arrow-right',
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
    downloadPdf: 'file-pdf',
    createDraft: 'add-file',
    folderExpanded: 'chevron-down',
    folderCollapsed: 'chevron-right',
  },
  windowControls: {
    close: 'close',
  },
} as const satisfies Record<string, Record<string, LxIconName>>;
