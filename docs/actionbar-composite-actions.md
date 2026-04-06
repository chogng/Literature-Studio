# Actionbar 组合式 Action 说明

## 背景

当前仓库里有一种常见 UI：一个主按钮，加一个下拉按钮，中间带分隔线。

典型例子是 draft editor toolbar 里的字号切换：

1. 主按钮负责执行当前动作
2. 右侧下拉按钮负责展开菜单
3. 外层视觉上表现为一个组合按钮

这套东西的实现思路应当尽量贴近上游 `ActionWithDropdownActionViewItem`，不要把它继续抽象成过重的通用 split 基座。

## 相关代码

核心结构在以下文件：

1. [`src/ls/base/browser/ui/actionbar/actionbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.ts)
2. [`src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/dropdown/dropdownActionViewItem.ts)
3. [`src/ls/base/browser/ui/actionbar/actionbar.css`](/Users/lance/Desktop/Literature-Studio/src/ls/base/browser/ui/actionbar/actionbar.css)

一个实际使用例子在：

1. [`src/ls/editor/browser/text/editorToolbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/editorToolbar.ts)
2. [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css)

## 结构模型

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

这和上游思路一致：本质上是“action + dropdown”的组合，不是全新控件体系。

## 职责边界

### actionbar 基座负责什么

`actionbar.css` 只负责组合控件的基础骨架：

1. `action-dropdown-item` 使用 `inline-flex`
2. separator 的基础布局
3. `actionbar-split` 容器的圆角、溢出裁切、整体 hover/active 表现
4. 两个内部 action 继续复用已有 `.actionbar-action` 行为

换句话说，基座只管“怎么拼起来”，不管某个业务场景到底要多宽、多高、多少 padding。

### 业务样式负责什么

像 draft toolbar 这样的具体场景，自己的 CSS 负责：

1. primary 按钮宽度
2. primary 按钮 padding
3. dropdown 按钮宽度
4. dropdown icon size
5. separator 线的可视高度
6. 这一组按钮在该场景下的字体和 icon 表现

这些应该写在业务样式里，例如 [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css)，而不是继续往 `actionbar.css` 里堆 split 专用变量。

## 为什么不要做重基座抽象

之前这里容易走偏的点是，把组合 action 的宽高、padding、separator 高度、dropdown icon size 都上提到 `actionbar.css`。

这会带来几个问题：

1. `actionbar.css` 开始承载具体业务几何，不再是纯骨架
2. split 相关变量越来越多，维护成本高
3. 后续别的场景接入时，会误以为这些变量是稳定通用能力
4. 真实责任边界被模糊，出了样式问题很难判断该改基座还是改业务层

因此当前约束是：

1. 优先复用 `ActionWithDropdownActionViewItem`
2. 基座只保留组合容器的基础结构
3. 业务几何样式留在各自模块

## 推荐使用方式

如果后续要新增类似控件，优先按下面方式做。

### 1. 先复用结构

在 actionbar item 层使用 split item，底层仍走 `createActionWithDropdownActionViewItem(...)`。

也就是说，优先复用：

1. 一个 primary action
2. 一个 dropdown action
3. 现成 separator

### 2. 再决定是否需要局部 class

如果只是普通组合按钮，基座样式就够。

如果像 draft toolbar 这种有特殊几何要求，再给 primary / dropdown 按钮加业务 class，例如：

1. `editor-draft-toolbar-split-primary`
2. `editor-draft-toolbar-split-dropdown`

### 3. 样式改动优先级

遇到视觉问题时，按这个顺序判断：

1. 这是组合骨架问题吗
2. 这是某个具体业务场景的尺寸问题吗

如果是骨架问题，改 `actionbar.css`。

如果是某个场景自己的宽高、padding、icon size、separator 高度问题，改该场景自己的 CSS，不要把它抬成通用 token。

## draft toolbar 当前约定

draft toolbar 的字号切换目前遵守下面这个分层：

1. 结构上用组合式 actionbar
2. 容器 hover/active 表现走 `actionbar-split`
3. 主按钮和下拉按钮的几何尺寸由 [`src/ls/editor/browser/text/media/editor.css`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/media/editor.css) 决定
4. 当前字号标签由 [`src/ls/editor/browser/text/editorToolbar.ts`](/Users/lance/Desktop/Literature-Studio/src/ls/editor/browser/text/editorToolbar.ts) 渲染

因此如果以后有人觉得字号按钮：

1. 太宽
2. padding 太大
3. separator 太高
4. chevron 太小或太大

优先去改 draft toolbar 自己的 CSS，而不是先动 `actionbar.css`。

## 一句话结论

这个“组合式 actionbar”本质上不是新控件体系，而是：

1. 复用 actionbar action
2. 复用 dropdown action view item
3. 用一个轻量容器把它们拼起来
4. 业务样式只在自己的模块里补几何细节
