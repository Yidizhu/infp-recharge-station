# Codex A 交接

日期：2026-09-22

## 第三轮结论：花园完成并停写

已按《第三轮-花园与发布.md》完成 A 范围视觉与奖励升级，停止编辑及浏览器操作，交由指挥部/C 验收。下面第二轮、第一轮内容为历史交接。

### 场景与交互

- 新增 src/ui/Garden.tsx 与 src/styles/garden.css。真实 ChargingApp 已接入完整河岸场景：天空/远山/雾、弯曲河流、分层草坡、树、房屋暖窗、石路与前景花丛。日间晨光和夜间月色分别配色，不依赖 CDN/图像服务或新依赖。
- 首页和记录页完整展示；动作卡、计时、反馈展示同一个近景版本。SVG 装饰 aria-hidden，状态由相邻可读文字说明。
- 新增 src/ui/gardenState.ts：仅按 records 中 outcome=completed 计数，每次一朵；3/7/14 对应树苗、小树、树冠，最多画 28 朵，文字保留真实总数。null、0、负面反馈不影响奖励；stopped 不添花、不扣花，已有旧记录自动映射。不修改 v1 字段或公共接口。
- 真实计时完成后触发一次 1.6 秒绽放与光圈，达到里程碑显示树木成长文案；刷新、导入旧记录、补反馈、语言切换不触发奖励。快速导航清空奖励时立即清除 bloom，重返同一奖励也不重播。
- 河面流光及树冠摇动可由可见按钮全部暂停，响应 prefers-reduced-motion 和后台可见性；减少动态效果下保留静态花朵及奖励文案。没有声音/震动。手动动态偏好仅保留在本次页面实例内。
- 新文案中英齐全，翻译覆盖检查包含 Garden.tsx。原流程按钮标签未改，计时 hook 未改。DESIGN.md 顶部记录本轮决定。

### 实际测试与视觉自查

- `npm run typecheck` 最后一次通过；早前发现的 C preview lifecycle 类型问题已向指挥部报告，并在后续检查中消失。
- `npm test -- src/ui`：扩展后的 40 项测试通过；随后追加快速导航不重播测试，再跑 `npm test -- src/ui/Garden.test.tsx`，15 项通过。合计当前 UI 41 项用例均有本轮通过结果，未为此重复执行整套浏览器验收。
- 新测试覆盖旧记录映射、反馈独立计数、停止不奖励、3/7/14 边界、99 朵总数/28 朵绘制上限、一次性绽放、切语言不重播、暂停/恢复、减少动态效果、快速离开奖励再返回，以及真实 ChargingApp 的完成→跳过反馈→再次完成→负面反馈→提前结束。
- `node src/ui/preview-garden.mjs`：独立 Edge、真实开发页面，生成空花园日间、14 次成长日间和英文夜间截图；已逐张查看。320px/200% 英文页面无横向溢出。
- 截图：src/ui/__qa__/evidence/garden-empty-day.png、garden-grown-day.png、garden-grown-night.png。脚本在隔离的浏览器上下文种入 QA 旧记录，未改用户实际浏览器数据；这些测试素材不得随正式站点发布。

### C 验收定位

- section：`.garden`，可访问名 `我的河边花园` / `My riverside garden`。
- 阶段：`data-stage=meadow|seedling|youngTree|canopy`，分别 0/3/7/14 起。
- 总数：`已种下 {count} 朵花` / `Flowers planted: {count}`；实际绘制节点 `[data-flower=true]`。
- 动态：`data-motion=running|paused`；按钮 `暂停花园动态` / `播放花园动态` / `动态已减少`，英文 `Pause garden motion` / `Play garden motion` / `Motion reduced`。
- 奖励：`data-bloom=active|idle`；`.garden-reward[role=status]`，动画目标 `.garden-new-flower` 与 `.garden-bloom-ring`。减少动态效果下不出现 active，但显示奖励文本。
- 花园规则为可键盘展开的 details/summary，内含完整中英文规则和里程碑。

### 未验证与范围

C 仍需最终真实生产页面计时/花园动作/减少动态/PWA 更新验收；真机、移动 Safari、锁屏、系统通知、实际公网和大陆网络未在 A 本轮验证。部署与费用说明由指挥部负责。A 未修改根配置、公共接口、B/C 或 PWA 文件，未安装依赖。

## 第二轮结论：完成并停写

已执行《第二轮-双语与集成.md》A 的全部任务及指挥部追加的 HTTP 记录 ID 回退。此刻停止编辑与浏览器操作，交给指挥部/C 最终集成验收。以下第二轮状态优先于后面的第一轮归档。

### 本轮实现

- 新增 src/ui/i18n.ts，本地中英字典；默认使用 navigator.languages[0]，为空时回退 navigator.language，中文区域语言为 zh-CN，其余为 en。响应系统 languagechange；显式偏好优先。
- 通过 AppData.language 持久化 system/zh-CN/en，旧数据缺字段视为 system。设置页和所有流程的页头都可选择语言。
- ChargingApp.tsx 按当前 locale 调用可选 getActivities，按已选动作 ID 获取当前文案，保持组件实例和计时 hook。没有以语言作为 React key，也没有因切换语言再次推荐。
- saveData、exportData、parseImport、getInsights 均传 locale；导入异步读取完成后使用当时的最新 locale。导入确认提醒将同时替换记录、收藏、主题和语言。
- 页面标题、HTML lang、日期、空状态、确认/错误提示、ARIA 与导航均双语；个人备注和反馈草稿原样保留。初始存储错误切换语言后显示对应语言的安全恢复提示，仍阻止未经同意覆盖原数据。
- ConfirmDialog 接收本地化的取消按钮文案；确认内容在渲染时翻译。文件入口使用本地化按钮触发隐藏文件输入。
- 新增 src/ui/sessionId.ts：randomUUID → getRandomValues UUID → 旧环境时间戳/计数/随机片段回退；全部符合 B 的 ID 字符/长度要求，用于记录身份而非认证。
- 调整 src/styles/charging.css 支持语言选择与英文换行。更新 DESIGN.md、UI 测试和独立组件浏览器检查器。

### 本轮实际检查

- `npm run typecheck`：通过。
- `npm test -- src/ui`：4 文件、25 项全部通过；原 10 项保留并通过。新增英语系统默认、中文/英文选择与保存恢复、运行和暂停中切换不重置会话、记录及备注保留、日期本地化、系统事件/显式优先、locale 参数传递、确认框与警告、翻译覆盖与占位符、HTTP ID 回退及结束保存。
- `node src/ui/verify-browser.mjs`：Edge 153 组件 QA 通过；中英签到覆盖窄屏/横屏，英文在 320px+200% 字号下的签到、设置、弹窗、计时、反馈、历史没有横向溢出，按钮最小 44px；切换语言保持暂停时长与备注，无 pageerror。
- 已查看新英文签到、英文暂停计时截图，位于 src/ui/__qa__/evidence/checkin-english.png 与 timer-english.png；browser-checks.json 已更新。
- 本轮未重复指挥部的全项目构建/全量测试。第一轮独立组件 bundle 已删除，避免误用旧产物；真实产品构建由指挥部完成。

### 集成与未验证项

- 指挥部已装配 App，需持续传入 B 的 getActivities；若省略，兼容回退为传入的 activities，动作内容语言由调用方负责。
- 根 App、公共类型、B/C 文件、依赖及锁文件均未修改。新增/修改均在 A 的 ui/styles/DESIGN/handoffs 范围，无新增依赖。
- 浏览器检查仍是注入样本的组件 QA，不替代 C 的真实整合页面、真实导入导出、PWA 和升级验收。
- HTTP 缺 randomUUID 已有函数和结束流程测试；尚未用物理手机实测同 Wi-Fi 访问。PWA 仍需要 HTTPS/localhost。
- 第一轮列出的真机/Safari/屏幕阅读器、进行中计时不跨刷新恢复等限制仍适用。

## 第一轮归档（下列为当时状态）

## 状态

A 已完成实现与组件级验证，停止编辑，等待指挥部阶段 2 集成。根 App.tsx 仍为指挥部占位页；本交付不代表完整应用已上线或 A/B 已完成联调。

已重新读取指挥日志、任务指令和 src/contracts.ts，沿用已完整读取的调研报告。使用 frontend-design、ui-ux-pro-max、humanizer，设计取舍记录于 DESIGN.md。

## 检查与结果

- `npm run typecheck`：通过，含 UI 和测试文件。
- `npm test -- src/ui`：2 个文件、10 项测试通过。覆盖后台补时且只结束一次、暂停时间排除、过截止时间再停止、提前结束+跳过反馈、缩为一分钟+明确 0 分、换卡耗尽、存储失败重试、初始损坏保护、取消清空及导入确认。
- 用现有 Vite build API，以 ChargingApp.tsx 为 library entry，在 src/ui/__qa__/bundle 输出生产组件：通过，5 modules，JS 28.21 kB、CSS 7.58 kB。没有把根占位 App 的构建当作 UI 打包证据。
- `node src/ui/verify-browser.mjs`：Edge 153.0.4234.48 无头浏览器通过。签到在 320、375、390、430×812 与 812×375 检查，无横向溢出，按钮均至少 44×44 CSS px。
- 320px + 根字号 200%：签到、计时、反馈、设置和确认弹窗检查通过；这是浏览器文字放大模拟，不等同手机系统大字体实测。
- 浏览器通过：暂停冻结、继续、提前结束、跳过反馈、历史显示、通过注入存储适配器刷新恢复、日夜主题、键盘跳转主内容入口、原生弹窗默认取消焦点及 Escape 取消；无 pageerror。
- 减少动态效果模拟下按钮 transitionDuration 为 0s。已查看日间签到、日间动作卡、夜间计时截图并复核布局。
- 色值计算：日间正文/背景 13.00:1、次级文字/背景 5.72:1、按钮文字/底色 5.94:1、选中态 5.02:1；夜间对应 15.59:1、8.18:1、8.07:1、5.49:1。

浏览器使用 QA 样本及注入适配器，未将样本导入生产模块。JSON 业务校验、实际 localStorage 和推荐规则仍需阶段 2/3 联调验收。

## 修改文件

- DESIGN.md：色彩、层级、交互与中文文案复核。
- src/ui/ChargingApp.tsx：唯一生产入口，默认导出 ChargingApp，直接使用 ChargingAppProps。
- src/ui/ConfirmDialog.tsx：原生确认弹窗，取消默认聚焦、Escape 取消及关闭后恢复焦点。
- src/ui/useSessionTimer.ts：时间戳计时、暂停、后台返回同步及一次性结束回调。
- src/styles/charging.css：局部作用域样式、手机布局、主题、安全区与 reduced-motion。
- src/ui/ChargingApp.test.tsx、src/ui/useSessionTimer.test.ts：10 项行为测试。
- src/ui/verify-browser.mjs：基于本地 Vite 服务及 Edge 的独立组件检查器，仅注入 QA 样本，不引用 B 模块、不写正式存储键。
- src/ui/__qa__/evidence/：4 张截图和 browser-checks.json。
- src/ui/__qa__/bundle/：组件构建 JS/CSS，不是完整应用站点。
- handoffs/A.md：本交接。

未修改公共类型、根配置、依赖、锁文件、App.tsx、main.tsx 或 B/C 文件；没有新增依赖。

## 已实现

- 逐步签到：1–5 格电量、五种耗能源、1/3/10 分钟；可按明确提示的三格/说不清/一分钟跳过。
- 推荐卡、换卡排除列表、耗尽空状态、开始前缩为一分钟；推荐及收藏动作是否适合当前电量均调用注入 recommend。
- 暂停、继续、提前结束、到时自动完成。周期回调只刷新显示，时长取时间戳差值，不累计暂停；后台超时后 endedAt 使用目标时刻。
- stopped 与 completed 分开。结束时先保存 null 反馈，补反馈时更新同一记录；可选备注、−1/0/+1/+2/不确定，跳过仍是 null。
- 历史倒序、每次展开 20 条；显示实际时长、结果、反馈、备注。洞察仅使用注入 getInsights。
- 收藏、取消收藏；系统/日间/夜间主题；无记录、无收藏及无候选的空状态。
- 导出、导入校验和覆盖确认、清空确认。parseImport 不写入，确认后才调用 saveData。
- 存储失败保留内存数据并提供重试和导出。有 initialWarning 时暂停写入，用户明确同意后才覆盖，避免主题或收藏操作意外覆盖损坏数据。
- 无外部字体、图片、音频或 API 依赖，无自动音效或震动。

## 需要指挥部完成

App.tsx 从 `./ui/ChargingApp` 导入默认组件，从 B 模块导入 activities、recommend、getInsights、loadData、saveData、exportData、parseImport。挂载时读取一次 loadData，传入 initialData=data、initialWarning=warning 和其余同名参数。建议用惰性 useState 保存读取结果，避免根组件重渲染时重复读取。UI 自行管理后续状态，initialData 只作初始值。

样式由 ChargingApp.tsx 自动导入。保留 index.html 的 viewport-fit=cover 和中文 lang。根页面只有完成装配后才会显示本界面，不要将 QA 脚本/构建产物当作产品入口。

## 未验证项及限制

- A/B 真实存储、推荐、洞察联调，目前是接口类型检查与注入适配器的组件测试。
- 手机真机、iOS Safari、屏幕阅读器、真实系统字体放大及锁屏/进程冻结。
- 浏览器导出下载及真实文件导入完整流程；导入确认已有组件测试，内容校验由 B 负责。
- PWA、缓存、断网、更新、跨地区访问及部署，归 C/指挥部。
- 进行中的计时不跨刷新恢复，开始前有提示，运行中注册 beforeunload 提醒；移动系统强制关闭时提醒可能不触发。已结束记录立即保存。
- 系统时钟被手动修改不在本轮验收范围；不实现系统通知或后台唤醒。

当前无接口变更、新增依赖需求。

## 后续入口与范围

默认导出组件：src/ui/ChargingApp.tsx；由指挥部负责 App.tsx 装配。A 仅修改 src/ui/**、src/styles/**、public/art/**、DESIGN.md、handoffs/A.md。推荐、洞察、存储和导入导出使用约定的注入函数。
