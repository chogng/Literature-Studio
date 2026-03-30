import type { LocaleMessages } from '../../../../../language/locales';

export type AuxiliaryBarLabels = {
  assistantAnswerTitle: string;
  assistantEvidenceTitle: string;
  assistantQuestion: string;
  assistantQuestionPlaceholder: string;
  assistantVoice: string;
  assistantImage: string;
  assistantSend: string;
  assistantSendBusy: string;
  assistantRerankOn: string;
  assistantRerankOff: string;
};

export function createAuxiliaryBarLabels(ui: LocaleMessages): AuxiliaryBarLabels {
  return {
    assistantAnswerTitle: ui.assistantSidebarAnswerTitle,
    assistantEvidenceTitle: ui.assistantSidebarEvidenceTitle,
    assistantQuestion: ui.assistantSidebarQuestion,
    assistantQuestionPlaceholder: ui.assistantSidebarQuestionPlaceholder,
    assistantVoice: ui.assistantSidebarVoice,
    assistantImage: ui.assistantSidebarImage,
    assistantSend: ui.assistantSidebarSend,
    assistantSendBusy: ui.assistantSidebarSendBusy,
    assistantRerankOn: ui.assistantSidebarRerankOn,
    assistantRerankOff: ui.assistantSidebarRerankOff,
  };
}
