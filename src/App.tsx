import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Braces,
  Bug,
  Check,
  Download,
  Eraser,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  History,
  RefreshCcw,
  RotateCcw,
  Settings,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Titlebar, { type TitlebarAction } from './titlebar';

type Article = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type PdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type AppSettingsPayload = {
  defaultDownloadDir: string | null;
};

type DesktopInvokeArgs = Record<string, unknown> | undefined;

const defaultArticleUrl = '';
const defaultHomepageUrl = 'https://arxiv.org/list/cs/new';
const minPanePercent = 20;
const maxPanePercent = 80;
const minPreviewZoom = 0.7;
const maxPreviewZoom = 1.2;
const defaultPreviewZoom = 0.9;

type PreviewBounds = { left: number; top: number; width: number; height: number };

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toCsvValue(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
}

function mergeArticles(incoming: Article[], existing: Article[]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];

  for (const item of [...incoming, ...existing]) {
    const key = `${item.sourceUrl}::${item.fetchedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function clampPanePercent(value: number): number {
  return Math.min(maxPanePercent, Math.max(minPanePercent, value));
}

function clampPreviewZoom(value: number): number {
  return Math.min(maxPreviewZoom, Math.max(minPreviewZoom, value));
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function withBaseHref(html: string, baseHref: string): string {
  const trimmedHtml = html.trim();
  if (!trimmedHtml) return '';

  const normalizedBase = baseHref.trim();
  if (!normalizedBase) return trimmedHtml;
  if (/<base\b/i.test(trimmedHtml)) return trimmedHtml;

  const baseTag = `<base href="${escapeHtmlAttribute(normalizedBase)}">`;

  if (/<head\b[^>]*>/i.test(trimmedHtml)) {
    return trimmedHtml.replace(/<head\b[^>]*>/i, (match) => `${match}\n    ${baseTag}`);
  }

  if (/<html\b[^>]*>/i.test(trimmedHtml)) {
    return trimmedHtml.replace(/<html\b[^>]*>/i, (match) => `${match}\n<head>${baseTag}</head>`);
  }

  return `<!doctype html><html><head>${baseTag}</head><body>${trimmedHtml}</body></html>`;
}

function toOriginHref(value: string): string {
  try {
    const parsed = new URL(value.trim());
    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return '';
  }
}

function extractBaseDomain(host: string): string {
  const normalized = host.toLowerCase().replace(/\.$/, '');
  const parts = normalized.split('.');
  if (parts.length <= 2) {
    return normalized;
  }

  const secondLevelTlds = new Set([
    'co.uk',
    'org.uk',
    'ac.uk',
    'gov.uk',
    'com.cn',
    'net.cn',
    'org.cn',
    'com.au',
    'net.au',
    'org.au',
    'co.jp',
    'com.br',
  ]);

  const tail2 = parts.slice(-2).join('.');
  const tail3 = parts.slice(-3).join('.');
  if (secondLevelTlds.has(tail2) && parts.length >= 3) {
    return tail3;
  }

  return tail2;
}

function detectHtmlBaseHref(html: string): string {
  const trimmedHtml = html.trim();
  if (!trimmedHtml) return '';

  const priorityPatterns = [
    /<link\b[^>]*\brel\s*=\s*['"]canonical['"][^>]*\bhref\s*=\s*['"]([^'"]+)['"][^>]*>/i,
    /<meta\b[^>]*\bproperty\s*=\s*['"]og:url['"][^>]*\bcontent\s*=\s*['"]([^'"]+)['"][^>]*>/i,
    /<meta\b[^>]*\bname\s*=\s*['"]citation_abstract_html_url['"][^>]*\bcontent\s*=\s*['"]([^'"]+)['"][^>]*>/i,
    /<meta\b[^>]*\bname\s*=\s*['"]citation_fulltext_html_url['"][^>]*\bcontent\s*=\s*['"]([^'"]+)['"][^>]*>/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = trimmedHtml.match(pattern);
    if (match?.[1]) {
      const origin = toOriginHref(match[1]);
      if (origin) return origin;
    }
  }

  const attributeUrlPattern = /\b(?:href|src|content)\s*=\s*['"](https?:\/\/[^'"]+)['"]/gi;
  const hostScores = new Map<string, number>();
  const domainScores = new Map<string, number>();
  const domainHosts = new Map<string, Set<string>>();
  let urlMatch = attributeUrlPattern.exec(trimmedHtml);

  while (urlMatch) {
    const rawUrl = urlMatch[1];
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.host.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      let score = 8;

      if (pathname.includes('/articles/') || pathname.includes('/article/') || pathname.includes('/doi/')) {
        score += 28;
      }
      if (pathname === '/' || pathname.endsWith('.html') || pathname.endsWith('.htm')) {
        score += 10;
      }
      if (host.startsWith('www.')) {
        score += 8;
      }
      if (
        /\.(js|mjs|css|woff|woff2|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp|avif|map|json|xml|rss)$/i.test(
          pathname,
        )
      ) {
        score -= 28;
      }
      if (
        /(?:^|\.)(cdn|static|assets?|img|images?|fonts?|js|cmp|consent|cookie|analytics|track|sgtm)(?:\.|$)/i.test(
          host,
        )
      ) {
        score -= 36;
      }
      if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
        score -= 50;
      }

      hostScores.set(host, (hostScores.get(host) ?? 0) + score);
      const baseDomain = extractBaseDomain(host);
      domainScores.set(baseDomain, (domainScores.get(baseDomain) ?? 0) + score);
      const hosts = domainHosts.get(baseDomain) ?? new Set<string>();
      hosts.add(host);
      domainHosts.set(baseDomain, hosts);
    } catch {
      // Ignore malformed URLs.
    }
    urlMatch = attributeUrlPattern.exec(trimmedHtml);
  }

  let bestDomain = '';
  let bestDomainScore = Number.NEGATIVE_INFINITY;
  for (const [domain, score] of domainScores.entries()) {
    if (score > bestDomainScore) {
      bestDomain = domain;
      bestDomainScore = score;
    }
  }

  if (bestDomain) {
    // Prefer site root over telemetry/cdn subdomains (e.g. cmp/sgtm/verify.nature.com -> www.nature.com).
    const hostsInDomain = domainHosts.get(bestDomain) ?? new Set<string>();
    if (bestDomain === 'nature.com' || hostsInDomain.size > 1 || hostsInDomain.has(bestDomain)) {
      if (bestDomain === 'nature.com') return 'https://www.nature.com/';
      const preferredHost = hostsInDomain.has(`www.${bestDomain}`) ? `www.${bestDomain}` : bestDomain;
      return `https://${preferredHost}/`;
    }
  }

  let bestHost = '';
  let bestHostScore = Number.NEGATIVE_INFINITY;
  for (const [host, score] of hostScores.entries()) {
    if (score > bestHostScore) {
      bestHost = host;
      bestHostScore = score;
    }
  }

  if (bestHost && bestHostScore > Number.NEGATIVE_INFINITY) {
    return `https://${bestHost}/`;
  }

  return '';
}

function sanitizeHtmlForStaticPreview(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<link\b[^>]*\brel\s*=\s*['"]preload['"][^>]*>/gi, '');
}

function toWebPreviewProxyUrl(targetUrl: string): string {
  return `/__preview_proxy?url=${encodeURIComponent(targetUrl)}`;
}

function tryGetHost(input: string): string {
  try {
    return new URL(input).host.toLowerCase();
  } catch {
    return '';
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<'reader' | 'settings'>('reader');
  const [webUrl, setWebUrl] = useState(defaultArticleUrl);
  const [browserUrl, setBrowserUrl] = useState(normalizeUrl(defaultArticleUrl));
  const [homepageUrl, setHomepageUrl] = useState(defaultHomepageUrl);
  const [batchLimit, setBatchLimit] = useState(5);
  const [sameDomainOnly, setSameDomainOnly] = useState(true);
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchEndDate, setBatchEndDate] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterJournal, setFilterJournal] = useState('');
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [leftPanePercent, setLeftPanePercent] = useState(58);
  const [contentGridWidth, setContentGridWidth] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(defaultPreviewZoom);
  const [pdfDownloadDir, setPdfDownloadDir] = useState('');
  const [readingModeEnabled, setReadingModeEnabled] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [webDebugOpen, setWebDebugOpen] = useState(false);
  const [webPreviewSource, setWebPreviewSource] = useState<'url' | 'html'>('url');
  const [webPreviewImplementation, setWebPreviewImplementation] = useState<'embed' | 'overlay'>('embed');
  const [webPreviewHtml, setWebPreviewHtml] = useState('');
  const [webPreviewHtmlBaseUrl, setWebPreviewHtmlBaseUrl] = useState('');
  const [webPreviewStaticMode, setWebPreviewStaticMode] = useState(true);
  const [webUrlProxyEnabled, setWebUrlProxyEnabled] = useState(import.meta.env.DEV);
  const [webOverlayBounds, setWebOverlayBounds] = useState<PreviewBounds | null>(null);

  const [isSingleLoading, setIsSingleLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const webviewHostRef = useRef<HTMLDivElement | null>(null);
  const contentGridRef = useRef<HTMLElement | null>(null);
  const splitStartRef = useRef<{ x: number; leftPercent: number } | null>(null);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const electronRuntime = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return typeof window.electronAPI?.invoke === 'function';
  }, []);
  const desktopRuntime = electronRuntime;
  const invokeDesktop = useCallback(
    async <T,>(command: string, args?: DesktopInvokeArgs): Promise<T> => {
      if (window.electronAPI?.invoke) {
        return window.electronAPI.invoke<T>(command, args);
      }
      throw new Error('当前运行环境不支持该命令');
    },
    [],
  );
  const contentGridStyle = useMemo(
    () =>
      ({
        '--left-pane': contentGridWidth
          ? `${Math.round((contentGridWidth * leftPanePercent) / 100)}px`
          : `${leftPanePercent}%`,
      }) as CSSProperties,
    [contentGridWidth, leftPanePercent],
  );

  const filteredArticles = useMemo(() => {
    const keyword = filterKeyword.trim().toLowerCase();
    const journal = filterJournal.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesJournal = !journal || article.sourceUrl.toLowerCase().includes(journal);
      if (!matchesJournal) return false;

      if (!keyword) return true;

      const searchable = [
        article.title,
        article.doi ?? '',
        article.authors.join(' '),
        article.abstractText ?? '',
        article.publishedAt ?? '',
        article.sourceUrl,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [articles, filterKeyword, filterJournal]);

  const hasData = articles.length > 0;
  const hasVisibleData = filteredArticles.length > 0;
  const detectedHtmlBaseUrl = useMemo(() => detectHtmlBaseHref(webPreviewHtml), [webPreviewHtml]);
  const previewNoiseHint = useMemo(() => {
    if (activePage !== 'reader') return null;

    if (webPreviewSource === 'url' && browserUrl && webUrlProxyEnabled) {
      const targetHost = tryGetHost(browserUrl);
      const localHost = typeof window !== 'undefined' ? window.location.host.toLowerCase() : '';
      if (targetHost && localHost && targetHost !== localHost) {
        return '代理预览下出现 CORS / 字体 / cookie / XHR 报错通常属于目标站点策略噪音，可忽略。';
      }
    }

    if (webPreviewSource === 'html' && webPreviewHtml.trim()) {
      if (!webPreviewStaticMode) {
        return 'HTML 调试已允许脚本执行，第三方脚本可能触发 cookie / CORS 报错，通常不影响结构排查。';
      }

      const hasRootStaticAssets = /(?:src|href)\s*=\s*["']\/static\//i.test(webPreviewHtml);
      const hasBaseUrl = Boolean(webPreviewHtmlBaseUrl.trim() || detectedHtmlBaseUrl || browserUrl);
      if (hasRootStaticAssets && !hasBaseUrl) {
        return 'HTML 含 /static 资源但未设置 Base URL，控制台可能出现 404 / CORS 噪音。';
      }
    }

    return null;
  }, [
    activePage,
    browserUrl,
    detectedHtmlBaseUrl,
    webPreviewHtml,
    webPreviewHtmlBaseUrl,
    webPreviewSource,
    webPreviewStaticMode,
    webUrlProxyEnabled,
  ]);

  const statusBarState = useMemo(() => {
    if (error) {
      return { label: '错误', message: error, className: 'status-bar is-error' };
    }
    if (status) {
      return { label: '状态', message: status, className: 'status-bar' };
    }
    if (previewNoiseHint) {
      return { label: '提示', message: previewNoiseHint, className: 'status-bar is-warning' };
    }
    return { label: '状态', message: '就绪', className: 'status-bar' };
  }, [error, previewNoiseHint, status]);
  const hasWebPreviewContent = useMemo(() => {
    if (webPreviewSource === 'url') {
      return Boolean(browserUrl);
    }
    return Boolean(webPreviewHtml.trim());
  }, [browserUrl, webPreviewHtml, webPreviewSource]);

  const computedHostBounds = useCallback((): PreviewBounds | null => {
    const host = webviewHostRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 2 || rect.height <= 2) return null;

    // `getBoundingClientRect()` returns logical (CSS) pixels.
    // Use inward rounding so the native preview never exceeds the host container.
    const logicalLeft = Math.max(0, Math.ceil(rect.left));
    const logicalTop = Math.max(0, Math.ceil(rect.top));
    const logicalRight = Math.max(logicalLeft + 1, Math.floor(rect.right));
    const logicalBottom = Math.max(logicalTop + 1, Math.floor(rect.bottom));

    return {
      left: logicalLeft,
      top: logicalTop,
      width: logicalRight - logicalLeft,
      height: logicalBottom - logicalTop,
    };
  }, []);

  const webPreviewSandbox = useMemo(() => {
    if (webPreviewSource !== 'html') {
      return 'allow-forms allow-scripts allow-same-origin';
    }
    return webPreviewStaticMode ? 'allow-same-origin' : 'allow-scripts allow-same-origin';
  }, [webPreviewSource, webPreviewStaticMode]);

  const webPreviewSrcDoc = useMemo(() => {
    if (webPreviewSource !== 'html') return '';
    const baseHref = webPreviewHtmlBaseUrl.trim() || browserUrl || detectedHtmlBaseUrl;
    const htmlForPreview = webPreviewStaticMode
      ? sanitizeHtmlForStaticPreview(webPreviewHtml)
      : webPreviewHtml;
    return withBaseHref(htmlForPreview, baseHref);
  }, [
    browserUrl,
    detectedHtmlBaseUrl,
    webPreviewHtml,
    webPreviewHtmlBaseUrl,
    webPreviewSource,
    webPreviewStaticMode,
  ]);

  const webPreviewUrlSrc = useMemo(() => {
    if (!browserUrl) return '';
    if (!webUrlProxyEnabled) return browserUrl;
    return toWebPreviewProxyUrl(browserUrl);
  }, [browserUrl, webUrlProxyEnabled]);

  const syncWebOverlayBounds = useCallback(() => {
    const nextBounds = computedHostBounds();
    setWebOverlayBounds(nextBounds);
  }, [computedHostBounds]);

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.windowControls) {
      setIsWindowMaximized(false);
      return;
    }

    let mounted = true;
    const controls = window.electronAPI.windowControls;

    void controls
      .getState()
      .then((state) => {
        if (mounted) {
          setIsWindowMaximized(Boolean(state.isMaximized));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsWindowMaximized(false);
        }
      });

    const unsubscribe = controls.onStateChange((state) => {
      setIsWindowMaximized(Boolean(state.isMaximized));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [electronRuntime]);

  useEffect(() => {
    if (activePage !== 'reader') return;

    const grid = contentGridRef.current;
    if (!grid) return;

    const update = () => {
      setContentGridWidth(grid.getBoundingClientRect().width);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(grid);

    return () => {
      observer.disconnect();
    };
  }, [activePage]);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);

      try {
        if (desktopRuntime) {
          const loaded = await invokeDesktop<AppSettingsPayload>('load_settings');
          setPdfDownloadDir(loaded.defaultDownloadDir ?? '');
          return;
        }

        const raw = window.localStorage.getItem('journal-reader-settings');
        if (!raw) {
          setPdfDownloadDir('');
          return;
        }

        const parsed = JSON.parse(raw) as Partial<AppSettingsPayload>;
        setPdfDownloadDir(typeof parsed.defaultDownloadDir === 'string' ? parsed.defaultDownloadDir : '');
      } catch (loadError) {
        setError(`加载设置失败：${errorMessage(loadError)}`);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    void loadSettings();
  }, [desktopRuntime, invokeDesktop]);

  useEffect(() => {
    if (activePage !== 'reader') return;
    const shouldTrackBounds = webDebugOpen || webPreviewImplementation === 'overlay';
    if (!shouldTrackBounds) {
      setWebOverlayBounds(null);
      return;
    }

    const host = webviewHostRef.current;
    if (!host) return;

    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        syncWebOverlayBounds();
      });
    };

    schedule();

    const observer = new ResizeObserver(schedule);
    observer.observe(host);

    window.addEventListener('resize', schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [activePage, syncWebOverlayBounds, webDebugOpen, webPreviewImplementation]);

  useEffect(() => {
    if (!isResizing) return;

    const onPointerMove = (event: PointerEvent) => {
      const start = splitStartRef.current;
      const grid = contentGridRef.current;
      if (!start || !grid) return;

      const rect = grid.getBoundingClientRect();
      if (rect.width <= 0) return;

      const deltaX = event.clientX - start.x;
      const next = start.leftPercent + (deltaX / rect.width) * 100;
      setLeftPanePercent(clampPanePercent(next));
    };

    const onPointerUp = () => {
      splitStartRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isResizing) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  const handleSplitterPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const grid = contentGridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    if (rect.width <= 0) return;

    splitStartRef.current = {
      x: event.clientX,
      leftPercent: leftPanePercent,
    };
    setIsResizing(true);
    event.preventDefault();
  };

  const handleSplitterKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setLeftPanePercent((prev) => clampPanePercent(prev - 2));
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      setLeftPanePercent((prev) => clampPanePercent(prev + 2));
      event.preventDefault();
      return;
    }

    if (event.key === 'Home') {
      setLeftPanePercent(minPanePercent);
      event.preventDefault();
      return;
    }

    if (event.key === 'End') {
      setLeftPanePercent(maxPanePercent);
      event.preventDefault();
    }
  };

  const handleNavigateWeb = () => {
    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      setError('请先输入文章链接。');
      return;
    }

    setWebPreviewSource('url');

    setError(null);
    setBrowserUrl(normalized);
  };

  const handleUseDetectedHtmlBaseUrl = () => {
    const nextBase = browserUrl || detectedHtmlBaseUrl;
    if (!nextBase) {
      setStatus('未识别到可用 Base URL，请手动填写（例如 https://www.nature.com/）。');
      setError(null);
      return;
    }

    setWebPreviewHtmlBaseUrl(nextBase);
    setStatus(`已设置 Base URL：${nextBase}`);
    setError(null);
  };

  const handleClearPreviewHtml = () => {
    if (!webPreviewHtml.trim()) {
      setStatus('HTML 内容已为空。');
      setError(null);
      return;
    }

    setWebPreviewHtml('');
    setStatus('已清空 HTML 内容。');
    setError(null);
  };

  const handleBrowserRefresh = () => {
    setIframeReloadKey((prev) => prev + 1);
  };

  const handleClosePreview = () => {
    if (!browserUrl) return;
    setStatus(null);
    setError(null);
    setBrowserUrl('');
  };

  const handlePreviewNavigate = async (direction: 'back' | 'forward') => {
    if (!browserUrl) return;
    setStatus(
      direction === 'back'
        ? 'Electron 嵌入预览暂不支持后退。'
        : 'Electron 嵌入预览暂不支持前进。',
    );
    setError(null);
  };

  const handleChoosePdfDownloadDir = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式不支持系统目录选择，请在桌面端运行。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      const selected = await invokeDesktop<string | null>('pick_download_directory');
      if (!selected) {
        setStatus('未选择目录，保持当前设置。');
        return;
      }

      setPdfDownloadDir(selected);
      setStatus(`已选择目录：${selected}（记得点击“保存设置”）`);
    } catch (pickError) {
      setError(`选择目录失败：${errorMessage(pickError)}`);
    }
  };

  const handleSaveSettings = async () => {
    setStatus(null);
    setError(null);
    setIsSettingsSaving(true);

    const nextDir = pdfDownloadDir.trim();
    const payload: AppSettingsPayload = {
      defaultDownloadDir: nextDir || null,
    };

    try {
      if (desktopRuntime) {
        const saved = await invokeDesktop<AppSettingsPayload>('save_settings', { settings: payload });
        setPdfDownloadDir(saved.defaultDownloadDir ?? '');
      } else {
        window.localStorage.setItem('journal-reader-settings', JSON.stringify(payload));
        setPdfDownloadDir(nextDir);
      }

      setStatus(
        nextDir
          ? `设置已保存，默认下载目录：${nextDir}`
          : '设置已保存，默认将使用系统 Downloads 目录',
      );
    } catch (saveError) {
      setError(`保存设置失败：${errorMessage(saveError)}`);
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleResetDownloadDir = () => {
    setPdfDownloadDir('');
    setStatus('已清空目录输入，点击“保存设置”后将恢复系统 Downloads 目录。');
    setError(null);
  };

  const handlePreviewDownloadPdf = async () => {
    if (!browserUrl) return;

    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式不支持本地 PDF 下载，请在桌面端运行。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      const result = await invokeDesktop<PdfDownloadResult>('preview_download_pdf', {
        pageUrl: browserUrl,
        customDownloadDir: pdfDownloadDir.trim() || null,
      });
      setStatus(`PDF 已下载到：${result.filePath}（来源：${result.sourceUrl}）`);
    } catch (downloadError) {
      setError(`下载 PDF 失败：${errorMessage(downloadError)}`);
    }
  };

  const handleZoomOut = () => {
    setPreviewZoom((prev) => clampPreviewZoom(Number((prev - 0.1).toFixed(2))));
  };

  const handleZoomIn = () => {
    setPreviewZoom((prev) => clampPreviewZoom(Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomReset = () => {
    setPreviewZoom(1);
  };

  const handleToggleReadingMode = (nextValue?: boolean) => {
    setReadingModeEnabled((prev) => (typeof nextValue === 'boolean' ? nextValue : !prev));
    setStatus('Electron 版本暂未实现深度阅读注入，此开关仅保留为实验项。');
    setError(null);
  };

  const handleFetchSingle = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持抓取（需要桌面端后端命令）。请在桌面端运行或先只用左侧预览调试布局。');
      return;
    }

    const normalized = normalizeUrl(webUrl);
    if (!normalized) {
      setError('请先输入文章链接。');
      return;
    }

    setIsSingleLoading(true);
    setStatus(null);
    setError(null);
    setBrowserUrl(normalized);

    try {
      const fetched = await invokeDesktop<Article>('fetch_article', { url: normalized });
      setArticles((prev) => mergeArticles([fetched], prev));
      setStatus('单篇抓取完成并已写入历史。');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`单篇抓取失败：${message}`);
    } finally {
      setIsSingleLoading(false);
    }
  };

  const handleFetchLatestBatch = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持批量抓取（需要桌面端后端命令）。请在桌面端运行。');
      return;
    }

    const normalized = normalizeUrl(homepageUrl);
    if (!normalized) {
      setError('请先输入期刊首页链接。');
      return;
    }

    if (batchStartDate && batchEndDate && batchStartDate > batchEndDate) {
      setError('开始日期不能晚于结束日期。');
      return;
    }

    setIsBatchLoading(true);
    setStatus(null);
    setError(null);

    try {
      const fetched = await invokeDesktop<Article[]>('fetch_latest_articles', {
        homepageUrl: normalized,
        limit: batchLimit,
        sameDomainOnly,
        startDate: batchStartDate || null,
        endDate: batchEndDate || null,
      });

      setArticles((prev) => mergeArticles(fetched, prev));
      setStatus(`批量抓取完成：${fetched.length} 篇，已写入历史。`);

      if (fetched[0]) {
        setWebUrl(fetched[0].sourceUrl);
        setBrowserUrl(fetched[0].sourceUrl);
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`批量抓取失败：${message}`);
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持读取历史（需要桌面端本地存储）。请在桌面端运行。');
      return;
    }

    setIsHistoryLoading(true);
    setStatus(null);
    setError(null);

    try {
      const history = await invokeDesktop<Article[]>('list_history', { limit: 1000 });
      setArticles(history);
      setStatus(`历史加载完成：${history.length} 条。`);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`读取历史失败：${message}`);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式暂不支持清空历史（需要桌面端本地存储）。请在桌面端运行。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      await invokeDesktop('clear_history');
      setArticles([]);
      setStatus('历史记录已清空。');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`清空历史失败：${message}`);
    }
  };

  const handleExportJson = () => {
    if (!hasVisibleData) return;
    const content = JSON.stringify(filteredArticles, null, 2);
    downloadFile(content, 'articles-filtered.json', 'application/json;charset=utf-8');
  };

  const handleExportCsv = () => {
    if (!hasVisibleData) return;

    const header = ['title', 'doi', 'authors', 'abstract', 'published_at', 'source_url', 'fetched_at'];
    const rows = filteredArticles.map((article) => {
      const authors = article.authors.join('; ');
      return [
        toCsvValue(article.title),
        toCsvValue(article.doi ?? ''),
        toCsvValue(authors),
        toCsvValue(article.abstractText ?? ''),
        toCsvValue(article.publishedAt ?? ''),
        toCsvValue(article.sourceUrl),
        toCsvValue(article.fetchedAt),
      ].join(',');
    });

    const content = [header.join(','), ...rows].join('\n');
    downloadFile(content, 'articles-filtered.csv', 'text/csv;charset=utf-8');
  };

  const handleResetFilters = () => {
    setFilterKeyword('');
    setFilterJournal('');
  };

  const handleOpenDevtools = async (target: 'app' | 'preview') => {
    if (!desktopRuntime) {
      setStatus('浏览器 Web 模式请直接使用浏览器开发者工具（F12 / ⌥⌘I）。');
      return;
    }

    setStatus(null);
    setError(null);

    try {
      await invokeDesktop('open_devtools', { target });
      setStatus(target === 'app' ? '已打开本程序开发者工具。' : '已打开网页预览开发者工具。');
    } catch (openError) {
      setError(`打开开发者工具失败：${errorMessage(openError)}`);
    }
  };

  const previewModeLabel = electronRuntime ? 'Electron 嵌入 iframe' : '浏览器 iframe';
  const handleWindowControl = (action: TitlebarAction) => {
    window.electronAPI?.windowControls?.perform(action);
  };

  return (
    <div className="app-window">
      {electronRuntime ? (
        <Titlebar isWindowMaximized={isWindowMaximized} onWindowControl={handleWindowControl} />
      ) : null}

      <div className="app-shell">
      <header className="toolbar">
        <div className="menu-bar">
          <span className="menu-title">浏览器</span>
          <Tabs.Root
            className="menu-tabs-root"
            value={activePage}
            onValueChange={(value: string) => setActivePage(value === 'settings' ? 'settings' : 'reader')}
          >
            <Tabs.List className="menu-tabs" aria-label="页面切换">
              <Tabs.Trigger className="menu-tab-btn" value="reader">
                <BookOpen size={15} />
                阅读
              </Tabs.Trigger>
              <Tabs.Trigger className="menu-tab-btn" value="settings">
                <Settings size={15} />
                设置
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          {activePage === 'reader' ? (
            <div className="menu-actions">
              <button
                className="icon-btn"
                type="button"
                onClick={handleLoadHistory}
                disabled={isHistoryLoading || isSingleLoading || isBatchLoading}
                title={isHistoryLoading ? '加载历史中' : '加载历史'}
                aria-label={isHistoryLoading ? '加载历史中' : '加载历史'}
              >
                <History size={16} />
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={handleClearHistory}
                disabled={isSingleLoading || isBatchLoading}
                title="清空历史"
                aria-label="清空历史"
              >
                <Eraser size={16} />
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={handleExportJson}
                disabled={!hasVisibleData}
                title="导出筛选 JSON"
                aria-label="导出筛选 JSON"
              >
                <Braces size={16} />
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={handleExportCsv}
                disabled={!hasVisibleData}
                title="导出筛选 CSV"
                aria-label="导出筛选 CSV"
              >
                <FileSpreadsheet size={16} />
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setArticles([])}
                disabled={!hasData}
                title="清空右侧列表"
                aria-label="清空右侧列表"
              >
                <Eraser size={16} />
              </button>
            </div>
          ) : null}
          <button
            className="icon-btn"
            type="button"
            onClick={() => void handleOpenDevtools('app')}
            title="应用 DevTools"
            aria-label="应用 DevTools"
          >
            <AppWindow size={16} />
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={() => void handleOpenDevtools('preview')}
            title="预览 DevTools"
            aria-label="预览 DevTools"
          >
            <Bug size={16} />
          </button>
          {activePage === 'reader' ? (
            <>
              <div className="menu-fetch-strip">
                <input
                  className="url-input menu-fetch-input"
                  type="text"
                  value={webUrl}
                  onChange={(event) => setWebUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleNavigateWeb();
                    }
                  }}
                  placeholder="文章链接，例如 https://example.com/paper"
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={handleNavigateWeb}
                  disabled={isSingleLoading || isBatchLoading}
                  title="网页跳转"
                  aria-label="网页跳转"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleFetchSingle}
                  disabled={isSingleLoading || isBatchLoading}
                >
                  {isSingleLoading ? '抓取中...' : '抓取当前文章'}
                </button>
              </div>

              <div className="menu-fetch-strip">
                <input
                  className="url-input menu-fetch-input"
                  type="text"
                  value={homepageUrl}
                  onChange={(event) => setHomepageUrl(event.target.value)}
                  placeholder="期刊首页 / 最新文章页链接"
                />
                <label className="inline-field" htmlFor="batch-limit">
                  数量
                  <input
                    id="batch-limit"
                    className="number-input"
                    type="number"
                    min={1}
                    max={20}
                    value={batchLimit}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(parsed)) {
                        setBatchLimit(1);
                        return;
                      }
                      setBatchLimit(Math.min(20, Math.max(1, parsed)));
                    }}
                  />
                </label>
                <label className="inline-field checkbox-field" htmlFor="same-domain-only">
                  <Checkbox.Root
                    id="same-domain-only"
                    className="radix-checkbox"
                    checked={sameDomainOnly}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      setSameDomainOnly(checked === true)
                    }
                  >
                    <Checkbox.Indicator className="radix-checkbox-indicator">
                      <Check size={12} />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  仅同域
                </label>
                <label className="inline-field" htmlFor="batch-start-date">
                  开始日期
                  <input
                    id="batch-start-date"
                    className="date-input"
                    type="date"
                    value={batchStartDate}
                    onChange={(event) => setBatchStartDate(event.target.value)}
                  />
                </label>
                <label className="inline-field" htmlFor="batch-end-date">
                  结束日期
                  <input
                    id="batch-end-date"
                    className="date-input"
                    type="date"
                    value={batchEndDate}
                    onChange={(event) => setBatchEndDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleFetchLatestBatch}
                  disabled={isSingleLoading || isBatchLoading}
                >
                  {isBatchLoading ? '批量抓取中...' : '抓取首页最新'}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {activePage === 'reader' ? (
          <>
            <div className="toolbar-row">
              <input
                className="filter-input"
                type="text"
                value={filterKeyword}
                onChange={(event) => setFilterKeyword(event.target.value)}
                placeholder="关键词过滤（标题/DOI/作者/摘要）"
              />
              <input
                className="filter-input"
                type="text"
                value={filterJournal}
                onChange={(event) => setFilterJournal(event.target.value)}
                placeholder="期刊/来源过滤（URL片段）"
              />
              <button
                className="icon-btn"
                type="button"
                onClick={handleResetFilters}
                disabled={!filterKeyword && !filterJournal}
                title="重置过滤"
                aria-label="重置过滤"
              >
                <RotateCcw size={16} />
              </button>
              <span className="count">
                显示 {filteredArticles.length} / 总计 {articles.length}
              </span>
            </div>
          </>
        ) : (
          <div className="toolbar-row settings-toolbar-row">
            <span className="settings-toolbar-text">在设置页配置默认下载目录，保存后将自动用于后续 PDF 下载。</span>
          </div>
        )}

      </header>

      {activePage === 'reader' ? (
        <main ref={contentGridRef} className={`content-grid ${isResizing ? 'is-resizing' : ''}`} style={contentGridStyle}>
          <section className="panel web-panel">
            <div className="panel-title web-panel-title">
              <div className="web-nav-row">
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => void handlePreviewNavigate('back')}
                  disabled={!browserUrl}
                  title="后退（暂不支持）"
                  aria-label="后退"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => void handlePreviewNavigate('forward')}
                  disabled={!browserUrl}
                  title="前进（暂不支持）"
                  aria-label="前进"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => void handlePreviewDownloadPdf()}
                  disabled={!browserUrl || !desktopRuntime}
                  title={desktopRuntime ? '下载 PDF' : '仅桌面端可用'}
                  aria-label="下载 PDF"
                >
                  <Download size={16} />
                </button>
	                <button
	                  className="icon-btn"
	                  type="button"
	                  onClick={handleBrowserRefresh}
	                  disabled={!browserUrl}
	                  title="刷新"
	                  aria-label="刷新"
	                >
	                  <RefreshCcw size={16} />
	                </button>
	                <button
	                  className="icon-btn"
	                  type="button"
	                  onClick={handleClosePreview}
	                  disabled={!browserUrl}
	                  title="关闭预览"
	                  aria-label="关闭预览"
	                >
	                  <Eraser size={16} />
	                </button>
	                <div className="zoom-controls">
	                  <button
	                    className="icon-btn"
	                    type="button"
	                    onClick={handleZoomOut}
                    disabled={!browserUrl || previewZoom <= minPreviewZoom}
                    title="缩小"
                    aria-label="缩小"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button type="button" onClick={handleZoomReset} disabled={!browserUrl}>
                    {Math.round(previewZoom * 100)}%
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={handleZoomIn}
                    disabled={!browserUrl || previewZoom >= maxPreviewZoom}
                    title="放大"
                    aria-label="放大"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <span
                    className="reading-switch-wrap"
                    title={
                      readingModeEnabled ? '关闭深度阅读（实验）' : '开启深度阅读（实验）'
                    }
                  >
                    <BookOpen size={16} />
                    <Switch.Root
                      className="reading-switch"
                      checked={readingModeEnabled}
                      onCheckedChange={(checked: boolean) => handleToggleReadingMode(checked)}
                      disabled={!browserUrl}
                      aria-label={readingModeEnabled ? '关闭深度阅读' : '开启深度阅读'}
                    >
                      <Switch.Thumb className="reading-switch-thumb" />
                    </Switch.Root>
                  </span>
                </div>
                <button
                  type="button"
                  className={webDebugOpen ? 'icon-btn debug-btn is-active' : 'icon-btn debug-btn'}
                  onClick={() => setWebDebugOpen((prev) => !prev)}
                  title={webDebugOpen ? '关闭 Web 调试' : '打开 Web 调试'}
                  aria-label={webDebugOpen ? '关闭 Web 调试' : '打开 Web 调试'}
                >
                  <Bug size={16} />
                </button>
                <span className="web-mode-tag">
                  预览模式：{previewModeLabel}
                </span>
                <input
                  className="web-current-url"
                  type="text"
                  value={browserUrl}
                  placeholder="未设置预览地址"
                  readOnly
                  aria-label="当前预览地址"
                />
              </div>
              {webDebugOpen ? (
                <div className="web-debug-panel">
                  <div className="web-debug-row">
                    <span className="web-debug-label">来源</span>
                    <RadioGroup.Root
                      className="web-debug-inline-group"
                      value={webPreviewSource}
                      onValueChange={(value: string) => setWebPreviewSource(value === 'html' ? 'html' : 'url')}
                      orientation="horizontal"
                      aria-label="预览来源"
                    >
                      <RadioGroup.Item className="web-debug-pill" value="url">
                        URL
                      </RadioGroup.Item>
                      <RadioGroup.Item className="web-debug-pill" value="html">
                        HTML（srcdoc）
                      </RadioGroup.Item>
                    </RadioGroup.Root>
                    <span className="web-debug-spacer" />
                    <span className="web-debug-label">渲染</span>
                    <RadioGroup.Root
                      className="web-debug-inline-group"
                      value={webPreviewImplementation}
                      onValueChange={(value: string) =>
                        setWebPreviewImplementation(value === 'overlay' ? 'overlay' : 'embed')
                      }
                      orientation="horizontal"
                      aria-label="预览渲染方式"
                    >
                      <RadioGroup.Item className="web-debug-pill" value="embed">
                        嵌入
                      </RadioGroup.Item>
                      <RadioGroup.Item className="web-debug-pill" value="overlay">
                        Overlay（模拟原生）
                      </RadioGroup.Item>
                    </RadioGroup.Root>
                  </div>

                  {webPreviewSource === 'url' ? (
                    <div className="web-debug-row">
                      <label className="web-debug-option">
                        <Checkbox.Root
                          className="radix-checkbox"
                          checked={webUrlProxyEnabled}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            setWebUrlProxyEnabled(checked === true)
                          }
                        >
                          <Checkbox.Indicator className="radix-checkbox-indicator">
                            <Check size={12} />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        Web 代理模式（推荐，绕过 iframe 拒绝策略）
                      </label>
                      <span>
                        当前 URL 预览地址：{webPreviewUrlSrc || '未设置'}
                      </span>
                    </div>
                  ) : null}

                  {webPreviewSource === 'html' ? (
                    <>
                      <div className="web-debug-row">
                        <span className="web-debug-label">Base URL</span>
                        <input
                          className="web-debug-input"
                          type="text"
                          placeholder={browserUrl ? `留空则使用当前 URL：${browserUrl}` : 'https://www.nature.com/'}
                          value={webPreviewHtmlBaseUrl}
                          onChange={(event) => setWebPreviewHtmlBaseUrl(event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleUseDetectedHtmlBaseUrl}
                          disabled={!browserUrl && !detectedHtmlBaseUrl}
                        >
                          用当前/识别 URL
                        </button>
                        <button type="button" onClick={handleClearPreviewHtml} disabled={!webPreviewHtml.trim()}>
                          清空 HTML
                        </button>
                      </div>
                      <div className="web-debug-row">
                        <label className="web-debug-option">
                          <Checkbox.Root
                            className="radix-checkbox"
                            checked={webPreviewStaticMode}
                            onCheckedChange={(checked: boolean | 'indeterminate') =>
                              setWebPreviewStaticMode(checked === true)
                            }
                          >
                            <Checkbox.Indicator className="radix-checkbox-indicator">
                              <Check size={12} />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          静态调试模式（移除 script，减少控制台噪音）
                        </label>
                        <span>
                          自动识别 Base URL：{detectedHtmlBaseUrl || '未识别'}
                        </span>
                      </div>
                      {!webPreviewHtmlBaseUrl.trim() && !browserUrl && !detectedHtmlBaseUrl ? (
                        <div className="web-debug-hint">
                          <span>
                            当前没有 Base URL，`/static/...` 资源会指向本地开发地址。建议填写 Base URL（如
                            `https://www.nature.com/`）。
                          </span>
                        </div>
                      ) : null}
                      <textarea
                        className="web-debug-textarea"
                        value={webPreviewHtml}
                        onChange={(event) => setWebPreviewHtml(event.target.value)}
                        placeholder="把抓到的整页 HTML（包含 <html>…</html>）粘贴到这里，然后在左侧预览查看是否超出容器。"
                        rows={10}
                      />
                    </>
                  ) : null}

                  <div className="web-debug-hint">
                    <span>
                      Host bounds（CSS px）：{webOverlayBounds ? `${webOverlayBounds.left},${webOverlayBounds.top} ${webOverlayBounds.width}×${webOverlayBounds.height}` : '未计算'}
                    </span>
                    <span>
                      DPR：{typeof window !== 'undefined' ? window.devicePixelRatio : 1}
                    </span>
                    <span>
                      Viewport：{typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '-'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="web-frame-container">
              {webPreviewSource === 'url' && browserUrl ? (
                <div className="web-frame-note">
                  <span>
                    当前是 Electron 嵌入 iframe 预览。
                    {webUrlProxyEnabled
                      ? '已启用 Web 代理模式（由本地开发服务器转发页面），可绕过多数 X-Frame-Options / frame-ancestors 限制。'
                      : '若目标站点设置了 X-Frame-Options / frame-ancestors（例如 Nature），浏览器会拒绝嵌入，这是站点策略，不是跳转失败。'}
                  </span>
                  {previewNoiseHint ? (
                    <span className="web-frame-note-warning">
                      提示：{previewNoiseHint}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn web-frame-note-btn"
                    onClick={() => setWebUrlProxyEnabled((prev) => !prev)}
                    title={webUrlProxyEnabled ? '关闭 Web 代理' : '启用 Web 代理'}
                    aria-label={webUrlProxyEnabled ? '关闭 Web 代理' : '启用 Web 代理'}
                  >
                    {webUrlProxyEnabled ? '关闭 Web 代理' : '启用 Web 代理'}
                  </button>
                  <button
                    type="button"
                    className="icon-btn web-frame-note-btn"
                    onClick={() => {
                      window.open(browserUrl, '_blank', 'noopener,noreferrer');
                    }}
                    title="新标签打开"
                    aria-label="新标签打开"
                  >
                    <ExternalLink size={15} />
                    新标签打开
                  </button>
                  <button
                    type="button"
                    className="icon-btn web-frame-note-btn"
                    onClick={() => setWebPreviewSource('html')}
                    title="切换到 HTML 调试"
                    aria-label="切换到 HTML 调试"
                  >
                    切换到 HTML 调试
                  </button>
                </div>
              ) : null}
              <div ref={webviewHostRef} className="native-webview-host">
                {webPreviewImplementation === 'embed' && hasWebPreviewContent ? (
                  <iframe
                    key={`${webPreviewSource}-${browserUrl}-${iframeReloadKey}`}
                    className="web-frame"
                    {...(webPreviewSource === 'html'
                      ? { srcDoc: webPreviewSrcDoc }
                      : { src: webPreviewUrlSrc || browserUrl })}
                    title="Web Preview"
                    sandbox={webPreviewSandbox}
                    scrolling="yes"
                  />
                ) : hasWebPreviewContent ? (
                  <div className="empty-state">已启用 Overlay 预览（iframe 将以浮层方式渲染）。</div>
              ) : (
                  <div className="empty-state">请输入链接或粘贴 HTML 后查看网页。</div>
                )}
              </div>
            </div>
          </section>

          {webPreviewImplementation === 'overlay' && hasWebPreviewContent && webOverlayBounds
            ? createPortal(
                <>
                  <iframe
                    key={`overlay-${webPreviewSource}-${browserUrl}-${iframeReloadKey}`}
                    className="web-frame web-frame-overlay"
                    style={{
                      left: webOverlayBounds.left,
                      top: webOverlayBounds.top,
                      width: webOverlayBounds.width,
                      height: webOverlayBounds.height,
                      pointerEvents: webDebugOpen ? 'none' : 'auto',
                    }}
                    {...(webPreviewSource === 'html'
                      ? { srcDoc: webPreviewSrcDoc }
                      : { src: webPreviewUrlSrc || browserUrl })}
                    title="Web Preview Overlay"
                    sandbox={webPreviewSandbox}
                    scrolling="yes"
                  />
                  <div
                    className="web-frame-overlay-outline"
                    style={{
                      left: webOverlayBounds.left,
                      top: webOverlayBounds.top,
                      width: webOverlayBounds.width,
                      height: webOverlayBounds.height,
                    }}
                  />
                </>,
                document.body,
              )
            : null}

          <div
            className="splitter"
            role="separator"
            tabIndex={0}
            aria-label="调整左右视图宽度"
            aria-orientation="vertical"
            aria-valuemin={minPanePercent}
            aria-valuemax={maxPanePercent}
            aria-valuenow={Math.round(leftPanePercent)}
            onPointerDown={handleSplitterPointerDown}
            onKeyDown={handleSplitterKeyDown}
          />

          <section className="panel result-panel">
            <div className="panel-title">右侧：抓取结果 / 历史记录</div>
            {hasVisibleData ? (
              <ul className="article-list">
                {filteredArticles.map((article, index) => (
                  <li key={`${article.sourceUrl}-${article.fetchedAt}-${index}`} className="article-card">
                    <h3>{article.title || '无标题'}</h3>
                    <p>
                      <strong>DOI：</strong>
                      {article.doi ?? '未识别'}
                    </p>
                    <p>
                      <strong>作者：</strong>
                      {article.authors.length > 0 ? article.authors.join(', ') : '未识别'}
                    </p>
                    <p>
                      <strong>摘要：</strong>
                      {article.abstractText ?? '未识别'}
                    </p>
                    <p>
                      <strong>发布日期：</strong>
                      {article.publishedAt ?? '未识别'}
                    </p>
                    <p>
                      <strong>来源：</strong>
                      {article.sourceUrl}
                    </p>
                    <p>
                      <strong>抓取时间：</strong>
                      {formatTime(article.fetchedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : hasData ? (
              <div className="empty-state">已有数据，但当前过滤条件没有匹配结果。</div>
            ) : (
              <div className="empty-state">暂无数据。可先单篇抓取，或点击“抓取首页最新 / 加载历史”。</div>
            )}
          </section>
        </main>
      ) : (
        <main className="settings-page">
          <section className="panel settings-card">
            <div className="panel-title">设置</div>
            <div className="settings-content">
              {isSettingsLoading ? <p className="settings-hint">设置加载中...</p> : null}

              <label className="settings-field">
                默认 PDF 下载目录
                <div className="settings-input-row">
                  <input
                    className="settings-input"
                    type="text"
                    value={pdfDownloadDir}
                    onChange={(event) => setPdfDownloadDir(event.target.value)}
                    placeholder="留空则使用系统 Downloads 目录"
                  />
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => void handleChoosePdfDownloadDir()}
                    disabled={!desktopRuntime || isSettingsSaving}
                    title="选择目录"
                    aria-label="选择目录"
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </label>

              <div className="settings-actions">
                <button
                  type="button"
                  onClick={handleResetDownloadDir}
                  disabled={!pdfDownloadDir.trim() || isSettingsSaving}
                >
                  恢复默认
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={isSettingsLoading || isSettingsSaving}
                >
                  {isSettingsSaving ? '保存中...' : '保存设置'}
                </button>
              </div>

              <p className="settings-hint">建议填写绝对路径；也支持 `~` 开头路径。</p>
              <p className="settings-hint">
                当前生效目录：{pdfDownloadDir.trim() ? pdfDownloadDir.trim() : '系统 Downloads 目录'}
              </p>
            </div>
          </section>
        </main>
      )}

        <footer className={statusBarState.className} role="status" aria-live="polite">
          <span className="status-bar-label">{statusBarState.label}</span>
          <span className="status-bar-message">{statusBarState.message}</span>
        </footer>
      </div>
    </div>
  );
}
