import './lxicon.css';
import addSvg from './svg/add.svg?raw';
import addFileSvg from './svg/add-file.svg?raw';
import arrowDownSvg from './svg/arrow-down.svg?raw';
import arrowLeftSvg from './svg/arrow-left.svg?raw';
import arrowRightSvg from './svg/arrow-right.svg?raw';
import arrowUpSvg from './svg/arrow-up.svg?raw';
import checkSvg from './svg/check.svg?raw';
import chevronDownSvg from './svg/chevron-down.svg?raw';
import chevronRightSvg from './svg/chevron-right.svg?raw';
import closeSvg from './svg/close.svg?raw';
import downloadSvg from './svg/download.svg?raw';
import enterSvg from './svg/enter.svg?raw';
import exportSvg from './svg/export.svg?raw';
import filePdfSvg from './svg/file-pdf.svg?raw';
import gearSvg from './svg/gear.svg?raw';
import historySvg from './svg/history.svg?raw';
import imageSvg from './svg/image.svg?raw';
import layoutSidebarLeftSvg from './svg/layout-sidebar-left.svg?raw';
import layoutSidebarLeftOffSvg from './svg/layout-sidebar-left-off.svg?raw';
import layoutSidebarRightSvg from './svg/layout-sidebar-right.svg?raw';
import layoutSidebarRightOffSvg from './svg/layout-sidebar-right-off.svg?raw';
import librarySvg from './svg/library.svg?raw';
import linkExternalSvg from './svg/link-external.svg?raw';
import moreSvg from './svg/more.svg?raw';
import micSvg from './svg/mic.svg?raw';
import settingsSvg from './svg/settings.svg?raw';
import syncSvg from './svg/sync.svg?raw';
import refreshSvg from './svg/refresh.svg?raw';

export type LxIconName =
  | 'add'
  | 'add-file'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'download'
  | 'enter'
  | 'export'
  | 'file-pdf'
  | 'gear'
  | 'history'
  | 'image'
  | 'layout-sidebar-left'
  | 'layout-sidebar-left-off'
  | 'layout-sidebar-right'
  | 'layout-sidebar-right-off'
  | 'library'
  | 'link-external'
  | 'more'
  | 'mic'
  | 'settings'
  | 'sync'
  | 'refresh';

const SVG_BY_NAME: Record<LxIconName, string> = {
  add: addSvg,
  'add-file': addFileSvg,
  'arrow-down': arrowDownSvg,
  'arrow-left': arrowLeftSvg,
  'arrow-right': arrowRightSvg,
  'arrow-up': arrowUpSvg,
  check: checkSvg,
  'chevron-down': chevronDownSvg,
  'chevron-right': chevronRightSvg,
  close: closeSvg,
  download: downloadSvg,
  enter: enterSvg,
  export: exportSvg,
  'file-pdf': filePdfSvg,
  gear: gearSvg,
  history: historySvg,
  image: imageSvg,
  'layout-sidebar-left': layoutSidebarLeftSvg,
  'layout-sidebar-left-off': layoutSidebarLeftOffSvg,
  'layout-sidebar-right': layoutSidebarRightSvg,
  'layout-sidebar-right-off': layoutSidebarRightOffSvg,
  library: librarySvg,
  'link-external': linkExternalSvg,
  more: moreSvg,
  mic: micSvg,
  settings: settingsSvg,
  sync: syncSvg,
  refresh: refreshSvg,
};

function createSvgElement(markup: string) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const svg = template.content.firstElementChild;
  if (!(svg instanceof SVGElement)) {
    throw new Error('Invalid lxicon SVG markup');
  }
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

export function createLxIcon(name: LxIconName, className = '') {
  const icon = document.createElement('span');
  icon.className = ['lx-icon', `lx-icon-${name}`, className].filter(Boolean).join(' ');
  icon.setAttribute('aria-hidden', 'true');
  icon.append(createSvgElement(SVG_BY_NAME[name]));
  return icon;
}
