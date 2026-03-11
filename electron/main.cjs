const path = require('path');
const { promises: fs } = require('fs');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { load } = require('cheerio');

const ARTICLE_LIMIT_MAX = 20;
const DEFAULT_BATCH_LIMIT = 5;
const PREVIEW_CANDIDATE_MULTIPLIER = 12;
const DOI_RE = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

let mainWindow = null;

const appState = {
  historyFile: '',
  settingsFile: '',
};

function isDevMode() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanNullable(value) {
  const normalized = cleanText(value);
  return normalized ? normalized : null;
}

function normalizeUrl(input) {
  const trimmed = cleanText(input);
  if (!trimmed) {
    throw new Error('链接不能为空');
  }
  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(value);
  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error('仅支持 http/https 链接');
  }
  return url.toString();
}

function parseDateString(value) {
  const source = cleanText(value);
  if (!source) return null;

  const isoDateMatch = source.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoDateMatch) {
    const year = Number.parseInt(isoDateMatch[1], 10);
    const month = Number.parseInt(isoDateMatch[2], 10);
    const day = Number.parseInt(isoDateMatch[3], 10);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseDateRange(startDate, endDate) {
  const start = startDate ? parseDateString(startDate) : null;
  const end = endDate ? parseDateString(endDate) : null;

  if (startDate && !start) {
    throw new Error(`开始日期格式无效：${startDate}`);
  }
  if (endDate && !end) {
    throw new Error(`结束日期格式无效：${endDate}`);
  }
  if (start && end && start > end) {
    throw new Error('开始日期不能晚于结束日期');
  }
  return { start, end };
}

function isWithinDateRange(value, range) {
  if (!range.start && !range.end) return true;
  if (!value) return false;
  if (range.start && value < range.start) return false;
  if (range.end && value > range.end) return false;
  return true;
}

function uniq(values) {
  return [...new Set(values)];
}

function pickFirstNonEmpty(values) {
  for (const value of values) {
    const normalized = cleanText(value);
    if (normalized) return normalized;
  }
  return '';
}

function pickMetaContent($, selectors) {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr('content'));
    if (value) return value;
  }
  return '';
}

function extractAuthors($) {
  const byMeta = [
    ...$('meta[name="citation_author"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
    ...$('meta[name="dc.creator"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
    ...$('meta[name="author"]')
      .map((_, node) => cleanText($(node).attr('content')))
      .get(),
  ].filter(Boolean);

  if (byMeta.length > 0) return uniq(byMeta);

  const ldAuthors = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).html();
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        const author = item?.author;
        if (!author) continue;
        if (Array.isArray(author)) {
          author.forEach((entry) => {
            if (typeof entry === 'string') {
              const text = cleanText(entry);
              if (text) ldAuthors.push(text);
              return;
            }
            const text = cleanText(entry?.name);
            if (text) ldAuthors.push(text);
          });
        } else if (typeof author === 'string') {
          const text = cleanText(author);
          if (text) ldAuthors.push(text);
        } else {
          const text = cleanText(author?.name);
          if (text) ldAuthors.push(text);
        }
      }
    } catch {
      return;
    }
  });

  return uniq(ldAuthors);
}

function extractDoi($, html) {
  const fromMeta = pickMetaContent($, [
    'meta[name="citation_doi"]',
    'meta[name="dc.identifier"]',
    'meta[name="prism.doi"]',
    'meta[property="og:doi"]',
  ]);
  if (fromMeta) return fromMeta;

  const text = cleanText(html);
  const matched = text.match(DOI_RE);
  return matched ? matched[0] : null;
}

function extractPublishedDate($) {
  return (
    parseDateString(
      pickMetaContent($, [
        'meta[name="citation_publication_date"]',
        'meta[name="citation_online_date"]',
        'meta[name="dc.date"]',
        'meta[name="prism.publicationDate"]',
        'meta[property="article:published_time"]',
      ]),
    ) ?? null
  );
}

function extractAbstract($) {
  const byMeta = pickMetaContent($, [
    'meta[name="description"]',
    'meta[name="citation_abstract"]',
    'meta[property="og:description"]',
    'meta[name="dc.description"]',
  ]);
  if (byMeta) return byMeta;

  const candidates = [
    cleanText($('section[aria-labelledby*="abs"] p').first().text()),
    cleanText($('div.abstract p').first().text()),
    cleanText($('p.abstract').first().text()),
  ].filter(Boolean);
  return candidates[0] ?? null;
}

function extractTitle($) {
  return pickFirstNonEmpty([
    pickMetaContent($, [
      'meta[name="citation_title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="dc.title"]',
    ]),
    cleanText($('title').first().text()),
    cleanText($('h1').first().text()),
  ]);
}

function buildArticleFromHtml(sourceUrl, html) {
  const $ = load(html);
  const title = extractTitle($);
  const doi = extractDoi($, html);
  const authors = extractAuthors($);
  const abstractText = extractAbstract($);
  const publishedAt = extractPublishedDate($);

  return {
    title: title || '无标题',
    doi: cleanNullable(doi),
    authors,
    abstractText: cleanNullable(abstractText),
    publishedAt,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}

function isProbablyArticle(candidateUrl, article) {
  if (!article?.title || article.title === '无标题') return false;

  const pathname = new URL(candidateUrl).pathname.toLowerCase();
  const articlePath = /(?:\/article|\/articles|\/paper|\/papers|\/doi|\/abs|\/content)/.test(pathname);
  if (articlePath) return true;

  if (article.doi) return true;
  if (article.abstractText && article.abstractText.length > 60) return true;
  return article.title.length >= 20;
}

function scoreCandidate(homepage, candidate) {
  const baseHost = homepage.host;
  const url = new URL(candidate);
  const pathname = url.pathname.toLowerCase();

  let score = 0;
  if (url.host === baseHost) score += 15;
  if (/\/(?:article|articles|paper|papers|doi|abs|content)\b/.test(pathname)) score += 40;
  if (/\/(latest|current|new|news)\b/.test(pathname)) score -= 30;
  if (/\.(pdf|jpg|jpeg|png|svg|gif|zip|rar|xml|rss|css|js|woff2?)$/i.test(pathname)) score -= 80;
  if (pathname.split('/').filter(Boolean).length >= 2) score += 8;
  return score;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`);
  }
  return response.text();
}

function historyFilePath() {
  return appState.historyFile;
}

function settingsFilePath() {
  return appState.settingsFile;
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function readHistory() {
  const payload = await readJson(historyFilePath(), []);
  return Array.isArray(payload) ? payload : [];
}

async function writeHistory(items) {
  await writeJson(historyFilePath(), items);
}

async function saveFetchedArticles(items) {
  const previous = await readHistory();
  const next = [...items, ...previous];
  const seen = new Set();
  const deduped = [];

  for (const item of next) {
    const key = `${item.sourceUrl}::${item.fetchedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  await writeHistory(deduped);
}

async function fetchArticle(urlValue) {
  const normalized = normalizeUrl(urlValue);
  const html = await fetchHtml(normalized);
  const article = buildArticleFromHtml(normalized, html);
  await saveFetchedArticles([article]);
  return article;
}

async function fetchLatestArticles(payload = {}) {
  const homepageUrl = normalizeUrl(payload.homepageUrl ?? '');
  const limit = Math.min(
    ARTICLE_LIMIT_MAX,
    Math.max(1, Number.parseInt(String(payload.limit ?? DEFAULT_BATCH_LIMIT), 10) || DEFAULT_BATCH_LIMIT),
  );
  const sameDomainOnly = payload.sameDomainOnly !== false;
  const dateRange = parseDateRange(payload.startDate ?? null, payload.endDate ?? null);
  const homepage = new URL(homepageUrl);
  const html = await fetchHtml(homepageUrl);
  const $ = load(html);

  const links = $('a[href]')
    .map((_, node) => $(node).attr('href'))
    .get()
    .map((href) => cleanText(href))
    .filter(Boolean);

  const candidates = [];
  const seen = new Set();
  for (const href of links) {
    try {
      const candidateUrl = new URL(href, homepageUrl);
      if (!/^https?:$/i.test(candidateUrl.protocol)) continue;
      if (sameDomainOnly && candidateUrl.host !== homepage.host) continue;
      const normalized = candidateUrl.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      candidates.push({
        url: normalized,
        score: scoreCandidate(homepage, normalized),
      });
    } catch {
      continue;
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const fetched = [];
  const maxAttempts = Math.min(candidates.length, limit * PREVIEW_CANDIDATE_MULTIPLIER);

  for (let index = 0; index < maxAttempts; index += 1) {
    if (fetched.length >= limit) break;
    const candidate = candidates[index];
    if (!candidate || candidate.score < -40) continue;

    try {
      const articleHtml = await fetchHtml(candidate.url);
      const article = buildArticleFromHtml(candidate.url, articleHtml);
      if (!isProbablyArticle(candidate.url, article)) continue;
      if (!isWithinDateRange(article.publishedAt, dateRange)) continue;
      fetched.push(article);
    } catch {
      continue;
    }
  }

  if (fetched.length === 0) {
    if (dateRange.start || dateRange.end) {
      throw new Error('已抓取候选链接，但没有命中你设置的时间区间');
    }
    throw new Error('已抓取候选链接，但未解析出有效文章内容');
  }

  await saveFetchedArticles(fetched);
  return fetched;
}

async function listHistory(payload = {}) {
  const limit = Math.min(1000, Math.max(1, Number.parseInt(String(payload.limit ?? 1000), 10) || 1000));
  const items = await readHistory();
  return items.slice(0, limit);
}

async function clearHistory() {
  await writeHistory([]);
  return null;
}

async function loadSettings() {
  const payload = await readJson(settingsFilePath(), { defaultDownloadDir: null });
  const value = typeof payload?.defaultDownloadDir === 'string' ? cleanText(payload.defaultDownloadDir) : '';
  return {
    defaultDownloadDir: value || null,
  };
}

async function saveSettings(payload = {}) {
  const raw = typeof payload.settings?.defaultDownloadDir === 'string' ? payload.settings.defaultDownloadDir : '';
  const normalized = cleanText(raw);
  const saved = {
    defaultDownloadDir: normalized || null,
  };
  await writeJson(settingsFilePath(), saved);
  return saved;
}

async function pickDownloadDirectory() {
  if (!mainWindow) {
    throw new Error('主窗口不可用');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择默认下载目录',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

function extractPdfUrl(pageUrl, html) {
  const $ = load(html);
  const fromMeta = pickMetaContent($, ['meta[name="citation_pdf_url"]', 'meta[name="wkhealth_pdf_url"]']);
  if (fromMeta) {
    try {
      return new URL(fromMeta, pageUrl).toString();
    } catch {
      return fromMeta;
    }
  }

  const hrefCandidates = $('a[href], link[href]')
    .map((_, node) => cleanText($(node).attr('href')))
    .get()
    .filter(Boolean);
  for (const href of hrefCandidates) {
    if (!/\.pdf(?:$|[?#])/i.test(href)) continue;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
  }

  const regexMatch = html.match(/https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/i);
  return regexMatch ? regexMatch[0] : null;
}

function safePdfFileName(fileName) {
  const raw = cleanText(fileName) || `article-${Date.now()}.pdf`;
  const sanitized = raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

async function previewDownloadPdf(payload = {}) {
  const pageUrl = normalizeUrl(payload.pageUrl ?? '');
  const customDownloadDir =
    typeof payload.customDownloadDir === 'string' ? cleanText(payload.customDownloadDir) : '';
  const downloadDir = customDownloadDir || app.getPath('downloads');
  await fs.mkdir(downloadDir, { recursive: true });

  const html = await fetchHtml(pageUrl);
  const pdfUrl = extractPdfUrl(pageUrl, html);
  if (!pdfUrl) {
    throw new Error('未在页面中识别到 PDF 下载链接');
  }

  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`PDF 下载失败：${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const parsed = new URL(pdfUrl);
  const fallbackName = path.basename(parsed.pathname) || `article-${Date.now()}.pdf`;
  const fileName = safePdfFileName(decodeURIComponent(fallbackName));
  const filePath = path.join(downloadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    sourceUrl: pdfUrl,
  };
}

function openDevtools(payload = {}) {
  if (!mainWindow) {
    throw new Error('主窗口不可用');
  }

  const target = cleanText(payload.target || 'app');
  if (!['app', 'preview', 'all'].includes(target)) {
    throw new Error('无效目标，仅支持 app / preview / all');
  }

  mainWindow.webContents.openDevTools({ mode: 'detach', activate: true });
  return null;
}

async function invokeCommand(command, payload) {
  switch (command) {
    case 'fetch_article':
      return fetchArticle(payload?.url);
    case 'fetch_latest_articles':
      return fetchLatestArticles(payload);
    case 'list_history':
      return listHistory(payload);
    case 'clear_history':
      return clearHistory();
    case 'load_settings':
      return loadSettings();
    case 'save_settings':
      return saveSettings(payload);
    case 'pick_download_directory':
      return pickDownloadDirectory();
    case 'preview_download_pdf':
      return previewDownloadPdf(payload);
    case 'open_devtools':
      return openDevtools(payload);
    default:
      throw new Error(`未知命令：${command}`);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: 'Journal Reader',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (typeof mainWindow.removeMenu === 'function') {
    mainWindow.removeMenu();
  } else {
    mainWindow.setMenuBarVisibility(false);
  }

  const publishWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('app:window-state', {
      isMaximized: mainWindow.isMaximized(),
    });
  };

  mainWindow.on('maximize', publishWindowState);
  mainWindow.on('unmaximize', publishWindowState);
  mainWindow.on('enter-full-screen', publishWindowState);
  mainWindow.on('leave-full-screen', publishWindowState);
  mainWindow.webContents.on('did-finish-load', publishWindowState);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const key = cleanText(input.key).toLowerCase();
    const toggleByFunctionKey = key === 'f12';
    const toggleByShortcut = key === 'i' && Boolean(input.shift) && Boolean(input.control || input.meta);
    if (!toggleByFunctionKey && !toggleByShortcut) return;

    if (mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow?.webContents.openDevTools({ mode: 'detach', activate: true });
    }
    event.preventDefault();
  });
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  await fs.mkdir(userDataDir, { recursive: true });
  appState.historyFile = path.join(userDataDir, 'history.json');
  appState.settingsFile = path.join(userDataDir, 'settings.json');

  ipcMain.handle('app:invoke', async (_event, command, payload) => {
    try {
      return await invokeCommand(command, payload ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message);
    }
  });

  ipcMain.on('app:window-action', (event, action) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    if (!target || target.isDestroyed()) return;

    switch (action) {
      case 'minimize':
        target.minimize();
        break;
      case 'maximize':
        target.maximize();
        break;
      case 'unmaximize':
        target.unmaximize();
        break;
      case 'toggle-maximize':
        if (target.isMaximized()) {
          target.unmaximize();
        } else {
          target.maximize();
        }
        break;
      case 'close':
        target.close();
        break;
      default:
        break;
    }
  });

  ipcMain.handle('app:get-window-state', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    return {
      isMaximized: Boolean(target && !target.isDestroyed() && target.isMaximized()),
    };
  });

  createMainWindow();

  if (process.platform === 'darwin') {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (isDevMode()) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}
