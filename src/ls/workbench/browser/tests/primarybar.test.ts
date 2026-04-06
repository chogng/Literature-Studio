import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import type { PrimaryBarProps } from 'ls/workbench/browser/parts/primarybar/primarybar';
import type { SidebarTopbarActionsProps } from 'ls/workbench/browser/parts/sidebar/sidebarTopbarActions';

let cleanupDomEnvironment: (() => void) | null = null;
let createPrimaryBar: typeof import('ls/workbench/browser/parts/primarybar/primarybar').createPrimaryBar;
let SidebarTopbarActionsView: typeof import('ls/workbench/browser/parts/sidebar/sidebarTopbarActions').SidebarTopbarActionsView;
let PrimaryBarFooterActionsView: typeof import('ls/workbench/browser/parts/primarybar/primarybarFooterActions').PrimaryBarFooterActionsView;

function createProps(): PrimaryBarProps {
  const labels = {
    libraryTitle: 'Library',
    fetchTitle: 'Fetch',
    writingAction: 'Write',
    selectionModeEnterMulti: 'Select multiple',
    selectionModeSelectAll: 'Select all',
    selectionModeExit: 'Exit selection',
    fetchLatest: 'Fetch latest',
    fetchLatestBusy: 'Fetching latest',
  } as PrimaryBarProps['labels'];

  const fetchPaneProps = {
    articles: [],
    hasData: false,
    locale: 'en',
    labels,
    onFocusWebUrlInput: () => {},
    fetchStartDate: '',
    onFetchStartDateChange: () => {},
    fetchEndDate: '',
    onFetchEndDateChange: () => {},
    onFetch: () => {},
    onDownloadPdf: async () => {},
    onOpenArticleDetails: () => {},
    isFetchLoading: false,
    isSelectionModeEnabled: false,
    selectionModePhase: 'off',
    selectedArticleKeys: new Set<string>(),
    onToggleSelectionMode: () => {},
    onToggleArticleSelected: () => {},
  } as PrimaryBarProps['fetchPaneProps'];

  return {
    labels,
    fetchPaneProps,
    librarySnapshot: {
      items: [],
      totalCount: 0,
      fileCount: 0,
      queuedJobCount: 0,
      libraryDbFile: '',
      defaultManagedDirectory: '',
      ragCacheDir: '',
    },
    isLibraryLoading: false,
  };
}

function createTopbarActionsProps(): SidebarTopbarActionsProps {
  return {
    isPrimarySidebarVisible: true,
    primarySidebarToggleLabel: 'Hide primary sidebar',
    addressBarLabel: 'Address bar',
  };
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createPrimaryBar } = await import('ls/workbench/browser/parts/primarybar/primarybar'));
  ({ SidebarTopbarActionsView } = await import('ls/workbench/browser/parts/sidebar/sidebarTopbarActions'));
  ({ PrimaryBarFooterActionsView } = await import('ls/workbench/browser/parts/primarybar/primarybarFooterActions'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('primary bar topbar exposes a primary sidebar toggle action', () => {
  let toggleCount = 0;
  const topbarActionsView = new SidebarTopbarActionsView({
    ...createTopbarActionsProps(),
    onTogglePrimarySidebar: () => {
      toggleCount += 1;
    },
  });
  const primaryBar = createPrimaryBar({
    ...createProps(),
    topbarActionsElement: topbarActionsView.getElement(),
  });
  const element = primaryBar.getElement();
  document.body.append(element);

  try {
    const toggleButton = element.querySelector(
      '.primarybar-topbar .sidebar-topbar-toggle-btn',
    );
    assert(toggleButton instanceof HTMLButtonElement);
    assert.equal(
      toggleButton.getAttribute('aria-label'),
      'Hide primary sidebar',
    );

    toggleButton.click();
    assert.equal(toggleCount, 1);
  } finally {
    primaryBar.dispose();
    topbarActionsView.dispose();
  }
});

test('primary bar topbar exposes an address bar action', () => {
  const topbarActionsView = new SidebarTopbarActionsView(createTopbarActionsProps());
  const primaryBar = createPrimaryBar({
    ...createProps(),
    topbarActionsElement: topbarActionsView.getElement(),
  });
  const element = primaryBar.getElement();
  document.body.append(element);

  try {
    const searchButton = element.querySelector(
      '.primarybar-topbar .sidebar-topbar-search-btn',
    );
    assert(searchButton instanceof HTMLButtonElement);
    assert.equal(searchButton.getAttribute('aria-label'), 'Address bar');
  } finally {
    primaryBar.dispose();
    topbarActionsView.dispose();
  }
});

test('primary bar renders a footer at the bottom and mounts footer content', () => {
  const footerActionsView = new PrimaryBarFooterActionsView({
    accountLabel: 'Literature Studio',
    settingsLabel: 'Settings',
  });
  const primaryBar = createPrimaryBar({
    ...createProps(),
    footerActionsElement: footerActionsView.getElement(),
  });
  const element = primaryBar.getElement();
  document.body.append(element);

  try {
    const footer = element.querySelector('.primarybar-footer');
    assert(footer instanceof HTMLElement);
    assert.equal(element.lastElementChild, footer);
    assert.equal(
      footer.querySelector('.primarybar-footer-actions-host'),
      footerActionsView.getElement(),
    );
    assert.equal(
      footer.querySelector('.primarybar-footer-account-label')?.textContent,
      'Literature Studio',
    );
  } finally {
    primaryBar.dispose();
    footerActionsView.dispose();
  }
});

test('primary bar footer settings action dispatches the provided handler', () => {
  let triggered = false;
  const footerActionsView = new PrimaryBarFooterActionsView({
    accountLabel: 'Literature Studio',
    settingsLabel: 'Settings',
    onOpenSettings: () => {
      triggered = true;
    },
  });
  const primaryBar = createPrimaryBar({
    ...createProps(),
    footerActionsElement: footerActionsView.getElement(),
  });
  const element = primaryBar.getElement();
  document.body.append(element);

  try {
    const settingsButton = element.querySelector(
      '.primarybar-footer .primarybar-footer-settings-btn',
    );
    assert(settingsButton instanceof HTMLButtonElement);
    assert.equal(settingsButton.getAttribute('aria-label'), 'Settings');
    settingsButton.click();
    assert.equal(triggered, true);
  } finally {
    primaryBar.dispose();
    footerActionsView.dispose();
  }
});
