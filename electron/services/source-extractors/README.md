# Source Extractors

这份目录下的 `source extractor` 用来告诉 `article-fetcher`:

- 某个首页/列表页是否有专用提取逻辑
- 应该从页面里优先抽出哪些文章链接
- 这些链接在页面中的顺序是什么
- 能不能顺手拿到 `dateHint`、`articleType`、`scoreBoost`
- 是否存在稳定的下一页入口
- 是否需要做一次轻量的二次补全

这套机制的目标不是“取代通用抓取器”，而是在我们已经知道某个页面结构比较稳定、而且值得优化时，给它一条更确定的候选提取路径。

`nature-latest-news.ts` 是当前最完整的例子，也很适合作为后续新增专用 extractor 的模板。

## Nature 固定入口策略（当前结论）

对 `www.nature.com` 这三个固定入口，建议默认都保留专用 extractor，而不是仅依赖通用抓取：

- `/latest-news`
- `/opinion`
- `/{journal}/research-articles`（例如 `/nature/research-articles`）

原因很直接：

- 都是高频入口，用户常从这些列表页抓“最新”文章
- 页面里有稳定结构化信号（卡片、顺序、类型、日期、分页）
- 专用 extractor 可以稳定输出 `order` / `dateHint` / `articleType`
- 当页面局部改版时，可以“定制提取 + shared fallback”减少回归风险

## 设计定位

在主流程里，extractor 的职责很克制:

1. `matches(homepage)` 负责判断当前 URL 是否命中某个专用实现。
2. `extract(context)` 负责从首页 DOM 中提取候选文章种子。
3. `refineExtraction(context)` 可选，负责在已有候选基础上补充信息。
4. `findNextPageUrl(context)` 可选，负责告诉主流程如何翻到下一页。

后续这些事情依然由统一流水线负责:

- URL 归一化
- 同域过滤
- 日期范围过滤
- 候选排序与抓取预算
- 正文抓取与正文解析

也就是说，extractor 只负责“更准确地指出应该先试哪些链接”，不负责重写整条抓取链路。

## `nature-latest-news` 是怎么做出来的

`nature-latest-news.ts` 采用了“定制提取 + 通用兜底 + 二次补全”的三层结构。

### 1. 先用路径精确匹配页面

它先把首页限定在:

- host: `www.nature.com`
- pathname: `/latest-news`

这样能确保这份逻辑只服务于一个非常具体的页面，不会误伤别的 Nature 列表页。

### 2. 针对页面卡片结构做定制提取

`extractNatureLatestNewsArticleCards()` 会直接读取 `latest-news` 页面的卡片 DOM，核心思路是:

- 先锁定卡片根节点 `div.c-article-item__wrapper`
- 在每张卡片里找文章链接、标题、摘要、footer、article type
- 从 `data-track-label` 中提取卡片顺序
- 从 footer 或时间相关节点里提取 `dateHint`
- 去重并产出 `HomepageCandidateSeed[]`

这里返回的候选种子长这样:

```ts
{
  href,
  order,
  dateHint,
  articleType,
  scoreBoost: 140,
}
```

几个字段各自的作用:

- `href`: 候选文章链接，可以是相对路径，主流程会再归一化
- `order`: 页面中的展示顺序，专用 extractor 命中后主流程会优先按这个顺序抓取
- `dateHint`: 用来做日期范围过滤、提前停止、预算优化
- `articleType`: 方便后续诊断或特定策略分流
- `scoreBoost`: 在统一打分基础上再给一点结构化加权

### 3. 带上 diagnostics，方便我们调试和演进

`latest-news` 的实现没有只返回 candidates，它还额外记录了:

- 命中的 selector
- 卡片总数、候选总数
- 有摘要/有 footer/有 article type 的卡片数
- 已拿到日期提示的候选数
- `articleTypeCounts`
- `sampleCards`

这非常值得保留。因为专用 extractor 不是“一次写完永远稳定”，后面页面结构变了，我们通常先看的就是这些 diagnostics。

### 4. 如果定制提取失败，就回退到共享列表页 extractor

`nature-latest-news.ts` 并不是孤立实现。它先尝试针对 `latest-news` 做精确抽取，如果结果为空，再回退到:

```ts
createNatureListingCandidateExtractor(...)
```

这个 shared extractor 位于 `nature-listing-shared.ts`，它提供的是一套更泛化的 Nature 列表页识别逻辑，比如:

- 选择最像文章列表的 layout root
- 从 tracked link 或 article link 反推卡片 root
- 从 `Rank:(n)` 或 `article card n` 中恢复顺序
- 尝试提取列表页日期
- 统一生成 diagnostics

这层兜底很重要，因为它让我们的专用 extractor 具备两个特点:

- 页面结构稳定时，吃到最精确的定制逻辑
- 页面局部变动时，还有较通用的备份路径

### 5. 再通过 `refineExtraction()` 用 RSS 补齐缺失日期

`latest-news` 的关键增强点在这里。

有些卡片本身没有稳定日期，但 Nature 的 RSS 里有 `dc:date`。所以我们在 `refineExtraction()` 里做了这件事:

1. 请求 `https://www.nature.com/nature.rss`
2. 解析 `<item rdf:about="...">` 和对应的 `<dc:date>`
3. 建立 `url -> dateHint` 映射
4. 只给“还没有 `dateHint` 的候选”补值
5. 做一个 5 分钟内存缓存，避免频繁请求 RSS

这样做的收益非常直接:

- 提高 `dateHint` 覆盖率
- 让主流程更容易做日期范围过滤
- 更容易触发“已经连续看到过旧文章，可以提前停止翻页/抓取”的优化

### 6. 翻页逻辑复用共享实现

`latest-news` 的 `findNextPageUrl()` 并没有自己重写分页规则，而是复用了 `findNatureListingNextPageUrl()`。

共享分页逻辑会:

- 读取当前 URL 的 `page` 参数
- 在当前页面里找同 pathname、下一页页码的链接
- 优先识别带 `next` 语义的按钮或链接
- 配合 `seenPageUrls` 避免循环翻页

这说明模板里有一个很重要的原则:

- 专用 extractor 只重写“真的需要特殊处理”的部分
- 通用分页、通用布局识别优先复用已有能力

## 为什么它适合作为模板

因为它基本覆盖了后续我们会遇到的三种 extractor 形态。

### 形态 A: 只用 shared extractor（极简）

适用于结构不稳定、价值一般，或暂时还不值得维护定制 selector 的页面：

- 仅实现 `matches`
- 直接复用 `createNatureListingCandidateExtractor`
- 直接复用共享分页

### 形态 B: 定制提取 + shared fallback（推荐默认）

参考 `nature-opinions.ts` 与 `nature-research-articles.ts`:

- 先做定制 DOM 提取（卡片、顺序、日期、类型）
- 定制提取失败时回退到 shared extractor
- 分页逻辑复用共享实现

这是现在 `Nature` 固定入口最常见也最稳的形态。

### 形态 C: 定制提取 + shared fallback + refine（增强版）

参考 `nature-latest-news.ts`:

- 定制 DOM 提取
- shared extractor 兜底
- `refineExtraction()` 引入外部轻量信号（如 RSS）补齐缺失字段

适用于“列表 DOM 不总是给全信息，但有可用外部补充源”的页面。

## 新增 extractor 的推荐步骤

以后新做一个“链接专用提取器”时，建议按下面的顺序走。

### 1. 先确认值不值得做专用 extractor

一般满足以下情况再做:

- 这个页面是稳定入口，用户会频繁从这里抓最新文章
- 通用提取已经不够准，或者顺序不稳定
- 页面上存在明显的结构化信号，值得利用
- 我们能稳定识别分页或日期线索

如果页面本身结构变化很大，而且没有明显规律，优先继续依赖通用逻辑。

### 2. 先选 extractor 形态

新增页面前，先判断它属于哪一类:

1. 只需要 `matches + shared extractor`
2. 需要自定义 `extract`
3. 需要自定义 `extract + refineExtraction`

这个判断能避免一开始就把实现写得过重。

### 3. 先写 `matches()`

建议优先使用最稳定的 URL 信号:

- host
- pathname
- 必要时再加 query 约束

`matches()` 越精确，误命中的风险越低。

### 4. 决定候选根节点和顺序来源

在写 selector 之前，先回答两个问题:

- 一篇文章在 DOM 里“哪一层”最适合作为候选 root
- 页面顺序是来自 DOM 顺序、rank、还是 tracking attribute

顺序字段非常关键，因为命中专用 extractor 后，主流程会更信任 `order`。

### 5. 优先提取 `dateHint`

只要页面里有任何比较可靠的日期来源，都尽量提出来:

- `time[datetime]`
- `content`
- `title`
- footer 文本
- aria label
- 外部轻量数据源，比如 RSS

`dateHint` 越完整，后面的抓取效率越高。

### 6. diagnostics 作为默认配置，而不是附加项

每个 extractor 最少建议记录:

- 命中的 layout/card/link selector
- 根节点数 / 候选数
- `datedCandidateCount`
- 若有分类信息，则记录 type counts
- 2 到 5 条 sample candidates

这样后面分析误抓、漏抓、页面改版时会轻松很多。

### 7. 有共享能力就复用，不要复制

如果以下能力已经在别处存在，优先复用:

- 同一站点的列表页结构识别
- 分页查找
- rank / track label 解析
- 日期字符串解析

我们希望每个新 extractor 只写“新增的站点知识”，而不是重复写基础设施。

### 8. 注册到 `index.ts`

写完 extractor 后，别忘了在 `index.ts` 里注册，否则主流程永远不会命中它。

## 一个推荐的模板骨架

下面是我们后续新建专用 extractor 时可以直接照着改的骨架:

```ts
import {
  createNatureListingCandidateExtractor,
  findNatureListingNextPageUrl,
  isNatureListingHomepage,
} from './nature-listing-shared.js';

import type {
  HomepageCandidateExtraction,
  HomepageCandidateExtractor,
  HomepageCandidateExtractorContext,
  HomepageCandidateRefinementContext,
  HomepagePaginationContext,
} from './types.js';

const HOMEPAGE_PATH = '/target-path';

const fallbackExtractor = createNatureListingCandidateExtractor({
  id: 'target-extractor',
  matches: isTargetHomepage,
  findNextPageUrl: findTargetNextPageUrl,
  refineExtraction: refineTargetExtraction,
});

export const targetCandidateExtractor: HomepageCandidateExtractor = {
  id: 'target-extractor',
  matches: isTargetHomepage,
  findNextPageUrl: findTargetNextPageUrl,
  refineExtraction: refineTargetExtraction,
  extract(context): HomepageCandidateExtraction | null {
    const targeted = extractTargetCards(context);
    if (targeted && targeted.candidates.length > 0) {
      return targeted;
    }

    return fallbackExtractor.extract(context);
  },
};

export function isTargetHomepage(homepage: URL) {
  return isNatureListingHomepage(homepage, HOMEPAGE_PATH);
}

function extractTargetCards(
  context: HomepageCandidateExtractorContext,
): HomepageCandidateExtraction | null {
  // 1. 锁定卡片 root
  // 2. 提取 href/title/order/dateHint
  // 3. 去重
  // 4. 返回 diagnostics
  return null;
}

async function refineTargetExtraction(
  context: HomepageCandidateRefinementContext,
) {
  // 可选:
  // - 请求轻量外部数据
  // - 只补齐缺失字段
  // - 返回补全后的 extraction
  return context.extraction;
}

function findTargetNextPageUrl(
  context: HomepagePaginationContext,
) {
  if (!isTargetHomepage(context.homepage)) return null;
  return findNatureListingNextPageUrl(context);
}
```

如果新页面根本不需要定制 `extract()`，那就直接退化成“只用 shared extractor”的极简版本即可。

## 代码层面的约束和经验

后续新增 extractor 时，建议默认遵守下面这些约束。

### 1. `extract()` 尽量纯

最好让 `extract()` 只依赖当前 DOM，不做网络请求。网络补全优先放到 `refineExtraction()`。

这样有两个好处:

- 结构更清楚
- 当主流程只想拿首轮候选时，不会被额外请求拖慢

### 2. 外部补全只做“加法”

`refineExtraction()` 最好只补齐缺失字段，不要轻易推翻已经从 DOM 拿到的信息。

`latest-news` 就是这样做的:

- DOM 已经有 `dateHint` 的候选保持不动
- 只给没有日期的候选补 RSS 日期

### 3. `order` 要稳定、可解释

专用 extractor 一旦命中，主流程会更偏向按 `order` 抓取，所以这个字段必须尽量稳定:

- 优先使用页面自身的 rank / track label
- 没有的话再回退到 DOM discovery order

### 4. `scoreBoost` 要保守

`scoreBoost` 只是辅助，不应该掩盖明显错误的候选。一般给一个中等幅度加分就够了，重点还是靠 selector 命中质量和 `order`。

### 5. 允许优雅失败

如果 selector 全部失效，extractor 应该返回 `null` 或空结果，然后把机会交还给:

- fallback extractor
- 通用候选提取逻辑

不要在结构变化时把整条链路卡死。

## 推荐的新增 checklist

- 新页面是否真的需要专用 extractor
- `matches()` 是否足够精确
- 候选 root 是否唯一且稳定
- `href` / `title` 是否都能稳定拿到
- `order` 是否和页面展示顺序一致
- `dateHint` 是否尽量覆盖
- diagnostics 是否足够排查问题
- 是否存在可以复用的 shared extractor / shared pagination
- 是否已经在 `index.ts` 注册

## 当前目录里的参考实现

- `types.ts`: extractor 接口与上下文类型
- `index.ts`: extractor 注册入口
- `nature-listing-shared.ts`: Nature 列表页的共享能力
- `nature-opinions.ts`: 定制提取 + shared fallback（无 refine）
- `nature-research-articles.ts`: 定制提取 + shared fallback（无 refine）
- `nature-latest-news.ts`: 定制提取 + shared fallback + refine（完整模板）

## 一句话结论

对 Nature 当前这三类固定入口（`latest-news`、`opinion`、`research-articles`），都应优先使用专用 extractor，并沿用 `nature-latest-news` 这套模式:

- 用精确 `matches()` 限定页面
- 用定制 DOM 提取拿到高质量 candidates
- 用 shared extractor 做兜底
- 按需用 `refineExtraction()` 补齐轻量外部信号
- 用 diagnostics 保证后续可维护性

这比每次从零写一个临时脚本式 extractor，更容易扩展，也更容易排查问题。
