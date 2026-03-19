/// <reference types="vite/client" />

type DesktopArticle = import('./ls/workbench/common/desktopTypes.js').Article;
type DesktopBatchSource = import('./ls/workbench/common/desktopTypes.js').BatchSource;
type DesktopFetchBatchSource = import('./ls/workbench/common/desktopTypes.js').FetchBatchSource;
type DesktopFetchStrategy = import('./ls/workbench/common/desktopTypes.js').FetchStrategy;
type DesktopPdfDownloadResult = import('./ls/workbench/common/desktopTypes.js').PdfDownloadResult;
type DesktopDocxExportResult = import('./ls/workbench/common/desktopTypes.js').DocxExportResult;
type DesktopArticleDetailsModalLabels = import('./ls/workbench/common/desktopTypes.js').ArticleDetailsModalLabels;
type DesktopArticleDetailsModalState = import('./ls/workbench/common/desktopTypes.js').ArticleDetailsModalState;
type DesktopNativeModalState = import('./ls/workbench/common/desktopTypes.js').NativeModalState;
type DesktopStoredAppSettings = import('./ls/workbench/common/desktopTypes.js').StoredAppSettings;
type DesktopAppSettings = import('./ls/workbench/common/desktopTypes.js').AppSettings;
type AppCommandPayloadMap = import('./ls/workbench/common/desktopTypes.js').AppCommandPayloadMap;
type AppCommandResultMap = import('./ls/workbench/common/desktopTypes.js').AppCommandResultMap;
type AppCommand = import('./ls/workbench/common/desktopTypes.js').AppCommand;
type WindowControlAction = import('./ls/workbench/common/desktopTypes.js').WindowControlAction;
type WindowState = import('./ls/workbench/common/desktopTypes.js').WindowState;
type WindowStateListener = import('./ls/workbench/common/desktopTypes.js').WindowStateListener;
type DesktopPreviewBounds = import('./ls/workbench/common/desktopTypes.js').PreviewBounds;
type DesktopPreviewState = import('./ls/workbench/common/desktopTypes.js').PreviewState;
type DesktopFetchChannel = import('./ls/workbench/common/desktopTypes.js').FetchChannel;
type DesktopPreviewReuseMode = import('./ls/workbench/common/desktopTypes.js').PreviewReuseMode;
type DesktopFetchStatus = import('./ls/workbench/common/desktopTypes.js').FetchStatus;
type ElectronInvoke = import('./ls/workbench/common/desktopTypes.js').ElectronInvoke;

interface Window {
  electronAPI?: import('./ls/workbench/common/desktopTypes.js').ElectronAPI;
}
