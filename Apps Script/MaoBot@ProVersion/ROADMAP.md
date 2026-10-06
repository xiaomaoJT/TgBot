# MaoBot 能力扩展可行性分析

> 调研时间：2026-09-30
> 结论基准：Telegram Bot API **10.3**（2026-08-24 发布）｜Google Apps Script 2026 配额表

---

## 零、一句话结论

改造时我按 **Bot API 7.x** 设计的 UI 层，而官方现在已经到 **10.3**。
其中 **Rich Messages（真表格）** 和 **临时消息（Ephemeral）** 两项，能直接把当前代码里的两块「手工硬凑」换成官方原生能力 —— 一个让 UI 变好，一个让代码变简单。

而「基于 GAS 还能实现什么」的真正答案不在 Telegram 侧，在 **Google 生态侧**：Gmail、Calendar、Drive、Docs、Translate、Gemini、HtmlService 这些是白送的，别的 bot 框架拿不到。

---

## 一、调研：热门 Bot 都在做什么

按功能分四类，对照我们已有的能力：

### 1. 群管理型
| Bot | 核心卖点 | MaoBot 现状 |
|---|---|---|
| @MissRose_bot | 词过滤、**跨群共享封禁**、notes、欢迎语 | ✅ 大部分有；❌ 缺跨群联合封禁 |
| @combot | 反垃圾 + **成员活跃度分析** | ✅ 有 `/stat` `/top` |
| @Shieldy | 入群做人机验证 | ✅ 有（数学题按钮） |
| @GroupHelpBot | 验证 + 过滤 + 仪表盘 | ⚠️ 缺可视化面板 |
| @modr8aibot | **AI 语义反垃圾** | ❌ 仅 DFA 字面匹配 |
| @Protectron | AI 安全 + 分析 | ❌ 同上 |

### 2. 内容推送型
| Bot | 核心卖点 | MaoBot 现状 |
|---|---|---|
| @RSSBot / Feed Reader | RSS 订阅推送到私聊/频道 | ❌ **完全没有 —— 而这是 GAS 最强项** |
| @ControllerBot | 频道**排期发帖**、按钮、反应统计 | ⚠️ 有 `task_queue` 底座，缺用户入口 |
| @GmailBot | 在 TG 里收发 Gmail | ❌ 没有 —— GAS 白送 |

### 3. 工具型
| Bot | 核心卖点 | MaoBot 现状 |
|---|---|---|
| @weatherbot | 天气预报 | ✅ 有 |
| @YTranslateBot | 100+ 语言翻译 | ✅ 有（但源不稳，可升级） |
| @Skeddy | **自然语言定时提醒** | ⚠️ 有调度器，缺 `/remind` 用户入口 |
| @SaveAsBot | 媒体下载 | ❌ GAS 弱项 |

### 4. 运营/娱乐型
| Bot | 核心卖点 | MaoBot 现状 |
|---|---|---|
| @GAMEE | 聊天小游戏 + 排行榜 | ❌ 没有 |
| @RaffleGram | 抽奖 + **可验证随机** | ❌ 没有 |
| @PollBot | 投票 | ❌ 没有 |
| @LivegramBot | **客服私信转发**（管理员双向回复） | ❌ 没有 |
| @InviteMember | 邀请裂变 + 付费门槛 | ⚠️ 有 `/invite`，无统计 |

**缺口最明显、且 GAS 最适合做的三件事：RSS 推送、客服转发、Gmail 集成。**

---

## 二、先摆事实：GAS 的硬约束

所有方案必须过这一关。数字来自 Google 官方配额页（2026）：

| 项目 | 消费级账号（gmail.com） | Workspace |
|---|---|---|
| 单次脚本运行时长 | **6 分钟** | 6 分钟 |
| **每日总运行时长** | **90 分钟** ← *真正的天花板* | 6 小时 |
| UrlFetch 调用 | **20,000 / 天** | 100,000 / 天 |
| **单次 UrlFetch 超时** | **60 秒** | 60 秒 |
| UrlFetch 响应体 | 50 MB | 50 MB |
| UrlFetch URL 长度 | 2 KB | 2 KB |
| 触发器 | **20 个 / 脚本** | 20 个 |
| 每用户并发执行 | 30 | 30 |
| Properties 总容量 | 500 KB | 500 KB |
| 单个 Property 值 | 9 KB | 9 KB |
| Script 版本数 | 200 | 200 |
| 邮件收件人 | 100 / 天 | 1,500 / 天 |
| Calendar 事件 | 5,000 / 天 | 10,000 / 天 |
| **Translate 调用** | **5,000 / 天** | 20,000 / 天 |
| 新建 Docs/Slides/Sheets | 250 / 天 | 1,500 / 3,200 |

### 换算成「能扛多大的群」

假设每条消息平均处理耗时 1.2 秒（读表 + 调 TG API）：

```
90 分钟/天 ÷ 1.2 秒 ≈ 4,500 条/天
```

**结论：GAS 版 MaoBot 适合日均 3,000 条以内的社群。**
超过这个量级，会先撞「每日 90 分钟」而不是 20,000 次 UrlFetch。
大群（几万人、日活上千）建议迁到 Cloudflare Workers / VPS —— 这点必须说清楚，不能假装 GAS 无所不能。

> 应对手段：把 `/stat` `/top` 这类重查询改成**按需定时预计算**（写入 `chat_settings` 或独立统计表），让消息处理路径保持轻量。

---

## 三、Tier 1：官方新能力 —— 收益最大、改动最小

### 3.1 Rich Messages｜真表格（Bot API 10.1+）

**这是本次调研最大的发现。**

10.1 引入 `sendRichMessage`，内容用 GFM Markdown 写，**Telegram 服务端渲染**：

```javascript
// 现在（UI.gs 里的等宽字符硬凑）
uiTable([["平台","热度"],["微博","1234万"],["知乎","987万"]])
// → "平台  热度\n微博  1234万\n..."  靠空格对齐，手机端字体不等宽就歪

// 之后
tgCall("sendRichMessage", {
  chat_id: chatId,
  rich_message: { markdown:
    "## 🔥 实时热榜\n\n" +
    "| 平台 | 热度 | 趋势 |\n" +
    "|:---|---:|:---:|\n" +
    "| 微博 | 1234万 | 🔺 |\n" +
    "| 知乎 | 987万 | 🔻 |\n" +
    "\n> 数据更新于 " + nowStr() + "\n"
  },
  reply_markup: kb([[btn("🔄 刷新", "hot:refresh")]])
});
```

支持：**多级标题、段落、分隔线、有序/无序列表、任务列表（`- [x]`）、真表格（带对齐冒号）、脚注、`$数学$`、折叠详情**。

**限制**：单条 32,768 字符 / 500 个块 / 表格最多 20 列；单元格内**只能**放行内格式，不能嵌块级标签。

**对我们的价值**：
- `/hot` `/top` `/stat` `/health` 的表格从「手工补齐空格」升级为真表格
- 帮助菜单、群规可以渲染成真正的标题 + 列表层级
- **不再需要 MarkdownV2 的 18 个转义字符**（GFM 没有那套转义地狱），`esc()` 的负担大减

**10.3 又补了**：表格内按钮 `RichBlockButtons`、紧凑表格 `is_compact`、可折叠引用 `RichBlockExpandableBlockQuotation`、文件块 `RichBlockDocument`。

### 3.2 临时消息｜砍掉整个自动删除调度器（10.2 / 10.3）

**这条直接减少代码量。**

现在 `UI.gs` 的 `sendEphemeral()` + `Manage.gs` 的 `scheduleAutoDelete()` + `Triggers.gs` 的 `runScheduler()` + `task_queue` 表 —— 一整套机制，目的是「让 `/id` `/health` 这类回复别一直挂在群里」。

10.2 之后官方原生支持：

```javascript
// 群里只有触发者能看到这条消息，别人完全看不见
tgCall("sendMessage", {
  chat_id: chatId,
  text: "你的 ID：<code>123456</code>",
  parse_mode: "HTML",
  ephemeral_message_parameters: {
    receiver_user_id: userId,          // 仅此人可见
    callback_query_id: cbId            // 或从按钮触发
  }
});
```

还配套了 `editEphemeralMessageText` / `editEphemeralMessageMedia` / `deleteEphemeralMessage`。

**两个注意点**：
1. **若非回复 callback query，机器人必须是群管理员**；从按钮触发则不需要。
2. 10.3 起参数合并为 `EphemeralMessageParameters`，旧字段 `receiver_user_id` / `callback_query_id` 已废弃。

**收益**：查询类命令**不再需要预先计划删除**，`task_queue` 的用途可以收窄到纯粹的「定时任务」（提醒、排期发帖），复杂度显著下降。

### 3.3 按钮颜色 + 禁用态（9.4 / 10.3）

```javascript
btn("🗑 删除", "del:123", { style: "danger" })    // 红色
btn("✅ 确认", "ok:123",  { style: "success" })   // 绿色
btn("已处理", "noop",     { disabled: true })     // 灰掉（10.3 新增）
```

`inline_keyboard_button` 还支持 `icon_custom_emoji_id`（需 bot 所有者有 Premium）。
对我们的价值：`/manage` 面板、确认类按钮的语义立刻清晰，**危险操作不再误点**。

### 3.4 本地化时间实体（9.5）

`MessageEntity` 新增 `date_time` 类型，**Telegram 客户端自动本地化**并显示相对时间：

```
"会议 <tg-time unix=1790000000>3分钟后</tg-time> 开始"
→ 用户看到的是"3分钟后"，且随时区自动换算
```

对我们：`/stat` 的时间列、`/remind` 的确认提示、欢迎语里的注册时长，**不用再手写时区转换**（`nowStr()` 那套可以简化）。

### 3.5 AI 消息流式输出（9.5 起对所有 bot 开放，10.3 完善）

```javascript
sendMessageDraft({ chat_id, draft_id, text: 累积文本 })  // 反复覆盖，约 30 秒的临时气泡
// 生成完毕再 sendRichMessage 落成正式消息
```

10.3 新增 `can_stop` / `keep_on_stop` 和 `MessageGenerationStopped` 更新 —— **用户能中途掐断生成**。

对我们 `/ai`：现在的做法是等 AI 出完整文本再发（慢且卡顿），改流式后体验完全不一样。

### 3.6 其他值得接的

| 能力 | 版本 | 用途 |
|---|---|---|
| `setChatMemberTag` 成员标签 | 9.5 | `/warn` 自动打「⚠️违规」标签，比禁言更轻 |
| `can_send_welcome_messages` 权限 | 10.3 | 欢迎语独立权限（以前借 send_messages） |
| `setMyProfilePhoto` / `setMyName` | 9.4 | `onBotInit()` 里一并把头像/名字设好 |
| `deleteMessageReaction` / `deleteAllMessageReactions` | 10.0 | 管理端清理恶意表情刷屏 |
| **Guest Mode** 访客模式 | 10.0 | **bot 不进群也能被召唤回复** —— 「用完就走」的查询场景 |
| **Poll 革命** | 9.6/10.0 | 多正确选项、重新投票、乱序选项、**用户可自行加选项**、选项可带图/位置、回复特定选项 |
| **Communities 社区** | 10.2/10.3 | 多个超级群/频道/机器人组成联合体，适合多群矩阵 |
| Live Photos 动态照片 | 10.0 | 支持带动效和声音的图片 |

---

## 四、Tier 2：GAS 独有优势 —— 这是「别人做不到」的部分

**这是问题的真正答案。** 任何 Python/Node bot 都要自己搭这些；GAS 签名就有：

### 4.1 免费 HTTPS 托管 → Telegram Mini App

`HtmlService` + `doGet` 部署为 Web App，白拿一个 HTTPS 地址，**直接配到 BotFather 的 Menu Button 当 Mini App**。

```javascript
function doGet(e) {
  return HtmlService.createTemplateFromFile('panel')
    .evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)      // 现在只支持 IFRAME
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle("MaoBot 控制台");
}
```

⚠️ **三个必须知道的限制**：
1. 只支持 `IFRAME` 沙箱模式；链接必须 `target="_top"` 或 `_blank`
2. 脚本/样式表/XHR **必须 HTTPS**
3. **`script.google.com` 在中国大陆被墙** —— 国内用户需代理才能打开。你自己用 QuantumultX 应该清楚这个前提，但群友不一定有。

**能做什么**：群运营仪表盘（活跃度图表、成员增长）、成员自助修改设置、抽奖/报名表单、群规确认页。
`doPost` 处理 webhook + `doGet` 提供面板，同一个脚本里可以共存。

### 4.2 Gemini API（免费额度比想象中大）

```
Gemini 3 Flash      10 RPM / 1,500 RPD / 1M 上下文
Gemini 3.1 Flash-Lite  15 RPM / 1,000 RPD
```

对比现在用的 pollinations：**质量、稳定性、能力全面碾压**。

能做的升级：
- `/ai` 从「单轮问答」升级为**多轮对话**（对话历史存 `chat_settings` 或独立 sheet）
- **图片理解**：用户发图 → Gemini 描述/OCR/审核（配合 `Utilities.base64Encode`）
- **函数调用**：让模型决定调用哪个内部命令，自然语言驱动 bot
- **语义反垃圾**：补 DFA 的短板 —— DFA 只能匹配字面词，「加V：xxxx 低价出」这类变体它抓不住，Gemini 能判意图

⚠️ 免费额度有 60 秒单次超时约束，且 10 RPM 对群聊偏紧，需要做**配额计数 + 降级**。

### 4.3 Google Translate（白送 5,000 次/天）

```javascript
LanguageApp.translate(text, "", "zh-CN")
```

现在 `/tr` 走的 MyMemory 是第三方公共接口，不稳、有长度限制。换成官方 `LanguageApp`：
**5,000 次/天、无明显限流、质量更好**。几乎是零成本升级。

### 4.4 Gmail 集成

对标 @GmailBot。能力：
- 收信规则 → 推送 TG（正则可过滤发件人/主题）
- TG 内 `/mail` 查看未读、`/mail read 3` 读正文
- 附件转发到 TG
- ⚠️ 消费级账号 **100 收件人/天** 上限

### 4.5 Calendar 集成

对标 @Skeddy 的一部分，且是**双向**的：
- `/日程 明天 15:00 评审会` → 写入 Google Calendar
- 会议前 N 分钟自动 TG 提醒（调度器已有）
- 每天早晨推送当日日程
- 5,000 事件/天，够用

### 4.6 Drive / Docs / Slides

- `/report` 把群统计数据生成 DOCX/Slides，回传分享链接
- 消息中的文件自动归档到 Drive 按月份建文件夹
- `/drive 关键词` 搜索云盘文件 → 直链
- 250 个文档/天（消费级）

### 4.7 其他

| 服务 | 能做什么 |
|---|---|
| **Charts** | 生成统计图 PNG，`sendPhoto` 发到群里 |
| **YouTube Data API**（UrlFetch） | 10,000 units/天，`/yt` 视频搜索、时长/播放量 |
| **Spreadsheets** | 让群成员 `/table` 自助建小表（记账、报名） |
| **CacheService** | 已在用于 DFA 缓存和限流；100KB/键 |
| **JDBC** | 如需真数据库（BigQuery/MySQL），10,000 连接/天 |
| **Static Maps** | 位置类功能（1,000 次/天） |

---

## 五、Tier 3：热门 Bot 功能补位（可落地清单）

按「GAS 契合度 × 用户价值」排序：

| # | 功能 | 对标 | GAS 契合度 | 实现要点 |
|---|---|---|---|---|
| 1 | **RSS 订阅推送** | @RSSBot | ⭐⭐⭐⭐⭐ | `UrlFetch` 抓 XML → 解析 → 增量比对已推送 GUID → 发频道。分钟级触发器天然适配。**GAS 最强项** |
| 2 | **`/remind` 定时提醒** | @Skeddy | ⭐⭐⭐⭐⭐ | `task_queue` 已就绪，只差用户侧入口和自然语言时间解析 |
| 3 | **频道排期发帖** | @ControllerBot | ⭐⭐⭐⭐⭐ | 同上，写队列即可 |
| 4 | **`/tr` 换 Google 翻译** | @YTranslateBot | ⭐⭐⭐⭐⭐ | 改 3 行代码 |
| 5 | **`/ai` 换 Gemini + 流式** | — | ⭐⭐⭐⭐ | 加配额计数与降级 |
| 6 | **客服私信转发** | @LivegramBot | ⭐⭐⭐⭐ | 私聊消息→转发管理员，`/reply <id>` 回给用户。纯转发逻辑，GAS 胜任 |
| 7 | **群规弹窗 + 入群验证升级** | @Shieldy | ⭐⭐⭐⭐ | 按钮连点 / emoji 点选 / 数学题随机 |
| 8 | **AI 语义反垃圾** | @modr8aibot | ⭐⭐⭐ | 只对「疑似」消息调 Gemini，控制配额 |
| 9 | **群投票** | @PollBot | ⭐⭐⭐⭐ | 用 9.6 新 poll：多正确项、乱序、用户加选项 |
| 10 | **抽奖开奖** | @RaffleGram | ⭐⭐⭐⭐ | 用 `hashSeed(chatId + 结束时间)` 做可复现随机，可公示验证 |
| 11 | **签到积分 + 排行榜** | @GAMEE | ⭐⭐⭐⭐ | Sheets 记分，`/checkin` `/rank`；纯表格操作 |
| 12 | **跨群联合封禁** | @MissRose_bot | ⭐⭐⭐⭐ | 新增 `global_ban` 表，`knownChatIds()` 已存在 |
| 13 | **邀请赛道排行** | @InviteMember | ⭐⭐⭐⭐ | 记录 `from.id` 邀请关系 → `/inviteboard` |
| 14 | **Gmail / Calendar 集成** | @GmailBot | ⭐⭐⭐ | 见 §4.4 / §4.5 |
| 15 | **群运营仪表盘（Mini App）** | @GroupHelpBot | ⭐⭐ | 见 §4.1，注意墙的问题 |
| 16 | 文件格式转换 | @TGFileConverterBot | ⭐ | GAS 无 ffmpeg/LibreOffice，须接第三方 |

---

## 六、Tier 4：明确不建议做 / 做不到（诚实边界）

| 项目 | 为什么不行 |
|---|---|
| **高并发大群**（日活数千） | 「90 分钟/天」先炸，不是 fetch 次数。需迁 Cloudflare Workers / VPS |
| **音视频转码/压缩** | GAS 无 ffmpeg，Blob 操作能力有限 |
| **WebSocket / 长连接** | GAS 是请求-响应模型，无常驻进程 |
| **大文件中转**（几百 MB） | UrlFetch 响应 50MB 上限，Web App 返回也有约束 |
| **毫秒级交互响应** | 冷启动 1–3 秒，`callback_query` 有超时压力 |
| **支付后端** | Telegram Stars / 第三方支付校验需要可靠服务端，GAS 可以但风险高 |
| **大规模持久化存储** | Properties 仅 500KB，必须落 Sheets；Sheets 单表 1000 万单元格上限 |
| **语音转文字** | 需 Google Speech API（要 GCP 计费），免费路径质量不稳 |
| **Mini App 面向国内用户** | `script.google.com` 被墙，需代理 |

---

## 七、建议路线（按 ROI 排序）

> **交付状态（2026-09-30 更新）**：P0 四项 **已全部落地**；P1 第 5/6 项与「RSS 订阅推送」的
> 能力底座（频道监听 + 关键词推送）已实现；其他项仍在待办。下面逐条标注。

### P0 —— 改动小、收益立竿见影　✅ 已全部交付
1. ✅ **接入 `sendRichMessage`**：新增 `UI.gs` 富消息层（`blk*` 块结构 + `richCard` 双产物），
   `/hot` `/top` `/stat` `/health` `/models` `/ch log` 全部切到真表格。
   关键是**一份数据同时产出 GFM 与 HTML**，富消息不可用时自动降级，两条路径永不脱节。
2. ✅ **用临时消息替换自动删除调度器**：`/id` `/ping` `/calc` `/ip` `/t` `/file` `/phone` `/ai`
   走 `ephemeral_message_parameters`；实现了「富+临时 → HTML+临时 → 公开+定时删除」三级降级。
   ⚠️ 实测发现：`task_queue` **不能**完全收窄为纯定时任务 —— 非管理员场景仍需第三级兜底。
3. ✅ **`/tr` 换 `LanguageApp.translate`**：官方免费 5000 次/天**且不占 UrlFetch 配额**，
   异常时降级到 MyMemory。
4. ✅ **`/ai` 换 Gemini + `sendMessageDraft` 流式反馈**：扩展为 **12 家免费模型的注册表**
   （自动故障转移 + 按模型配额保护 + 隐私默认值），并补了 8 个工作类指令
   `/sum /ask /code /polish /see /digest /todo /models`。
   ⚠️ 诚实结论：GAS 的 `UrlFetchApp` **无法消费 SSE**，真正的逐字流式做不到；
   已实现的是「调用前先亮思考中气泡」这一层。

### P1 —— 中等工作量、高价值
5. ⬜ 按钮 `style` 配色 + `disabled` 禁用态（`btn()` 已预留扩展点，尚未启用）
6. ⬜ `date_time` 实体替换手写时区转换
7. ✅ **订阅推送**（GAS 最强项）：以**频道监听 + 关键词推送**形式交付
   （`Channel.gs` + `channel_watch` 表 + `/ch` 指令族）。
   ※ RSS 源解析尚未做，但那只是「取内容」的一环，推送链路已经通了。
8. ⬜ **`/remind` 用户入口**（复用现有调度器）

### P2 —— 值得做但需投入
9. ⬜ `/warn` 接 `setChatMemberTag` 自动打标签
10. ⬜ 客服私信转发
11. ⬜ Gmail / Calendar 集成
12. ⬜ 签到积分 / 群投票 / 抽奖
13. ⬜ 跨群联合封禁
14. ⬜ Mini App 运营仪表盘（注意国内可达性）

### 额外交付（原路线图未列，但补上了用户 To-Do 里缺的两项）
15. ✅ **频道消息监听 / 查询 / 关键词推送** —— 见上第 7 条
16. ✅ **热更新** —— 三条路全铺好：
    ① 配置热更新（`/reload`，覆盖 90% 日常改动）
    ② 在线热更新（`/push` 指令：远端清单 → Apps Script API 覆盖 → 建版本 → 切部署）
    ③ 本地 clasp + GitHub Actions（`Tools/build.js` / `make-manifest.js` / 仓库根目录的 workflow）
    ⚠️ 诚实结论：GAS 运行时**读不到自己的源码**（平台无此 API），所以 `/push` 只比对版本号，不做 diff。
17. ✅ **Web 应用地址自动解析**（踩坑补充）—— `ScriptApp.getService().getUrl()`
    在编辑器里运行返回的是 `/dev` 测试地址，Telegram 访问不了，而 `setWebhook`
    照样返回成功 → "初始化全绿但机器人没反应"。已实现三级解析
    （手工配置 → 部署列表取版本号最高的 `/exec` → 运行时自报兜底），
    并明确拒绝 `/dev`、在 `/webhook` 与 `diagnose()` 里给出对照提示。

### 不建议投入
- 音视频处理类功能
- 面向大群的高并发优化（架构性限制，优化无效）

---

## 八、一句话总结

**Telegram 侧**：升级到 10.3 后，Rich Messages 让 UI 从「手搓」变「原生」，临时消息让群内查询不再污染聊天 —— 两块最别扭的代码都拆掉了。

**GAS 侧**：真正的护城河是 Google 全家桶。Translate（免费 5000 次/天且不占 UrlFetch 配额）、Gemini、免费 HTTPS 托管 —— 这些是别的 bot 框架要花钱花时间搭的，GAS 签名就有。
本次落地的 AI 能力层正是在这条护城河上做到的：**12 家免费模型 + 故障转移 + 配额保护**，成本为零。

**边界**：GAS 撑得住日均 3,000 条以内的社群，撑不住大群。这个必须提前说清楚。
另外两条同样要说清楚：**无法 SSE 流式输出**、**运行时读不到自身源码**。
