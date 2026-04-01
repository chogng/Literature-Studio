import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { installDomTestEnvironment } from 'ls/editor/browser/text/tests/domTestUtils';
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

    historyButton.dispatchEvent(new Event('focus', { bubbles: true }));
    await delay(0);

    const overlayContent = document.querySelector('.ls-hover-content');
    assert(overlayContent instanceof HTMLElement);
    assert.equal(overlayContent.textContent, 'History');
  } finally {
    auxiliaryBar.dispose();
  }
});
