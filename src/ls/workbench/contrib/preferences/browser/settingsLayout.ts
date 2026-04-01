import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes.js';

export type SettingsSectionId =
  | 'locale'
  | 'appearance'
  | 'configPath'
  | 'textEditor'
  | 'llm'
  | 'translation'
  | 'batchSources'
  | 'batchOptions'
  | 'knowledgeBase'
  | 'downloadDirectory';

export type SettingsPageId =
  | 'general'
  | 'textEditor'
  | 'chat'
  | 'knowledgeBase'
  | 'literature';

type SettingsPageDefinition = {
  id: SettingsPageId;
  label: (labels: SettingsPartLabels) => string;
  sections: SettingsSectionId[];
};

const settingsPageLayout: SettingsPageDefinition[] = [
  {
    id: 'general',
    label: (labels) => labels.settingsNavigationGeneral,
    sections: ['locale', 'appearance', 'configPath'],
  },
  {
    id: 'textEditor',
    label: (labels) => labels.settingsNavigationTextEditor,
    sections: ['textEditor'],
  },
  {
    id: 'chat',
    label: (labels) => labels.settingsNavigationChat,
    sections: ['llm', 'translation'],
  },
  {
    id: 'knowledgeBase',
    label: (labels) => labels.settingsNavigationKnowledgeBase,
    sections: ['knowledgeBase'],
  },
  {
    id: 'literature',
    label: (labels) => labels.settingsNavigationLiterature,
    sections: ['batchSources', 'batchOptions', 'downloadDirectory'],
  },
] as const;

export type SettingsSectionMap = Record<SettingsSectionId, HTMLElement>;
export type SettingsNavigationItem = {
  id: SettingsPageId;
  label: string;
};

// This remains intentionally lightweight: it defines page structure and the
// section membership of each page without introducing tree models.
export function createSettingsSectionMap(factory: () => HTMLElement): SettingsSectionMap {
  const sectionIds = new Set<SettingsSectionId>();
  for (const page of settingsPageLayout) {
    for (const sectionId of page.sections) {
      sectionIds.add(sectionId);
    }
  }
  const entries = Array.from(sectionIds).map((id) => [id, factory()] as const);
  return Object.fromEntries(entries) as SettingsSectionMap;
}

export function getSettingsNavigationItems(labels: SettingsPartLabels): SettingsNavigationItem[] {
  return settingsPageLayout.map((page) => ({
    id: page.id,
    label: page.label(labels).trim(),
  }));
}

export function getSettingsPageSectionIds(pageId: SettingsPageId): SettingsSectionId[] {
  return settingsPageLayout.find((page) => page.id === pageId)?.sections ?? [];
}
