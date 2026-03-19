/// <reference types="vite/client" />

type DesktopArticle = import('./ls/base/parts/sandbox/common/desktopTypes.js').Article;
type DesktopBatchSource = import('./ls/base/parts/sandbox/common/desktopTypes.js').BatchSource;
type DesktopFetchBatchSource = import('./ls/base/parts/sandbox/common/desktopTypes.js').FetchBatchSource;
type DesktopFetchStrategy = import('./ls/base/parts/sandbox/common/desktopTypes.js').FetchStrategy;
type DesktopPdfDownloadResult = import('./ls/base/parts/sandbox/common/desktopTypes.js').PdfDownloadResult;
type DesktopDocxExportResult = import('./ls/base/parts/sandbox/common/desktopTypes.js').DocxExportResult;
type DesktopArticleDetailsModalLabels = import('./ls/base/parts/sandbox/common/desktopTypes.js').ArticleDetailsModalLabels;
type DesktopArticleDetailsModalState = import('./ls/base/parts/sandbox/common/desktopTypes.js').ArticleDetailsModalState;
type DesktopNativeModalState = import('./ls/base/parts/sandbox/common/desktopTypes.js').NativeModalState;
type DesktopStoredAppSettings = import('./ls/base/parts/sandbox/common/desktopTypes.js').StoredAppSettings;
type DesktopAppSettings = import('./ls/base/parts/sandbox/common/desktopTypes.js').AppSettings;
type AppCommandPayloadMap = import('./ls/base/parts/sandbox/common/desktopTypes.js').AppCommandPayloadMap;
type AppCommandResultMap = import('./ls/base/parts/sandbox/common/desktopTypes.js').AppCommandResultMap;
type AppCommand = import('./ls/base/parts/sandbox/common/desktopTypes.js').AppCommand;
type WindowControlAction = import('./ls/base/parts/sandbox/common/desktopTypes.js').WindowControlAction;
type WindowState = import('./ls/base/parts/sandbox/common/desktopTypes.js').WindowState;
type WindowStateListener = import('./ls/base/parts/sandbox/common/desktopTypes.js').WindowStateListener;
type DesktopPreviewBounds = import('./ls/base/parts/sandbox/common/desktopTypes.js').PreviewBounds;
type DesktopPreviewState = import('./ls/base/parts/sandbox/common/desktopTypes.js').PreviewState;
type DesktopFetchChannel = import('./ls/base/parts/sandbox/common/desktopTypes.js').FetchChannel;
type DesktopPreviewReuseMode = import('./ls/base/parts/sandbox/common/desktopTypes.js').PreviewReuseMode;
type DesktopFetchStatus = import('./ls/base/parts/sandbox/common/desktopTypes.js').FetchStatus;
type ElectronInvoke = import('./ls/base/parts/sandbox/common/desktopTypes.js').ElectronInvoke;

interface Window {
  electronAPI?: import('./ls/base/parts/sandbox/common/desktopTypes.js').ElectronAPI;
}
