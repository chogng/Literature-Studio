# Editor Tab Mode Behavior

## 背景

编辑器顶部不是普通“tab 列表”，而是三种固定 mode 入口：

1. `draft`
2. `browser`
3. `pdf`

固定入口只负责表达“进入这个 mode”，不等同于“永远新建一个 tab”。真正的工作区 tab 仍然保存在 `editorModel` 里。

当前实现里：

1. 固定入口来自 [`src/ls/workbench/browser/parts/editor/editorGroupModel.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/editorGroupModel.ts)
2. 点击分发来自 [`src/ls/workbench/browser/parts/editor/tabsTitleControl.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/tabsTitleControl.ts)
3. 具体创建 / 激活策略来自 [`src/ls/workbench/browser/parts/editor/editorGroupView.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/editorGroupView.ts) 和 [`src/ls/workbench/browser/parts/editor/editorPart.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/editorPart.ts)

## 术语

### 固定 mode 入口

指顶部固定的 `draft` / `browser` / `pdf` 三个入口。

### 显式新建

指 add 菜单里用户主动选择 `Write` / `Browser` / `File` 的动作。

### 空态 tab

指当前 mode 下可继续输入或补全信息的“占位工作 tab”。

当前约定：

1. `browser` 的空态 tab 是 `url === 'about:blank'`
2. `draft` 的空态 tab 是正常 untitled draft，不需要额外 sentinel
3. `pdf` 目前没有长期驻留的空态 sentinel，创建时仍以 URL / 文件来源为准

## Browser 规则

### 固定 browsertab

点击固定 `browsertab` 时，规则如下：

1. 如果当前 group 里没有实际 browser tab：
   创建一个新的 browser tab，URL 固定为 `about:blank`，然后 focus 到地址栏。
2. 如果当前 group 已有 browser tab，且代表 tab 是 `about:blank`：
   激活该 tab，并 focus 到地址栏。
3. 如果当前 group 已有 browser tab，且代表 tab 不是 `about:blank`：
   只激活该 tab，不强制抢焦点。

这保证固定 `browsertab` 的语义始终是“进入 browser mode；若当前是空态，则引导输入 URL”。

### Add 菜单里的 Browser

add 菜单里的 `Browser` 是“显式新建 browser tab”，但 browser mode 的新建策略不再继承当前页面 URL，而是统一走空态：

1. 调用 `createBrowserTab('about:blank')`
2. 然后 focus 到地址栏

由于 [`src/ls/workbench/browser/parts/editor/editorModel.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/editorModel.ts) 对 content tab 采用“同资源去重”策略，若当前 group 已经存在 `about:blank` browser tab，则 add 菜单里的 `Browser` 不会制造重复空白 tab，而会直接激活已有空白 tab，再 focus 地址栏。

这意味着以下用户感知是成立的：

1. 固定 browsertab 首次点击：创建空白 browser tab 并引导输入 URL
2. 固定 browsertab 再次点击空白 tab：直接引导输入 URL
3. add -> Browser：显式创建 browser，但若已有空白 browser tab，则复用这一个空白 tab

## 长期稳健的抽象

建议把 editor mode 行为拆成四种动作，而不是继续混用“创建 tab”：

1. `ensureModeEntry(mode)`
   含义：保证用户进入该 mode；必要时创建一个该 mode 的默认工作 tab。
2. `createNewTab(mode)`
   含义：显式新建一个该 mode 的新 tab。
3. `openResource(mode, resource)`
   含义：打开某个具体资源，例如 URL、PDF URL、文件路径。
4. `focusModePrimaryInput(mode)`
   含义：把焦点移动到该 mode 最主要的输入入口。

对 browser 来说：

1. `ensureModeEntry('browser')`
   如果没有 browser tab，则创建 `about:blank`
   如果当前代表 tab 是空态，则 focus 地址栏
2. `createNewTab('browser')`
   创建或复用 `about:blank`
   然后 focus 地址栏
3. `openResource('browser', url)`
   打开指定 URL，并按资源 key 去重
4. `focusModePrimaryInput('browser')`
   focus titlebar URL input

## 是否可推广到 Draft / PDF

可以推广，但每个 mode 的“空态”语义不同，不能强行共用 browser 的 `about:blank` 规则。

### Draft

推荐规则：

1. 固定 `draft` 入口：
   若没有 draft tab，则 `ensureModeEntry('draft')` 创建一个 untitled draft
   若已有 draft，则激活代表 draft
2. add -> `Write`：
   总是 `createNewTab('draft')`
3. `focusModePrimaryInput('draft')`：
   focus 到编辑器正文

draft 和 browser 不同的点在于：

1. draft 的“空态”本身就是一个可编辑文档
2. add -> `Write` 通常应该真的创建新草稿，而不是复用已有 untitled draft

### PDF

推荐规则：

1. 固定 `pdf` 入口：
   若没有 pdf tab，则走 `ensureModeEntry('pdf')`
   这里通常不是创建 sentinel，而是触发“打开 PDF”来源选择或 URL 输入
2. add -> `File`：
   总是 `createNewTab('pdf')`，再进入 PDF 资源选择流程
3. `openResource('pdf', url)`：
   用资源 URL 去重

pdf 和 browser 不同的点在于：

1. pdf 没有合适的长期空白 sentinel
2. 它更适合“进入 mode 后立即要求资源”

## 推荐落地约束

为避免后续逻辑再次混乱，建议以后新增 mode 或重构时遵守以下约束：

1. 固定 mode 入口不得直接复用“显式新建 tab”的 handler，除非语义完全一致。
2. `createNewTab(mode)` 与 `ensureModeEntry(mode)` 必须是两个显式概念。
3. content tab 是否去重，必须由资源 key 决定，而不是由 view 层临时判断。
4. 空态判定必须封装成 mode 级规则，例如 `isEmptyBrowserTab(tab)`，不要在多个 view 中散落比较 `about:blank`。
5. focus 行为必须和 mode 绑定，而不是绑定某个局部 DOM；browser 当前绑定 titlebar URL input，后续如果地址栏容器变化，只应改一处。

## 当前代码状态

当前 browser 逻辑已经满足以下行为：

1. 固定 `browsertab` 首次点击会创建 `about:blank`
2. 固定 `browsertab` 命中空态 tab 时会 focus 地址栏
3. add -> `Browser` 也会创建 / 复用 `about:blank` 并 focus 地址栏
4. 已有非空 browser tab 时，固定 `browsertab` 点击只做激活，不强制 focus

后续如果继续重构，优先把以下两个 helper 正式抽出来：

1. `isEmptyBrowserTab(tab)`
2. `createOrRevealEmptyBrowserTab()`
