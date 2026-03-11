import type { Connect, Plugin } from 'vite';

const previewProxyRoute = '/__preview_proxy';
const previewProxyTimeoutMs = 20_000;

function safeDecodeTargetUrl(raw: string | null): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function injectBaseTagIfMissing(html: string, targetUrl: string): string {
  if (/<base\b/i.test(html)) return html;

  let baseHref = targetUrl;
  try {
    const parsed = new URL(targetUrl);
    baseHref = `${parsed.protocol}//${parsed.host}/`;
  } catch {
    // keep raw URL
  }

  const baseTag = `<base href="${baseHref.replaceAll('"', '&quot;')}">`;
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (headTag) => `${headTag}\n${baseTag}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (htmlTag) => `${htmlTag}\n<head>${baseTag}</head>`);
  }
  return `<!doctype html><html><head>${baseTag}</head><body>${html}</body></html>`;
}

export function createWebPreviewProxyPlugin(): Plugin {
  return {
    name: 'web-preview-proxy',
    configureServer(server) {
      server.middlewares.use(previewProxyRoute, ((
        req: Connect.IncomingMessage,
        res: Connect.ServerResponse,
      ) => {
        void (async () => {
          const requestUrl = new URL(req.url ?? previewProxyRoute, 'http://localhost');
          const target = safeDecodeTargetUrl(requestUrl.searchParams.get('url')).trim();

          if (!isHttpUrl(target)) {
            res.statusCode = 400;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end('Invalid url parameter.');
            return;
          }

          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), previewProxyTimeoutMs);

          try {
            const upstream = await fetch(target, {
              method: 'GET',
              redirect: 'follow',
              signal: abortController.signal,
              headers: {
                'user-agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9',
                pragma: 'no-cache',
                'cache-control': 'no-cache',
              },
            });

            const contentType = upstream.headers.get('content-type') ?? '';
            const upstreamBuffer = Buffer.from(await upstream.arrayBuffer());

            res.statusCode = upstream.status;
            res.setHeader('cache-control', 'no-store');

            if (contentType.toLowerCase().includes('text/html')) {
              const html = upstreamBuffer.toString('utf-8');
              const htmlWithBase = injectBaseTagIfMissing(html, target);
              res.setHeader('content-type', 'text/html; charset=utf-8');
              res.end(htmlWithBase);
              return;
            }

            res.setHeader('content-type', contentType || 'application/octet-stream');
            res.end(upstreamBuffer);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            res.statusCode = 502;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end(`Proxy failed: ${message}`);
          } finally {
            clearTimeout(timeoutId);
          }
        })();
      }) as Connect.NextHandleFunction);
    },
  };
}

