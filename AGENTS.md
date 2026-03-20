上游在 C:\Users\lanxi\Desktop\code

编码处理约定
- 本仓库按 `.editorconfig` 使用 `utf-8`。
- 编辑含中文或其他非 ASCII 文本的文件前，先用严格 UTF-8 解码校验文件字节；校验通过后再编辑。
- 优先用 `apply_patch` 做文本修改，不要用 PowerShell 的 `Get-Content` / `Set-Content` / `WriteAllText` 对整文件做无差别重写。
- PowerShell 终端里中文显示成乱码，不等于文件编码损坏；先看严格 UTF-8 校验和字节验证结果，不要只凭终端输出判断。
- 对高风险文件，先复制到 `.tmp` 做一次 `apply_patch` 演练并验证，再改源文件。
- 本规则已在 `src/ls/workbench/browser/articleDetailsModalWindow.ts` 和 `src/language/locales/zh.ts` 的副本上实测通过：`apply_patch` 后仍为有效 UTF-8，且中文字节序列可验证存在。
