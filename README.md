# 小电站

花园版公开网址：[小电站 · 河畔花园](https://infp-riverside-recharge.zesty-mesa-1831.chatgpt.site)。Sites 部署状态已确认成功；大陆真实网络可达性未验证。

React + TypeScript + Vite 的手机优先静态 Web App。提供状态签到、24 个充电动作的 1/3/10 分钟版本、计时与反馈、历史记录、收藏，以及本机数据导入导出。支持中文和英文切换，个人备注保留原文。

SVG 河岸花园随完成记录生长，每次完整休息增加一朵花，3/7/14 次呈现树木成长。河流、树冠与一次性绽放动效可暂停，并遵守 reduced-motion。状态从已有 v1 记录推导，不增加云数据库。

## 本地运行

需要 Node.js 22.12+（本机使用 24）。安装统一使用 npm，不混用锁文件。

```sh
npm ci
npm run dev
npm run check
```

开发地址 http://127.0.0.1:5173；构建产物 dist/；`npm run preview` 在 4173 端口提供构建预览。

手机体验：先 `npm run build`，再 `npm run preview:phone`，手机与电脑连接同一 Wi-Fi，打开输出中的电脑局域网地址（4174 端口）。电脑需保持运行；若防火墙阻止连接，需由你允许私人网络访问。此模式只用于本地体验，不是公网部署。局域网 HTTP 可试用核心流程，但离线安装需要 HTTPS 或 localhost。

## 测试

- `npm run typecheck`：包含 src、tests 和配置文件。
- `npm test`：Vitest + jsdom，扫描 src 下的 .test/.spec.ts(x)，可使用 Testing Library。
- `npm run test:e2e`：Playwright，扫描 tests/e2e，先构建，再通过 Vite API 启动并关闭 4187 测试预览。避免 Windows 的 npm 子进程服务清理路径。
- Windows 默认使用已安装的 Edge，其他环境使用 Playwright Chromium；可用 PLAYWRIGHT_CHANNEL 指定通道。没有可用浏览器时，E2E 不能算通过。

## 分工与接口

先读指挥日志及任务指令。公共类型和函数签名以 src/contracts.ts 为准。
A 默认导出 ChargingApp；B 提供动作、推荐和存储模块；指挥部通过 App.tsx 装配。
App.tsx 和 bootstrap.test.tsx 归指挥部，A/B 不修改。
所有运行资源本地托管，不从外部 CDN 加载依赖。离线与发布验收结果以 docs/release 和 handoffs/C.md 为准；本地成功不代表国内外公网都已验证。

## 数据和使用边界

记录只存在当前浏览器的 localStorage，切换设备或清理浏览器不会同步保留。请通过设置导出 JSON 备份。旧 v1 备份不含语言设置时，自动跟随系统语言。计时可暂停或提前结束；刷新页面会结束当前计时，不支持跨设备接续。

这是日常休息工具；INFP 只是偏好入口，不作为算法或医疗判断依据。
