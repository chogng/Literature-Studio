import assert from 'node:assert/strict';
import { once } from 'node:events';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { app, BrowserWindow } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const builtMainEntry = path.join(projectRoot, 'dist-electron', 'code', 'electron-main', 'main.js');
const builtWorkbenchEntry = path.join(
  projectRoot,
  'dist',
  'src',
  'ls',
  'code',
  'electron-sandbox',
  'workbench',
  'workbench.html',
);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ls-electron-smoke-'));
const portableRoot = path.join(tempRoot, 'portable-root');
const smokePagePath = path.join(tempRoot, 'browser-smoke.html');

process.env.PORTABLE_EXECUTABLE_DIR = portableRoot;
delete process.env.ELECTRON_RENDERER_URL;
delete process.env.LS_RENDERER_DEBUG;

let cleanedUp = false;

function logStep(message, details) {
  if (details === undefined) {
    console.log(`[smoke] ${message}`);
    return;
  }

  console.log(`[smoke] ${message}`, details);
}

async function cleanupTempRoot() {
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;
  try {
    await rm(tempRoot, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only.
  }
}

function createSmokePageHtml() {
  const sections = Array.from({ length: 180 }, (_, index) => {
    return `<p>Smoke section ${index + 1}: editor lifecycle release and restore check.</p>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Electron Smoke</title>
    <style>
      body {
        margin: 0;
        font-family: ui-serif, Georgia, serif;
        line-height: 1.6;
        background: linear-gradient(180deg, #f6f2e8 0%, #ebe4d3 100%);
        color: #2d241b;
      }
      main {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px 24px 240px;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 32px;
      }
      p {
        margin: 0 0 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Editor Lifecycle Smoke</h1>
      ${sections}
    </main>
  </body>
</html>`;
}

function createSeedWorkspace(smokeUrl) {
  return {
    groups: [
      {
        groupId: 'editor-group-a',
        inputs: [
          {
            id: 'browser-a',
            kind: 'browser',
            title: 'Smoke Browser',
            url: smokeUrl,
          },
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Smoke Draft',
            viewMode: 'draft',
          },
        ],
        activeTabId: 'browser-a',
        mruTabIds: ['browser-a', 'draft-a'],
      },
    ],
    activeGroupId: 'editor-group-a',
    draftStateByInputId: {
      'draft-a': {
        title: 'Smoke Draft',
        viewMode: 'draft',
        document: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: {
                blockId: 'block-smoke-a',
              },
              content: [
                {
                  type: 'text',
                  text: 'Draft smoke content',
                },
              ],
            },
          ],
        },
      },
    },
    viewStateEntries: [],
  };
}

async function waitForCondition(description, predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const stepMs = options.stepMs ?? 100;
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await predicate();
    if (lastValue) {
      return lastValue;
    }

    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }

  throw new Error(
    `Timed out while waiting for ${description}.${lastValue === undefined ? '' : ` Last value: ${JSON.stringify(lastValue)}`}`,
  );
}

async function waitForMainWindow() {
  return await waitForCondition(
    'main window',
    async () => BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) ?? null,
    { timeoutMs: 20000, stepMs: 100 },
  );
}

async function waitForDidFinishLoad(window) {
  if (!window.webContents.isLoadingMainFrame() && window.webContents.getURL()) {
    return;
  }

  const didFinishLoad = once(window.webContents, 'did-finish-load').then(() => undefined);
  const didFailLoad = once(window.webContents, 'did-fail-load').then(([, errorCode, errorDescription]) => {
    throw new Error(`Renderer load failed (${errorCode}): ${errorDescription}`);
  });

  await Promise.race([didFinishLoad, didFailLoad]);
}

async function evaluateRenderer(window, expression) {
  return await window.webContents.executeJavaScript(expression, true);
}

async function seedRendererStorage(window, workspaceState) {
  const serializedWorkspace = JSON.stringify(workspaceState);
  await evaluateRenderer(
    window,
    `(() => {
      localStorage.clear();
      localStorage.setItem('ls.writingWorkspace.state', ${JSON.stringify(serializedWorkspace)});
      return localStorage.getItem('ls.writingWorkspace.state');
    })()`,
  );
}

async function reloadRenderer(window) {
  const didFinishLoad = once(window.webContents, 'did-finish-load');
  window.webContents.reload();
  await didFinishLoad;
}

async function getRendererSnapshot(window) {
  return await evaluateRenderer(
    window,
    `(() => ({
      activePage: document.querySelector('.app-shell')?.classList.contains('app-shell-settings')
        ? 'settings'
        : 'content',
      activeTabKind: document.querySelector('.editor-tab.is-active')?.dataset.kind ?? null,
      webviewCount: document.querySelectorAll('webview').length,
      hasWorkbench: Boolean(document.querySelector('.workbench-content-layout')),
      hasTabs: document.querySelectorAll('.editor-tab').length,
    }))()`,
  );
}

async function clickSelector(window, selector, description) {
  await waitForCondition(
    `${description} selector`,
    async () => {
      return await evaluateRenderer(
        window,
        `(() => {
          const element = document.querySelector(${JSON.stringify(selector)});
          return element instanceof HTMLElement;
        })()`,
      );
    },
    { timeoutMs: 5000, stepMs: 100 },
  );

  const clicked = await evaluateRenderer(
    window,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      element.click();
      return true;
    })()`,
  );

  assert.equal(clicked, true, `Expected to click ${description}.`);
}

async function getContentState(window, targetId) {
  return await evaluateRenderer(
    window,
    `(async () => {
      return await window.electronAPI.webContent.getState(${JSON.stringify(targetId)});
    })()`,
  );
}

async function getWebviewDomDiagnostics(window) {
  return await evaluateRenderer(
    window,
    `(() => {
      const host = document.querySelector('.native-webcontentview-host');
      return {
        host: host instanceof HTMLElement
          ? {
              active: host.dataset.webcontentActive ?? null,
              className: host.className,
              childCount: host.childElementCount,
              rect: (() => {
                const rect = host.getBoundingClientRect();
                return {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                };
              })(),
            }
          : null,
        webviews: Array.from(document.querySelectorAll('webview')).map((node, index) => {
          const rect = node.getBoundingClientRect();
          const webview = node;
          const getURL =
            typeof webview.getURL === 'function'
              ? String(webview.getURL() ?? '').trim()
              : null;
          const isLoading =
            typeof webview.isLoading === 'function'
              ? Boolean(webview.isLoading())
              : null;

          return {
            index,
            src: String(node.getAttribute('src') ?? '').trim(),
            currentUrl: getURL,
            isLoading,
            isConnected: node.isConnected,
            className: node.className,
            parentClassName: node.parentElement?.className ?? null,
            style: node.getAttribute('style') ?? '',
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };
        }),
      };
    })()`,
  );
}

async function getBrowserLifecycleDiagnostics(window, targetId) {
  return {
    renderer: await getRendererSnapshot(window),
    targetState: await getContentState(window, targetId),
    releasedProbe: await executeTargetScript(
      window,
      targetId,
      '(() => location.href)()',
      500,
    ),
    scrollTop: await getBrowserScroll(window, targetId),
    dom: await getWebviewDomDiagnostics(window),
  };
}

async function executeTargetScript(window, targetId, script, timeoutMs = 1000) {
  return await evaluateRenderer(
    window,
    `(async () => {
      return await window.electronAPI.webContent.executeJavaScript(
        ${JSON.stringify(targetId)},
        ${JSON.stringify(script)},
        ${timeoutMs},
      );
    })()`,
  );
}

async function setBrowserScroll(window, targetId, scrollTop) {
  const nextScrollTop = await executeTargetScript(
    window,
    targetId,
    `(() => {
      window.scrollTo(0, ${scrollTop});
      return Math.round(window.scrollY || document.scrollingElement?.scrollTop || 0);
    })()`,
    2000,
  );
  return Number(nextScrollTop ?? 0);
}

async function getBrowserScroll(window, targetId) {
  const scrollTop = await executeTargetScript(
    window,
    targetId,
    `(() => Math.round(window.scrollY || document.scrollingElement?.scrollTop || 0))()`,
    2000,
  );
  return typeof scrollTop === 'number' ? scrollTop : null;
}

async function runSmoke() {
  await access(builtMainEntry);
  await access(builtWorkbenchEntry);
  await writeFile(smokePagePath, createSmokePageHtml(), 'utf8');
  const smokeUrl = pathToFileURL(smokePagePath).toString();
  const seedWorkspace = createSeedWorkspace(smokeUrl);

  logStep('importing built electron main entry');
  await import(pathToFileURL(builtMainEntry).toString());
  logStep('built electron main entry imported');
  logStep('waiting for electron app ready');
  await app.whenReady();
  logStep('electron app ready');

  const window = await waitForMainWindow();
  logStep('main window detected');
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[smoke] renderer process gone', details);
  });
  window.webContents.on('did-start-loading', () => {
    logStep('renderer did-start-loading');
  });
  window.webContents.on('did-finish-load', () => {
    logStep('renderer did-finish-load', { url: window.webContents.getURL() });
  });
  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      logStep('renderer did-fail-load', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
    },
  );

  logStep('waiting for initial renderer load');
  await waitForDidFinishLoad(window);
  logStep('initial renderer load settled', { url: window.webContents.getURL() });
  logStep('seeding isolated renderer storage');
  await seedRendererStorage(window, seedWorkspace);
  await reloadRenderer(window);

  await waitForCondition(
    'workbench bootstrap',
    async () => {
      const snapshot = await getRendererSnapshot(window);
      return snapshot.hasWorkbench && snapshot.hasTabs === 3 ? snapshot : null;
    },
    { timeoutMs: 20000, stepMs: 100 },
  );

  logStep('waiting for initial browser target activation');
  await waitForCondition(
    'initial browser webview',
    async () => {
      const snapshot = await getRendererSnapshot(window);
      const state = await getContentState(window, 'browser-a');
      if (
        snapshot.activePage === 'content' &&
        snapshot.activeTabKind === 'browser' &&
        snapshot.webviewCount === 1 &&
        state.activeTargetId === 'browser-a'
      ) {
        return { snapshot, state };
      }

      return null;
    },
    { timeoutMs: 20000, stepMs: 150 },
  );

  const scrolledTo = await setBrowserScroll(window, 'browser-a', 960);
  assert.ok(scrolledTo >= 900, `Expected browser target to scroll, got ${scrolledTo}.`);
  logStep('browser tab scrolled', { scrollTop: scrolledTo });

  await clickSelector(
    window,
    `.editor-tab[data-kind="draft"] .editor-tab-main`,
    'draft tab button',
  );

  logStep('waiting for browser target release after switching to draft');
  try {
    await waitForCondition(
      'draft activation and browser release',
      async () => {
        const snapshot = await getRendererSnapshot(window);
        const releasedProbe = await executeTargetScript(
          window,
          'browser-a',
          '(() => location.href)()',
          500,
        );
        if (
          snapshot.activeTabKind === 'draft' &&
          snapshot.webviewCount === 0 &&
          releasedProbe === null
        ) {
          return { snapshot, releasedProbe };
        }

        return null;
      },
      { timeoutMs: 20000, stepMs: 150 },
    );
  } catch (error) {
    logStep(
      'draft release diagnostics',
      await getBrowserLifecycleDiagnostics(window, 'browser-a'),
    );
    throw error;
  }

  await clickSelector(
    window,
    `.editor-tab[data-kind="browser"] .editor-tab-main`,
    'browser tab button',
  );

  logStep('waiting for browser target recreation and view-state restore');
  try {
    await waitForCondition(
      'browser restoration after returning from draft',
      async () => {
        const snapshot = await getRendererSnapshot(window);
        const scrollTop = await getBrowserScroll(window, 'browser-a');
        if (
          snapshot.activeTabKind === 'browser' &&
          snapshot.webviewCount === 1 &&
          typeof scrollTop === 'number' &&
          scrollTop >= 900
        ) {
          return { snapshot, scrollTop };
        }

        return null;
      },
      { timeoutMs: 20000, stepMs: 150 },
    );
  } catch (error) {
    logStep(
      'browser restore diagnostics after draft',
      await getBrowserLifecycleDiagnostics(window, 'browser-a'),
    );
    throw error;
  }

  logStep('smoke pass', await getBrowserLifecycleDiagnostics(window, 'browser-a'));

  for (const existingWindow of BrowserWindow.getAllWindows()) {
    if (!existingWindow.isDestroyed()) {
      existingWindow.destroy();
    }
  }

  app.quit();
}

void runSmoke()
  .then(async () => {
    await cleanupTempRoot();
  })
  .catch(async (error) => {
    console.error(
      '[smoke] failure',
      error instanceof Error ? error.stack ?? error.message : String(error),
    );
    await cleanupTempRoot();
    app.exit(1);
  });
