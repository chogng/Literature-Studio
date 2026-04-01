import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
import { HorizontalScrollbar } from 'ls/base/browser/ui/scrollbar/horizontalScrollbar';
import type { AuxiliaryBarProps } from 'ls/workbench/browser/parts/auxiliarybar/auxiliarybar';

let cleanupDomEnvironment: (() => void) | null = null;
let createAuxiliaryBar: typeof import('ls/workbench/browser/parts/auxiliarybar/auxiliarybar').createAuxiliaryBar;

function createProps(): AuxiliaryBarProps {
  return {
    labels: {
      assistantAnswerTitle: 'Answer',
      assistantEvidenceTitle: 'Evidence',
      assistantNewConversation: 'New chat',
      assistantHistory: 'History',
      assistantMore: 'More',
      assistantQuestion: 'Question',
      assistantQuestionPlaceholder: 'Ask something',
      assistantVoice: 'Voice',
      assistantImage: 'Image',
      assistantSend: 'Send',
      assistantSendBusy: 'Asking...',
      assistantRerankOn: 'Rerank on',
      assistantRerankOff: 'Rerank off',
    },
    isKnowledgeBaseModeEnabled: true,
    messages: [],
    question: '',
    onQuestionChange: () => {},
    isAsking: false,
    errorMessage: null,
    onAsk: () => {},
    availableArticleCount: 1,
    conversations: [
      {
        id: 'conversation-1',
        title: 'Conversation 1',
        autoTitleIndex: null,
        question: '',
        result: null,
        messages: [],
        isAsking: false,
        errorMessage: null,
      },
    ],
    activeConversationId: 'conversation-1',
    isHistoryOpen: true,
    isMoreMenuOpen: false,
    onCreateConversation: () => {},
    onActivateConversation: () => {},
    onCloseConversation: () => {},
    onCloseAuxiliarySidebar: () => {},
    onToggleHistory: () => {},
    onToggleMoreMenu: () => {},
  };
}

before(async () => {
  const domEnvironment = installDomTestEnvironment();
  cleanupDomEnvironment = domEnvironment.cleanup;
  ({ createAuxiliaryBar } = await import('ls/workbench/browser/parts/auxiliarybar/auxiliarybar'));
});

after(() => {
  cleanupDomEnvironment?.();
  cleanupDomEnvironment = null;
});

test('auxiliary bar action buttons expose labels and shared hover', async () => {
  const auxiliaryBar = createAuxiliaryBar(createProps());
  const element = auxiliaryBar.getElement();
  document.body.append(element);

  try {
    const actionButtons = Array.from(
      element.querySelectorAll('.sidebar-action-bar .sidebar-action-btn'),
    );
    assert.equal(actionButtons.length, 3);
    assert.deepEqual(
      actionButtons.map((button) => button.getAttribute('aria-label')),
      ['New chat', 'History', 'More'],
    );

    const historyButton = actionButtons[1];
    assert(historyButton instanceof HTMLButtonElement);
    assert.equal(historyButton.getAttribute('aria-pressed'), 'true');

    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }),
    );
    historyButton.dispatchEvent(new Event('focus', { bubbles: true }));
    await delay(0);

    const overlayContent = document.querySelector('.ls-hover-content');
    assert(overlayContent instanceof HTMLElement);
    assert.equal(overlayContent.textContent, 'History');
  } finally {
    auxiliaryBar.dispose();
  }
});

test('horizontal scrollbar handles wheel events from the strip content', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb);

  try {
    scrollbar.renderNow();
    await delay(0);

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 48,
    });
    strip.dispatchEvent(event);

    assert.equal(strip.scrollLeft, 48);
    assert.equal(event.defaultPrevented, true);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});

test('horizontal scrollbar applies mouse wheel sensitivity', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb, {
    mouseWheelScrollSensitivity: 2,
  });

  try {
    scrollbar.renderNow();
    await delay(0);

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 24,
    });
    strip.dispatchEvent(event);

    assert.equal(strip.scrollLeft, 48);
    assert.equal(event.defaultPrevented, true);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});

test('horizontal scrollbar can avoid consuming mouse wheel events', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb, {
    consumeMouseWheelIfScrollbarIsNeeded: false,
  });

  try {
    scrollbar.renderNow();
    await delay(0);
    strip.scrollLeft = 200;

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 24,
    });
    strip.dispatchEvent(event);

    assert.equal(strip.scrollLeft, 200);
    assert.equal(event.defaultPrevented, false);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});

test('horizontal scrollbar can use smooth mouse wheel scrolling', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  let smoothScrollCall:
    | {
        left?: number;
        behavior?: string;
      }
    | null = null;
  strip.scrollTo = ((options: ScrollToOptions) => {
    smoothScrollCall = {
      left: options.left,
      behavior: options.behavior,
    };
    if (typeof options.left === 'number') {
      strip.scrollLeft = options.left;
    }
  }) as typeof strip.scrollTo;

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb, {
    mouseWheelSmoothScroll: true,
  });

  try {
    scrollbar.renderNow();
    await delay(0);

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 24,
    });
    strip.dispatchEvent(event);

    assert.deepEqual(smoothScrollCall, {
      left: 24,
      behavior: 'smooth',
    });
    assert.equal(event.defaultPrevented, true);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});

test('horizontal scrollbar converts vertical wheel to horizontal when shift is held', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb);

  try {
    scrollbar.renderNow();
    await delay(0);

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 24,
      shiftKey: true,
    });
    strip.dispatchEvent(event);

    assert.equal(strip.scrollLeft, 24);
    assert.equal(event.defaultPrevented, true);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});

test('horizontal scrollbar applies fast scroll sensitivity when alt is held', async () => {
  const host = document.createElement('div');
  const strip = document.createElement('div');
  const track = document.createElement('div');
  const thumb = document.createElement('div');
  host.append(strip, track);
  track.append(thumb);
  document.body.append(host);

  Object.defineProperty(strip, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(strip, 'scrollWidth', {
    configurable: true,
    value: 500,
  });
  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(track, 'clientHeight', {
    configurable: true,
    value: 4,
  });

  const scrollbar = new HorizontalScrollbar(host, strip, track, thumb, {
    fastScrollSensitivity: 4,
  });

  try {
    scrollbar.renderNow();
    await delay(0);

    const event = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 10,
      altKey: true,
      shiftKey: true,
    });
    strip.dispatchEvent(event);

    assert.equal(strip.scrollLeft, 40);
    assert.equal(event.defaultPrevented, true);
  } finally {
    scrollbar.dispose();
    host.remove();
  }
});
