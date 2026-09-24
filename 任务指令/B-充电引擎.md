# 给 Codex B 的 Prompt（与 A 同时发送）

你负责 INFP 充电 App 的数据和逻辑。工作目录为 C:\Users\10656\Desktop\INFP charging。先阅读《指挥日志.md》《INFP充电App调研报告.md》及 src/contracts.ts。骨架缺失则报告等待阶段 0，不自行创建。

唯一写入范围：src/domain/**、src/data/**、src/storage/**、src/tests/domain/**、handoffs/B.md。不得编辑任何界面、根配置、公共类型、package.json 或锁文件。

严格实现指挥日志中 activities、recommend、getInsights、loadData、saveData、exportData、parseImport 的约定。24 条中文动作分六类，各 4 条；每条有 1/3/10 分钟版本，行动具体、无需昂贵准备、不要求屏气、不承诺疗效。INFP 仅是偏好入口。

推荐首先处理电量和时长，再考虑耗能源与个人反馈；低电量不推荐高负担动作。稳定排序并支持排除已展示动作；耗尽返回 null。null 反馈和停止记录不可当作成功；小样本不得生成伪精确或因果结论。洞察注明样本量，不足 5 条有效完成反馈则返回空数组。

本地存储提供版本字段和输入验证；存储不可用、JSON 损坏、导入字段不合法、未来版本等应返回明确错误或 warning。损坏数据不得在读取时悄悄覆盖。导入解析不得直接写入或覆盖，由 UI 确认后保存。默认不联网，不实现账户或云服务。

用骨架已有测试工具测试关键分支：低电量过滤、全部排除、确定性排序、null 反馈、小样本、坏存储、错误版本和导入边界。测试行为而非镜像实现。需要依赖时报告，不自行改包。

完成后写 handoffs/B.md：公开导出、规则、数据结构、实际测试结果、已知限制及集成说明；停止编辑等待指挥部。
