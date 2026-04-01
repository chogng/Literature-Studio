import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLeadingGroupPaneSizes } from 'ls/workbench/browser/readerLayoutSizing';

test('leading group growth keeps primary bar width and expands secondary sidebar', () => {
  const sizes = resolveLeadingGroupPaneSizes({
    totalSize: 660,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    primarySidebarSize: 320,
    fetchSidebarConstraints: {
      minimum: 248,
      maximum: 420,
    },
    primarySidebarConstraints: {
      minimum: 280,
      maximum: 420,
    },
  });

  assert.deepEqual(sizes, {
    fetchSize: 330,
    primarySize: 320,
  });
});

test('leading group resolves the actual primary size under tighter active constraints', () => {
  const sizes = resolveLeadingGroupPaneSizes({
    totalSize: 660,
    isFetchSidebarVisible: true,
    isPrimarySidebarVisible: true,
    primarySidebarSize: 420,
    fetchSidebarConstraints: {
      minimum: 140,
      maximum: 320,
    },
    primarySidebarConstraints: {
      minimum: 160,
      maximum: 360,
    },
  });

  assert.deepEqual(sizes, {
    fetchSize: 290,
    primarySize: 360,
  });
});
