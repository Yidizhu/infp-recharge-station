# Codex B 交接

## 状态

2026-09-22：阶段 1B 已完成，停止编辑，等待指挥部集成。已重新读取指挥日志、src/contracts.ts 和 B 任务指令。未修改公共类型、根配置、依赖、锁文件或界面。

## 修改文件与公开导出

- src/data/activities.ts：activities: Activity[]，24 个动作，六类各四个，每个包含 1/3/10 分钟版本。
- src/domain/recommend.ts：recommend，符合 contracts.Recommend。
- src/domain/insights.ts：getInsights，符合 contracts.GetInsights。
- src/domain/feedback.ts：内部共享 hasFeedback，过滤有效完成反馈。
- src/storage/store.ts：loadData、saveData、exportData、parseImport，符合 contracts 中对应类型；另导出 STORAGE_KEY。
- src/tests/domain/engine.test.ts、src/tests/domain/store.test.ts：业务及边界测试。
- handoffs/B.md：本交接。

## 推荐与洞察规则

1. 先排除已展示 ID、电量 1–2 时的 medium 动作，以及缺少当前分钟版本或步骤为空的动作。
2. 候选按耗能源匹配优先排序，再按个人反馈均值排序，同分保留动作库输入顺序。不随机、不修改输入；耗尽返回 null。
3. 只有 completed 且反馈为 -1/0/1/2 的记录参与；同一动作至少三条有效反馈才影响推荐。null、stopped 不参与，0 是有效反馈但不是正向反馈。三条门槛是产品规则，不是统计显著性判断。
4. 洞察仅使用当前动作库中已知动作的有效完成反馈。总样本不足五条返回空数组。总览及单动作描述使用明确计数；单动作也至少五条；最多三条，依动作库顺序显示。不生成百分比、因果或疗效结论。
5. 动作无运行时外部资源。可选联系他人的动作由用户自主执行；无需回复才能完成，有草稿或照片替代。无屏气要求或疗效保证。INFP 不参与算法判定。

## 数据与存储

沿用 AppData v1：version、records、favorites、theme；不新增公共字段。localStorage 键为 infp-charging:data。首次读取返回独立空数据，不写盘。

- 顶层、记录及 checkIn 校验精确字段；不静默丢弃额外字段。
- ID 允许英文字母、数字、下划线、连字符，1–128 字符。记录 ID、收藏 ID 各自不可重复。
- 接受未知但合法的 activityId / 收藏 ID，以保留旧动作历史；未知动作不参与洞察。界面应对找不到的动作提供占位名称。
- 时间要求 Date.toISOString() 生成的 UTC ISO 格式，含三位毫秒；拒绝非法日历日期及结束早于开始。actualSeconds 必须有限且非负，不超过起止间隔加一秒（容许取整误差），允许小数、暂停及零秒停止。
- 备注最多 2000 个 JS 字符单位，记录最多 10000 条，收藏最多 1000 项；JSON 文本最多 200 万 JS 字符单位。限制属于当前本地版本的容量边界。
- loadData 对坏 JSON、未来/错误版本、存储访问失败返回 warning 和临时空数据；绝不在读取时覆盖原始内容。
- saveData 先校验，失败返回 ok:false 和 warning；配额或访问错误也返回明确提示。
- parseImport 是纯解析，不调用存储。必须由界面展示并确认后调用 saveData。
- exportData 返回带缩进 JSON；输入不合法或超限时抛出 Error，界面需捕获并显示错误。saveData 内部已捕获。
- 无账户、联网、迁移、云同步或加密。

## 实际验证

- npm test -- src/tests/domain --maxWorkers=1：2 个文件、42 项通过。
- npm run typecheck：通过。
- npm test -- --maxWorkers=1：3 个文件、43 项全部通过（包括骨架挂载测试）。

测试包含：六类及版本完整性、低电量过滤、所选版本缺失、换卡耗尽、稳定排序且输入不变、耗能源优先、反馈门槛、null/停止/零/负反馈、小样本、数据往返、首次空存储、损坏数据不覆盖、存储 getter 禁用、写入配额失败、未来与旧版本、未知/缺失字段、重复 ID、非法枚举/日期/时长、文本与数量上限、未知历史动作保留。

## 集成说明与未验证项

指挥部在 App.tsx 导入上述模块，将 loadData() 的 data 和 warning 作为 initialData 与 initialWarning 传入 ChargingApp，其余函数按固定 props 注入。

重要：loadData 的临时空数据不代表原数据为空。出现 initialWarning 时，界面不能因挂载或初始化自动保存空数据；覆盖损坏原数据前应明确告知并取得用户确认。正常保存也应检查 ok；失败时保留内存记录并提示导出。导入覆盖确认由 A/UI 实现，B 不直接操作界面。

本轮未运行正式构建（避免生成 B 写入范围外的 dist），未进行浏览器、刷新持久化、导入确认交互、E2E、离线/PWA 或跨地区网络验收。存储测试使用 jsdom 的 localStorage 及故障模拟；真实浏览器整体验证由指挥部/C 负责。无需新增依赖。

## 第二轮：中英文内容与兼容｜2026-09-22

状态：B 第二轮完成，停止编辑，等待集成。本节为最新状态；第一轮规则与限制仍适用。

### 本轮文件

- src/data/activities.ts：新增具名 getActivities(locale: Locale)，保留原具名 activities 中文默认库。
- src/data/activities.en.ts：英文文本，覆盖全部 24 个动作标题、环境和 72 个时长版本的引导/步骤。
- src/domain/insights.ts：新增可选末尾 locale，默认 zh-CN。已知动作名按 locale 获取，即使调用方传入另一语言的动作库也正确显示。
- src/storage/store.ts：四个公开函数新增可选末尾 locale，默认中文。全部校验、读写与导出错误均有英文版本。
- src/tests/domain/bilingual.test.ts：新增 22 项双语及兼容测试。

### 兼容与集成

getActivities 只替换展示文本，ID、分类、负担、耗能源、顺序完全不变，recommend 无修改。英文库从中文库复用元数据。原 activities 是原有具名导出，未新增 default export。

v1 允许多出合法 language（system / zh-CN / en），仍拒绝其余未知字段和非法嵌套内容。无 language 的旧 v1 原样往返，UI 使用 data.language ?? 'system' 解释，不强制改写备份。显式存在但值为 undefined/null 或其他非法值的 language 会被拒绝。备注和记录内容不会翻译。

App 注入 getActivities；UI 调用 getInsights / loadData / saveData / exportData / parseImport 时传当前 locale。语言切换时选中动作应按稳定 ID 重新取得当前文本。不要用语言当组件 key。系统语言判断、运行计时连续性、设置和确认弹窗由 A/UI 负责。

### 实际检查

- npm test -- src/tests/domain --maxWorkers=1：3 个文件、64 项全部通过（原 42 + 新增 22）。
- npm run typecheck：本轮全项目未通过；当时错误全部位于并行工作的外部范围：src/bootstrap.test.tsx 的 ByRoleOptions.exact；src/ui/ChargingApp.test.tsx 将 JSON.stringify 直接赋给扩展后的 ExportData；src/ui/ChargingApp.tsx 的 Confirmation.values 和 cancelLabel 类型尚未同步。没有 B 文件的类型诊断。
- npm test -- --maxWorkers=1：当时共 76 项，69 通过、7 失败；失败全部在 src/ui/ChargingApp.test.tsx，旧测试查询中文按钮但系统默认渲染英文。B 64 项全部通过。并行文件仍在修改，需指挥部最终重跑整体验证。

新增测试覆盖完整双语结构与无中文遗漏、推荐和排除 ID 一致性、中英文洞察和样本门槛、原中文库及备注不被修改、旧 v1 和三种语言值备份/存储往返、非法 language、严格字段校验保留、英文 JSON/版本/容量/存储禁用/写入失败/导出错误提示、损坏内容不覆盖。

未执行浏览器与计时语言切换验收、正式构建或 PWA 验收。未新增依赖，未修改根配置、公共接口或 UI。请 A 与指挥部完成各自变更后复跑全项目检查。
