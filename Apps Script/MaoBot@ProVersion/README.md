#### 🎟 XiaoMaoBot · ProVersion 源码解析

> 在官方版 `MaoBot@OfficialVersion`（V1.74）基础上做的一次**结构性重构**：
> 修掉真正的 Bug、淘汰失效接口、把 Telegram 官方能力真正用起来、并把
> 「消息外观」和「指令管理」收敛成可维护的两层。
>
> 在此基础上又补了三块**新能力层**：**富消息 / 临时消息**、**多模型 AI**（对话 + 干活）、
> **频道监听与关键词推送**，以及**热更新**链路。
>
> 原版目录**完整保留、未做任何改动**，两个版本可并存、可随时回滚。

**当前规模**：15 个模块（含 Secrets.gs）· 约 11853 行 · 365 项冒烟测试全绿 · 515 处顶层声明 0 重复

---

##### 📁 目录结构

```
MaoBot@ProVersion
├── appsscript.json        # 清单文件（原版缺失）—— 决定 Web 应用访问权限与 OAuth 作用域
├── Modules/               # 模块化源码（按下面的顺序放入 GAS 项目）
│   ├── Params.gs          # 配置中心（参数占位，真实密钥见 Secrets.gs）
│   ├── Utils.gs           # 工具：转义 / 时间 / 分页 / 安全计算器
│   ├── Core.gs            # 基础设施：表格 / 缓存 / 日志 / 任务队列 / 幂等 / 限流
│   ├── I18n.gs            # 🆕 中英文切换（轻量 i18n）：L() 助手 / 每聊语言 / /lang 指令
│   ├── Telegram.gs        # Telegram Bot API 全量封装（含 9.4~10.3 新能力）
│   ├── UI.gs              # 消息外观层：卡片 DSL / 富消息双产物 / 键盘 / 分段
│   ├── Api.gs             # 第三方能力层：多源故障转移
│   ├── AI.gs              # 🆕 大模型能力层：12 家免费模型注册表 + 故障转移 + 工作类任务
│   ├── Channel.gs         # 🆕 频道监听 / 历史查询 / 关键词推送
│   ├── Deploy.gs          # 🆕 热更新：远端清单 → 在线覆盖 → 自动发版
│   ├── Commands.gs        # 指令注册表 + 路由 + 帮助菜单
│   ├── Manage.gs          # 群管 / 安全防护 / 群设置 / 回调路由
│   ├── Triggers.gs        # 调度器 / 部署助手 / 数据库初始化
│   └── MaoBot.gs          # 入口 doPost + 全量 update 路由 + 关键字引擎
├── Tools/                 # 🆕 本地构建脚本（Node 运行，非 GAS 代码）
│   ├── modules.js         # 模块清单唯一来源（build / bundle 共用，防顺序漂移）
│   ├── build.js           # 把 Modules/*.gs 摊平到 dist/ 供 clasp 推送
│   ├── bundle.js          # 🆕 合并成单文件 dist-bundle/MaoBot.gs，供手工粘贴
│   ├── push.sh            # 🆕 一键同步：自检 → 构建 → 空值保护 → clasp push → 回读校验（→ 发版）
│   ├── setup-config.js    # 🆕 交互式配置向导（EXECID / Token / Telegram ID）
│   ├── keep-remote-values.js # 🆕 空值保护：别把你在网页里填过的值 push 没了
│   ├── verify-push.js     # 🆕 回读校验：把线上代码拉回来逐字节比
│   ├── params-edit.js     # Params.gs 的行级读写（保住注释 / 缩进）
│   ├── clasp-resolve.js   # 找到可用的 clasp（绕开 PATH 缺失）
│   └── make-manifest.js   # 生成 deploy/manifest.json，供热更新指令读取
├── DB/
│   └── COURSE.md          # 数据表结构说明
├── ROADMAP.md             # 能力扩展可行性分析（Bot API 10.3 / GAS 配额 / 优先级建议）
├── package.json           # 🆕 npm 脚本：build / config / keep / push / deploy / verify / test
├── .clasp.json.example    # 🆕 clasp 配置模板（复制成 .clasp.json 并填 scriptId）
└── Tests/                 # 本地冒烟测试（Node 运行，不联网、不耗配额）
│   ├── gas-mock.js
│   ├── check-dupes.js     # 🆕 跨文件重复声明检查（GAS 扁平作用域的隐形杀手）
│   ├── smoke-test.js
    └── run.sh
```

> ⚠️ **顺序很重要**：`Params.gs` 必须放在第一位。
> 仓库根目录的 `.github/workflows/maobot-pro.yml` 是配套的 CI + 自动部署工作流。

> 📌 **下一步能做什么？** 见 [ROADMAP.md](./ROADMAP.md) —— 基于 Bot API **10.3** 与 GAS 2026 配额表的可落地清单。
> 两个最值得先做的：`sendRichMessage`（真表格，替代手工拼表）与**临时消息**（替代整套自动删除调度器）。

---

##### 🚀 部署（三步）

```text
① 复制 Modules 下全部 13 个 .gs + appsscript.json 到你的 GAS 项目
② 改 Modules/Secrets.gs 里的 EXECID / BOTID / KingId / botIdAlone（真实密钥所在，被 .gitignore 排除）
③ 依次运行三个函数：initDatabase() → onBotInit()
```

`onBotInit()` 会自动完成：建表 → 自检 → 注册命令菜单 → 安装调度器 → 绑定 Webhook。

详细步骤见 **[COURSE.md](./COURSE.md)**。

> 💡 **不想手工复制？** 装一次 clasp，之后每次改完都只需要一条命令：
> `bash Tools/push.sh`（详见下面的「改完代码怎么同步到 GAS」一节）。
>
> GAS 里只有 `Modules/` 下的 `.gs` 文件是机器人代码；`Tools/`、`Tests/`、`package.json` **不要**上传。

---

##### 🩹 修正的问题清单

这些不是"风格问题"，而是**真的会让功能不工作**的缺陷。

| # | 问题 | 影响 | 处理 |
|:-:|:-----|:-----|:-----|
| 1 | 入群/退群检测用了 `new_chat_participant` / `left_chat_participant` | 这两个字段 **Bot API 5.x 就已移除**，官方版的入群欢迎、退群欢送**从未真正生效过** | 改用 `new_chat_members` / `left_chat_member` |
| 2 | 回调按钮从不调用 `answerCallbackQuery` | 用户点按钮后**一直转圈到超时**（最长 30 秒） | 每个回调分支都补上应答，失败时用 `show_alert` 提示 |
| 3 | 关键字命中后仍会继续走到兜底分支 | 用户收到关键字答案**外加**一条"未匹配到内容" | 用 `undefined / null` 双哨兵值区分"未命中"与"已处理" |
| 4 | `setStorage` 用 `spreadSheet.getLastRow()` 取写入行号 | 该值返回的是**电子表格所有工作表的最大行号**，其他表更长时消息会写错行 | 改为目标工作表自己的行号，并显式声明表头行数 |
| 5 | `getUnixTime` 里写成 `date.getseconds()` | 当秒数 < 10 时得到 `NaN`，禁言时长计算异常 | 修正拼写 |
| 6 | `pushDataToKing` 内部引用未定义的全局 `userMessage` | 特定分支直接抛异常 | 重写为纯参数传递 |
| 7 | 用 `key.indexOf("/ban") != -1` 判断指令 | 消息里**只要出现 `/ban` 三个字符**就会误触发管理指令 | 改为要求以指令前缀开头，并支持 `/cmd@BotName` |
| 8 | 混用 `getActiveSpreadsheet()` 与 `openById(EXECID)` | 脚本未绑定表格时前者返回 `null`，`doPost` **直接抛异常、消息无响应** | 统一优先 `openById`，失败再回退 |
| 9 | 第三方返回文本未做 HTML 转义 | 内容含 `<` `&` 时 Telegram 返回 400，**整条回复静默丢失** | 所有动态内容统一走 `esc()` |
| 10 | `cacheExpirationStatus = true` 时每轮先清缓存再读 | 等于**缓存永久失效**，每条消息都全量扫表（卡顿主因） | 拆分 `enabled` / `forceRefresh` 两个语义 |
| 11 | 敏感词 DFA 每收到一条消息就重建一次 Trie 树 | 词库越大越慢，拖垮整个 doPost | 构建结果进缓存，仅词库变化时重建 |
| 12 | 回复超过 4096 字符 | Telegram 直接拒收，消息丢失 | 自动按行切分为多条发送 |
| 13 | `userMessage.message.hasOwnProperty(...)` 无保护 | 收到 `inline_query` / `my_chat_member` 等 update 时**抛异常** | 全量 update 分派 + 每类独立处理 |
| 14 | 没有 `update_id` 去重 | Telegram 重推时机器人**重复回复同一条消息** | 用 `CacheService` 做 5 分钟幂等窗口 |
| 15 | 绝杀词判断漏看引用内容 | 拼好的 `userText` 算出来了却没用，引用式绕词可绕过 | 统一走一个检测函数 |
| 16 | `returnText` 等变量未声明 | 隐式全局变量，多请求间**串数据** | 全部改为局部变量 / 立即返回 |
| 17 | `media: JSON.stringify([...])` 传数组 | 半吊子写法，部分场景被拒 | 改为原生数组 |
| 18 | 使用已废弃的 `disable_web_page_preview` | 官方新字段为 `link_preview_options` | 已切换 |

---

##### 🔌 失效 / 不合规接口处理

原版把功能**一个个绑死在单域名**上，域名一挂功能就死。现在改为**多源故障转移**：任一源失效自动切下一源，全部失效则给出友好提示而不是让机器人哑掉。

| 接口 | 原用途 | 判断 | 处理 |
|:-----|:-------|:-----|:-----|
| `v1.apigpt.cn` | ChatGPT 对话 | 服务已长期停止响应 | ➜ 替换为 Pollinations（零配置）或**你自己的 OpenAI 兼容端点** |
| `api.vvhan.com/api/hotlist/*` | 热榜 | 已下线并要求密钥 | ➜ 主源换 imsyy 热榜聚合（18 个平台），vvhan 留作备源 |
| `api.vvhan.com/api/horoscope` | 星座运势 | 已下线并要求密钥 | ➜ 替换为 `/fortune` 今日一签（本地算法 + hitokoto，同一天同一人结果稳定） |
| `api.vvhan.com/api/douban` | 豆瓣电影 | 已下线并要求密钥 | ➜ 移除，能力并入 `/hot` |
| `api.vvhan.com/api/text/sexy` | 骚话 | 已下线 | ➜ 替换为 `/qinghua` 土味情话 |
| `apis.jxcxin.cn/api/lanzou` | 蓝奏云解析 | 服务不稳定 | ➜ 移除 |
| `anime-music.jijidown.com` | 随机音乐 | 服务已停止 | ➜ 移除，能力并入 `/hot`、`/img` |
| `s.nfangbian.com/shortlink` | 短链 | 第三方短链服务不可靠 | ➜ 替换为 is.gd（主）+ v.gd（备），均免密钥 |
| `tucdn.wpon.cn/api-girl` | 随机视频 | **内容不合规** | ➜ 已彻底移除，替换为 `/dice` `/coin` `/img` |
| `api.mxnzp.com` 号码归属地 | 号码归属 | 免费额度需自行申请，硬编码密钥已失效 | ➜ 降级为**本地号段表**识别运营商（纯离线，永不失效） |
| `query.asilu.com/weather` | 天气 | 仍可用 | ➜ 保留为备源，主源换 wttr.in（免密钥、含三日预报） |
| `api.btstu.cn/yan` | 毒鸡汤 | 仍可用 | ➜ 保留 |
| `apis.jxcxin.cn/api/yiyan` | 一言 | 仍可用 | ➜ 替换为 hitokoto 官方源（更稳定） |

> 💡 想加回自己的接口：直接改 `Api.gs` 里对应能力的源数组即可，不用动业务代码。

---

##### ✨ 接入的 Telegram 官方能力

原版只用了约 12 个 API 方法，且全部走"表单字符串拼接"。现在覆盖 60+ 个方法：

| 类别 | 新增能力 |
|:-----|:---------|
| **机器人配置** | `setMyCommands` 命令面板（用户点输入框旁的按钮就能看到全部指令）、`setChatMenuButton`、`setMyName`、`setMyDescription`、`setMyShortDescription` |
| **交互** | `answerCallbackQuery`（修转圈）、`editMessageText` / `editMessageReplyMarkup` **原地翻页**、`answerInlineQuery` **内联模式** |
| **群组管理** | `createChatInviteLink` 邀请链接、`approveChatJoinRequest` 入群审批、`promoteChatMember` / `demote`、`getChatMemberCount`、`getChat` / `getChatMember`、`banChatSenderChat` 频道身份封禁、`setChatAdministratorCustomTitle` |
| **消息** | `deleteMessages` **批量删除**、`forwardMessage` / `copyMessage`、`setMessageReaction` 表情回应、`sendChatAction` 正在输入、`link_preview_options`、`message_thread_id` **话题群支持**、`sendMediaGroup` 相册 |
| **文件** | `getFile` 取直链 |
| **运维** | `setWebhook` / `deleteWebhook` / `getWebhookInfo` 一键绑定、`getMe`、`allowed_updates` |
| **update 类型** | `message` / `edited_message` / `channel_post` / `edited_channel_post` / `callback_query` / `inline_query` / `my_chat_member` / `chat_join_request`（原版只处理 3 种） |
| **⭐ 富消息**（10.1+） | `sendRichMessage` + `rich_message.markdown`（GFM）：**真表格 / 多级标题 / 列表 / 分隔线 / 折叠块**，彻底告别"用等宽空格拼表格"。限制 32768 字符 / 500 块 / 20 列 |
| **⭐ 临时消息**（10.2+） | `ephemeral_message_parameters`：群内**只有指定用户能看到**。`editEphemeralMessageText` 原地刷新、`deleteEphemeralMessage` 删除 |
| **⭐ 草稿气泡**（9.5+） | `sendMessageDraft`：先亮一个约 30 秒的"思考中"气泡，AI 这种十几秒的操作不再是黑屏等待 |
| **其它新字段** | 按钮 `style` / `disabled`、`date_time` 实体、`setChatMemberTag`、`deleteMessageReaction` |

---

##### ⭐ 富消息与临时消息：一次架构级的观感升级

这两项是 Bot API 10.x 里对"机器人体验"影响最大的变化，也是最容易做错的两个。

**① 富消息 —— 一份数据，两种产物**

难点在于：富消息不是人人都能用（老账号 / 自建 Bot API Server 可能返回 404），所以必须有 HTML 降级路径。**天真的做法是写两套渲染逻辑，然后它们永远对不上。**

这里改成：所有卡片都由一组**块结构**（`blkP` / `blkTable` / `blkUL` / `blkKV` …）描述，一次构造同时产出 Markdown 与 HTML：

```javascript
richCard({
  icon: "📡", title: "频道动态",
  blocks: [
    blkKV("📣", "频道", "某频道"),
    blkTable(["时间", "内容"], rows, ["l", "l"]),   // 富消息里是真表格，HTML 里退化为等宽 <pre>
  ],
})
// → { md: "…GFM…", html: "…HTML…" }
```

配套做了三件容易被忽略的事：

- **GFM 转义**（`mdEsc`）比 MarkdownV2 温和得多，但**行首的块级标记必须转义** —— 否则用户输入 `# 标题` 会被渲染成标题、`- 列表` 会变成列表；
- **能力探测 + 缓存降级**：只有 404 / `method not found` 才写入 6 小时降级标记；**400 参数错误只降级这一条**，不会因为一条畸形 Markdown 就把整个富消息功能永久关掉；
- 表格单元格内的 `|` 单独转义，否则整张表错列。

**② 临时消息 —— 让"查一下 ID"不再刷屏**

`/id` `/ping` `/calc` `/ip` `/t` `/file` `/phone` `/ai` 这类"答案只对本人有意义"的指令，现在走 `ephemeral_message_parameters`，**群里其他人根本看不到**，不需要"先发出来再定时删掉"这套事后补救。

⚠️ 但它有个硬限制：**非按钮回调触发时，机器人必须是群管理员**，否则会失败。所以这里实现了三级降级：

```text
① 富消息 + 临时   →   ② HTML + 临时   →   ③ 公开发送 + 进 task_queue 定时删除
```

三级都不可用的情况不存在 —— 最后一级就是升级前的行为。群管理员也能在 `/settings` 里一键关掉这个行为。

**③ 诚实的边界：GAS 做不到真正的流式输出**

`UrlFetchApp` 一次性返回完整响应，**无法消费 SSE**，所以"逐字吐字"在 GAS 上是做不到的。这里没有假装能做，而是实现了能做的部分：调用前先推一个 `sendMessageDraft` 草稿气泡，用户立刻知道机器人在思考，十几秒后富消息落地。

---

##### 🧠 AI 能力层（AI.gs）

不是"接一个 API 调通"，而是做成了一个**带注册表、故障转移与配额保护的能力层**。

**12 家免费模型，填了密钥就自动生效**（真实 `geminiKey` 写在 `Modules/Secrets.gs` 的 `PROJECT_SECRETS` 里，运行时覆盖 `Params.gs` 中 `CONFIG.ai.geminiKey` 的空占位）：

| 模型 | 免费额度 | 特点 |
|:-----|:---------|:-----|
| **Google Gemini** ⭐ | 1500 次/天 | 推荐首选，**唯一支持看图**的免费源 |
| Groq | 有免费额度 | 推理极快 |
| Cerebras | 有免费额度 | 速度最快 |
| Mistral | 有免费额度 | 欧洲合规 |
| OpenRouter | 有 `:free` 系列 | 模型最全 |
| GitHub Models | 免费 | 用 GitHub Token 即可 |
| Together / SambaNova / HuggingFace | 有免费额度 | 兜底 |
| Cloudflare Workers AI | 按神经元计 | 需账号 ID + Token |
| 自定义兼容端点 | — | DeepSeek / 智谱 / 通义 / 本地 Ollama 都能接 |
| Pollinations | 免密钥 | **默认不参与故障转移**（见下） |

**故障转移**：填了多个密钥 → 自动组成转移链，主模型 429 / 超时 / 报错时按顺序切下一个，用户无感知。`/models` 可以看到当前的转移顺序与今日用量。

**两条刻意加上的约束**：

- **免密钥的 Pollinations 默认被排除在转移链之外** —— 否则你的内容会被静默发给一个你没配置过的第三方。要用必须显式打开 `allowKeylessFallback`；
- **本地配额保护**（按模型分别计数，写入 Properties）—— 免费额度烧光之前先拒绝，而不是把 429 甩给用户。

**工作类任务**（不只是聊天）：

| 指令 | 干什么 | 取材方式 |
|:-----|:-------|:---------|
| `/sum` | 结构化摘要 | 回复消息 / 直接给文本 / **给一个网页 URL（自动抓正文）** |
| `/ask` | 针对某条消息提问 | 回复目标消息 + 问题 |
| `/code` | 写代码 / 解释代码 / 排查报错 | 需求描述，或回复报错信息 |
| `/polish` | 润色改写 | `正式 / 口语 / 简洁 / 专业 / 英文 / 邮件` 六种风格前缀 |
| `/see` | **看图**：描述画面 + OCR 提取文字 | 回复一张图片（走 `inline_data` 多模态） |
| `/digest` | 总结本群最近 N 条消息 | 从 `db_telegram` 取 |
| `/todo` | 从聊天/会议记录里提取待办 | 回复消息或直接给文本 |
| `/models` | 模型清单 + 今日额度 + 转移顺序 | 真表格 |
| `/ai` | 多轮对话 | CacheService 保存上下文，`/ai clear` 清空 |

**没有密钥时会怎样？** 不是报"服务不可用"，而是给一张**申请引导卡片**，直接列出各家的申请地址。

---

##### 🌐 中英文切换（i18n）

机器人支持**按聊独立**切换中文 / 英文，**不调用任何翻译接口**（英文是代码里预置的静态文案）。

**怎么用**

- 私聊发送 `/lang en` → 本聊切英文；`/lang zh` → 切回中文；`/lang` 查看当前语言；
- **群聊**里只有管理员 / Bot 主人能改语言（防滥用），改的是「这个群」的语言，不影响其他群和你自己的私聊；
- 语言按聊持久化（脚本缓存 24h + `chat_settings` 表），切完**本条之后的回复即生效**。

**实现要点**

- `Modules/I18n.gs` 提供 `L(zh, en)` 内联助手；`handleUpdate` 每条消息进入时按 `chatId` 读出该聊语言，写进请求级变量 `__CUR_LANG__`，之后所有 `L()` 直接取，不用处处传 `ctx`；
- 指令注册表补充英文 `desc/usage`（`I18N_CMD_EN`），`/help` 与 `/menu` 按当前语言渲染分类名、描述与用法；
- 包裹范围（已做）：`/start` `/help` `/menu` `/id` `/ping` `/mode` `/health` `/lang` 及「未匹配内容」兜底文案；
- 未提供英文的地方自动回落中文，**不会**出现空白。
- 想加更多英文：在对应调用处把 `L("中文", "English")` 包一层即可；指令正文可继续往 `I18N_CMD_EN` 补。

---

##### 📡 频道监听 · 查询 · 关键词推送（Channel.gs）

原版只把 `channel_post` 往表里塞一行就结束了 —— 既查不出来，也没法"某个频道发了含某个关键词的帖子就通知我"。

**三件事**：

1. **监听** —— 机器人是频道管理员时，每条新帖进入处理管线（`handleChannelPost`）；
2. **查询** —— `/ch log` 按时间倒序查频道历史消息，带分页；
3. **推送** —— 按 **频道 × 关键词 × 目标会话** 三个维度配置规则，命中即转发，图文原样搬运（`copyMessage`）。

**添加规则非常省事**，三种方式任选：

```text
转发一条该频道的消息给我，然后发 /ch add        ← 自动识别频道 ID 与名称
/ch add -1001234567890 小米,红米,澎湃          ← 按 ID + 关键词
/ch add @channelname to:-1009876543210        ← 按用户名，推到指定群
```

指令全家桶：`/ch`（列表）`add` `del` `key` `on` `off` `test` `log`

**几个刻意做的细节**：

- **关键词匹配规则与群内关键字自动回复故意不同**：那边要防"随便出现一个短词就被插话"，所以 ≤2 字的词要求整句相等；这边是用户**主动订阅**的规则，命中即推送才符合预期，所以一律用忽略大小写的子串包含；
- **幂等去重**：同一条帖子对同一个目标只推一次，编辑重推不会重复打扰；
- **推送卡片里标明"为什么推给我"**（命中了哪几个关键词），并带「查看原帖」与「🔕 暂停该频道监听」按钮；
- **一条新帖最多推 5 个目标**（`maxPushPerPost`），规则写错也不会把自己刷爆；
- **私有一句话是真话**：机器人只有在被设为频道管理员**之后**才能收到新帖，之前的历史消息它根本没见过 —— 这一点在 `/ch log` 空结果时直接写进提示里。

---

##### 🔗 Web 应用地址与 `/dev` 陷阱（Deploy.gs）

**这一步不需要你填任何东西** —— 部署完 Web 应用后，`onBotInit()` / `setupWebhook()` 会自动把地址绑给 Telegram。

但它有一个非常隐蔽的坑，值得单独说：

| 结尾 | 是什么 | 谁能访问 | Telegram 能用吗 |
|:-----|:-------|:---------|:---------------|
| `/dev` | 测试部署（头部部署） | 只有你自己的 Google 账号 | ❌ |
| `/exec` | 正式部署 | 部署时选的权限（选「任何人」） | ✅ |

`ScriptApp.getService().getUrl()` 在**编辑器里运行时返回的就是 `/dev`**，
而 `setWebhook` 只校验地址格式不校验可用性，照样返回成功 —— 于是现象是
**「初始化全部成功，但机器人发消息毫无反应」，且日志里一句报错都没有。**

###### 地址解析的五级顺序

```text
① 手工绑定（脚本属性，/webhook bind 写入）  ← 热更新覆盖不掉，最稳
② CONFIG.deploy.webappUrl                   ← 写死在代码里的兜底
③ 缓存（6 小时内有效）
④ Apps Script 部署列表                      ← 挑 versionNumber 最高的 /exec
⑤ ScriptApp.getService()                    ← 仅在不是 /dev 时采信
```

拿不到 `/exec` 时**明确失败并给出可照做的提示**，绝不悄悄用 `/dev` 去绑定。

###### 一条指令搞定绑定

```text
/webhook            查看绑定状态 + 「当前地址 vs 应该用的地址」对照
/webhook bind <url> 手工绑定一次（存脚本属性，热更新冲不掉）
/webhook unbind     清掉手工绑定，回到自动解析
/webhook scan       绕过缓存重新扫描部署列表并重绑
```

> **✅ 只需要绑一次，不是每次部署都要改。**
>
> 一个部署的 `/exec` 地址是**永久固定**的：推多少新版本、`/push` 多少次都不变。
> 只有「删除部署后重新新建」才会换地址。
> 手工绑定存在 **Script Properties** 而不是 `Params.gs` —— 正是为了避免
> `/push` 热更新覆盖代码时把地址一起冲掉。

###### 如果提示「授权不足」

这说明第 ④ 步（读部署列表）被拒了 —— **不代表你没建过部署**，只是读不到。
两条路：

- **修授权**（之后全自动）：`https://script.google.com/home/usersettings` 打开
  「Google Apps Script API」→ 到 `https://myaccount.google.com/permissions`
  删掉本项目权限 → 回编辑器运行一次函数触发重新授权 → `setupWebhook()`
- **不修**：`/webhook bind <你的 /exec 地址>` 绑一次，或者 `switchToPolling()`
  完全不要地址（⚠️ 轮询每分钟一次 = 每天 1440 次执行，会吃掉可观配额，仅适合应急验证）

> 想自己验证 `/exec` 是否真的对外开放：开浏览器**无痕窗口**访问它，
> 跳出 Google 登录页说明权限没选「任何人」。

---

##### ♻️ 热更新（Deploy.gs）

"改完代码要生效"有三条路，这里把三条都铺好了。

**方案 ①：配置热更新 —— 覆盖 90% 的日常改动，零成本**

开关、关键词、敏感词、群规、频道监听规则全都在 Google 表格里。改完发一条 `/reload` 清缓存即可生效，**根本不需要重新部署**。

**方案 ②：在线热更新 —— `/push` 指令（仅 Bot 主人）**

```text
/push check    看远端有没有新版本
/push apply    拉取远端源码 → 覆盖线上脚本 → 建版本 → 切换部署
/push status   看上次推送记录
```

流程：读取 `deploy/manifest.json` → 按 `files[].url` 逐个下载 → `PUT projects/{id}/content` 覆盖 → `POST versions` 建版本 → `PUT deployments/{id}` 把默认部署切到新版本。

> **为什么不切部署就是白推？** Web App 默认跑的是**某个固定版本**，不是 HEAD。只覆盖 content 而不更新部署，线上行为不会变。这是很多人"推了代码却没生效"的真正原因，所以 `/push` 把这两步绑在一起了。
>
> ⚠️ 需要 `appsscript.json` 里的 `script.projects` / `script.deployments` 授权，首次使用会要求**重新授权一次**。授权不足时会给出"怎么修"的提示，而不是甩一个 403。

**方案 ③：本地 clasp —— 一条命令（推荐主链路）**

首次配置，只做一次：

```text
① 开启 Apps Script API ── https://script.google.com/home/usersettings
② npm i -g @google/clasp
③ clasp login
④ cp .clasp.json.example .clasp.json     然后填入你的 scriptId
```

之后每次改完代码，只需要：

```bash
bash Tools/push.sh              # 自检 → 构建 → 推送
bash Tools/push.sh --deploy     # 再顺手建版本 + 更新部署（/exec 地址不变）
```

`push.sh` 会自动做完这些：检查 node / clasp / 登录状态 / scriptId 是否还是占位符 →
`node Tools/build.js` 摊平模块 → 跑**重复声明检查**（不通过直接拒绝推送）→
`clasp push --force` → **`node Tools/verify-push.js` 回读校验**（把线上代码拉回来跟本地逐字节比）。

> ⚠️ **`clasp push` 是「同步」而不是「追加」**：本地 `dist/` 里没有的文件，线上会被**删除**。
> 这正是想要的效果 —— 线上残留的旧文件会和本次代码重名，而 GAS 所有 `.gs` 共享一个全局作用域，
> 同名函数**不报错、只按文件顺序静默覆盖**，属于最难查的一类线上故障。

---

##### 🐞 关键经验：Webhook 永远 302 的真因（已根治）

早期「部署后第一条能回、后面全哑 / 完全没反应」的元凶，最终定位为：

> **GAS 的 `/exec` 对 POST 请求架构上永远返回 302** 到 `script.googleusercontent.com/macros/echo`，
> 真内容在 echo 上且 echo 只收 GET。浏览器 / `curl -L` / Postman 会自动跟随所以人肉测试无感；
> **Telegram 严格不跟随重定向 → 看到 302 直接判投递失败**，于是机器人时灵时不灵。

这与「执行身份 / 访问权限」那两栏**无关**（实测匿名 GET 跟随后能拿到 200 和页面内容，权限一直是好的）。
网传「把 `ContentService` 换成 `HtmlService` 治 302」是对的——`doPost` 返回值改成
`HtmlService.createHtmlOutput(...)` 后 GAS 直接回 200、不再重定向（详见 `Modules/MaoBot.gs` 顶部注释与 `CHANGELOG.md`）。

⚠️ 之前「HtmlService 无效」的误判，是被**固定版本部署跑旧快照**骗了（push 了但没真正挂到部署）。
凡「改了代码现象没变」，先 `node Tools/verify-push.js` + `clasp deployments` 确认线上真的换了代码。

---

> 🔥 **踩过的坑：`.claspignore` 里写 `**/*` 会让 push 静默变成空操作**
>
> 曾经 `.claspignore` 第一行是 `**/*`（想兜底别误推本地文件）。但在 gitignore 语义下，
> `**/*` 会把 `dist/` 整个目录一起排除 —— 即使下面写了 `!dist/**` 也放行不了（父目录被 ignore 了）。
> 结果 clasp 压根没把 `dist/` 当成本地代码：
>
> ```
> $ bash Tools/push.sh
> Script is already up to date.     ← 退出码 0，看着像成功
> ```
>
> 线上一个字节都没变，但命令全绿、没有任何报错。当时表现是：改了 `Commands / Deploy /
> Params / Triggers` 四个文件，push 完打开 GAS 编辑器，代码还是旧的。
>
> **修法**：`.claspignore` 里删掉 `**/*`。推送范围本来就已经由 `.clasp.json` 的
> `"rootDir": "./dist"` 限定了，不需要任何排除/放行规则。
>
> **怎么知道中了招**：`bash Tools/push.sh` 收尾会跑回读校验，直接把线上代码拉回来比对。
> 上面的场景现在会这样报，而不是悄悄放过：
> ```
> ❌ 线上回读 有 4 个文件跟线上对不上：
>      · Commands: 本地 44789B / 线上 39200B
> ```
> 想单独验一次：`node Tools/verify-push.js`（加 `--offline` 只做本地产物检查）。

> ℹ️ **线上文件名可能是 `.js` 不是 `.gs`**，这是正常的：
> clasp 更新同名文件时沿用线上已有的扩展名，所以本地 `dist/Params.gs` 推上去后线上还是叫 `Params.js`。
> 功能完全不受影响，只是对文件时会发现后缀不一样。

##### 🔒 配置空值保护：你填过的 EXECID / Token 不会再被 push 冲掉

`clasp push` 是整文件覆盖，**以本地为准**。所以你之前手工填过的
`var EXECID = ""` / `var BOTID = ""` / `CONFIG.deploy.webappUrl` 这类值，
下次 push 就会被本地那个**空占位**覆盖回空 —— 这是 clasp 的固有行为，不是 bug。

`push.sh` 现在在推送前加了一步**空值保护**（`Tools/keep-remote-values.js`）：

```text
④ 配置空值保护（别把你填过的值 push 没了）
  取线上 Params 做空值保护
  已保留你在线上手填的 3 项，写回本地源码：
       · EXECID = 1AbC2d…
       · BOTID  = 12345678…oken
       · KingId = 778899
```

规则只有一条，很直觉：

| 本地状态 | 线上状态 | 结果 |
|:--|:--|:--|
| 空占位 `""` | 有值 | **采用线上的值**，并写回本地源码 |
| 有值 | 任意 | 保持本地（你故意填的，以本地为准） |
| 有值 | 有值但不同 | 保持本地，push 覆盖线上 |

被保住的值会**同时写进 `Modules/Params.gs`（源码）和 `dist/Params.gs`（产物）**，
所以 `build.js` 重新生成时也不会丢，下次 push 照样带着。

> ⚠️ 说明：本仓库里 `Modules/Params.gs` **始终是干净的空占位**（真实密钥在 `Modules/Secrets.gs`，已被 `.gitignore` 排除）；`keep-remote-values` 会跳过那 6 个外移的密钥，所以 `Params.gs` 不会因为 push 被写回真值，可直接提交到公开仓库。
> 如果要把仓库推到 GitHub，请按 `.gitignore` 里的提示忽略它。
> 想看当前填了什么：`node Tools/setup-config.js --show`

**第一次配置 / 换配置**用交互向导更快，不用手翻文件：

```bash
node Tools/setup-config.js
```

它只问没填的项（表格 ID、Bot Token、你的 Telegram ID…），
每项都带「这个值从哪抄」的说明，写完自动落到两个文件里。

> ⚠️ **push 不等于生效**：Web 应用部署跑的是**固定版本快照**而不是 HEAD，
> 只覆盖代码而不更新部署，线上行为不会变。要真正生效请加 `--deploy`，
> 或在 GAS 界面「部署 → 管理部署 → ✏️ 编辑 → 版本选新版本 → 部署」。

仓库根目录已附 `.github/workflows/maobot-pro.yml`：push 到 `main` 时自动跑测试 → 构建 → `clasp push` → `clasp deploy` → 刷新热更新清单并提交回去。只需配置一个 Secret：`CLASPRC_JSON`（本地 `clasp login` 后 `~/.clasprc.json` 的内容）。

**方案 ④：单文件粘贴 —— 零依赖兜底**

```bash
node Tools/bundle.js
```

产出 `dist-bundle/MaoBot.gs`：14 个模块按固定顺序合并成**一个文件**（约 11,500 行 / 345 KB）。
在 GAS 编辑器里**删掉全部旧的 `.gs`** → 新建一个文件 → 全选粘贴，**一次**搞定。

> 合并顺序由 `Tools/modules.js` 里唯一一份 `ORDER` 表决定，`build.js` 和 `bundle.js` 共用，
> 所以「clasp 推的顺序」和「手工粘贴的顺序」不可能不一致。
> 脚本会校验合并前后顶层函数数量一致（当前 509 个）且无重名。

**该用哪条路？**

| 你改了什么 | 用什么 | 代价 |
|:-----------|:-------|:-----|
| 开关 / 关键词 / 敏感词 / 群规 | 在 Telegram 里发 `/reload` | 零 |
| `Modules/` 下的 `.gs` 代码 | `bash Tools/push.sh --deploy` | 一条命令 |
| 没装 Node 或装不上 npm 包 | `node Tools/bundle.js` 后粘贴一次 | 一次粘贴 |
| 想提交即自动上线 | 仓库根的 GitHub Actions | 配一次 Secret |

> 只改 `Params.gs` 里的**配置值**（不改函数体）也可以走 `/reload`，不必重新部署。

> **诚实的边界**：GAS 运行时**读不到自己的源码**（平台没有这个 API），所以 `/push` 没法在本地做 diff，只能比对远端清单里的版本号。这不是偷懒，是平台限制。

---

##### 🏗 两个结构性改进

**① 触发器：从「20 个一次性触发器 + 补偿逻辑」到「1 个调度器 + 任务队列」**

原版为了实现"60 秒后删除机器人消息"，给每条消息创建一个一次性时间触发器。但 GAS 普通账号硬限制每个项目最多 20 个触发器，于是不得不用"数触发器数量 → 超了就把最老的提前执行 → 再补建"这套逻辑硬扛，并发一高就丢任务，README 里直接把这条列为已知缺陷（*"受限于GAS，高并发仅支持20次/30s"*）。

现在：任务写进 `task_queue` 表，**全局只装 1 个每分钟触发一次的调度器**来消费，并且把同一会话的删除请求合并成一次 `deleteMessages` 批量调用。

➜ 触发器数量恒为 1，任务数量上限只取决于表格行数。

**② 指令：从「单一 switch 的 20+ 分支」到「声明式注册表」**

原版新增一个功能要同时改三个地方：`Params.gs` 的 `commandWord` 数组、`processReplyWord` 的 `switch` 分支、以及硬编码的 `/help` 文案——所以帮助文本永远和实际功能对不上。

现在加一个指令 = 加一条记录，**帮助菜单和 Telegram 命令面板自动同步**：

```javascript
{ cmd: "weather", alias: ["w", "tq"], cat: "查询", level: "public", menu: true,
  desc: "查询城市天气", usage: "/weather <城市>", examples: ["/weather 北京"],
  handler: function (ctx, args) { return apiWeather(args); } },
```

---

##### 🎨 消息外观层（UI.gs）

原版是"一行行字符串硬拼 + 到处 `<b></b>` + 手动 `\n\n` 排版"。现在收敛成一套卡片 DSL：

```javascript
uiCard({
  status: "ok",                         // 自动带 ✅/❌/⚠️/💡
  title: "群组信息",
  subtitle: ctx.chatTitle,
  body: [uiKV("成员数", "42", "👥"), uiItem("管理员 3 位")],
  footer: nowStr(),
})
```

配套解决：

- `esc()` 统一转义 —— 不再因第三方文本含 `<` `&` 而丢消息
- `splitText()` 自动分段 —— 不再因超 4096 字符而发送失败
- `kb()` / `btn()` / `pagerRow()` —— 键盘构造，空链接自动降级
- `cbPack()` —— 自动遵守 `callback_data ≤ 64 字节`硬限制
- `withTyping()` —— 耗时操作前打 `sendChatAction`，用户知道机器人在干活
- `scheduleAutoDelete()` —— 群聊里机器人消息自动清理

---

##### 🆕 功能清单

**公开指令**

| 分类 | 指令 |
|:-----|:-----|
| 基础 | `/start` `/help` `/menu` `/id` `/ping` `/lang` |
| 查询 | `/weather` `/hot` `/ai` `/ip` `/phone` |
| 娱乐 | `/hitokoto` `/dujitang` `/qinghua` `/fortune` `/dice` `/coin` `/roll` |
| 工具 | `/calc` `/tr` `/short` `/qr` `/img` `/t` `/file` |
| 群组 | `/info` `/stat` `/top` `/rules` `/report` |

**AI 能力**（可选，填了密钥即生效）

`/ai` 多轮对话 · `/sum` 摘要 · `/ask` 就事提问 · `/code` 写码/排错
`/polish` 润色 · `/see` 看图 · `/digest` 群聊总结 · `/todo` 待办提取 · `/models` 模型与额度

**管理指令**（群管理员 / Bot 主人）

`/manage` `/ban` `/unban` `/mute` `/kick` `/warn` `/warns` `/resetwarn`
`/pin` `/unpin` `/purge` `/invite` `/settings` `/broadcast`

**频道指令**（群管理员 / Bot 主人）

`/ch` 监听列表 · `/ch add` 新增 · `/ch del` 删除 · `/ch key` 改关键词
`/ch on|off` 启用/暂停 · `/ch test` 验证推送链路 · `/ch log` 查历史消息

**维护指令**（仅 Bot 主人）

`/health` 运行自检 · `/webhook` 查看绑定 · `/sync` 同步命令菜单
`/reload` 清缓存 · `/word` 敏感词增删查 · `/push` 热更新

**自动化能力**

- 敏感词过滤（DFA + 缓存，绝杀词即封即删，敏感词 3 次自动封禁）
- 反刷屏（可配置阈值 / 禁言 / 踢出）
- 入群按钮验证（防广告机器人）
- 警告系统（累计 3 次自动移出）
- 群级功能开关面板（写入 `chat_settings` 表，每个群独立）
- 频道新帖监听 + 关键词推送（`channel_watch` 表）
- 每日维护（清理任务队列 / 日志 / 过期警告）
- 错误日志表 + 同错误 5 分钟去重
- 用户级指令冷却

---

##### 🧪 本地测试

不需要部署、不联网、不消耗 GAS 配额：

```bash
bash Tests/run.sh
# 扫描 15 个模块，共 510 处顶格声明
# ✅ 无重复声明
# ══════════════════════════════════════════════
# 通过 365 项，失败 0 项
# ══════════════════════════════════════════════
```

`Tests/gas-mock.js` 模拟了 `UrlFetchApp` / `SpreadsheetApp` / `CacheService` /
`PropertiesService` / `ScriptApp` / `Utilities` / `LanguageApp`，可以断言"到底往
Telegram 发了什么请求"，覆盖指令链路、敏感词拦截、权限判定、回调翻页、幂等、
调度器批量删除、富消息降级、临时消息三级降级、AI 故障转移、频道关键词推送、
热更新覆盖与发版、Web 应用 `/dev` 地址拦截等关键路径。

**`Tests/check-dupes.js` 是这套测试里最值钱的一个。** GAS 的**所有 `.gs` 共享一个扁平全局作用域**，
两个文件里出现同名顶层函数**不会报错**，只会按文件顺序静默覆盖 —— 这种 Bug 只在线上偶发，
本地根本查不出来。这个检查把它变成了构建期的硬失败（目前 470 处声明，0 重复）。

---

##### 📋 To-Do

- [x] 入群/退群检测修复（`new_chat_members`） 「已支持」
- [x] 消息自动删除 —— 改用调度器+队列，**解除 20 触发器限制** 「已支持」
- [x] 敏感词动态增删 「已支持」`/word add|del|list`
- [x] 命令面板 / 交互式面板 / 消息原地翻页 「已支持」
- [x] 频道消息监听、查询、关键词推送 「已支持」`/ch add|del|key|on|off|test|log`
- [x] 热更新 「已支持」`/push` 在线覆盖 + clasp/CI 本地链路
- [x] 多语言（i18n）「已支持」`/lang` 切换 zh/en + `L()` 内联助手 + 指令表英文（详见下节）

---

##### 🔐 安全说明

- 敏感词库仍以 **Base64** 存储（与官方版一致，仅用于防误读，**不是加密**）
- 群成员列表、用户隐私数据不做缓存落表
- 所有外链按钮自动过滤空值，避免非法 URL 导致消息发送失败
- `/calc` 使用**手写递归下降解析器**，对输入做字符白名单校验，**不使用 `eval`**
