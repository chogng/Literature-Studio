import http from 'node:http';

import { app } from 'electron';

import { fetchLatestArticles } from './services/article-fetcher.js';

app.commandLine.appendSwitch('disable-gpu');

const variant = process.env.READER_FETCH_RENDER_FALLBACK === '0' ? 'A' : 'B';
const articleLimit = 8;
const BROWSER_COOKIE_NAME = 'reader_browser_session';
const BROWSER_COOKIE_VALUE = '1';

function buildHomepageHtml(count: number) {
  const links = Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return `<li><a href="/articles/${id}">Candidate ${id}</a></li>`;
  }).join('');

  return `<!doctype html><html><head><title>Mock Home</title></head><body><main><ul>${links}</ul></main></body></html>`;
}

function buildRenderedShellHtml(id: number) {
  const renderedTitle = `Rendered Article ${id}`;
  const renderedAbstract =
    `This rendered abstract for article ${id} is long enough to satisfy the parser and verify browser-render accuracy.`;
  return `<!doctype html>
<html>
  <head>
    <title>shell</title>
  </head>
  <body>
    <div id="app">loading</div>
    <script>
      setTimeout(() => {
        document.title = ${JSON.stringify(renderedTitle)};
        const dateMeta = document.createElement('meta');
        dateMeta.name = 'dc.date';
        dateMeta.content = '2026-03-14';
        document.head.appendChild(dateMeta);

        const descMeta = document.createElement('meta');
        descMeta.name = 'description';
        descMeta.content = ${JSON.stringify(renderedAbstract)};
        document.head.appendChild(descMeta);

        document.body.innerHTML = '<article><h1>${renderedTitle}</h1><p>${renderedAbstract}</p></article>';
      }, 80);
    </script>
  </body>
</html>`;
}

function buildBrowserSessionArticleHtml(id: number) {
  const title = `Browser Session Article ${id}`;
  const abstractText =
    `This browser session abstract for article ${id} is long enough to satisfy the parser and validate browser transport accuracy.`;
  return `<!doctype html><html><head><title>${title}</title><meta name="dc.date" content="2026-03-14" /><meta name="description" content="${abstractText}" /></head><body><article><h1>${title}</h1><p>${abstractText}</p></article></body></html>`;
}

function buildServerArticleHtml(id: number) {
  const title = `Server Article ${id}`;
  const abstractText =
    `This server rendered abstract for article ${id} is long enough to satisfy the parser and validate fallback comparisons.`;
  return `<!doctype html><html><head><title>${title}</title><meta name="dc.date" content="2026-03-14" /><meta name="description" content="${abstractText}" /></head><body><article><h1>${title}</h1><p>${abstractText}</p></article></body></html>`;
}

function buildInvalidHtml(id: number) {
  return `<!doctype html><html><head><title>x${id}</title></head><body><p>placeholder ${id}</p></body></html>`;
}

function hasBrowserSessionCookie(cookieHeader: string | undefined) {
  const cookie = typeof cookieHeader === 'string' ? cookieHeader : '';
  return cookie.includes(`${BROWSER_COOKIE_NAME}=${BROWSER_COOKIE_VALUE}`);
}

function articleDelayMs(id: number, hasBrowserCookie: boolean) {
  if (id >= 1 && id <= 8) {
    return hasBrowserCookie ? 90 : 40;
  }
  if (id >= 9 && id <= 12) return 220;
  return 1500;
}

function articleBody(id: number, hasBrowserCookie: boolean) {
  if (id >= 1 && id <= 8) {
    return hasBrowserCookie ? buildBrowserSessionArticleHtml(id) : buildRenderedShellHtml(id);
  }
  if (id >= 9 && id <= 12) return buildInvalidHtml(id);
  return buildServerArticleHtml(id);
}

function parseArticleId(sourceUrl: string) {
  const matched = new URL(sourceUrl).pathname.match(/\/articles\/(\d+)$/);
  return matched ? Number.parseInt(matched[1], 10) : Number.NaN;
}

function buildExpectedIds(label: 'A' | 'B') {
  const prefersBrowserTransport = process.env.READER_FETCH_TRANSPORT !== 'node';
  const expectsBrowserSessionArticles =
    prefersBrowserTransport || process.env.READER_FETCH_RENDER_FALLBACK !== '0';

  if (expectsBrowserSessionArticles) {
    return Array.from({ length: articleLimit }, (_, index) => index + 1);
  }

  return Array.from({ length: articleLimit }, (_, index) => index + 13);
}

function verifyAccuracy(
  label: 'A' | 'B',
  articles: Array<{ title: string; publishedAt: string | null; abstractText: string | null }>,
) {
  if (articles.length !== articleLimit) return false;

  const expectedIds = buildExpectedIds(label);
  const expectsBrowserSessionArticles = expectedIds[0] === 1;

  return articles.every((article, index) => {
    const expectedId = expectedIds[index];
    const expectedTitle = expectsBrowserSessionArticles
      ? `Browser Session Article ${expectedId}`
      : `Server Article ${expectedId}`;
    const abstractMarker = expectsBrowserSessionArticles
      ? 'browser session abstract'
      : 'server rendered abstract';
    return (
      article.title === expectedTitle &&
      article.publishedAt === '2026-03-14' &&
      typeof article.abstractText === 'string' &&
      article.abstractText.toLowerCase().includes(abstractMarker)
    );
  });
}

async function main() {
  await app.whenReady();

  const homepageHtml = buildHomepageHtml(20);
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    if (requestUrl.pathname === '/home') {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': `${BROWSER_COOKIE_NAME}=${BROWSER_COOKIE_VALUE}; Path=/; SameSite=Lax`,
      });
      response.end(homepageHtml);
      return;
    }

    const articleMatch = requestUrl.pathname.match(/^\/articles\/(\d+)$/);
    if (!articleMatch) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }

    const id = Number.parseInt(articleMatch[1], 10);
    const hasBrowserCookie = hasBrowserSessionCookie(request.headers.cookie);
    setTimeout(() => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(articleBody(id, hasBrowserCookie));
    }, articleDelayMs(id, hasBrowserCookie));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('LOCAL_SERVER_ADDRESS_INVALID');
  }

  const homepageUrl = `http://127.0.0.1:${address.port}/home`;
  const storage = {
    async saveFetchedArticles() {},
    async loadSettings() {
      return {
        defaultDownloadDir: null,
        defaultBatchSources: [],
        defaultBatchLimit: articleLimit,
        defaultSameDomainOnly: true,
        locale: 'zh' as const,
        configPath: '',
      };
    },
    async saveSettings() {
      return {
        defaultDownloadDir: null,
        defaultBatchSources: [],
        defaultBatchLimit: articleLimit,
        defaultSameDomainOnly: true,
        locale: 'zh' as const,
        configPath: '',
      };
    },
  };

  try {
    const startedAt = Date.now();
    const articles = await fetchLatestArticles(
      {
        sources: [
          {
            sourceId: `mock-${variant.toLowerCase()}`,
            homepageUrl,
            journalTitle: 'Mock Journal',
          },
        ],
        sameDomainOnly: true,
      },
      storage,
      {
        homepageSourceMode: 'network',
      },
    );
    const elapsedMs = Date.now() - startedAt;
    const articleIds = articles.map((article) => parseArticleId(article.sourceUrl));
    const expectedIds = buildExpectedIds(variant);
    const orderPass = articleIds.every((id, index) => id === expectedIds[index]);
    const accuracyPass = verifyAccuracy(variant, articles);

    console.log(
      JSON.stringify({
        ok: true,
        variant,
        speedMs: elapsedMs,
        msPerArticle: Number((elapsedMs / Math.max(1, articles.length)).toFixed(2)),
        orderPass,
        accuracyPass,
        articleIds,
        titles: articles.map((article) => article.title),
      }),
    );
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    app.quit();
  }
}

main().catch((error) => {
  console.log(
    JSON.stringify({
      ok: false,
      variant,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  app.exit(1);
});
