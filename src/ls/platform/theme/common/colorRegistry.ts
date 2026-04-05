export type ColorIdentifier =
  | 'sash.hoverBorder'
  | 'scrollbar.shadow'
  | 'scrollbarSlider.background'
  | 'scrollbarSlider.hoverBackground'
  | 'scrollbarSlider.activeBackground'
  | 'sideBar.foreground'
  | 'sideBar.secondaryForeground'
  | 'sideBar.border'
  | 'sideBar.background'
  | 'sideBar.cardBackground'
  | 'sideBar.cardBorder'
  | 'sideBar.codeBackground'
  | 'sideBar.codeForeground'
  | 'sideBar.actionHoverBackground'
  | 'sideBar.actionActiveBackground'
  | 'sideBar.statusInfoBackground'
  | 'sideBar.statusInfoForeground'
  | 'sideBar.statusSuccessBackground'
  | 'sideBar.statusSuccessForeground'
  | 'sideBar.statusWarningBackground'
  | 'sideBar.statusWarningForeground'
  | 'sideBar.statusErrorBackground'
  | 'sideBar.statusErrorForeground'
  | 'sideBar.statusNeutralBackground'
  | 'sideBar.statusNeutralForeground'
  | 'primaryBar.fetchCardBorder'
  | 'primaryBar.fetchCardHoverBackground'
  | 'primaryBar.fetchCardFocusBorder'
  | 'primaryBar.fetchCardSelectedBackground'
  | 'primaryBar.fetchCardSelectedHoverBackground'
  | 'primaryBar.fetchCardSelectedBorder'
  | 'primaryBar.fetchCardTitleForeground'
  | 'primaryBar.fetchCardMetaForeground'
  | 'primaryBar.fetchCardBodyForeground'
  | 'primaryBar.fetchCardStrongForeground'
  | 'primaryBar.emptyStateForeground'
  | 'primaryBar.linkForeground'
  | 'primaryBar.linkHoverForeground'
  | 'auxiliaryBar.inputBorder'
  | 'auxiliaryBar.inputBackground'
  | 'auxiliaryBar.inputForeground'
  | 'auxiliaryBar.tabForeground'
  | 'auxiliaryBar.tabActiveBackground'
  | 'auxiliaryBar.tabActiveForeground'
  | 'auxiliaryBar.tabActiveHoverForeground'
  | 'auxiliaryBar.tabCloseForeground'
  | 'auxiliaryBar.tabCloseHoverForeground'
  | 'auxiliaryBar.tabFocusBorder'
  | 'auxiliaryBar.popoverBackground'
  | 'auxiliaryBar.popoverBorder'
  | 'auxiliaryBar.popoverTitleForeground'
  | 'auxiliaryBar.itemBackground'
  | 'auxiliaryBar.itemBorder'
  | 'auxiliaryBar.itemForeground'
  | 'auxiliaryBar.itemActiveBackground'
  | 'auxiliaryBar.itemActiveBorder'
  | 'auxiliaryBar.itemMetaForeground'
  | 'editor.panelGradientFrom'
  | 'editor.panelGradientTo'
  | 'editor.panelAccent'
  | 'editor.sourcePaneBackground'
  | 'editor.sourceHeaderBorder'
  | 'editor.sourceHeaderForeground'
  | 'editor.sourceSubheadingForeground'
  | 'editor.modeEnabledForeground'
  | 'editor.modeEnabledBorder'
  | 'editor.modeEnabledBackground'
  | 'editor.modeDisabledForeground'
  | 'editor.modeDisabledBorder'
  | 'editor.modeDisabledBackground'
  | 'editor.assistantCardBorder'
  | 'editor.assistantCardGradientFrom'
  | 'editor.assistantCardGradientTo'
  | 'editor.assistantCardForeground'
  | 'editor.assistantCardTextForeground'
  | 'editor.draftGradientFrom'
  | 'editor.draftGradientTo'
  | 'editor.draftInsetShadow'
  | 'editor.loadingBorder'
  | 'editor.loadingBackground'
  | 'editor.loadingCardBackground'
  | 'editor.loadingCardForeground'
  | 'editor.placeholderTitleForeground'
  | 'editor.placeholderBodyForeground'
  | 'editor.statusModeForeground'
  | 'editor.statusModeBorder'
  | 'editor.statusModeBackground'
  | 'editor.statusSummaryForeground'
  | 'editor.statusItemBorder'
  | 'editor.statusItemBackground'
  | 'editor.statusItemAccentBorder'
  | 'editor.statusItemAccentBackground'
  | 'editor.statusItemLabelForeground'
  | 'editor.statusItemValueForeground'
  | 'editor.tabsHeaderBackground'
  | 'editor.tabHoverBackground'
  | 'editor.tabActiveBackground'
  | 'editor.tabHistoryBackground'
  | 'editor.tabHistoryActiveBackground'
  | 'editor.tabForeground'
  | 'editor.tabHoverForeground'
  | 'editor.tabActiveForeground'
  | 'editor.tabCloseHoverBackground'
  | 'editor.tabCloseHoverForeground'
  | 'editor.tabCloseActiveBackground'
  | 'editor.tabCloseActiveForeground'
  | 'editor.tabKindForeground'
  | 'editor.tabKindBackground'
  | 'editor.tabKindDraftForeground'
  | 'editor.tabKindDraftBackground'
  | 'editor.tabKindWebForeground'
  | 'editor.tabKindWebBackground'
  | 'editor.tabKindPdfForeground'
  | 'editor.tabKindPdfBackground'
  | 'editor.webContentBackground'
  | 'editor.webContentForeground'
  | 'workbench.chromeBackground'
  | 'workbench.chromeBackgroundTransparent'
  | 'workbench.foreground'
  | 'workbench.buttonBorder'
  | 'workbench.buttonBackground'
  | 'workbench.buttonForeground'
  | 'workbench.panelBackground'
  | 'workbench.panelBorder'
  | 'workbench.panelTitleBorder'
  | 'workbench.panelTitleForeground'
  | 'settings.navigationBorder'
  | 'settings.navigationBackgroundFrom'
  | 'settings.navigationBackgroundTo'
  | 'settings.navigationItemForeground'
  | 'settings.navigationItemHoverBackground'
  | 'settings.navigationItemActiveBorder'
  | 'settings.navigationItemActiveBackground'
  | 'settings.navigationItemActiveForeground'
  | 'settings.contentBackground'
  | 'settings.sectionBorder'
  | 'settings.sectionTitleForeground'
  | 'settings.fieldForeground'
  | 'settings.checkboxBorder'
  | 'settings.checkboxBackground'
  | 'settings.checkboxCheckedBorder'
  | 'settings.checkboxCheckedBackground'
  | 'settings.checkboxCheckmark'
  | 'settings.checkboxFocusBorder'
  | 'settings.inputBorder'
  | 'settings.inputBackground'
  | 'settings.inputForeground'
  | 'settings.inputFocusOutline'
  | 'settings.inputFocusBorder'
  | 'settings.buttonBorder'
  | 'settings.buttonBackground'
  | 'settings.buttonForeground'
  | 'settings.buttonHoverBackground'
  | 'settings.panelBackground'
  | 'settings.panelBorder'
  | 'settings.panelForeground'
  | 'settings.mutedForeground'
  | 'settings.linkForeground'
  | 'settings.separator'
  | 'settings.badgeBorder'
  | 'settings.badgeBackground'
  | 'settings.badgeForeground'
  | 'settings.cardBorder'
  | 'settings.cardBackground'
  | 'settings.cardBackgroundAlt'
  | 'settings.cardLabelForeground'
  | 'settings.cardTitleForeground'
  | 'settings.cardAccentForeground'
  | 'titleBar.fieldBackground'
  | 'titleBar.fieldHoverBackground'
  | 'titleBar.fieldFocusBackground'
  | 'titleBar.fieldForeground'
  | 'titleBar.placeholderForeground'
  | 'titleBar.appNameForeground'
  | 'titleBar.buttonForeground'
  | 'titleBar.closeHoverBackground'
  | 'titleBar.closeHoverForeground'
  | 'titleBar.closeActiveBackground'
  | 'titleBar.closeActiveForeground'
  | 'titleBar.fetchSourceNetworkBackground'
  | 'titleBar.fetchSourceNetworkBorder'
  | 'titleBar.fetchSourceNetworkForeground'
  | 'titleBar.fetchSourceWebBackground'
  | 'titleBar.fetchSourceWebBorder'
  | 'titleBar.fetchSourceWebForeground'
  | 'titleBar.fetchSourceLiveBackground'
  | 'titleBar.fetchSourceLiveBorder'
  | 'titleBar.fetchSourceLiveForeground'
  | 'titleBar.fetchStopBackground'
  | 'titleBar.fetchStopBorder'
  | 'titleBar.fetchStopForeground';

import type { ThemeColorDefaults } from 'ls/platform/theme/common/theme';

type RegisteredColor = {
  id: ColorIdentifier;
  defaults: ThemeColorDefaults;
};

const colorRegistry = new Map<ColorIdentifier, RegisteredColor>();

export function asCssVariableName(colorId: ColorIdentifier) {
  return `--vscode-${colorId.replace(/\./g, '-')}`;
}

export function registerColor(
  id: ColorIdentifier,
  defaults: ThemeColorDefaults,
) {
  const registered = {
    id,
    defaults,
  } satisfies RegisteredColor;
  colorRegistry.set(id, registered);
  return id;
}

export function getRegisteredColors() {
  return [...colorRegistry.values()];
}

export const sashHoverBorder = registerColor('sash.hoverBorder', {
  dark: 'rgba(46, 109, 179, 0.28)',
  light: 'rgba(46, 109, 179, 0.28)',
});

export const scrollbarShadow = registerColor('scrollbar.shadow', {
  dark: 'rgba(0, 0, 0, 0.18)',
  light: 'rgba(0, 0, 0, 0.18)',
});

export const scrollbarSliderBackground = registerColor('scrollbarSlider.background', {
  dark: 'rgba(96, 125, 139, 0.55)',
  light: 'rgba(96, 125, 139, 0.55)',
});

export const scrollbarSliderHoverBackground = registerColor('scrollbarSlider.hoverBackground', {
  dark: 'rgba(76, 107, 122, 0.72)',
  light: 'rgba(76, 107, 122, 0.72)',
});

export const scrollbarSliderActiveBackground = registerColor('scrollbarSlider.activeBackground', {
  dark: 'rgba(58, 87, 102, 0.88)',
  light: 'rgba(58, 87, 102, 0.88)',
});

export const sideBarForeground = registerColor('sideBar.foreground', {
  dark: '#d7e1ea',
  light: '#1f2d3a',
});

export const sideBarSecondaryForeground = registerColor('sideBar.secondaryForeground', {
  dark: '#93a4b5',
  light: '#66798f',
});

export const sideBarBorder = registerColor('sideBar.border', {
  dark: '#33404d',
  light: '#e5e5e5',
});

export const sideBarBackground = registerColor('sideBar.background', {
  dark: '#18222c',
  light: '#ffffff',
});

export const sideBarCardBackground = registerColor('sideBar.cardBackground', {
  dark: '#1f2a35',
  light: '#f7fafc',
});

export const sideBarCardBorder = registerColor('sideBar.cardBorder', {
  dark: '#344150',
  light: '#e4ebf1',
});

export const sideBarCodeBackground = registerColor('sideBar.codeBackground', {
  dark: '#24313d',
  light: '#eef3f8',
});

export const sideBarCodeForeground = registerColor('sideBar.codeForeground', {
  dark: '#d4e0ec',
  light: '#223140',
});

export const sideBarActionHoverBackground = registerColor('sideBar.actionHoverBackground', {
  dark: 'rgba(255, 255, 255, 0.08)',
  light: 'rgba(0, 0, 0, 0.05)',
});

export const sideBarActionActiveBackground = registerColor('sideBar.actionActiveBackground', {
  dark: 'rgba(255, 255, 255, 0.14)',
  light: 'rgba(0, 0, 0, 0.1)',
});

export const sideBarStatusInfoBackground = registerColor('sideBar.statusInfoBackground', {
  dark: '#22344a',
  light: '#eef4ff',
});

export const sideBarStatusInfoForeground = registerColor('sideBar.statusInfoForeground', {
  dark: '#8cb9ff',
  light: '#1d4d8f',
});

export const sideBarStatusSuccessBackground = registerColor('sideBar.statusSuccessBackground', {
  dark: '#1d3326',
  light: '#eaf6ef',
});

export const sideBarStatusSuccessForeground = registerColor('sideBar.statusSuccessForeground', {
  dark: '#7cd39c',
  light: '#1f6a3a',
});

export const sideBarStatusWarningBackground = registerColor('sideBar.statusWarningBackground', {
  dark: '#3b3020',
  light: '#fff7e6',
});

export const sideBarStatusWarningForeground = registerColor('sideBar.statusWarningForeground', {
  dark: '#f2c572',
  light: '#986100',
});

export const sideBarStatusErrorBackground = registerColor('sideBar.statusErrorBackground', {
  dark: '#412628',
  light: '#fdecec',
});

export const sideBarStatusErrorForeground = registerColor('sideBar.statusErrorForeground', {
  dark: '#ff9d9d',
  light: '#a53333',
});

export const sideBarStatusNeutralBackground = registerColor('sideBar.statusNeutralBackground', {
  dark: '#28323c',
  light: '#f4f6f9',
});

export const sideBarStatusNeutralForeground = registerColor('sideBar.statusNeutralForeground', {
  dark: '#b4c0cb',
  light: '#536576',
});

export const primaryBarFetchCardBorder = registerColor('primaryBar.fetchCardBorder', {
  dark: '#3a3f45',
  light: '#ebebeb',
});

export const primaryBarFetchCardHoverBackground = registerColor('primaryBar.fetchCardHoverBackground', {
  dark: '#232a31',
  light: '#f3f3f3',
});

export const primaryBarFetchCardFocusBorder = registerColor('primaryBar.fetchCardFocusBorder', {
  dark: '#5aa9ff',
  light: '#0078d4',
});

export const primaryBarFetchCardSelectedBackground = registerColor('primaryBar.fetchCardSelectedBackground', {
  dark: '#1d3147',
  light: '#eef6ff',
});

export const primaryBarFetchCardSelectedHoverBackground = registerColor('primaryBar.fetchCardSelectedHoverBackground', {
  dark: '#223954',
  light: '#e6f1ff',
});

export const primaryBarFetchCardSelectedBorder = registerColor('primaryBar.fetchCardSelectedBorder', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const primaryBarFetchCardTitleForeground = registerColor('primaryBar.fetchCardTitleForeground', {
  dark: '#edf3f9',
  light: '#1f1f1f',
});

export const primaryBarFetchCardMetaForeground = registerColor('primaryBar.fetchCardMetaForeground', {
  dark: '#a0afbd',
  light: '#6a6a6a',
});

export const primaryBarFetchCardBodyForeground = registerColor('primaryBar.fetchCardBodyForeground', {
  dark: '#b6c6d6',
  light: '#334455',
});

export const primaryBarFetchCardStrongForeground = registerColor('primaryBar.fetchCardStrongForeground', {
  dark: '#eef4fb',
  light: '#1c2a38',
});

export const primaryBarEmptyStateForeground = registerColor('primaryBar.emptyStateForeground', {
  dark: '#9dafc1',
  light: '#556577',
});

export const primaryBarLinkForeground = registerColor('primaryBar.linkForeground', {
  dark: '#7cb6ff',
  light: '#0a5fbf',
});

export const primaryBarLinkHoverForeground = registerColor('primaryBar.linkHoverForeground', {
  dark: '#9cc8ff',
  light: '#0d6ed8',
});

export const auxiliaryBarInputBorder = registerColor('auxiliaryBar.inputBorder', {
  dark: '#3a4652',
  light: '#d6e0e8',
});

export const auxiliaryBarInputBackground = registerColor('auxiliaryBar.inputBackground', {
  dark: '#202b35',
  light: '#f9fbfd',
});

export const auxiliaryBarInputForeground = registerColor('auxiliaryBar.inputForeground', {
  dark: '#d7e1ea',
  light: '#1f2d3a',
});

export const auxiliaryBarTabForeground = registerColor('auxiliaryBar.tabForeground', {
  dark: '#93a4b5',
  light: '#415366',
});

export const auxiliaryBarTabActiveBackground = registerColor('auxiliaryBar.tabActiveBackground', {
  dark: '#22344a',
  light: '#e8f1fc',
});

export const auxiliaryBarTabActiveForeground = registerColor('auxiliaryBar.tabActiveForeground', {
  dark: '#8cb9ff',
  light: '#0a5fbf',
});

export const auxiliaryBarTabActiveHoverForeground = registerColor('auxiliaryBar.tabActiveHoverForeground', {
  dark: '#a8ccff',
  light: '#084a96',
});

export const auxiliaryBarTabCloseForeground = registerColor('auxiliaryBar.tabCloseForeground', {
  dark: '#93a4b5',
  light: '#66798f',
});

export const auxiliaryBarTabCloseHoverForeground = registerColor('auxiliaryBar.tabCloseHoverForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const auxiliaryBarTabFocusBorder = registerColor('auxiliaryBar.tabFocusBorder', {
  dark: 'rgba(90, 169, 255, 0.34)',
  light: 'rgba(10, 95, 191, 0.24)',
});

export const auxiliaryBarPopoverBackground = registerColor('auxiliaryBar.popoverBackground', {
  dark: '#1f2a35',
  light: '#f8fbfe',
});

export const auxiliaryBarPopoverBorder = registerColor('auxiliaryBar.popoverBorder', {
  dark: '#344150',
  light: '#d7e2ec',
});

export const auxiliaryBarPopoverTitleForeground = registerColor('auxiliaryBar.popoverTitleForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const auxiliaryBarItemBackground = registerColor('auxiliaryBar.itemBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const auxiliaryBarItemBorder = registerColor('auxiliaryBar.itemBorder', {
  dark: '#344150',
  light: '#d7e2ec',
});

export const auxiliaryBarItemForeground = registerColor('auxiliaryBar.itemForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const auxiliaryBarItemActiveBackground = registerColor('auxiliaryBar.itemActiveBackground', {
  dark: '#22344a',
  light: '#eef5fd',
});

export const auxiliaryBarItemActiveBorder = registerColor('auxiliaryBar.itemActiveBorder', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const auxiliaryBarItemMetaForeground = registerColor('auxiliaryBar.itemMetaForeground', {
  dark: '#93a4b5',
  light: '#66798f',
});

export const editorPanelGradientFrom = registerColor('editor.panelGradientFrom', {
  dark: '#18222c',
  light: '#ffffff',
});

export const editorPanelGradientTo = registerColor('editor.panelGradientTo', {
  dark: '#1c2630',
  light: '#fbfcfe',
});

export const editorPanelAccent = registerColor('editor.panelAccent', {
  dark: 'rgba(90, 169, 255, 0.12)',
  light: 'rgba(22, 136, 217, 0.08)',
});

export const editorSourcePaneBackground = registerColor('editor.sourcePaneBackground', {
  dark: 'rgba(29, 39, 48, 0.82)',
  light: 'rgba(248, 250, 253, 0.72)',
});

export const editorSourceHeaderBorder = registerColor('editor.sourceHeaderBorder', {
  dark: '#33404d',
  light: '#e4ebf3',
});

export const editorSourceHeaderForeground = registerColor('editor.sourceHeaderForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const editorSourceSubheadingForeground = registerColor('editor.sourceSubheadingForeground', {
  dark: '#93a4b5',
  light: '#698099',
});

export const editorModeEnabledForeground = registerColor('editor.modeEnabledForeground', {
  dark: '#7cd39c',
  light: '#1f6a3a',
});

export const editorModeEnabledBorder = registerColor('editor.modeEnabledBorder', {
  dark: '#3b6b4d',
  light: '#b5dfc2',
});

export const editorModeEnabledBackground = registerColor('editor.modeEnabledBackground', {
  dark: '#1d3326',
  light: '#eaf6ef',
});

export const editorModeDisabledForeground = registerColor('editor.modeDisabledForeground', {
  dark: '#93a4b5',
  light: '#6b7c8d',
});

export const editorModeDisabledBorder = registerColor('editor.modeDisabledBorder', {
  dark: '#344150',
  light: '#d9e3ec',
});

export const editorModeDisabledBackground = registerColor('editor.modeDisabledBackground', {
  dark: '#28323c',
  light: '#f4f7fa',
});

export const editorAssistantCardBorder = registerColor('editor.assistantCardBorder', {
  dark: '#344150',
  light: '#dae5ef',
});

export const editorAssistantCardGradientFrom = registerColor('editor.assistantCardGradientFrom', {
  dark: 'rgba(33, 43, 57, 0.95)',
  light: 'rgba(244, 248, 255, 0.95)',
});

export const editorAssistantCardGradientTo = registerColor('editor.assistantCardGradientTo', {
  dark: 'rgba(25, 34, 44, 0.95)',
  light: 'rgba(252, 253, 255, 0.95)',
});

export const editorAssistantCardForeground = registerColor('editor.assistantCardForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const editorAssistantCardTextForeground = registerColor('editor.assistantCardTextForeground', {
  dark: '#a8b7c5',
  light: '#4e6176',
});

export const editorDraftGradientFrom = registerColor('editor.draftGradientFrom', {
  dark: 'rgba(24, 34, 44, 0.98)',
  light: 'rgba(255, 255, 255, 0.98)',
});

export const editorDraftGradientTo = registerColor('editor.draftGradientTo', {
  dark: 'rgba(28, 38, 48, 0.98)',
  light: 'rgba(251, 252, 254, 0.98)',
});

export const editorDraftInsetShadow = registerColor('editor.draftInsetShadow', {
  dark: 'rgba(255, 255, 255, 0.06)',
  light: 'rgba(255, 255, 255, 0.85)',
});

export const editorLoadingBorder = registerColor('editor.loadingBorder', {
  dark: '#3a4652',
  light: '#d6e0eb',
});

export const editorLoadingBackground = registerColor('editor.loadingBackground', {
  dark: 'rgba(28, 38, 48, 0.92)',
  light: 'rgba(251, 252, 254, 0.92)',
});

export const editorLoadingCardBackground = registerColor('editor.loadingCardBackground', {
  dark: 'rgba(40, 50, 60, 0.9)',
  light: 'rgba(244, 247, 250, 0.9)',
});

export const editorLoadingCardForeground = registerColor('editor.loadingCardForeground', {
  dark: '#93a4b5',
  light: '#607285',
});

export const editorPlaceholderTitleForeground = registerColor('editor.placeholderTitleForeground', {
  dark: '#d7e1ea',
  light: '#1d3145',
});

export const editorPlaceholderBodyForeground = registerColor('editor.placeholderBodyForeground', {
  dark: '#93a4b5',
  light: '#597086',
});

export const editorStatusModeForeground = registerColor('editor.statusModeForeground', {
  dark: '#8cb9ff',
  light: '#18486e',
});

export const editorStatusModeBorder = registerColor('editor.statusModeBorder', {
  dark: 'rgba(90, 169, 255, 0.28)',
  light: 'rgba(88, 141, 191, 0.22)',
});

export const editorStatusModeBackground = registerColor('editor.statusModeBackground', {
  dark: 'rgba(34, 52, 74, 0.88)',
  light: 'rgba(225, 238, 249, 0.88)',
});

export const editorStatusSummaryForeground = registerColor('editor.statusSummaryForeground', {
  dark: '#93a4b5',
  light: '#597086',
});

export const editorStatusItemBorder = registerColor('editor.statusItemBorder', {
  dark: 'rgba(85, 101, 117, 0.9)',
  light: 'rgba(208, 220, 232, 0.9)',
});

export const editorStatusItemBackground = registerColor('editor.statusItemBackground', {
  dark: 'rgba(24, 34, 44, 0.7)',
  light: 'rgba(255, 255, 255, 0.7)',
});

export const editorStatusItemAccentBorder = registerColor('editor.statusItemAccentBorder', {
  dark: 'rgba(124, 211, 156, 0.55)',
  light: 'rgba(179, 220, 197, 0.95)',
});

export const editorStatusItemAccentBackground = registerColor('editor.statusItemAccentBackground', {
  dark: 'rgba(29, 51, 38, 0.92)',
  light: 'rgba(232, 247, 238, 0.92)',
});

export const editorStatusItemLabelForeground = registerColor('editor.statusItemLabelForeground', {
  dark: '#93a4b5',
  light: '#607488',
});

export const editorStatusItemValueForeground = registerColor('editor.statusItemValueForeground', {
  dark: '#d7e1ea',
  light: '#1d3145',
});

export const editorTabsHeaderBackground = registerColor('editor.tabsHeaderBackground', {
  dark: '#1b2630',
  light: '#f3f6f9',
});

export const editorTabHoverBackground = registerColor('editor.tabHoverBackground', {
  dark: 'rgba(255, 255, 255, 0.08)',
  light: 'rgba(223, 231, 239, 0.7)',
});

export const editorTabActiveBackground = registerColor('editor.tabActiveBackground', {
  dark: '#24313d',
  light: '#fbfcfd',
});

export const editorTabHistoryBackground = registerColor('editor.tabHistoryBackground', {
  dark: 'rgba(147, 164, 181, 0.62)',
  light: 'rgba(111, 134, 156, 0.72)',
});

export const editorTabHistoryActiveBackground = registerColor('editor.tabHistoryActiveBackground', {
  dark: 'rgba(140, 185, 255, 0.88)',
  light: 'rgba(78, 108, 136, 0.96)',
});

export const editorTabForeground = registerColor('editor.tabForeground', {
  dark: '#93a4b5',
  light: '#58697b',
});

export const editorTabHoverForeground = registerColor('editor.tabHoverForeground', {
  dark: '#d7e1ea',
  light: '#304253',
});

export const editorTabActiveForeground = registerColor('editor.tabActiveForeground', {
  dark: '#edf3f9',
  light: '#1d2f41',
});

export const editorTabCloseHoverBackground = registerColor('editor.tabCloseHoverBackground', {
  dark: 'rgba(255, 255, 255, 0.08)',
  light: 'rgba(0, 0, 0, 0.05)',
});

export const editorTabCloseHoverForeground = registerColor('editor.tabCloseHoverForeground', {
  dark: '#d7e1ea',
  light: '#1f2d3a',
});

export const editorTabCloseActiveBackground = registerColor('editor.tabCloseActiveBackground', {
  dark: 'rgba(255, 255, 255, 0.14)',
  light: 'rgba(0, 0, 0, 0.1)',
});

export const editorTabCloseActiveForeground = registerColor('editor.tabCloseActiveForeground', {
  dark: '#edf3f9',
  light: '#1f2d3a',
});

export const editorTabKindForeground = registerColor('editor.tabKindForeground', {
  dark: '#b6c6d6',
  light: '#4d6276',
});

export const editorTabKindBackground = registerColor('editor.tabKindBackground', {
  dark: 'rgba(147, 164, 181, 0.2)',
  light: 'rgba(173, 187, 202, 0.24)',
});

export const editorTabKindDraftForeground = registerColor('editor.tabKindDraftForeground', {
  dark: '#8cb9ff',
  light: '#35536f',
});

export const editorTabKindDraftBackground = registerColor('editor.tabKindDraftBackground', {
  dark: 'rgba(90, 169, 255, 0.18)',
  light: 'rgba(104, 149, 191, 0.18)',
});

export const editorTabKindWebForeground = registerColor('editor.tabKindWebForeground', {
  dark: '#f2c572',
  light: '#5f572f',
});

export const editorTabKindWebBackground = registerColor('editor.tabKindWebBackground', {
  dark: 'rgba(242, 197, 114, 0.18)',
  light: 'rgba(187, 167, 83, 0.2)',
});

export const editorTabKindPdfForeground = registerColor('editor.tabKindPdfForeground', {
  dark: '#ffb4a3',
  light: '#6f3f35',
});

export const editorTabKindPdfBackground = registerColor('editor.tabKindPdfBackground', {
  dark: 'rgba(255, 157, 157, 0.16)',
  light: 'rgba(196, 116, 89, 0.18)',
});

export const editorWebContentBackground = registerColor('editor.webContentBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const editorWebContentForeground = registerColor('editor.webContentForeground', {
  dark: '#93a4b5',
  light: '#667788',
});

export const workbenchChromeBackground = registerColor('workbench.chromeBackground', {
  dark: '#18222c',
  light: '#fafafd',
});

export const workbenchChromeBackgroundTransparent = registerColor('workbench.chromeBackgroundTransparent', {
  dark: 'rgba(24, 34, 44, 0)',
  light: 'rgba(250, 250, 253, 0)',
});

export const workbenchForeground = registerColor('workbench.foreground', {
  dark: '#d7e1ea',
  light: '#1a2530',
});

export const workbenchButtonBorder = registerColor('workbench.buttonBorder', {
  dark: '#344150',
  light: '#c4cfda',
});

export const workbenchButtonBackground = registerColor('workbench.buttonBackground', {
  dark: '#24313d',
  light: '#f6f9fc',
});

export const workbenchButtonForeground = registerColor('workbench.buttonForeground', {
  dark: '#d7e1ea',
  light: '#1f2d3a',
});

export const workbenchPanelBackground = registerColor('workbench.panelBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const workbenchPanelBorder = registerColor('workbench.panelBorder', {
  dark: '#344150',
  light: '#d2dce8',
});

export const workbenchPanelTitleBorder = registerColor('workbench.panelTitleBorder', {
  dark: '#344150',
  light: '#e5ebf1',
});

export const workbenchPanelTitleForeground = registerColor('workbench.panelTitleForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsNavigationBorder = registerColor('settings.navigationBorder', {
  dark: '#344150',
  light: '#e6edf5',
});

export const settingsNavigationBackgroundFrom = registerColor('settings.navigationBackgroundFrom', {
  dark: '#1d2934',
  light: '#f7fbff',
});

export const settingsNavigationBackgroundTo = registerColor('settings.navigationBackgroundTo', {
  dark: '#18222c',
  light: '#f2f7fc',
});

export const settingsNavigationItemForeground = registerColor('settings.navigationItemForeground', {
  dark: '#b7c7d6',
  light: '#304357',
});

export const settingsNavigationItemHoverBackground = registerColor('settings.navigationItemHoverBackground', {
  dark: 'rgba(90, 169, 255, 0.12)',
  light: 'rgba(10, 95, 191, 0.06)',
});

export const settingsNavigationItemActiveBorder = registerColor('settings.navigationItemActiveBorder', {
  dark: '#4c6892',
  light: '#c9d7e6',
});

export const settingsNavigationItemActiveBackground = registerColor('settings.navigationItemActiveBackground', {
  dark: '#22344a',
  light: '#ffffff',
});

export const settingsNavigationItemActiveForeground = registerColor('settings.navigationItemActiveForeground', {
  dark: '#8cb9ff',
  light: '#0a5fbf',
});

export const settingsContentBackground = registerColor('settings.contentBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const settingsSectionBorder = registerColor('settings.sectionBorder', {
  dark: '#344150',
  light: '#e1e9f2',
});

export const settingsSectionTitleForeground = registerColor('settings.sectionTitleForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsFieldForeground = registerColor('settings.fieldForeground', {
  dark: '#b7c7d6',
  light: '#2d4052',
});

export const settingsCheckboxBorder = registerColor('settings.checkboxBorder', {
  dark: '#4c6892',
  light: '#a7bad0',
});

export const settingsCheckboxBackground = registerColor('settings.checkboxBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const settingsCheckboxCheckedBorder = registerColor('settings.checkboxCheckedBorder', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const settingsCheckboxCheckedBackground = registerColor('settings.checkboxCheckedBackground', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const settingsCheckboxCheckmark = registerColor('settings.checkboxCheckmark', {
  dark: '#ffffff',
  light: '#ffffff',
});

export const settingsCheckboxFocusBorder = registerColor('settings.checkboxFocusBorder', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const settingsInputBorder = registerColor('settings.inputBorder', {
  dark: '#344150',
  light: '#c9d7e6',
});

export const settingsInputBackground = registerColor('settings.inputBackground', {
  dark: '#1f2a35',
  light: '#ffffff',
});

export const settingsInputForeground = registerColor('settings.inputForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsInputFocusOutline = registerColor('settings.inputFocusOutline', {
  dark: 'rgba(90, 169, 255, 0.22)',
  light: 'rgba(10, 95, 191, 0.18)',
});

export const settingsInputFocusBorder = registerColor('settings.inputFocusBorder', {
  dark: '#5aa9ff',
  light: '#0a5fbf',
});

export const settingsButtonBorder = registerColor('settings.buttonBorder', {
  dark: '#344150',
  light: '#c9d7e6',
});

export const settingsButtonBackground = registerColor('settings.buttonBackground', {
  dark: '#1f2a35',
  light: '#ffffff',
});

export const settingsButtonForeground = registerColor('settings.buttonForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsButtonHoverBackground = registerColor('settings.buttonHoverBackground', {
  dark: '#24313d',
  light: '#f6f9fc',
});

export const settingsPanelBackground = registerColor('settings.panelBackground', {
  dark: '#202b35',
  light: '#f6f6f6',
});

export const settingsPanelBorder = registerColor('settings.panelBorder', {
  dark: '#344150',
  light: '#e5e5e5',
});

export const settingsPanelForeground = registerColor('settings.panelForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsMutedForeground = registerColor('settings.mutedForeground', {
  dark: '#93a4b5',
  light: '#5b6b7b',
});

export const settingsLinkForeground = registerColor('settings.linkForeground', {
  dark: '#8cb9ff',
  light: '#0a5fbf',
});

export const settingsSeparator = registerColor('settings.separator', {
  dark: '#344150',
  light: '#e5e5e5',
});

export const settingsBadgeBorder = registerColor('settings.badgeBorder', {
  dark: '#344150',
  light: '#d8e3ef',
});

export const settingsBadgeBackground = registerColor('settings.badgeBackground', {
  dark: '#18222c',
  light: '#ffffff',
});

export const settingsBadgeForeground = registerColor('settings.badgeForeground', {
  dark: '#93a4b5',
  light: '#5c7084',
});

export const settingsCardBorder = registerColor('settings.cardBorder', {
  dark: '#344150',
  light: '#dce7f2',
});

export const settingsCardBackground = registerColor('settings.cardBackground', {
  dark: '#1f2a35',
  light: '#f9fbfe',
});

export const settingsCardBackgroundAlt = registerColor('settings.cardBackgroundAlt', {
  dark: '#24313d',
  light: '#f3f7fb',
});

export const settingsCardLabelForeground = registerColor('settings.cardLabelForeground', {
  dark: '#93a4b5',
  light: '#607285',
});

export const settingsCardTitleForeground = registerColor('settings.cardTitleForeground', {
  dark: '#d7e1ea',
  light: '#203040',
});

export const settingsCardAccentForeground = registerColor('settings.cardAccentForeground', {
  dark: '#8cb9ff',
  light: '#35536e',
});

export const titleBarFieldBackground = registerColor('titleBar.fieldBackground', {
  dark: 'rgba(24, 34, 44, 0.72)',
  light: 'rgba(255, 255, 255, 0.72)',
});

export const titleBarFieldHoverBackground = registerColor('titleBar.fieldHoverBackground', {
  dark: 'rgba(36, 49, 61, 0.9)',
  light: 'rgba(255, 255, 255, 0.9)',
});

export const titleBarFieldFocusBackground = registerColor('titleBar.fieldFocusBackground', {
  dark: '#24313d',
  light: '#ffffff',
});

export const titleBarFieldForeground = registerColor('titleBar.fieldForeground', {
  dark: '#d7e1ea',
  light: '#304357',
});

export const titleBarPlaceholderForeground = registerColor('titleBar.placeholderForeground', {
  dark: '#7f92a5',
  light: '#94a3b8',
});

export const titleBarAppNameForeground = registerColor('titleBar.appNameForeground', {
  dark: '#b7c7d6',
  light: '#425468',
});

export const titleBarButtonForeground = registerColor('titleBar.buttonForeground', {
  dark: '#d7e1ea',
  light: '#1f2d3a',
});

export const titleBarCloseHoverBackground = registerColor('titleBar.closeHoverBackground', {
  dark: '#e81123',
  light: '#e81123',
});

export const titleBarCloseHoverForeground = registerColor('titleBar.closeHoverForeground', {
  dark: '#ffffff',
  light: '#ffffff',
});

export const titleBarCloseActiveBackground = registerColor('titleBar.closeActiveBackground', {
  dark: '#c50f1f',
  light: '#c50f1f',
});

export const titleBarCloseActiveForeground = registerColor('titleBar.closeActiveForeground', {
  dark: '#ffffff',
  light: '#ffffff',
});

export const titleBarFetchSourceNetworkBackground = registerColor('titleBar.fetchSourceNetworkBackground', {
  dark: '#3b3020',
  light: '#fff7ec',
});

export const titleBarFetchSourceNetworkBorder = registerColor('titleBar.fetchSourceNetworkBorder', {
  dark: '#8b6940',
  light: '#f5cf99',
});

export const titleBarFetchSourceNetworkForeground = registerColor('titleBar.fetchSourceNetworkForeground', {
  dark: '#f2c572',
  light: '#8b5a14',
});

export const titleBarFetchSourceWebBackground = registerColor('titleBar.fetchSourceWebBackground', {
  dark: '#1d3326',
  light: '#e9f8ef',
});

export const titleBarFetchSourceWebBorder = registerColor('titleBar.fetchSourceWebBorder', {
  dark: '#3d6b4e',
  light: '#93d2aa',
});

export const titleBarFetchSourceWebForeground = registerColor('titleBar.fetchSourceWebForeground', {
  dark: '#7cd39c',
  light: '#1e6b3d',
});

export const titleBarFetchSourceLiveBackground = registerColor('titleBar.fetchSourceLiveBackground', {
  dark: '#22344a',
  light: '#eaf2ff',
});

export const titleBarFetchSourceLiveBorder = registerColor('titleBar.fetchSourceLiveBorder', {
  dark: '#4c6892',
  light: '#a9c2ef',
});

export const titleBarFetchSourceLiveForeground = registerColor('titleBar.fetchSourceLiveForeground', {
  dark: '#8cb9ff',
  light: '#244f93',
});

export const titleBarFetchStopBackground = registerColor('titleBar.fetchStopBackground', {
  dark: '#3b3020',
  light: '#fff3dd',
});

export const titleBarFetchStopBorder = registerColor('titleBar.fetchStopBorder', {
  dark: '#8b6940',
  light: '#f1c07b',
});

export const titleBarFetchStopForeground = registerColor('titleBar.fetchStopForeground', {
  dark: '#f2c572',
  light: '#8a4d12',
});
