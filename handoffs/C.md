# Codex C 交接

## 第三轮最终交接：完成并停写

HQ放行后已将public/sw.js RELEASE升为2026-09-22-garden-1，保留ignoreVary。直接执行npm run test:e2e，构建/typecheck通过，34 passed (2.4m)，完整命令exit0。收尾有延迟但自行退出，无手动中断；4187已释放。HQ报告另行npm test为9文件108项、exit0。本轮无应用缺陷，不再扩大或重复测试。

20项花园+14项原流程全部通过，详细结果和产物SHA256在docs/release/验收报告.md顶部。截图garden-home-zh-390.png、garden-home-en-390.png、garden-night-en-390.png已生成并逐张查看。发布对应index-B8PLw0g9.js、index-DeeSI55U.css及garden-1 worker。

未改A/B和根配置，未操作4174、未修改site-publication、未公开发布。HQ可发布当前最终dist；真机安装、屏幕阅读器、锁屏及大陆/海外公网可达性未验证。先前“34项后仍未退出”的消息是当时状态，最终已正常exit0。停止编辑及浏览器操作，交HQ发布。

下列准备记录及更早轮次为历史。

## 第三轮准备｜2026-09-22

当前由用户任务 CodexC 接管，上一轮内部 c_release 已停写。已读第三轮任务，准备合成花园边界数据与完整验收矩阵，见 docs/release/第三轮验收准备.md。等待 A 停写及 HQ 明确基线稳定通知，尚未运行第三轮真实浏览器验收；不修改 A/B、根配置、PWA，不负责公开发布。

HQ追加授权：花园基线稳定后由C将public/sw.js的RELEASE更新为新的花园版本，保留ignoreVary修复，再进行离线和更新验收；准备期间暂不改PWA。不得停止用户4174预览，不修改site-publication发布目录。

HQ已采用进程内Vite方案，根test:e2e先build并使用4187/globalSetup。C已同步c-independent.config.ts：删除旧webServer与4186覆盖，修正setup相对路径。该配置仅隔离结果目录，与根套件共享4187，必须串行运行；最终验收优先直接npm run test:e2e并记录退出码。本次未重复探针或启动浏览器。

已按HQ提供的接口编写garden.spec.ts，20项花园用例；已有recharge.spec.ts的worker更新场景追加14次完成、3次停止记录及升级后花数/阶段/不重播检查。与原14项合计34项，npm run typecheck和playwright --list通过。preview-lifecycle.setup.ts通过in属性检查收窄HTTP/HTTP2联合类型，保留清理逻辑。此为准备结果，不是浏览器通过；继续等明确放行。

新增 tests/e2e/garden-fixtures.ts：0/1/2/3/6/7/13/14/35完成、混合停止和全部反馈、旧v1无language数据。准备不重复奖励、成长阈值、暂停动态/reduced-motion、计时独立、窄屏双语及PWA更新检查。

Windows清理替代方案已通过无浏览器HTTP探针：preview-lifecycle.setup.ts 用Vite API直接启动预览并返回关闭回调；preview-lifecycle.config.ts + preview-lifecycle.probe.ts 的命令退出码0，1项通过。根因仍需捕获旧路径taskkill输出，当前仅确认替代路径生命周期正常。根配置修复建议见准备文档，由HQ决策修改。

下列为上一轮归档。

## 本轮安排

指挥部于 2026-09-22 明确修订阶段 3 启动条件：A/B 补双语期间，C 只在自己的目录准备 PWA、真实应用端到端套件及可移植静态交付文档；最终浏览器验收等待集成基线稳定通知。浏览器使用独立 Edge 无头上下文，不控制 A 的浏览器。

## PWA 集成要求

- `public/sw.js`、`public/manifest.webmanifest` 与 `public/icons/icon-{192,512}.png` 会随 Vite 复制到 dist。
- 指挥部在 index.html 的 head 加 `<link rel="manifest" href="/manifest.webmanifest">`、`<meta name="theme-color" content="#466451">` 和 `<link rel="apple-touch-icon" href="/icons/icon-192.png">`。
- 指挥部在 main.tsx 仅生产环境、支持 serviceWorker 时于 window load 后执行 `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })`。捕获注册失败，不让异常阻断应用；不要在缓存成功前宣称可离线。
- 当前 Vite 默认 base 是 `/`，本次交付安装在域名根路径。子目录发布需要指挥部同时调整 Vite base、上述注册/链接路径并重新验收。
- 首次联网安装会预缓存 HTML 引用的同源 JS/CSS、manifest 与图标；注册成功不等于安装完成，应等 `navigator.serviceWorker.ready`。已有页面保持旧 worker，关闭该站全部标签页后新 worker 才接管；不使用 skipWaiting 中断计时。
- 每次发布必须修改 sw.js 的 RELEASE。只删除自身前缀旧缓存，不读写 localStorage。拒绝缓存外站、非 GET、带查询的静态资源、API、失败响应。

## 当前验证状态

最终验收完成并停止编辑。SW JavaScript 语法、manifest JSON 和 PNG 实际尺寸检查通过。14 个E2E场景均有通过断言：首轮13/14，修复C-001后针对性3/3。完整结果、命令退出限制和未测项见 docs/release/验收报告.md；未公开发布。

两次测试命令在用例完成后Windows清理阶段未及时退出，C用Ctrl+C停止自己的测试会话，未操作4174用户预览；不要把逐项断言通过表述成命令退出成功。

离线初次失败已修复：只对本应用同源公开静态缓存匹配ignoreVary，解决Vite `Vary: Origin`导致模块JS/CSS缓存未命中。当前 RELEASE=2026-09-22-2，指挥部需让旧预览标签页关闭重开取得新worker。

已生成4张真实390px截图于 docs/release/evidence；报告包含已测对比度与资源审计。完整更新测试通过：旧worker等待、新worker接管、旧缓存删除、其它缓存及本机数据保留、更新后断网刷新。

## 已准备的验收

tests/e2e/recharge.spec.ts 直接访问正式生产入口，不替换应用组件或注入推荐/存储适配器。包括充电完整流程、暂停和时间跳跃、双语切换保持计时/备注、持久化、收藏、文件下载/导入确认、取消清空、坏存储保护、浏览器配额失败后的内存记录重试、换卡耗尽、320/375/390/430 px + 200%文字、键盘入口、暗色、减少动画、首次缓存后离线、缓存隔离与完整 worker 版本更新。更新用独立本地 HTTP 服务提供 dist，仅替换 RELEASE 来模拟两次发布。故障测试仅对浏览器存储 API 做局部故障注入。

按指挥部最新要求，此轮用户无域名和云账号，交付本地体验版本，不做公网部署。真实手机和两地公网验收继续列为未测。
