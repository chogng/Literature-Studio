import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import type { ElectronInvoke } from 'ls/base/parts/sandbox/common/desktopTypes';
import { editorDraftStyleService } from 'ls/editor/browser/text/editorDraftStyleService';
import { createSettingsController } from 'ls/workbench/contrib/preferences/browser/settingsController';
import { locales } from 'language/locales';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test('SettingsController syncs editorDraftStyleService through load and autosave', async () => {
  editorDraftStyleService.resetToCatalog();
  const initialSnapshot = editorDraftStyleService.getSnapshot();
  const savePayloads: unknown[] = [];

  const invokeDesktop = (async (command: string, args?: { settings?: unknown }) => {
    if (command === 'load_settings') {
      return {
        editorDraftStyle: {
          defaultBodyStyle: {
            fontFamilyValue: '"Times New Roman", Times, serif',
            fontSizeValue: '16px',
            lineHeight: 1.6,
            color: '#112233',
            inlineStyleDefaults: {
              bold: false,
              italic: false,
              underline: false,
            },
          },
        },
      };
    }

    if (command === 'save_settings') {
      savePayloads.push(args?.settings ?? null);
      return {
        ...(args?.settings as Record<string, unknown>),
        configPath: '/tmp/literature-studio.json',
      };
    }

    throw new Error(`Unexpected desktop command in editor draft style settings test: ${command}`);
  }) as ElectronInvoke;

  const controller = createSettingsController({
    desktopRuntime: true,
    invokeDesktop,
    ui: locales.en,
    locale: 'en',
    initialBatchSources: [],
  });

  try {
    controller.start();
    await flushMicrotasks();
    await delay(0);
    await flushMicrotasks();

    assert.equal(
      editorDraftStyleService.getSnapshot().defaultBodyStyle.fontFamilyValue,
      '"Times New Roman", Times, serif',
    );
    assert.equal(
      editorDraftStyleService.getSnapshot().defaultBodyStyle.fontSizeValue,
      '16px',
    );
    assert.equal(savePayloads.length, 0);

    editorDraftStyleService.setSnapshot({
      ...editorDraftStyleService.getSnapshot(),
      defaultBodyStyle: {
        ...editorDraftStyleService.getSnapshot().defaultBodyStyle,
        fontFamilyValue: initialSnapshot.defaultBodyStyle.fontFamilyValue,
        fontSizeValue: initialSnapshot.defaultBodyStyle.fontSizeValue,
        lineHeight: initialSnapshot.defaultBodyStyle.lineHeight,
        color: initialSnapshot.defaultBodyStyle.color,
      },
    });

    controller.dispose();
    await flushMicrotasks();

    const lastPayload = savePayloads.at(-1) as
      | {
          editorDraftStyle?: {
            defaultBodyStyle?: {
              fontFamilyValue?: string;
              fontSizeValue?: string;
            };
          };
        }
      | undefined;
    assert(lastPayload);
    assert.equal(
      lastPayload.editorDraftStyle?.defaultBodyStyle?.fontFamilyValue,
      initialSnapshot.defaultBodyStyle.fontFamilyValue,
    );
    assert.equal(
      lastPayload.editorDraftStyle?.defaultBodyStyle?.fontSizeValue,
      initialSnapshot.defaultBodyStyle.fontSizeValue,
    );
  } finally {
    controller.dispose();
    editorDraftStyleService.resetToCatalog();
  }
});
