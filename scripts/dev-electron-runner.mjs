import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rendererHost = '127.0.0.1';
const rendererPort = 1420;
const projectRoot = process.cwd();
const distElectronDir = path.join(projectRoot, 'dist-electron');
const launchScriptPath = path.join(distElectronDir, 'code', 'electron-main', 'launch.js');
const mainScriptPath = path.join(distElectronDir, 'code', 'electron-main', 'main.js');
const waitPollMs = 250;
const restartDebounceMs = 150;

let electronProcess = null;
let shuttingDown = false;
let restartingElectron = false;
let restartTimer = null;
let distWatcher = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canAccessFile(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function waitForRendererServer() {
  while (!shuttingDown) {
    try {
      const response = await fetch(`http://${rendererHost}:${rendererPort}`, {
        method: 'HEAD',
      });
      response.body?.cancel?.();
      return;
    } catch {
      await sleep(waitPollMs);
    }
  }
}

async function waitForElectronBuild() {
  while (!shuttingDown) {
    if (canAccessFile(launchScriptPath) && canAccessFile(mainScriptPath)) {
      return;
    }
    await sleep(waitPollMs);
  }
}

function clearRestartTimer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function stopElectron(signal = 'SIGTERM') {
  if (!electronProcess || electronProcess.exitCode !== null || electronProcess.signalCode !== null) {
    return;
  }

  try {
    electronProcess.kill(signal);
  } catch {
    electronProcess.kill();
  }
}

function spawnElectron() {
  if (shuttingDown) {
    return;
  }

  const env = {
    ...process.env,
    ELECTRON_RENDERER_URL: `http://${rendererHost}:${rendererPort}`,
  };

  delete env.ELECTRON_RUN_AS_NODE;

  electronProcess = spawn(process.execPath, [launchScriptPath, mainScriptPath], {
    cwd: projectRoot,
    stdio: 'inherit',
    env,
  });

  electronProcess.once('close', (code) => {
    electronProcess = null;

    if (shuttingDown) {
      process.exit(code ?? 0);
      return;
    }

    if (restartingElectron) {
      restartingElectron = false;
      spawnElectron();
      return;
    }

    process.exit(code ?? 0);
  });
}

function scheduleRestart() {
  if (shuttingDown || restartingElectron) {
    return;
  }

  clearRestartTimer();
  restartTimer = setTimeout(() => {
    restartTimer = null;

    if (shuttingDown || restartingElectron) {
      return;
    }

    restartingElectron = true;
    if (!electronProcess) {
      restartingElectron = false;
      spawnElectron();
      return;
    }

    stopElectron('SIGTERM');
  }, restartDebounceMs);
}

function startDistWatcher() {
  if (distWatcher) {
    return;
  }

  distWatcher = fs.watch(
    distElectronDir,
    {
      recursive: true,
    },
    (_eventType, filename) => {
      if (!filename || !filename.endsWith('.js')) {
        return;
      }
      scheduleRestart();
    },
  );

  distWatcher.on('error', (error) => {
    console.error('[dev-electron-runner] file watcher failed:', error);
    process.exit(1);
  });
}

function requestShutdown(signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearRestartTimer();
  distWatcher?.close();
  distWatcher = null;

  if (!electronProcess) {
    process.exit(0);
    return;
  }

  stopElectron(signal);
}

async function main() {
  await Promise.all([waitForRendererServer(), waitForElectronBuild()]);

  if (shuttingDown) {
    return;
  }

  startDistWatcher();
  spawnElectron();
}

process.once('SIGINT', () => requestShutdown('SIGINT'));
process.once('SIGTERM', () => requestShutdown('SIGTERM'));
process.once('SIGHUP', () => requestShutdown('SIGHUP'));

main().catch((error) => {
  console.error('[dev-electron-runner] failed to start:', error);
  process.exit(1);
});
