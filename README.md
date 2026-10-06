<p align="center">
  <img src="https://img.shields.io/badge/TgBot%40XiaoMao-ProVersion-blue?style=for-the-badge" alt="version" />
  <img src="https://img.shields.io/badge/%E6%88%90%E6%9C%AC-%E5%AE%8C%E5%85%A8%E5%85%8D%E8%B4%B9-brightgreen?style=for-the-badge" alt="free" />
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-Platform-orange?style=for-the-badge" alt="platform" />
  <img src="https://img.shields.io/badge/Bot%20API-10.3-9cf?style=for-the-badge" alt="botapi" />
  <img src="https://img.shields.io/badge/%E5%86%92%E7%83%9F%E6%B5%8B%E8%AF%95-365%20passed-success?style=for-the-badge" alt="tests" />
  <img src="https://img.shields.io/badge/%E5%8F%AF%E5%AE%89%E5%85%A8%E5%BC%80%E6%BA%90-✓-important?style=for-the-badge" alt="opensource" />
</p>

<h1 align="center">🤖 TgBot@XiaoMao</h1>

<p align="center">
基于 <b>Google Apps Script</b> 的 Telegram 机器人 · 完全免费 · 长期维护<br />
仓库：<a href="https://github.com/xiaomaoJT/TgBot">github.com/xiaomaoJT/TgBot</a>
</p>

------------

> ## 👋 这是什么
>
> 一个跑在 **Google Apps Script（GAS）** 上的 Telegram 机器人：用免费额度实现**超级群管**、**多源接口查询**、**多模型 AI 对话 / 干活**、**频道监听与关键词推送**、**富消息 / 临时消息**、**中英文切换**等能力。
>
> 仓库里目前有两套可并存、可回滚的代码：
> - 🌟 **`MaoBot@ProVersion`（重构版）** —— 本仓库的**首选版本**，建议所有人从这里开始。修掉了官方的真 Bug、淘汰了失效接口、把 Telegram 官方能力真正用起来，并新增三块能力层。
> - 🧱 `MaoBot@OfficialVersion`（正式版 V1.74）—— 稳定维护的模块化版本，作为**兜底与对照**保留。

<p align="center">
<b>📌 新用户直接看 Pro 版本即可；数据表结构 100% 兼容，可从官方版平滑迁移。</b>
</p>

------------

## 🌟 推荐版本：ProVersion（重构版）

> 在官方版 `MaoBot@OfficialVersion`（V1.74）基础上做的一次**结构性重构**：修掉真正的 Bug、淘汰失效接口、把 Telegram 官方能力真正用起来，并把「消息外观」与「指令管理」收敛成可维护的两层；又补了三块**新能力层**——**富消息 / 临时消息**、**多模型 AI**、**频道监听与关键词推送**，以及**热更新**链路。
>
> 原版目录**完整保留、未做任何改动**，两个版本可并存、可随时回滚。

**当前规模**：15 个模块（含 Secrets.gs）· 约 11566 行 · 365 项冒烟测试全绿 · 510 处顶层声明 0 重复

### ✨ 相对官方版的新增要点汇总

| # | 能力 | 说明 |
|:-:|:-----|:-----|
| 1 | 🐞 **18 处真 Bug 根治** | 入群检测从未生效、回调按钮一直转圈、关键字误触发管理指令、超长消息丢失、重复回复… 全部修掉 |
| 2 | 🔌 **失效接口 → 多源故障转移** | 不再绑死单域名，任一源挂了自动切下一源，全挂也友好提示而非「机器人哑掉」 |
| 3 | ⭐ **富消息 + 临时消息** | 真表格卡片；群内查询「只看得到自己的结果」不刷屏；定时自动消失替代手工删消息 |
| 4 | 🧠 **多模型 AI 能力层** | 12 家免费模型注册表 + 故障转移 + 配额保护；`/ai` 对话、`/img` 生图等干活类指令 |
| 5 | 📡 **频道监听 · 查询 · 关键词推送** | 订阅频道、历史检索、命中关键词自动转发到群 |
| 6 | 🌐 **中英文切换 i18n** | 按聊独立切换，英文为代码内预置文案，**不调用任何翻译接口**；群聊仅管理员可改，防滥用 |
| 7 | 🔗 **热更新链路（四条路）** | 远端清单 → 在线覆盖 → 自动发版；改完代码一行 `bash Tools/push.sh` 同步到 GAS |
| 8 | 🏗 **两个结构性改进** | ① 1 个调度器 + 任务队列（解除 GAS 触发器上限）② 声明式指令注册表（加指令改一处） |
| 9 | 🩹 **Webhook 302 真因根治 + 自愈** | `doPost` 改回 200 不再重定向；探测到 302 自动装轮询自愈；`/mode` 手动切 polling / webhook |
| 10 | 🔐 **密钥外移 Secrets.gs（可安全开源）** | 真实密钥移出 `Params.gs`，clone 后 `cp Secrets.gs.example Secrets.gs` 填值即可 |

> 完整修正清单见 **[Pro 版源码解析](./Apps%20Script/MaoBot%40ProVersion/README.md)**，能力路线图见 **[ROADMAP.md](./Apps%20Script/MaoBot%40ProVersion/ROADMAP.md)**。

### 🚀 Pro 版本部署（三步）

```text
① 复制 Modules/ 下全部 .gs 文件 + appsscript.json 到你的 GAS 项目
② 改 Modules/Secrets.gs 里的 EXECID / BOTID / KingId / botIdAlone
   （真实密钥所在，被 .gitignore 排除；clone 后：cp Modules/Secrets.gs.example Modules/Secrets.gs）
③ 依次运行两个函数：initDatabase() → onBotInit()
```

`onBotInit()` 会自动完成：建表 → 自检 → 注册命令菜单 → 安装调度器 → 绑定 Webhook。

👉 **图文 / 视频部署教程见 [Pro 版 COURSE.md](./Apps%20Script/MaoBot%40ProVersion/COURSE.md)**

------------

## 🧭 快速导航

### 🌟 Pro 版本（推荐首选）

- 📘 [Pro 版源码解析](./Apps%20Script/MaoBot%40ProVersion/README.md) —— 架构、模块清单、修正的问题清单
- 🚀 [Pro 版部署教程（图文）](./Apps%20Script/MaoBot%40ProVersion/COURSE.md) ✅
- 🗂️ [Pro 版数据表说明](./Apps%20Script/MaoBot%40ProVersion/DB/COURSE.md)
- 📈 [Pro 版能力路线图 ROADMAP](./Apps%20Script/MaoBot%40ProVersion/ROADMAP.md) —— 基于 Bot API 10.3 与 GAS 配额
- 🖼️ [Pro 版功能概览（图文 / 长图）](./Apps%20Script/MaoBot%40ProVersion/%E5%8A%9F%E8%83%BD%E6%A6%82%E8%A7%88.md)
- 📝 [Pro 版更新日志 CHANGELOG](./Apps%20Script/MaoBot%40ProVersion/CHANGELOG.md)

### 🧱 官方版（稳定维护 · 兜底对照）

- 📘 [官方版源码解析](./Apps%20Script/MaoBot%40OfficialVersion/README.md)
- 🚀 [官方版部署教程（图文）](./Apps%20Script/MaoBot%40OfficialVersion/COURSE.md) ✅
- 🗂️ [官方版数据表说明](./Apps%20Script/MaoBot%40OfficialVersion/DB/COURSE.md)

### 📚 仓库其他资源

- 📖 [仓库资源更新日志 UPDATELOG](./UPDATELOG.md) —— 小版本模块更新说明
- 🚗 [测试版部署教程（一体化，已停止维护）](./COURSE.md)

------------

## 📂 目录构成

+ 📁 [Apps Script](./Apps%20Script) **总目录**
  + 🌟 **MaoBot@ProVersion** —— 🆕 重构版「模块化 + 多源容错 + 官方能力全接入」**（推荐）**
    + **Modules** —— 15 个模块（配置 / 密钥 / 工具 / 基建 / i18n / TG API / UI / 接口 / AI / 频道 / 热更新 / 指令 / 群管 / 调度 / 入口）
    + **Tools** —— 本地构建脚本（build / push / verify / 测试）
    + **Tests** —— 本地冒烟测试（Node 运行，不联网、不耗配额）
    + **DB** —— 数据表结构说明
    + **deploy** —— 热更新清单
  + 🧱 **MaoBot@OfficialVersion** —— 小帽机器人正式版「模块化部署（持续更新）」
    + **Modules** —— 模块化代码
    + **DB** —— 初始化数据表
  + 🛑 **MaoBot@BetaVersion** —— 测试版「一体化部署（停止维护）」
  + 📁 配置图解 / BotTest（BaseBot / HighBot 示例）

> ⚠️ 自正式版 V1.00 起，Beta 测试版已停止维护。官方版 `MaoBot@OfficialVersion` 继续保留可用；需要更完善的功能与更稳的架构，**建议迁移到 `MaoBot@ProVersion`**——数据表结构 100% 兼容，可平滑迁移。

------------

## 🎟 XiaoMao 频道 · 群组

<div align="center">
<a href="https://t.me/ListenToMao" target="_blank">
<img src="https://img.shields.io/badge/Telegram-XiaoMao频道-blue" alt="channel" style="margin-bottom: 5px;" />
</a>
<a href="https://t.me/hSuMjrQppKE5MWU9" target="_blank">
<img src="https://img.shields.io/badge/Telegram-XiaoMao群聊-red" alt="group" style="margin-bottom: 5px;" />
</a>
<a href="https://t.me/Xiao_MaoMao_bot" target="_blank">
<img src="https://img.shields.io/badge/Robot-XiaoMaoBot-orange" alt="bot" style="margin-bottom: 5px;" />
</a>
<a href="https://github.com/xiaomaoJT/xiaomaoJT/blob/main/photo/qrcode.jpg?raw=true" target="_blank">
<img src="https://img.shields.io/badge/WeChat-小帽集团-green" alt="wechat" style="margin-bottom: 5px;" />
</a>
</div>

------------

## 📋 To-Do / 待办列表

**1、图文消息** [开发完成 🎉] 「V1.20+」

- 图文消息

**2、频道消息监听、查询、关键词推送** [ProVersion 已完成 🎉]

- 频道监听 / 历史查询 / 关键词推送

**3、消息自动删除 / 临时消息** [开发完成 🎉] 「V1.30+」

- 受限于 GAS，旧版高并发仅 20 次 / 30s
- 🆕 **ProVersion 已解除限制**：改用「1 个分钟级调度器 + 任务队列表」，触发器数量恒为 1

**4、热更新** [ProVersion 已完成 🎉]

- 热更新（`push.sh` / 远端清单覆盖）

**5、敏感词动态配置** [开发完成 🎉] 「V1.54+ / ProVersion 已完善」

- 动态新增 / 删除，`/word add|del|list`

**6、Telegram 官方能力全量接入** [ProVersion 开发完成 🎉] 「Bot API 10.3」

- 命令面板、回调应答、消息原地编辑翻页、内联模式、表情回应、邀请链接、入群审批、频道身份封禁、话题群、批量删除、Webhook 自管理

------------

## 🎟 声明

- 此项目中仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
- 由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
- 请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
- 此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
- 本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
- 如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明、所有权证明，我将在收到认证文件确认后删除此脚本。
- 所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。

<p align="center">
⚠️ 源码开发不易，使用引用请注明出处 · <b>@XiaoMao</b>
</p>
