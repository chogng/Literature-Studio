import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app } from 'electron';

import { previewDownloadPdf } from '../../src/ls/code/electron-main/services/pdf.js';

const outputRoot = path.join(
  process.cwd(),
  '.tmp',
  'pdf-strategy-test-downloads',
  String(Date.now()),
);

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
    stack: '',
  };
}

async function discoverNatureArticleUrls() {
  const listingUrl = 'https://www.nature.com/ncomms/research-articles';
  const response = await fetch(listingUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Nature listing request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/href="(\/articles\/[^"?#]+)"/g)) {
    const relativePath = String(match[1] ?? '').trim();
    if (!relativePath || relativePath.includes('.pdf') || relativePath.includes('_reference')) {
      continue;
    }

    const absoluteUrl = new URL(relativePath, listingUrl).toString();
    if (seen.has(absoluteUrl)) {
      continue;
    }

    seen.add(absoluteUrl);
    urls.push(absoluteUrl);
    if (urls.length >= 8) {
      break;
    }
  }

  if (urls.length === 0) {
    throw new Error('Unable to discover a Nature article URL from the listing page.');
  }

  return urls;
}

async function runScienceTest() {
  const payload = {
    pageUrl: 'https://www.science.org/doi/epdf/10.1126/science.aeh1090',
    doi: '10.1126/science.aeh1090',
    articleTitle: 'Science smoke test',
    journalTitle: 'Science Smoke Test',
  };
  const startedAt = Date.now();
  const result = await previewDownloadPdf(payload, outputRoot, null);
  return {
    kind: 'science',
    elapsedMs: Date.now() - startedAt,
    payload,
    result,
  };
}

async function runNatureTest() {
  const candidateUrls = await discoverNatureArticleUrls();
  const failures: Array<{
    pageUrl: string;
    error: ReturnType<typeof serializeError>;
  }> = [];

  for (const pageUrl of candidateUrls) {
    const payload = {
      pageUrl,
      articleTitle: 'Nature smoke test',
      journalTitle: 'Nature Smoke Test',
    };
    const startedAt = Date.now();
    try {
      const result = await previewDownloadPdf(payload, outputRoot, null);
      return {
        kind: 'nature',
        elapsedMs: Date.now() - startedAt,
        payload,
        candidateUrls,
        failures,
        result,
      };
    } catch (error) {
      failures.push({
        pageUrl,
        error: serializeError(error),
      });
    }
  }

  const lastFailure = failures[failures.length - 1] ?? null;
  throw new Error(
    `Nature smoke test failed for ${candidateUrls.length} candidates. Last failure: ${JSON.stringify(lastFailure)}`,
  );
}

async function main() {
  await app.whenReady();
  await fs.mkdir(outputRoot, { recursive: true });

  const science = await runScienceTest();
  const nature = await runNatureTest();

  console.log(
    JSON.stringify(
      {
        outputRoot,
        science,
        nature,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    app.exit(0);
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          outputRoot,
          error: serializeError(error),
        },
        null,
        2,
      ),
    );
    app.exit(1);
  });

