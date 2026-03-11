import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronBinary = require('electron') as string;
const args = process.argv.slice(2);
const env = { ...process.env };

// Some shells export ELECTRON_RUN_AS_NODE globally; Electron must not inherit it.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, args, {
  stdio: 'inherit',
  windowsHide: false,
  env,
});

child.on('close', (code, signal) => {
  if (code === null) {
    console.error(`Electron exited with signal ${signal}`);
    process.exit(1);
    return;
  }
  process.exit(code);
});
