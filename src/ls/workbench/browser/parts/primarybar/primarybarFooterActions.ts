import { createActionBarView } from 'ls/base/browser/ui/actionbar/actionbar';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { requestToggleTitlebarSettings } from 'ls/workbench/browser/parts/titlebar/titlebarActions';

import 'ls/workbench/browser/parts/primarybar/media/primarybarFooterActions.css';

export type PrimaryBarFooterActionsProps = {
  accountLabel?: string;
  settingsLabel?: string;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

export class PrimaryBarFooterActionsView {
  private readonly hostElement = createElement(
    'div',
    'primarybar-footer-actions-host',
  );
  private readonly accountElement = createElement(
    'div',
    'primarybar-footer-account',
  );
  private readonly avatarElement = createElement(
    'div',
    'primarybar-footer-avatar',
  );
  private readonly accountLabelElement = createElement(
    'span',
    'primarybar-footer-account-label',
  );
  private readonly actionBarView = createActionBarView({
    className: 'primarybar-footer-actions',
    ariaRole: 'group',
  });

  constructor(props?: PrimaryBarFooterActionsProps) {
    this.avatarElement.append(createLxIcon('account'));
    this.accountElement.append(this.avatarElement, this.accountLabelElement);
    this.hostElement.append(this.accountElement, this.actionBarView.getElement());
    if (props) {
      this.setProps(props);
    }
  }

  getElement() {
    return this.hostElement;
  }

  setProps(props: PrimaryBarFooterActionsProps) {
    this.accountLabelElement.textContent = props.accountLabel?.trim() || '';
    this.actionBarView.setProps({
      className: 'primarybar-footer-actions',
      ariaRole: 'group',
      items: [
        {
          label: props.settingsLabel ?? '',
          title: props.settingsLabel ?? '',
          mode: 'icon',
          buttonClassName: 'primarybar-footer-settings-btn',
          content: createLxIcon('gear'),
          onClick: requestToggleTitlebarSettings,
        },
      ],
    });
  }

  dispose() {
    this.actionBarView.dispose();
    this.hostElement.replaceChildren();
  }
}
