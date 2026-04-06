import { toast } from 'ls/base/browser/ui/toast/toast';
import type { ElectronInvoke } from 'ls/base/parts/sandbox/common/desktopTypes';
import type { LocaleMessages } from 'language/locales';
import type { EditorPartProps } from 'ls/workbench/browser/parts/editor/editorPartView';
import { getEditorContentDisplayUrl } from 'ls/workbench/browser/parts/editor/editorUrlPresentation';
import type { WebContentNavigationModel } from 'ls/workbench/browser/webContentNavigationModel';

type EditorBrowserToolbarActionHandlers = Pick<
  EditorPartProps,
  | 'onOpenAddressBarSourceMenu'
  | 'onToolbarNavigateBack'
  | 'onToolbarNavigateForward'
  | 'onToolbarNavigateRefresh'
  | 'onToolbarHardReload'
  | 'onToolbarCopyCurrentUrl'
  | 'onToolbarClearBrowsingHistory'
  | 'onToolbarClearCookies'
  | 'onToolbarClearCache'
  | 'onToolbarAddressChange'
  | 'onToolbarAddressSubmit'
>;

type CreateEditorBrowserToolbarActionsParams = {
  browserUrl: string;
  electronRuntime: boolean;
  webContentRuntime: boolean;
  invokeDesktop: ElectronInvoke;
  setWebUrl: (value: string) => void;
  ui: LocaleMessages;
  webContentNavigationModel: WebContentNavigationModel;
  onOpenAddressBarSourceMenu: () => void;
  onToolbarAddressSubmit: () => void;
};

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('Clipboard copy command was rejected.');
    }
  } finally {
    textarea.remove();
  }
}

export function createEditorBrowserToolbarActions(
  params: CreateEditorBrowserToolbarActionsParams,
): EditorBrowserToolbarActionHandlers {
  const {
    browserUrl,
    electronRuntime,
    webContentRuntime,
    invokeDesktop,
    setWebUrl,
    ui,
    webContentNavigationModel,
    onOpenAddressBarSourceMenu,
    onToolbarAddressSubmit,
  } = params;

  return {
    onOpenAddressBarSourceMenu,
    onToolbarNavigateBack: () => {
      webContentNavigationModel.handleWebContentBack({
        webContentRuntime,
        ui,
      });
    },
    onToolbarNavigateForward: () => {
      webContentNavigationModel.handleWebContentForward({
        webContentRuntime,
        ui,
      });
    },
    onToolbarNavigateRefresh: () => {
      webContentNavigationModel.handleBrowserRefresh({
        electronRuntime,
        webContentRuntime,
        ui,
      });
    },
    onToolbarHardReload: () => {
      webContentNavigationModel.handleBrowserHardReload({
        electronRuntime,
        webContentRuntime,
        ui,
      });
    },
    onToolbarCopyCurrentUrl: async () => {
      const currentUrl = getEditorContentDisplayUrl(browserUrl);
      if (!currentUrl) {
        return;
      }

      try {
        await copyTextToClipboard(currentUrl);
        toast.success(ui.toastCurrentUrlCopied);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? 'Unknown clipboard error');
        toast.error(ui.toastCurrentUrlCopyFailed.replace('{error}', message));
      }
    },
    onToolbarClearBrowsingHistory: () => {
      try {
        webContentNavigationModel.handleWebContentClearHistory({
          webContentRuntime,
          ui,
        });
        if (webContentRuntime) {
          toast.success(ui.toastBrowsingHistoryCleared);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? 'Unknown history error');
        toast.error(ui.toastBrowsingHistoryClearFailed.replace('{error}', message));
      }
    },
    onToolbarClearCookies: async () => {
      try {
        const cleared = await invokeDesktop<boolean>('clear_web_cookies');
        if (!cleared) {
          throw new Error(ui.toastWebContentRuntimeUnavailable);
        }
        toast.success(ui.toastCookiesCleared);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? 'Unknown cookie error');
        toast.error(ui.toastCookiesClearFailed.replace('{error}', message));
      }
    },
    onToolbarClearCache: async () => {
      try {
        const cleared = await invokeDesktop<boolean>('clear_web_cache');
        if (!cleared) {
          throw new Error(ui.toastWebContentRuntimeUnavailable);
        }
        toast.success(ui.toastCacheCleared);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? 'Unknown cache error');
        toast.error(ui.toastCacheClearFailed.replace('{error}', message));
      }
    },
    onToolbarAddressChange: setWebUrl,
    onToolbarAddressSubmit,
  };
}
