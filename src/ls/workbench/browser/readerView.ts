import { jsx, jsxs } from "react/jsx-runtime";
import { type CSSProperties } from "react";
import {
  getWorkbenchContentClassName,
  getWorkbenchContentStyle,
  WORKBENCH_PART_IDS,
  type WorkbenchSidebarKind,
  useWorkbenchPartRef,
} from "./layout";
import EditorPartView, {
  type EditorPartProps,
} from "./parts/editor/editorPartView";
import {
  AuxiliarySidebarPartView,
  PrimarySidebarPartView,
  SecondarySidebarPartView,
  type SecondarySidebarProps,
} from "./parts/sidebar/secondarySidebarPart";
import type {
  LibraryDocumentsResult,
  RagAnswerResult,
} from "../../base/parts/sandbox/common/desktopTypes.js";

type ReaderViewProps = {
  isSidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
  isAuxiliarySidebarVisible: boolean;
  secondarySidebarProps: SecondarySidebarProps;
  primarySidebarProps: {
    labels: SecondarySidebarProps["labels"];
    librarySnapshot: LibraryDocumentsResult;
    isLibraryLoading: boolean;
    onRefreshLibrary?: () => void;
    onDownloadPdf?: () => void;
    onCreateDraftTab?: () => void;
  };
  auxiliarySidebarProps: {
    labels: SecondarySidebarProps["labels"];
    isKnowledgeBaseModeEnabled: boolean;
    librarySnapshot: LibraryDocumentsResult;
    question: string;
    onQuestionChange: (value: string) => void;
    result: RagAnswerResult | null;
    isAsking: boolean;
    errorMessage: string | null;
    onAsk: () => void;
    availableArticleCount: number;
  };
  editorPartProps: EditorPartProps;
};

function renderSidebarPart({
  isSidebarVisible,
  activeSidebarKind,
  secondarySidebarPartRef,
  secondarySidebarProps,
  primarySidebarPartRef,
  primarySidebarProps,
}: {
  isSidebarVisible: boolean;
  activeSidebarKind: WorkbenchSidebarKind;
  secondarySidebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  secondarySidebarProps: SecondarySidebarProps;
  primarySidebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  primarySidebarProps: ReaderViewProps["primarySidebarProps"];
}) {
  if (!isSidebarVisible) {
    return null;
  }

  if (activeSidebarKind === "primary") {
  return jsx(PrimarySidebarPartView, {
    partRef: primarySidebarPartRef,
    ...primarySidebarProps,
  });
}

  return jsx(SecondarySidebarPartView, {
    partRef: secondarySidebarPartRef,
    ...secondarySidebarProps,
  });
}

export default function ReaderView({
  isSidebarVisible,
  activeSidebarKind,
  isAuxiliarySidebarVisible,
  secondarySidebarProps,
  primarySidebarProps,
  auxiliarySidebarProps,
  editorPartProps,
}: ReaderViewProps) {
  const secondarySidebarPartRef = useWorkbenchPartRef(
    WORKBENCH_PART_IDS.secondarySidebar
  );
  const primarySidebarPartRef = useWorkbenchPartRef(
    WORKBENCH_PART_IDS.primarySidebar
  );
  const auxiliarySidebarPartRef = useWorkbenchPartRef(
    WORKBENCH_PART_IDS.auxiliarySidebar
  );
  const contentClassName = getWorkbenchContentClassName({
    isSidebarVisible,
    isAuxiliarySidebarVisible,
    activeSidebarKind,
  });
  const contentStyle = getWorkbenchContentStyle({
    isSidebarVisible,
    isAuxiliarySidebarVisible,
    activeSidebarKind,
  }) as CSSProperties;
  const sidebarPartView = renderSidebarPart({
    isSidebarVisible,
    activeSidebarKind,
    secondarySidebarPartRef,
    secondarySidebarProps,
    primarySidebarPartRef,
    primarySidebarProps,
  });
  const auxiliarySidebarPartView = isAuxiliarySidebarVisible
    ? jsx(AuxiliarySidebarPartView, {
        partRef: auxiliarySidebarPartRef,
        ...auxiliarySidebarProps,
      })
    : null;

  return jsxs("main", {
    className: contentClassName,
    style: contentStyle,
    children: [
      sidebarPartView,
      jsx(EditorPartView, { ...editorPartProps }),
      auxiliarySidebarPartView,
    ],
  });
}
