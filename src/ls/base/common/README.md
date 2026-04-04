这里用于底层通用逻辑，不依赖 DOM，且要被 node / electron main 的无 DOM 环境复用，DOM 类型使用会污染底层边界。

`event.ts` 与 `lifecycle.ts` 也属于这一层：只提供纯逻辑的事件与生命周期原语，不引入浏览器依赖。
