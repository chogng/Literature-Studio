# Journal Reader (Electron + React + Vite)

一个用于阅读期刊网页、抓取文章信息、批量处理最新文章的桌面应用骨架。

## 功能概览

- 左侧结果面板：展示抓取结果与历史记录
- 右侧网页预览：在桌面模式下直接浏览目标网页
- 支持单篇文章抓取
- 支持从期刊首页或最新文章页批量抓取
- 支持按起止日期筛选批量抓取范围
- 支持按关键词和来源 URL 过滤结果
- 支持本地设置保存
- 支持 PDF 下载目录配置
- 支持导出结构化信息

当前抓取结果主要包括：

- 标题 `title`
- DOI `doi`
- 作者 `authors`
- 摘要 `abstract`
- 发布时间 `publishedAt`
- 来源链接 `sourceUrl`

## 技术栈

- 前端：React 19 + Vite 7 + TypeScript
- 桌面壳：Electron
- 抓取后端：Electron Main Process + Node.js + Cheerio

## 开发启动

安装依赖：

```bash
npm install
```

启动桌面开发环境：

```bash
npm run dev
```

## 纯 Web 调试模式

如果只想快速排查前端布局，而不依赖 Electron 主进程能力，可以使用：

```bash
npm run dev:web
```

说明：

- 这个模式主要用于调试界面布局和交互
- 纯 Web 模式下，抓取、历史、目录选择、PDF 下载等桌面能力不可用
- 纯 Web 模式下的网页预览仍然会受到 `iframe` 安全策略限制

## 构建与运行

构建项目：

```bash
npm run build
```

构建后启动桌面应用：

```bash
npm run start
```

## 项目结构说明

- 主进程入口：[electron/main.ts](c:\Users\lanxi\Desktop\Literature-Studio\electron\main.ts)
- 预加载桥接：[electron/preload.ts](c:\Users\lanxi\Desktop\Literature-Studio\electron\preload.ts)
- 主窗口管理：[electron/window.ts](c:\Users\lanxi\Desktop\Literature-Studio\electron\window.ts)
- 原生网页预览管理：[electron/preview-view.ts](c:\Users\lanxi\Desktop\Literature-Studio\electron\preview-view.ts)
- 渲染层主界面：[src/App.tsx](c:\Users\lanxi\Desktop\Literature-Studio\src\App.tsx)
- 阅读视图：[src/views/ReaderView.tsx](c:\Users\lanxi\Desktop\Literature-Studio\src\views\ReaderView.tsx)

Electron 侧主要通过 `window.electronAPI.invoke` 和 `window.electronAPI.preview` 与渲染进程通信。

## 预览白屏问题记录

### 现象

- 在地址栏输入链接并按 Enter 后，右侧预览区白屏
- 某些站点，例如 `nature.com`，控制台会出现 `X-Frame-Options: deny` 或 `frame-ancestors` 相关报错
- 开发过程中可能伴随 React Fast Refresh 的 `useEffect` 依赖警告，但这不是白屏主因

### 根因

- 旧方案依赖 `iframe` 或 `webview` 思路承载网页
- 当目标站点禁止被嵌入时，浏览器安全策略会直接拦截页面显示
- 当渲染进程已经运行在 Electron 中，但新的 `main` / `preload` 尚未完整重启时，会出现“Electron 壳已启动，但桌面预览桥未就绪”的错位状态
- 这时界面表面上像是“容器没铺满”或“高度顶不出来”，实际上是预览承载方式和运行时判断错了

### 解决方案

- 在主进程中使用 `WebContentsView` 承载右侧网页预览，而不是继续依赖 `iframe` / `webview`
- 渲染进程中的预览区域只负责提供占位容器
- 渲染进程通过 IPC 持续把容器的 `bounds`、可见性和导航意图同步给主进程
- 主进程根据这些信息调用 `setBounds` / `setVisible`，让原生预览视图与 React 布局保持一致
- 在运行时区分 `electronRuntime` 和 `previewRuntime`

含义如下：

- `electronRuntime`：当前运行在 Electron 环境中
- `previewRuntime`：新的桌面预览桥已经真正可用

额外兜底：

- 当 `previewRuntime` 未就绪时，界面会直接提示需要完整重启 Electron
- 不再静默退回到 `iframe` 后继续白屏

### 结果

- 桌面模式下，像 `nature.com` 这类禁止 iframe 嵌入的页面也可以正常显示
- 右侧预览区域能够随容器正确铺满
- 纯 Web 调试模式下仍然会受到 `iframe` 策略限制，这属于预期行为

### 注意

- 只改渲染进程代码后进行热更新通常不够
- 只要改到了 `electron/main.ts`、`electron/preload.ts`、IPC 或 `WebContentsView` 逻辑，就需要完整重启 `npm run dev` 对应的 Electron 进程

## 当前限制

- 纯 Web 模式无法绕过所有站点的 iframe 安全策略
- 某些站点需要额外的专用抓取逻辑
- 前进/后退等导航能力依赖桌面预览桥可用

## 后续可扩展方向

- 为不同出版商增加专用解析器
- 增加更稳定的历史存储方案，例如 SQLite
- 增加更强的全文提取能力
- 为必须执行 JS 的站点接入 Playwright sidecar
