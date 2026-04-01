import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const watchMode = process.argv.includes('--watch');
const distElectronDir = path.join(projectRoot, 'dist-electron');
const srcRoot = path.join(projectRoot, 'src', 'ls');
const lsRoot = srcRoot;
const entryPoints = [
  path.join(srcRoot, 'code', 'electron-main', 'launch.ts'),
  path.join(srcRoot, 'code', 'electron-main', 'main.ts'),
  path.join(srcRoot, 'base', 'parts', 'sandbox', 'electron-browser', 'preload.ts'),
];

const packageJson = await import(path.join(projectRoot, 'package.json'), {
  with: { type: 'json' },
});
const packageNames = [
  ...Object.keys(packageJson.default.dependencies ?? {}),
  ...Object.keys(packageJson.default.devDependencies ?? {}),
];
const builtinExternals = builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);

function resolveSourcePath(candidatePath) {
  if (fs.existsSync(candidatePath)) {
    return candidatePath;
  }

  if (candidatePath.endsWith('.js')) {
    const tsCandidate = `${candidatePath.slice(0, -3)}.ts`;
    if (fs.existsSync(tsCandidate)) {
      return tsCandidate;
    }

    const tsxCandidate = `${candidatePath.slice(0, -3)}.tsx`;
    if (fs.existsSync(tsxCandidate)) {
      return tsxCandidate;
    }
  }

  return candidatePath;
}

const buildOptions = {
  absWorkingDir: projectRoot,
  bundle: true,
  entryPoints,
  external: [...builtinExternals, ...packageNames],
  format: 'esm',
  logLevel: 'info',
  outbase: srcRoot,
  outdir: distElectronDir,
  packages: 'external',
  platform: 'node',
  plugins: [
    {
      name: 'ls-alias',
      setup(build) {
        build.onResolve({ filter: /^ls\// }, (args) => ({
          path: resolveSourcePath(path.join(lsRoot, args.path.slice('ls/'.length))),
        }));
      },
    },
  ],
  sourcemap: true,
  target: 'node20',
};

if (watchMode) {
  await fsPromises.rm(distElectronDir, { force: true, recursive: true });
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('[build-electron] watching for changes');
} else {
  await fsPromises.rm(distElectronDir, { force: true, recursive: true });
  await esbuild.build(buildOptions);
}
