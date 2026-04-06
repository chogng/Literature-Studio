上游在 C:\Users\lanxi\Desktop\code or /Users/lance/Desktop/code-main
prosemirror的官方文档如下
[https://github.com/prosemirror](https://github.com/prosemirror)
[https://prosemirror.net/examples/](https://prosemirror.net/examples/)
[https://prosemirror.net/docs/](https://prosemirror.net/docs/)
tiptap的官方文档如下
[https://tiptap.dev/docs/editor/getting-started/overview](https://tiptap.dev/docs/editor/getting-started/overview)
[https://tiptap.dev/docs/guides](https://tiptap.dev/docs/guides)
[https://tiptap.dev/docs/examples](https://tiptap.dev/docs/examples)
[https://tiptap.dev/docs/ui-components/getting-started/overview](https://tiptap.dev/docs/ui-components/getting-started/overview)
[https://github.com/ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)

UI 规范文档：
- ActionBar 样式职责和分层规范见 `docs/actionbar.md`
- Dropdown / Menu / ContextView 样式分层规范见 `docs/dropdown.md`

颜色相关修改约束：
- 先查主题 token 和 color registry，再改具体样式。不要只改 CSS 里的 fallback 色值。
- 如果样式写的是 `var(--vscode-*, fallback)`，而界面颜色没变，优先检查 `src/ls/workbench/services/themes/common/themes/*.json` 和 `src/ls/platform/theme/common/colorRegistry*.ts` 里的同名 token。
- 只有在确认这不是主题语义色、或者明确就是局部写死色时，才直接改具体 CSS。

尺寸相关修改约束：
- `ActionBar`、`InputBox`、`Button` 这类基础 UI 组件，基类优先只负责结构、交互和默认兜底，不负责具体宿主尺寸设计。
- 组件的实际尺寸应由宿主样式负责；例如 titlebar、sidebar、primarybar、editor toolbar 各自决定按钮或输入框的高度、宽度、padding。
- 颜色走主题 token；尺寸不要塞进 theme token / color registry。
- 修改基础组件尺寸前，先看上游是否由宿主负责；若上游是宿主负责，默认优先对齐上游分层，而不是在基类里新增尺寸抽象。
- `InputBox`：保留基础默认尺寸参数（如高度、内边距、圆角）作为组件默认值；具体场景尺寸优先由宿主通过局部变量覆写，不把 titlebar/editor/browser 等场景直接写进基类。
- `Button`：允许保留 `sm/md/lg/icon` 这类公开尺寸 API，因为这本身就是组件语义；但不要为了某个宿主场景把专用尺寸或布局规则塞回 `button.css`。
- 如果一个尺寸规则只服务于单个界面或单个业务场景，应放到该宿主 CSS；如果一个尺寸规则是组件公开 API 且被多个场景稳定复用，才允许留在基础组件。
