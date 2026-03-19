import { jsx, jsxs } from 'react/jsx-runtime';
import {
  getWorkbenchContentClassName,
  WORKBENCH_PART_IDS,
  useWorkbenchPartRef,
} from './layout';
import EditorPartView, { type EditorPartProps } from './parts/editor/editorPartView';
import SidebarView, { type SidebarProps } from './parts/sidebar/sidebarView';

type ReaderViewProps = {
  isSidebarVisible: boolean;
  sidebarProps: SidebarProps;
  editorPartProps: EditorPartProps;
};

function renderSidebarPart({
  isSidebarVisible,
  sidebarPartRef,
  sidebarProps,
}: {
  isSidebarVisible: boolean;
  sidebarPartRef: ReturnType<typeof useWorkbenchPartRef>;
  sidebarProps: SidebarProps;
}) {
  if (!isSidebarVisible) {
    return null;
  }

  return jsx(SidebarView, { partRef: sidebarPartRef, ...sidebarProps });
}

export default function ReaderView({
  isSidebarVisible,
  sidebarProps,
  editorPartProps,
}: ReaderViewProps) {
  const sidebarPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.sidebar);
  const contentClassName = getWorkbenchContentClassName({
    isSidebarVisible,
  });
  const sidebarPartView = renderSidebarPart({
    isSidebarVisible,
    sidebarPartRef,
    sidebarProps,
  });

  return jsxs('main', {
    className: contentClassName,
    children: [sidebarPartView, jsx(EditorPartView, { ...editorPartProps })],
  });
}
