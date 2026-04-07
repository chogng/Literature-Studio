# ActionBar 样式规范

## 目的

这份文档用于约束 `ActionBar` 的样式职责边界，避免后续继续把宿主尺寸、局部业务几何、组件骨架混写在一起。

默认目标：

1. 尽量对齐上游 `ActionBar` 的分层思路
2. 基类只负责结构、状态、交互
3. 宿主负责尺寸和场景化布局

## 相关文件

核心基类：

1. [`src/ls/base/browser/ui/actionbar/actionbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.ts)
2. [`src/ls/base/browser/ui/actionbar/actionbar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.css)
3. [`src/ls/base/browser/ui/actionbar/actionViewItems.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionViewItems.ts)

典型宿主：

1. [`src/ls/workbench/browser/parts/titlebar/media/titlebar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/titlebar/media/titlebar.css)
2. [`src/ls/workbench/browser/parts/sidebar/media/sidebarTopbarActions.css`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/sidebar/media/sidebarTopbarActions.css)
3. [`src/ls/workbench/browser/parts/primarybar/media/primarybar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/primarybar/media/primarybar.css)
4. [`src/ls/workbench/browser/parts/editor/media/editorToolbar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/workbench/browser/parts/editor/media/editorToolbar.css)
5. [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css)

## 对齐上游的原则

上游 `ActionBar` 的核心思路是：

1. 基类负责结构和交互
2. 具体场景自己决定按钮尺寸和布局

因此本仓库的 `ActionBar` 默认也按这个原则处理：

1. 不在基类里定义统一按钮尺寸 token
2. 不在基类里决定 icon size
3. 不在基类里承载 titlebar、sidebar、primarybar、editor toolbar 这类宿主几何

## 样式职责分层

### 1. `.actionbar`

负责：

1. 根节点布局
2. 横向/纵向方向类
3. 通用颜色语义 token
4. 通用圆角、gap、focus、hover、active、disabled 状态

不负责：

1. 按钮宽高
2. icon 尺寸
3. 宿主高度
4. 某个场景专用 padding

### 2. `.actionbar-actions-container`

负责：

1. actions 容器的 flex 布局
2. actions 之间的 gap

不负责：

1. 单个按钮尺寸
2. 某个业务按钮的几何特例

### 3. `.actionbar-item`

负责：

1. action item 外层包裹结构
2. active / checked 的容器态
3. split item 内部结构承接

不负责：

1. 具体按钮的宽高
2. 宿主级布局规则

### 4. `.actionbar-action`

负责：

1. 按钮基础交互样式
2. 通用 hover / focus / active / disabled 行为
3. icon / text / custom 模式的基础行为

不负责：

1. icon-only 按钮固定尺寸
2. 某个宿主里的 icon 宽高
3. 某个宿主里的按钮高度

### 5. 宿主根类

例如：

1. `.titlebar-actionbar`
2. `.sidebar-topbar-actions`
3. `.pane-header-actionbar`
4. `.editor-browser-toolbar-actions`
5. `.editor-draft-toolbar-group`

负责：

1. 这一组 actionbar 在宿主中的尺寸体系
2. 这一组按钮的高度、宽度、icon size
3. 宿主里的对齐方式、间距、上下文布局

### 6. 单按钮 class

例如：

1. `.titlebar-btn`
2. `.sidebar-topbar-toggle-btn`
3. `.editor-browser-toolbar-btn`
4. `.primarybar-footer-settings-btn`
5. `.editor-draft-toolbar-split-primary`

负责：

1. 单个按钮或单类按钮的局部几何和视觉差异
2. icon-only / text button / split primary / split dropdown 的局部特例

不负责：

1. actionbar 容器结构
2. 整组 action 的 gap
3. 宿主整组布局

## 判断规则

改 `ActionBar` 样式前，先按下面顺序判断：

1. 这是结构问题还是尺寸问题？
2. 这是所有 `ActionBar` 都成立，还是某个宿主独有？
3. 这是整组 actionbar 的问题，还是某一个按钮的特例？

对应落点：

1. 结构问题，改 `actionbar.css`
2. 宿主尺寸问题，改宿主 CSS
3. 单按钮特例，改按钮 class

## 允许放在基类里的内容

可以放：

1. `display`
2. `align-items`
3. `gap`
4. `border-radius`
5. `outline`
6. `cursor`
7. `disabled`
8. `hover/active/checked/focus` 的基础状态
9. split 结构骨架

## 不允许继续放在基类里的内容

不要再往 `actionbar.css` 加：

1. `--ls-actionbar-item-size`
2. `--ls-actionbar-icon-size`
3. 统一的 `width/height/min-width/min-height` 按钮尺寸规则
4. 某个宿主专用的 separator 高度
5. 某个宿主专用的 padding
6. 某个业务按钮的 icon 几何

## 推荐改法

### 新增一个宿主 actionbar 时

1. 先复用 `createActionBarView(...)`
2. 给宿主 actionbar 一个宿主 class
3. 在宿主 CSS 中定义按钮尺寸、icon 尺寸、局部布局
4. 如果某个按钮有特殊几何，再加 `buttonClassName`

### 遇到视觉问题时

优先判断：

1. 这是 `ActionBar` 基类结构错了吗？
2. 还是宿主没定义自己的尺寸？

如果只是某个界面上的按钮大小不对，默认优先改宿主，不要先改基类。

## 当前仓库里的既有约定

当前已经按这套规则处理的宿主包括：

1. titlebar
2. sidebar topbar
3. primarybar
4. editor browser toolbar
5. draft editor toolbar
6. agentbar / agent chat 顶栏与 composer actionbar

如果后续新增 actionbar 宿主，默认照这套落。

## ActionBar 弹出策略

`ActionBar` 相关弹出内容默认只看两种 DOM 形态：

1. `menu`：标准动作菜单
2. `renderOverlay`：自定义面板

默认优先级：

1. 能用 `menu` 就用 `menu`
2. 只有标准菜单表达不了时，才用 `renderOverlay`

`contextview` 仍然只是承载与定位层，不承担菜单视觉规范；具体规范见 [`docs/dropdown.md`](/Users/lance/Desktop/Literature-Studio/docs/dropdown.md)。

## 组合式 Split Action

### 背景

当前仓库里有一种常见 UI：一个主按钮，加一个下拉按钮，中间带分隔线。

典型例子是 draft editor toolbar 里的字号切换：

1. 主按钮负责执行当前动作
2. 右侧下拉按钮负责展开菜单
3. 外层视觉上表现为一个组合按钮

这套东西应尽量贴近上游 `ActionWithDropdownActionViewItem`，不要继续抽象成过重的通用 split 基座。

### 相关代码

核心结构在以下文件：

1. [`src/ls/base/browser/ui/actionbar/actionbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.ts)
2. [`src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts)
3. [`src/ls/base/browser/ui/actionbar/actionbar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.css)

一个实际使用例子在：

1. [`src/ls/editor/browser/text/editorToolbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/editorToolbar.ts)
2. [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css)

### 结构模型

组合式 action 不是一个特殊的“超级按钮”，而是一个容器里放两个现成 action：

1. primary action
2. dropdown action
3. separator

当前 DOM 结构大致是：

```html
<div class="actionbar-item is-action action-dropdown-item actionbar-split">
  <div class="actionbar-item is-action">
    <button class="actionbar-action ...">...</button>
  </div>
  <div class="action-dropdown-item-separator">
    <div></div>
  </div>
  <div class="actionbar-item is-action">
    <button class="actionbar-action ...">...</button>
  </div>
</div>
```

这和上游思路一致：本质上是 “action + dropdown” 的组合，不是全新控件体系。

### Split 的职责边界

`actionbar.css` 只负责组合控件的基础骨架：

1. `action-dropdown-item` 使用 `inline-flex`
2. separator 的基础布局
3. `actionbar-split` 容器的圆角、溢出裁切、整体 hover/active 表现
4. 两个内部 action 继续复用已有 `.actionbar-action` 行为

基座只管“怎么拼起来”，不管某个业务场景到底要多宽、多高、多少 padding。

业务样式负责：

1. primary 按钮宽度
2. primary 按钮 padding
3. dropdown 按钮宽度
4. dropdown icon size
5. separator 线的可视高度
6. 这一组按钮在该场景下的字体和 icon 表现

这些应写在业务样式里，例如 [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css)，而不是继续往 `actionbar.css` 里堆 split 专用变量。

### Split Dropdown 的高风险误区

这是后续最容易把样式写乱的地方，需要单独记住。

#### 误区 1

看到 split dropdown 的 trigger 在 `ActionBar` 里，就把展开后的菜单样式也写进 `actionbar.css`。

这是错的。

原因：

1. split dropdown 只有 trigger 属于 `ActionBar`
2. 一旦展开，内容已经进入 `dropdown / menu / contextview` 分层
3. 这时候继续改 `actionbar.css`，本质上是在让 trigger 层反向控制 menu 层

#### 误区 2

因为菜单是从某个 action 打开的，就把菜单宽度、阴影、边框写到宿主按钮 class。

这也是错的。

例如下面这些 class 只能管 trigger：

1. `editor-draft-toolbar-split-primary`
2. `editor-draft-toolbar-split-dropdown`
3. 其他 `buttonClassName`

它们不应该负责：

1. dropdown 面板宽度
2. menu item hover / selected
3. overlay 卡片背景和阴影

#### 误区 3

因为 `menuClassName` 是从 action item 上传下去的，就把它当成“菜单项 class”来用。

这也是容易出错的点。

在当前实现里，`menuClassName` 更接近 overlay scope class，不是直接挂到 menu item 上的 class。相关实现见 [`src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts#L302) 和 [`src/ls/platform/contextview/browser/contextMenuHandler.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/platform/contextview/browser/contextMenuHandler.ts#L31)。

所以：

1. 它适合做 overlay 区域范围约束
2. 不适合替代 `menu.css`
3. 更不应该用来承接通用 menu item 视觉

### 推荐使用方式

如果后续要新增类似控件，优先按下面方式做：

1. 在 actionbar item 层使用 split item，底层仍走 `createActionWithDropdownActionViewItem(...)`
2. 优先复用一个 primary action、一个 dropdown action 和现成 separator
3. 如果只是普通组合按钮，基座样式就够
4. 如果像 draft toolbar 这种有特殊几何要求，再给 primary / dropdown 按钮加业务 class

例如：

1. `editor-draft-toolbar-split-primary`
2. `editor-draft-toolbar-split-dropdown`

### Split 样式改动优先级

遇到视觉问题时，按这个顺序判断：

1. 这是组合骨架问题吗？
2. 这是某个具体业务场景的尺寸问题吗？
3. 还是其实已经是 dropdown/menu/contextview 层的问题？

如果是骨架问题，改 `actionbar.css`。

如果是某个场景自己的宽高、padding、icon size、separator 高度问题，改该场景自己的 CSS，不要把它抬成通用 token。

如果已经是展开后的菜单面板、menu item、overlay 内容问题，直接转去 [`docs/dropdown.md`](/Users/lance/Desktop/Literature-Studio/docs/dropdown.md)，不要继续在 `actionbar` 层处理。

## ActionBar 场景下的检查清单

每次给 `ActionBar` 加 dropdown 或 split dropdown 时，至少过一遍下面几条：

1. trigger 的宽高、padding、icon size 是否只写在宿主和 `buttonClassName`
2. `actionbar.css` 是否只在管骨架、状态和 split 结构
3. 展开后的菜单宽度是否交给 `menu.css` / `dropdown.css` 或 `minWidth`
4. `menuClassName` 是否只被拿来做 overlay scope，而不是通用 menu item 样式入口
5. `contextview.css` 是否保持中性，没有被塞进菜单视觉

## 一句话结论

`ActionBar` 基类只负责骨架和状态，尺寸归宿主，单按钮特例归按钮 class。
