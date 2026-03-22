# Literature Studio

一个面向期刊网页阅读与文献信息整理的桌面应用，基于 Electron、React、TypeScript 和 Vite 构建。

它现在不只是“抓文章骨架”，而是一套已经跑起来的工作台：

- 在桌面端直接预览期刊网页，而不是依赖易受限制的 `iframe`
- 从单篇文章页抓取结构化信息
- 从期刊列表页或最新文章页批量抓取文章
- 按日期范围、来源和关键词过滤结果
- 下载文章 PDF
- 选中文献卡片后导出 DOCX
- 在设置页维护默认抓取源、下载目录、语言和模型提供方配置

## 当前能力

### Reader 工作台

- 左侧侧边栏展示抓取结果，并支持筛选与选择模式
- 顶部地址栏支持手动输入 URL，也支持“快速来源”切换
- 右侧预览区在 Electron 中使用原生预览桥接，可正常显示很多禁止 iframe 嵌入的站点
- 支持单篇抓取和批量抓取
- 批量抓取支持起止日期限制
- 批量抓取支持同域限制

### 文献处理

- 抓取结果包含标题、作者、摘要或描述、DOI、发布日期、来源链接等结构化字段
- 支持打开文章详情弹窗
- 支持按文章来源下载 PDF
- 支持将选中的文献卡片导出为 DOCX
- DOCX 导出会按期刊分组，并复用本地模型配置将摘要或描述翻译为中文

### 设置与本地存储

- 支持中英文界面切换
- 支持维护默认批量抓取来源列表
- 支持配置默认 PDF 下载目录
- 支持配置和测试 GLM、Kimi、DeepSeek 等 OpenAI 兼容接口
- 设置与历史记录会保存到本地

默认内置了一批常用来源，包括：

- `Science`
- `Science Advances`
- `Nature Latest News`
- `Nature Opinion`
- 多个 Nature research-articles / reviews-and-analysis 列表页
- `arXiv Computer Science`

## 技术栈

- 渲染层：React 19 + TypeScript + Vite 7
- 桌面壳：Electron 37
- 抓取与文件处理：Electron Main Process + Node.js
- HTML 解析：Cheerio

## 开发

安装依赖：

```bash
npm install
```

启动桌面开发环境：

```bash
npm run dev
```

这个命令会同时启动：

- Vite 渲染层开发服务器
- Electron 主进程 TypeScript watch 构建
- Electron 进程自动重启

如果端口被旧进程占用，`predev` 会先运行 [`kill-dev-ports.ps1`](/c:/Users/lanxi/Desktop/Literature-Studio/kill-dev-ports.ps1)。

## 纯 Web 调试模式

如果只想调布局或交互，不需要 Electron 主进程能力，可以运行：

```bash
npm run dev:web
```

这个模式下：

- 可用于调试前端界面
- 不支持抓取、PDF 下载、DOCX 导出、目录选择、模型连通性测试等桌面能力
- 网页预览仍会受到浏览器 `iframe` 安全策略限制

## 构建与运行

构建：

```bash
npm run build
```

启动桌面应用：

```bash
npm run start
```

触发 GitHub Actions 自动打包发布：

```bash
git tag -a vX.Y.Z -m "release vX.Y.Z"
git push origin vX.Y.Z
```

当前发布 workflow 会生成这些产物：

- Windows 安装包
- Windows Portable
- macOS DMG
- macOS ZIP

首个发布版本可以从 `v0.1.0` 开始。

可选检查：

```bash
npm run check:i18n
```

## 数据与配置位置

应用启动时会把 Electron 的用户数据目录统一映射到 `~/.reader`：

- 配置文件：`~/.reader/config/config.json`
- 历史记录：`~/.reader/data/history.json`
- 缓存与临时目录：`~/.reader/cache/*`
- 日志目录：`~/.reader/logs`

对应实现可以看 [`environmentMainService.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/platform/environment/electron-main/environmentMainService.ts)。

## 目录速览

- 渲染层入口：[`src/main.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/main.ts)
- 工作台主视图：[`workbenchView.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/workbench/browser/workbenchView.ts)
- 预览导航模型：[`previewNavigationModel.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/workbench/browser/previewNavigationModel.ts)
- 设置模型：[`settingsModel.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/workbench/services/settings/settingsModel.ts)
- 默认抓取源：[`defaultBatchSources.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/platform/config/common/defaultBatchSources.ts)
- Electron 主进程入口：[`main.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/code/electron-main/main.ts)
- IPC 命令注册：[`ipc.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/code/electron-main/ipc.ts)
- 预览视图实现：[`previewView.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/platform/windows/electron-main/previewView.ts)
- DOCX 导出：[`docx.ts`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/code/electron-main/document/docx.ts)
- 站点专用列表提取器：[`README.md`](/c:/Users/lanxi/Desktop/Literature-Studio/src/ls/code/electron-main/fetch/sourceExtractors/README.md)

## 预览机制说明

桌面模式下，右侧网页预览不是简单的 `iframe`，而是由主进程维护原生预览视图，渲染层只负责同步容器位置、可见性和导航意图。

这带来几个直接好处：

- 很多禁止 iframe 嵌入的站点仍可正常预览
- 预览区域能跟随 React 布局稳定同步
- 地址栏、快速来源和主进程预览状态可以统一管理

如果你改到了主进程、预加载桥、IPC 或预览视图相关代码，通常需要完整重启一次 `npm run dev` 对应的 Electron 进程，单纯热更新往往不够。

## 当前已知限制

- `npm run dev:web` 无法绕过站点自身的 iframe 安全策略
- 某些出版社仍需要更专用的提取器或 PDF 策略
- 前进和后退依赖桌面预览桥可用
- DOCX 导出中的翻译能力依赖本地已配置且可连通的模型提供方

## 相关脚本

- `npm run dev`：桌面开发模式
- `npm run dev:web`：纯 Web 调试模式
- `npm run build`：构建渲染层与 Electron 代码
- `npm run start`：构建后启动桌面应用
- `npm run preview`：Vite 预览
- `npm run check:i18n`：检查中英文文案键是否一致
