预览架构约定
- 工作台预览相关改动遵循上游 editor 的分层思路：tab 负责管理 editor 中的输入与激活状态，editor 内容区渲染当前 active tab 对应的 pane。
- 网页/PDF 预览可以显示在当前 active tab 的 editor 内容区里，但仍保持为共享 preview surface；不要让每个 tab 各自持有一套 preview/view 实例。
- 共享预览只能复用现成的 Electron webcontents view；不要引入 iframe 或 webview 作为 editor tab 里的网页/PDF 渲染兜底。
- 共享网页/PDF 预览优先由状态机或纯函数驱动“当前谁拥有 preview、当前该显示哪个目标”；提交这类改动时补上简短注释，避免后续误把结构做回每 tab 一套 view。
- editor 内容类型新增或调整时，优先落到独立 pane 模块和统一 resolver 中，不要把 `tab.kind` 分支重新堆回 editor shell。
- editor pane resolver 继续按“tab 先转成 editor input，再由 descriptor 选 pane”的方式扩展；不要让 editor shell 直接知道每种内容该怎么渲染。

上游在 C:\Users\lanxi\Desktop\code

编码处理约定
- 本仓库按 `.editorconfig` 使用 `utf-8`。
- 编辑含中文或其他非 ASCII 文本的文件前，先用严格 UTF-8 解码校验文件字节；校验通过后再编辑。
- 优先用 `apply_patch` 做文本修改，不要用 PowerShell 的 `Get-Content` / `Set-Content` / `WriteAllText` 对整文件做无差别重写。
- PowerShell 终端里中文显示成乱码，不等于文件编码损坏；先看严格 UTF-8 校验和字节验证结果，不要只凭终端输出判断。
- 对高风险文件，先复制到 `.tmp` 做一次 `apply_patch` 演练并验证，再改源文件。
- 本规则已在 `src/ls/workbench/browser/articleDetailsModalWindow.ts` 和 `src/language/locales/zh.ts` 的副本上实测通过：`apply_patch` 后仍为有效 UTF-8，且中文字节序列可验证存在。
