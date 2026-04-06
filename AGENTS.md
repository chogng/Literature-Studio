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

颜色相关修改约束：
- 先查主题 token 和 color registry，再改具体样式。不要只改 CSS 里的 fallback 色值。
- 如果样式写的是 `var(--vscode-*, fallback)`，而界面颜色没变，优先检查 `src/ls/workbench/services/themes/common/themes/*.json` 和 `src/ls/platform/theme/common/colorRegistry*.ts` 里的同名 token。
- 只有在确认这不是主题语义色、或者明确就是局部写死色时，才直接改具体 CSS。
