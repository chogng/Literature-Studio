import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputDir = path.join(rootDir, '.tmp', 'library-store-tests');
const entryPoint = path.join(rootDir, 'tests', 'library-store', 'index.test.ts');
const outputFile = path.join(outputDir, 'index.test.mjs');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await build({
  entryPoints: [entryPoint],
  outfile: outputFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'inline',
  external: ['node:assert/strict', 'node:test', 'node:sqlite'],
});

const result = spawnSync(process.execPath, ['--test', outputFile], {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}

process.exit(1);
