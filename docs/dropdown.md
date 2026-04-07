# Dropdown / Menu / ContextView 样式规范

## 目的

这份文档用于说明 `dropdown`、`menu`、`contextview` 三层在当前仓库中的职责边界，避免后续把 trigger、菜单内容、承载层样式混写。

默认目标：

1. trigger 样式和菜单样式分层清晰
2. `contextview` 只做承载和定位
3. `menu` 负责菜单内容视觉
4. `dropdown` 负责 trigger 和独立 dropdown 组件自己的菜单表现

## 与上游的关系

这份规范不是上游文档的逐字翻译，而是对上游职责边界的本地化归纳。

长期默认按上游思路收敛：

1. `ActionBar` 不负责 dropdown 展开后菜单的视觉和宽度
2. `contextview` 不负责菜单卡片视觉，只负责承载、挂载、定位、关闭
3. 菜单本体的视觉和宽度策略，归 `menu` 或 `dropdown` 自己的实现
4. 宿主如果有场景化宽度要求，通过调用参数或 scope class 局部约束，不把规则塞回基础层

## 先说结论

如果是 `ActionBar` 里的 dropdown 或 split dropdown，优先按下面理解：

1. trigger 按钮样式，归宿主和 `buttonClassName`
2. 菜单内容样式，归 `menu.css` 或该 overlay 自己的 CSS
3. `contextview` 只负责定位、挂载、点击外部关闭，不负责菜单视觉

也就是说，更重要的确实不是 `actionbar` 本身，而是：

1. menu 内容层
2. contextview 承载层

## 收敛后的弹出模型（2026-04）

仓库内统一按下面 3 类管理：

1. `DOM 表单下拉（listbox）`
2. `DOM 动作菜单（menu）`
3. `Native 菜单（Electron popup）`

其中：

1. 第 1 类用于“值选择”场景（例如字体、字号）
2. 第 2 类用于“动作触发”场景（ActionBar 菜单、右键菜单、split dropdown）
3. 第 3 类是第 2 类的 native backend，不单独定义新视觉规范

`renderOverlay` 仍保留，但它属于第 2 类中的“自定义面板形态”，只在标准 `menu` 无法表达时使用。

默认决策顺序：

1. 能用 `menu` 就不要用 `renderOverlay`
2. `renderOverlay` 仅用于复杂布局（分组描述、复合控件、历史面板等）
3. 不在 `contextview` 定义菜单视觉

## 相关文件

### Dropdown

1. [`src/ls/base/browser/ui/dropdown/dropdown.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdown.ts)
2. [`src/ls/base/browser/ui/dropdown/dropdown.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdown.css)
3. [`src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts)

### Menu

1. [`src/ls/base/browser/ui/menu/menu.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/menu/menu.ts)
2. [`src/ls/base/browser/ui/menu/menu.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/menu/menu.css)

### ContextView

1. [`src/ls/base/browser/ui/contextview/contextview.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/contextview/contextview.ts)
2. [`src/ls/base/browser/ui/contextview/contextview.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/contextview/contextview.css)
3. [`src/ls/platform/contextview/browser/contextMenuHandler.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/platform/contextview/browser/contextMenuHandler.ts)

## 三层模型

### 1. Trigger 层

trigger 是用户点开的那个按钮或字段。

常见例子：

1. `ActionBar` 里的 dropdown button
2. split action 右侧 dropdown button
3. 独立 `DropdownView` 的 `.dropdown-wrapper`

负责：

1. 按钮宽高
2. 按钮 padding
3. icon 尺寸
4. trigger 的 hover / focus / active 外观
5. trigger 在宿主里的布局

不负责：

1. 菜单面板视觉
2. overlay 定位逻辑

### 2. Menu 内容层

menu 是点开后真正看到的列表内容和菜单面板。

负责：

1. 菜单面板背景、边框、阴影、圆角
2. menu item 的 padding、hover、selected、disabled
3. checkmark、icon、文本布局
4. 菜单内容的默认宽度策略、最大宽度、最大高度、滚动（root/submenu 分开）

补充：

1. 二级菜单（submenu）属于这一层能力
2. 不应该塞到表单 `DropdownView` 的 `listbox` 语义里
3. root menu 可保留锚点宽度语义，submenu 仅按内容宽度策略，不使用 `%` 作为最小宽度

### 3. ContextView 承载层

`contextview` 是浮层宿主，不是菜单本体。

负责：

1. 固定定位
2. 挂载到 `document.body`
3. 对齐 anchor
4. outside click / Escape / scroll / resize 时关闭

不负责：

1. 菜单背景
2. 菜单 item 样式
3. trigger 样式

## 哪个文件负责哪层

### `dropdown.css`

`dropdown.css` 主要负责独立 dropdown 组件：

1. `.dropdown-wrapper`
2. `.custom-dropdown-field`
3. `.dropdown-icon-wrapper`
4. `.dropdown-menu`
5. `.dropdown-menu-item`

它适用于：

1. 独立 `DropdownView`
2. `dropdown.ts` 自己渲染出来的 DOM menu

它不应该成为所有 actionbar dropdown 的总样式入口。

### `menu.css`

`menu.css` 负责 repo 里的通用菜单视觉，特别是 context menu / actionbar menu 这类通过 `Menu` 渲染的菜单。

核心类：

1. `.ls-menu`
2. `.ls-menu .dropdown-menu-item`
3. `.ls-menu .dropdown-menu-item-content`
4. `.ls-menu .dropdown-menu-item-check`

所以如果 `DropdownMenuActionViewItem` 走的是：

1. `menu`
2. `contextMenuService`
3. `ContextMenuHandler`
4. `Menu`

那么菜单视觉默认应改 `menu.css`，不是 `actionbar.css`。

### `contextview.css`

`contextview.css` 只负责承载层：

1. `.ls-context-view`
2. `.ls-context-view-content`

这里默认只应该有：

1. 定位相关样式
2. pointer-events / z-index 这类宿主能力

不要把菜单卡片视觉、菜单 item 样式、业务背景直接写进这里。

## `ActionBar` dropdown 的分层

### 普通 actionbar dropdown

如果一个 action item 用的是 `DropdownMenuActionViewItem`：

1. trigger 样式归 `ActionBar` 宿主和 `buttonClassName`
2. 如果是 `menu` 模式，菜单样式归 `menu.css`
3. 如果是 `renderOverlay` 模式，overlay 内容样式归 overlay 自己的 CSS
4. `contextview` 只负责挂载和定位

落地约束：

1. “空菜单占位”允许短期走 `renderOverlay`
2. 一旦进入真实动作列表，优先改回 `menu`

### split action dropdown

对于 split action：

1. 左右按钮骨架和结构关系归 `actionbar.css`
2. 右侧 dropdown trigger 按钮尺寸归宿主按钮类
3. 下拉出来的 menu / overlay 样式不归 `actionbar.css`

这点非常重要：

split action 的 dropdown 按钮属于 `ActionBar` trigger 层，但 dropdown 展开的内容已经进入 menu/contextview 分层，不能继续在 `actionbar.css` 里处理。

## `menuClassName` 挂在哪

这是最容易混的点。

### 对 `DropdownMenuActionViewItem`

无论是：

1. `renderOverlay`
2. `contextMenuService`

`menuClassName` 最终都优先作为 contextview 内容包装层的 class 使用。

也就是说，它更接近：

1. overlay scope class
2. context scope class

而不是“直接挂在 menu item 上的 class”。

因此：

1. 如果要改整个 overlay 区域的布局、内边距、宽度范围，用 `menuClassName`
2. 如果要改菜单项本身的通用视觉，优先改 `menu.css`
3. 如果要改某个自定义 overlay 里的业务节点，改 overlay 自己返回的 DOM class

### 这里最容易犯的错误

1. 把 `menuClassName` 当成“菜单项 class”
2. 在 `menuClassName` 对应的 CSS 里直接重写通用 `.dropdown-menu-item`
3. 用 `menuClassName` 去承接本来应该进 `menu.css` 的通用菜单视觉

默认不要这么做。

在当前实现里，`menuClassName` 是随 overlay 一起传入 context view 容器的 scope class，见 [`src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts#L302) 和 [`src/ls/platform/contextview/browser/contextMenuHandler.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/platform/contextview/browser/contextMenuHandler.ts#L31)。

所以它的定位始终是：

1. overlay scope
2. 局部宽度约束
3. 自定义 overlay 外层布局

不是通用菜单样式总入口。

## 菜单宽度谁负责

这是后续最容易反复打架的点，单独写清楚。

### 默认规则

1. 菜单默认宽度策略归菜单内容层负责
2. `ActionBar` 不负责展开后菜单宽度
3. `contextview` 不定义菜单视觉宽度，只接收外部给的最小宽度约束

延伸规则：

1. 二级菜单宽度策略也归 `menu.css`
2. `contextview.css` 不承接子菜单卡片样式

### 分实现看

如果走独立 `DropdownView`：

1. 菜单宽度改 `dropdown.css` 里的 `.dropdown-menu`

如果走 `DropdownMenuActionViewItem -> contextMenuService -> Menu`：

1. 菜单默认宽度策略改 `menu.css` 里的 `.ls-menu`
2. 调用方需要场景最小宽度时，传 `minWidth`
3. 调用方需要局部宽度范围或 overlay 布局时，用 `menuClassName`
4. 调用方需要固定左右对齐时，用 `overlayAlignment: 'start' | 'end'`
5. 调用方需要动态决策时，优先用 `overlayAlignmentProvider(anchor) => 'start' | 'end'`
6. 调用方需要通用语义策略时，用 `overlayAlignmentPolicy`（`strict-*` / `prefer-*` / `edge-aware`）

### 不推荐的做法

不要把菜单宽度写到：

1. `actionbar.css`
2. `contextview.css`
3. 某个宿主的 trigger button class

因为这些层都不是菜单本体。

也不要把通用菜单宽度策略拆散到多个宿主 CSS 里分别处理。

长期看，这种写法一定会产生：

1. 同类 dropdown 在不同宿主下表现不一致
2. 某个宿主修菜单时误伤别的场景
3. 想和上游继续对齐时越来越难收敛

## 容易写错层的几种情况

### 情况 1

问题：某个 action 打开的菜单太窄，于是直接改 `buttonClassName`

不推荐。

正确做法：

1. 先判断这是默认菜单宽度策略问题，还是单个场景最小宽度问题
2. 默认策略问题改 `menu.css` 或 `dropdown.css`
3. 单场景约束用 `minWidth` 或 `menuClassName`

### 情况 2

问题：某个 overlay 的背景、圆角、阴影看起来像菜单，于是改 `contextview.css`

不推荐。

正确做法：

1. `contextview.css` 只保留承载层能力
2. 真正的卡片视觉回到 `menu.css`、`dropdown.css` 或自定义 overlay 自己的 CSS

### 情况 3

问题：某个宿主里 dropdown 视觉想特殊一点，于是直接在宿主 CSS 里覆盖 `.dropdown-menu` 或 `.ls-menu`

这是高风险写法。

只有在明确需要局部 overlay scope 时，才允许通过 `menuClassName` 缩小作用域后处理。

默认不要让宿主 CSS 直接碰通用菜单类。

## 改样式时怎么判断落点

### 情况 1

问题：dropdown 按钮太大、太小、padding 不对

落点：

1. 宿主 CSS
2. `buttonClassName`
3. `ActionBar` 宿主根类

不要改：

1. `menu.css`
2. `contextview.css`

### 情况 2

问题：菜单面板阴影、边框、item hover、selected 状态不对

落点：

1. `menu.css`
2. `dropdown.css`

如何选：

1. 如果是独立 `DropdownView` 的菜单，改 `dropdown.css`
2. 如果是 context menu / actionbar menu / `Menu` 渲染的菜单，改 `menu.css`

### 情况 3

问题：浮层位置、点击外部关闭、scroll 后关闭、overlay 跟随 anchor

落点：

1. `contextview.ts`
2. `contextview.css`

但一般应只改行为和承载，不改视觉。

### 情况 4

问题：自定义 overlay 里的卡片、popover、表单、复杂业务区块样式

落点：

1. overlay 业务模块自己的 CSS

不要改：

1. `menu.css`
2. `actionbar.css`
3. `contextview.css`

## 推荐规则

默认按下面顺序找样式落点：

1. trigger 问题，先看宿主和 `buttonClassName`
2. menu 内容问题，先看 `menu.css` 或 `dropdown.css`
3. overlay 承载问题，才看 `contextview`
4. 自定义 overlay 的业务内容，回业务模块

## 检查清单

每次改 dropdown / menu / contextview 相关样式前，先过一遍：

1. 我现在改的是 trigger，还是展开后的内容？
2. 我是不是在宿主层直接改了通用菜单类？
3. 我是不是把 `menuClassName` 当成了 menu item class？
4. 我是不是把菜单视觉塞进了 `contextview.css`？
5. 这个宽度问题到底是默认策略，还是单场景最小宽度约束？

## 长期方案

长期默认采用更接近上游的收敛方向：

1. trigger 留在宿主层
2. menu 留在菜单层
3. contextview 保持中性承载层
4. 只在调用点传最小必要的宽度约束，不在基础层追加场景特化规则

如果一个需求只能通过改 `actionbar.css` 或 `contextview.css` 才能影响 dropdown 菜单宽度，默认先判断分层是不是已经错了。

## 一句话结论

`ActionBar` dropdown 的 trigger 样式归宿主，menu 样式归菜单层，`contextview` 只做浮层承载。
