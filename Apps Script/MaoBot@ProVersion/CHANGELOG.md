# 📝 MaoBot · ProVersion 更新日志（Changelog）

> 版本说明：这里的日期是「能力落地的日期」，不是 Google Apps Script 的部署版本号（GAS 部署版本号是 `@数字`，当前线上为 `@815`）。
> 每次改完代码都要 `bash Tools/push.sh --deploy` 才会生成新的 `@版本` 并真正生效。

---

## 2026-11-06（续）· 主人代发 /say

> 规模同步更新为：15 个模块（含 Secrets.gs）· 约 12888 行 · 424 项冒烟测试全绿 · 539 处顶层声明 0 重复。

### ✨ 新增：主人代发 /say（仅 Bot 主人）
- **场景**：主人私聊 bot，让 bot 把一条消息**发送或回复**到指定的群聊 / 频道 / 用户。
- **语法**：`/say <目标> <消息> [re:<消息ID>] [--raw] [--silent] [--pin]`
  - `<目标>`：群组/频道/用户 **数字 ID**、**@用户名**、**t.me 链接**、`me`（发给自己）；或留空时**回复一条转发自目标会话的消息**自动取来源。
  - `re:<ID>`：回复目标会话里的第 `ID` 条消息（也可由转发消息自动带出原消息 ID）。
  - `--raw`：不包裹卡片，原样发送（仍支持 HTML）。
  - `--silent`：静默发送（不响铃通知成员）。
  - `--pin`：发送后置顶（仅群/频道，需置顶权限）。
- **美化**：默认把正文包成一张「📣 来自 Bot 主人的消息 … 由 {bot} 代发」卡片（分隔线 + 页脚），样式可在 `Params.gs` 的 `say` 配置块自定义（`header` / `footer` / `divider` / `linkPreview`）。
- **反馈**：发送后回报目标标题、`chat_id`、所用模式、以及可点击的**消息链接**（公开用户名或私有 `t.me/c/...` 自动拼出）。
- **复用**：目标解析复用既有 `channelResolve`，封面/分隔/键值统一走 `uiCard` / `uiDiv` / `uiKV` / `aLink`，与全局外观一致。

---

## 2026-11-06 · 入群欢迎修复 + API 审计 + 新功能

> 当前线上为 `@814` 之后（本次重新部署会生成新版本）。规模同步更新为：15 个模块（含 Secrets.gs）· 约 12888 行 · 424 项冒烟测试全绿 · 539 处顶层声明 0 重复。

### 🐞 核心修复：审核通过入群不发欢迎语
- **根因**：Telegram 在「需审核的公开群、隐藏成员大群」场景下**不保证**下发 `new_chat_members` 服务消息；可靠通道是 `chat_member` 更新（`left → member`，且 `via_join_request=true`）。本 Bot 的 `setWebhook` 订阅了 `chat_member`，但 `handleUpdate()` 里**根本没有分发分支**，导致这类入群被静默丢弃。
- **修复**：
  1. `handleUpdate()` 新增 `chat_member` 分支 → `handleChatMemberUpdate()`；
  2. 入群欢迎/入群验证改为**双通道**：`new_chat_members`（普通入群）与 `chat_member`（审核/隐藏成员入群）都会触发，并用 `chatId:userId` 缓存做 **30 分钟去重**，避免重复欢迎；
  3. 自入群（机器人被拉进群）改在 `chat_member` 通道处理（`via_join_request`/自己加入都覆盖），`new_chat_members` 不再承担机器人自入群判断；
  4. 新增 `getChatMemberSafe()` 兜底（无 `getChatMemberCount` 时回退到 `getChatAdministrators` 计数），避免隐藏成员群取人数时报错；
  5. 欢迎语支持 `{name}/{chat}/{count}` 占位符，并清理注入字符。
- **注意**：`chat_member` 仅在机器人是群管理员时才下发。若不加 Bot 为管理员，审核入群仍不会触发（这是 Telegram 限制，非代码问题）。

### 🔒 安全加固：Webhook 来源校验
- 匿名 `/exec` 端点 + 无签名校验，理论上可被伪造 owner 指令。新增 `WEBHOOK_SECRET_TOKEN`（存 `Params.gs`，默认随机生成一次）：`setupWebhook()` 调 `setWebhook` 时带上 `secret_token`；`doPost` 校验请求头 `X-Telegram-Bot-Api-Secret-Token`，不匹配直接返回 200 空响应（避免伪造 update 触发逻辑）。自动启用，不影响现有部署。

### 🧰 缺陷修补（审计确认的确定性 bug）
- `uiKV` 改用 `esc()` 转义，修复群名/昵称含 `<` 时消息发送失败；
- `sendStorage` 群聊链接在 `-100` 私有群回退到 `tg://chat?chat_id=`，不再生成无效 `t.me/+chatId` 链接（此前会 404）；
- `getDFA` 改用 `cacheDrop` 命名空间失效（原本调不存在的 `cacheDropCache()`），敏感词/违禁词缓存真正刷新；
- `handleJoin` 退群提示默认值（`left`）从 `welcome.enabled` 误读改为 `cfg("welcome.leftEnabled")`；
- `/menu` 标题字符串拼接 bug（`BRAND.name || "Bot" + " 功能面板"` 优先级错误）修正；
- 删除 `Api.gs` 中 `carrier()` 死逻辑（永远返回 `null`，掩盖号段归属）；
- 全局 HTTP 超时：所有 `UrlFetchApp` 调用加 `timeoutSeconds`（普通 8s、AI 推理 30s），避免外部接口挂掉拖死整个 webhook（GAS 默认 360s）。

### 🔧 维护：热榜接口迁移
- 原热榜备源 `vvhan` 已彻底不可达；主源 `api-hot.imsyy.top` 也不稳定。改用 **`60s.viki.moe`** 作为主源，覆盖 微博/知乎/百度/B站/抖音/头条/微信/网易/36氪/IT之家，并附 `vvhan`/`imsyy` 备源回退。实测可用。

### ✨ 新增功能（实用 + 娱乐）
- **`/apicheck`**（owner）：一键体检全部外部端点（天气/一言/热榜/短链/IP/二维码/翻译/AI 等），输出哪些可用、哪些挂了，方便排障。
- **`/topic <标题>`**（admin，仅超级群）：用 `createForumTopic` 快速建话题。
- **`/poll <问题> ~选项1 ~选项2 [--quiz 正确答案序号]`**：发投票/测验（原生 `sendPoll`，支持匿名/多选/测验）。
- **`/slot` / `/darts` / `/bowl` / `/goal`**（娱乐）：原生 `sendDice` 动画（老虎机/飞镖/保龄球/进球），无需外部接口。
- **`/choose <项1> <项2> ...`**（娱乐）：帮做选择，同一天结果稳定。
- **`/8ball <问题>`**（娱乐）：魔法八号球，按「问题+日期」稳定给出答案。
- **`/encode <b64e|b64d|morse> <文本>`**（工具）：Base64 / 摩尔斯互转，无外部依赖。

### 改动文件
- `Modules/MaoBot.gs`：`handleUpdate` 加 `chat_member` 分支；`handleMyChatMember` 新增；`doPost` 加 secret token 校验；`sendStorage` 链接修复。
- `Modules/Manage.gs`：`handleJoin`（双通道欢迎+验证+去重）、`getChatMemberSafe`、退群默认修复。
- `Modules/Params.gs`：`welcome.leftEnabled`、新增 `webhook.secretToken`、热榜源迁移配置。
- `Modules/Triggers.gs`：`setupWebhook` 写入 `secret_token`。
- `Modules/UI.gs`：`uiKV` 改用 `esc()`。
- `Modules/AI.gs` / `Api.gs`：HTTP 超时分级；热榜迁移；`carrier()` 死逻辑删除。
- `Modules/Commands.gs` / `I18n.gs`：注册 9 个新指令 + 英文文案。
- `Tests/gas-mock.js` / `Tests/smoke-test.js`：mock 加 `fetchAll`、新增 32 项测试（审核入群/新指令/API 体检/超时分级等）。
- `Tools/push.sh`：修复 `--deploy` 在代理环境下因 `set -e` 遇 clasp 非零退出而中断、导致固定版本部署没自动挂新版本的问题；改为「建版本 + 挂版本 + 复核」均带重试，且统一以 `deployments` 复核为准，不再依赖脆弱的 "Redeployed" 字样匹配。

### 验证
- `node Tools/build.js` → 15 个模块、约 12655 行
- `node Tests/check-dupes.js Modules` → 537 处顶格声明、无重复
- `bash Tests/run.sh` → 408 项冒烟测试全绿

---

## 2026-10-08 · 入群申请屏蔽指令 /auth + 通知加群组跳转

### 🚫 新增：`/auth` 权限名单管理（仅 Bot 主人）
统一管理 `authority_management` 表里的两张名单，支持 **查看（带跳转）/ 新增 / 修改 / 删除**：
- `/auth block list|add|del|edit` —— **群组屏蔽列表**（第 3 行）：被屏蔽的群，其入群申请与群消息都不再推送给主人。
- `/auth admin list|add|del|edit` —— **管理员列表**（第 4 行）：手动维护管理员 ID（可视化/备用；权限校验仍以 Telegram 官方 `getChatAdministrators` 自动获取为准）。

### 🔔 入群申请通知增强
- 通知卡片现在额外展示 **群组 ID**，并附 **可跳转链接**（公开群用 `https://t.me/<username>`，私有群自动导出主邀请链接；用户用 `tg://user?id=<id>`）。
- `handleJoinRequest` 接入「群组屏蔽列表」：被屏蔽的群不再推送入群申请。

### 改动文件
- `Modules/MaoBot.gs`：`handleJoinRequest` 跳过屏蔽群 + 展示群组 ID/跳转；新增 `resolveJumpLink()` 辅助。
- `Modules/Triggers.gs`：新增 `authorityRowValues()` / `setAuthorityRowValues()` / `getAdminList()`（读写第 3/4 行，写后失效缓存）。
- `Modules/Manage.gs`：新增 `cmdAuth()` 处理器。
- `Modules/Commands.gs`：注册 `/auth`（别名 authority / 权限，owner 级）。

### 验证
- `node Tools/build.js` → 15 个模块、约 11853 行
- `node Tests/check-dupes.js Modules` → 515 处顶格声明、无重复
- `bash Tests/run.sh` → 365 项冒烟测试全绿

---

## 2026-10-08 · 修复：`/auth` 参数解析 + 进 /help

### 🐞 修复 1：`/auth block list` / `/auth admin list` 报「参数不正确」
- **根因**：指令分发层 `runCommand` 给 handler 传的是**字符串** `parsed.args`（如 `"block list"`），而 `cmdAuth` 当**数组**用（`args[0]`/`args[1]` 取到的是字符串首字符 `"b"`/`"l"`），导致 `listType`/`op` 永远不匹配子命令，回退到 `uiUsage` 卡片。
- **修复**：`cmdAuth` 入口增加对「字符串参数」的兼容——`typeof args === "string"` 时按空白拆成数组（`"block list"` → `["block","list"]`）。与其他多词指令（`/ch`、`/word`、`/ban` 等）的约定一致。

### 📖 修复 2：`/auth` 未出现在 `/help`
- **根因**：`/help` 由 `COMMANDS` 注册表自动生成，但 `helpVisibleCommands()` 过滤掉了**所有 `level:"owner"` 指令**，而 `/auth` 标记为 owner。
- **修复**：给指令定义新增可选 `help` 字段；`helpVisibleCommands()` 改为「owner 默认不展示，但显式 `help:true` 的纳入」。`/auth` 已标记 `help:true`，现在出现在 `/help` 的「管理」分类下（Describe 与用法自动同步）。
- **审计结论**：非 owner 指令均已通过注册表自动进入 `/help`，无遗漏；默认隐藏的 11 个 owner 指令为 `broadcast` + 维护类（`health`/`webhook`/`sync`/`reload`/`push`/`word`/`kw`/`db`/`king`/`mode`），按设计不面向普通用户展示。

### 改动文件
- `Modules/Manage.gs`：`cmdAuth()` 入口参数归一化（字符串→数组）。
- `Modules/Commands.gs`：`/auth` 加 `help:true`；`helpVisibleCommands()` 放宽 owner 过滤。

---

## 2026-10-06 · 密钥外移 Secrets.gs（可安全开源）+ 仓库清理

把仓库变得可以放心推到公开平台：

### 🔐 密钥与仓库安全
- 真实密钥（表格 ID / Bot Token / 主人 ID / botIdAlone / Gemini Key / Webhook 地址）从 `Modules/Params.gs` 移到新增的 `Modules/Secrets.gs`，`Params.gs` 只保留空占位，**可安全提交到公开仓库**。
- `Secrets.gs` 被 `.gitignore` 排除，绝不会进仓库；运行时由它把值覆盖回 `Params.gs` 的空占位（用 `var PROJECT_SECRETS` + 赋值，不新增顶层声明，所以 `check-dupes` 不会误报重复）。
- 新增 `Modules/Secrets.gs.example`（占位模板，可提交）：clone 后 `cp Modules/Secrets.gs.example Modules/Secrets.gs` 填自己的值。
- `Tools/modules.js`：`ORDER` 加入 `Secrets`，并把 `readModules` 改成「ORDER 里本地不存在的模块（即被 gitignore 的私密配置）软跳过」—— 没 `Secrets.gs` 也能正常 build / push。
- `Tools/keep-remote-values.js`：push 前的空值保护现在**跳过这 6 个外移的密钥**，不会再把手填的真值写回 `Params.gs`。
- 仓库清理：删除全部 `.DS_Store`（macOS 垃圾）并加入 `.gitignore`；`Tests/` 测试套件保留（365 项冒烟测试仍全绿）。

### 验证
- `node Tools/build.js` → 15 个模块、`dist/Secrets.gs` 正常生成
- `node Tests/check-dupes.js Modules` → 510 处顶格声明、无重复
- `node Tools/verify-push.js --offline` → 本地产物自检通过
- `bash Tests/run.sh` → 365 项冒烟测试全绿

---

## 2026-10-05 · 中英文切换（i18n）+ Webhook 302 真因根治 + 自愈闭环

### ✨ 新增：中英文切换
- 新增 `Modules/I18n.gs` 轻量 i18n 层，设计原则与用户约定一致：
  - **不做全局语言自动识别**：语言是「每聊独立」的，私聊 / 群各自切换、互不影响；
  - **不调用任何翻译接口**：英文是代码里**预置的静态文案**，不是实时翻译（避免把内容发给未配置的第三方）。
- 新增 `L(zh, en)` 内联助手 + 请求级当前语言 `__CUR_LANG__`（每条消息进入 `handleUpdate` 时按 `chatId` 从 `chat_settings` 读出）。
- 新增 **`/lang`** 指令：
  - `/lang` 查看当前语言；`/lang en` 切英文；`/lang zh` 切回中文；
  - **私聊**任何人都能改自己的语言；**群聊**只有管理员 / Bot 主人能改（防滥用）；
  - 语言按聊持久化（脚本缓存 24h + `chat_settings` 表），切完本条之后的回复即生效。
- 指令注册表补充英文 `desc/usage`（`I18N_CMD_EN`），`/help` 与 `/menu` 按当前语言渲染分类名、描述与用法；`/start` `/id` `/ping` `/mode` `/health` `/lang` 及「未匹配内容」兜底文案均已双语化。

### 🐞 修复：Webhook 永远 302 的真因（根治，非绕过）
- **根因**：GAS 的 `/exec` 对 **POST 请求架构上永远返回 302** 到 `script.googleusercontent.com/macros/echo`，真内容在 echo 上且 echo 只收 GET。浏览器 / `curl -L` / Postman 会自动跟随重定向所以人肉测试无感；**Telegram 严格不跟随重定向 → 看到 302 直接判投递失败**，表现为「时灵时不灵 / 首条能回后续全哑」。这与「执行身份 / 访问权限」那两栏**无关**（实测匿名 GET 跟随后能拿到 200 和页面，权限一直是好的）。
- **解法**：`doPost` 的返回值从 `ContentService` 换成 `HtmlService.createHtmlOutput(...)`，GAS 直接回 200、不再重定向。改完一测，POST 立刻从 302 变 200，Webhook 重新绑定后实时秒回。
- ⚠️ 历史教训：之前「HtmlService 无效」的误判，是被**固定版本部署跑旧快照**骗了（push 了但没真正挂到部署）。凡「改了代码现象没变」，先 `node Tools/verify-push.js` + `clasp deployments` 确认线上真的换了代码。
- 顺手修了 `Tools/push.sh` 里「发版报成功其实没挂上」的坑（本次 `@811` 曾手动补挂）。

### ♻️ 自愈闭环
- `pollUpdates()` 开头新增**自动让位**：探测到 Webhook 已绑定就自杀（两者互斥，留着会抢消息 / 刷 409）；
- `runDailyMaintenance()` 第 0 步新增 `ensureReachable()`：发现 Webhook 又 302 且无轮询触发器 → 自动清积压 + 装轮询（24h 内不重复打扰）；
- 新增 `/mode` 指令，随时手动切 `polling` / `webhook`。

### 规模
- 15 个模块（含 Secrets.gs）· 约 11566 行 · **365 项冒烟测试全绿** · 510 处顶层声明 0 重复。

---

## 2026-10-05（早）· 数据落表 + 接入模式可观测

- **修复**：私聊里的 `/xxx` 指令此前按设计不写 `db_telegram`，造成「私聊完全没记录」的错觉。改为**私聊指令也留痕**（类型标注「·指令」），群聊指令照旧跳过不刷屏。
- 新增 **`/db`** 指令：逐张报表名 + 行数，`/db init` 自动补建缺失的表。
- 新增 **`/mode`** 指令与 `modeDiag()`：一眼看清当前是 Webhook 还是轮询、积压多少、最近报错。
- `setup-webhook.js` 的 `--drop` 现在会打印 Telegram 侧的 `last_error_message` / 积压，定位更快。

---

## 2026-09-30 起 · 初始 ProVersion 重构（相对官方版 V1.74）

在官方版 `MaoBot@OfficialVersion`（V1.74）基础上做一次结构性重构，原版目录完整保留、可并存回滚。

### 🐞 修正的 18 项真 Bug（节选，详见 README「修正的问题清单」）
- 入群 / 退群检测用了已移除的 `new_chat_participant` 字段（欢迎 / 欢送从未生效）；
- 回调按钮从不调用 `answerCallbackQuery`（点按钮一直转圈到超时）；
- 关键字命中后还走兜底分支（收到答案外加一条「未匹配」）；
- `getUnixTime` 写成 `date.getseconds()`（秒 < 10 得 NaN，禁言时长算错）；
- 指令用 `key.indexOf("/ban") != -1` 判断（消息里出现 `/ban` 就误触发）；
- 没有 `update_id` 去重（Telegram 重推时重复回复）；
- 第三方文本未做 HTML 转义（含 `<` `&` 整条静默丢失）；
- 等共 18 项。

### 🔌 失效 / 不合规接口替换
- v1.apigpt.cn（ChatGPT）→ Pollinations / 自建 OpenAI 兼容端点；
- api.vvhan.com 系列（热榜 / 星座 / 豆瓣）→ imsyy 热榜、本地今日一签、并入 `/hot`；
- 不合规的随机视频 → 移除，换 `/dice` `/coin` `/img`；
- 不稳定 / 失效的蓝奏云、随机音乐等 → 移除或降级；
- 改为**多源故障转移**：任一源失效自动切下一源。

### ✨ 接入的 Telegram 官方能力（覆盖 60+ 方法）
- 命令面板 `setMyCommands`、交互面板、原地翻页、内联模式；
- 群管全套（邀请链接 / 入群审批 / 晋升 / 封频道身份 / 管理员头衔）；
- 批量删除、转发、表情回应、相册、话题群、`link_preview_options`；
- **富消息**（10.1+ 真表格 / 列表 / 折叠块，GFM 渲染）、**临时消息**（10.2+ 群内仅本人可见）、草稿气泡（9.5+）；
- Webhook / 部署可达性自检。

### 🧠 多模型 AI 层
- 12 家免费模型注册表 + 故障转移 + 本地配额保护；`/sum` `/ask` `/code` `/polish` `/see` `/digest` `/todo` `/models` 等工作类任务。

### 📡 频道监听 · 查询 · 关键词推送
- 监听 + `/ch log` 历史查询 + 按「频道 × 关键词 × 目标会话」规则推送（图文原样搬运、幂等去重）。

### 🏗 两个结构性改进
- 触发器：从「20 个一次性触发器」→「1 个调度器 + 任务队列」；
- 指令：从「单一 switch 20+ 分支」→「声明式注册表」，帮助菜单与命令面板自动同步。

### 🔁 热更新与本地工具链
- 配置热更新 `/reload`；在线热更新 `/push`；clasp 一条命令 `Tools/push.sh`（自检 → 构建 → 空值保护 → 推送 → 回读校验）；单文件粘贴兜底 `Tools/bundle.js`；GitHub Actions。
- 跨文件重复声明检查（GAS 扁平作用域的隐形杀手，509 处声明 0 重复）。

---

## 路线图（见 ROADMAP.md）
- 富消息真表格替代手工拼表、临时消息替代自动删除调度器（已在 10.x 能力内实现）；
- 更多指令回复双语化（当前已覆盖 `/start` `/help` `/menu` `/id` `/ping` `/mode` `/health` `/lang` 及兜底文案，其余指令正文可继续包裹 `L()`）；
- 更多 Bot API 10.3 / GAS 2026 配额项。
