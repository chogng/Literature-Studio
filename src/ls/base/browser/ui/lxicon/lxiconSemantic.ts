import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

export const lxIconSemanticMap = {
  titlebar: {
    fetchSidebarOpen: 'layout-sidebar-left',
    fetchSidebarClosed: 'layout-sidebar-left-off',
    primarySidebarOpen: 'projects-filled',
    primarySidebarClosed: 'projects',
    auxiliaryOpen: 'agent-filled',
    auxiliaryClosed: 'agent',
    navigateBack: 'arrow-left',
    navigateForward: 'arrow-right',
    refresh: 'refresh',
    exportDocx: 'docx',
    settings: 'gear',
  },
  assistant: {
    closeConversation: 'close',
    newConversation: 'add',
    history: 'history',
    more: 'more',
    secondarySidebarOpen: 'layout-sidebar-right',
    secondarySidebarClosed: 'layout-sidebar-right-off',
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
  sidebar: {
    selectionMode: 'select-all',
  },
  editor: {
    closeTab: 'close',
  },
  settings: {
    moveUp: 'arrow-up',
    moveDown: 'arrow-down',
    removeBatchSource: 'close',
    chooseDirectory: 'projects',
    openConfigLocation: 'link-external',
  },
  library: {
    refresh: 'projects',
    downloadPdf: 'download-2',
    createDraft: 'write',
    folderExpanded: 'chevron-down',
    folderCollapsed: 'chevron-right',
  },
  windowControls: {
    close: 'close',
  },
} as const satisfies Record<string, Record<string, LxIconName>>;
