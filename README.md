# Journal Reader (Electron + React + Vite)

一个用于每日阅读期刊文章的桌面应用骨架：

- 左栏：网页对照（输入文章链接后显示页面）
- 右栏：抓取到的结构化信息
  - 标题 `title`
  - DOI `doi`
  - 作者 `authors`
  - 摘要 `abstract`
- 支持导出 `JSON` 和 `CSV`
- 支持从“期刊首页 / 最新文章页”批量抓取最新文章
- 支持按“开始日期 ~ 结束日期”抓取特定时间区间内文章
- 自动写入本地历史记录，可加载和清空
- 支持按关键词与期刊来源过滤当前历史结果
- 支持一键导出当前筛选结果（JSON/CSV）

## 技术栈

- 前端：React 19 + Vite 7 + TypeScript
- 桌面壳：Electron
- 抓取后端：Electron Main Process（Node.js + Cheerio）

## 启动

```bash
npm install
npm run dev
```

## 纯 Web 调试（浏览器）

用于快速复现/排查“预览区域溢出容器”等布局问题（不依赖桌面端后端能力）：

```bash
npm run dev:web
```

说明：

- 预览区右上角新增了 `Web 调试`（小虫图标）面板，可切换：
  - `来源`：`URL` / `HTML（srcdoc）`
  - `渲染`：`嵌入` / `Overlay（模拟原生）`
- `URL` 模式支持 `Web 代理模式`（默认开启），通过本地 dev server 转发页面，可绕过大部分 iframe 拒绝策略。
- 若仍被目标站策略阻断，可使用 `HTML（srcdoc）` 粘贴整页 HTML 来调试布局/溢出问题。
- Web 模式下，抓取/历史/下载等功能会提示“需要桌面端后端命令”，属于预期行为。

## 构建

可先构建前端，再直接启动 Electron：

```bash
npm run build
npm run start
```

## 说明

- Electron 命令入口：`electron/main.cjs`，渲染进程桥接：`electron/preload.cjs`。
- 抓取命令通过 `window.electronAPI.invoke` 转发，保持与原前端命令名一致：
  - `fetch_article`
  - `fetch_latest_articles`
  - `list_history` / `clear_history`
  - `load_settings` / `save_settings`
  - `pick_download_directory`
  - `preview_download_pdf`
- 历史与设置存储在 Electron `userData` 目录（JSON 文件）。
- 若目标站点禁止 iframe（`X-Frame-Options` / `frame-ancestors`），嵌入预览仍可能被拒绝，这是站点策略。

## 可扩展方向

- 按站点做专用解析器（Elsevier、Springer、Wiley、ACS 等）。
- 增加“期刊首页 -> 最新文章列表”的批量抓取。
- 用 SQLite 保存历史记录并支持检索过滤。
- 增加 Playwright sidecar，处理必须执行 JS 才能拿到正文的站点。
