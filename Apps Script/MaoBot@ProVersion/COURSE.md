**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到源码解析](./README.md)** ｜ **[<< 更新日志](./CHANGELOG.md)** ｜ **[<< 回到首页](https://github.com/xiaomaoJT/TgBot)**

---

##### 🚀 ProVersion 部署教程

> 全程约 10 分钟。**不需要**写代码，只需要复制粘贴 + 填 4 个参数。

---

#### 第一步 · 准备机器人 Token

1. Telegram 里搜索 **@BotFather**
2. 发送 `/newbot`，按提示设置名称和用户名（用户名必须以 `bot` 结尾）
3. 记下返回的 Token，形如 `123456789:AAE-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> 💡 顺手在 BotFather 里开两个开关，能解锁额外能力：
> - `/setinline` —— 开启**内联模式**（在任意聊天框输入 `@你的机器人 关键词`）
> - `/setjoingroups` → Enable，并把机器人设为群管理员

---

#### 第二步 · 准备 Google 表格

1. 打开 <https://sheets.new> 新建一个空白表格
2. 记下网址中 `/d/` 与 `/edit` 之间的那串字符 —— 这就是 **EXECID**

> 📌 **从官方版升级的用户**：直接用你原来那张表格即可，
> 数据表结构 100% 兼容，不需要迁移数据。
> 缺少的 5 张新表（`chat_settings` / `warn_records` / `error_log` / `task_queue` / `channel_watch`）
> 会在运行 `initDatabase()` 时自动补建，**已有数据不会被覆盖**。

---

#### 第三步 · 创建 Apps Script 项目

**方式 A · 手工复制（适合只想跑起来）**

1. 在表格里点 **扩展程序 → Apps Script**
2. 点左上角项目名改成 `MaoBot@ProVersion`
3. 左侧 **⚙️ 项目设置** → 勾选 **「在编辑器中显示 appsscript.json 清单文件」**
4. 回到 **编辑器**，按下表创建文件并粘贴对应代码

| 顺序 | 文件名 | 内容来源 |
|:----:|:-------|:---------|
| 1 | `Params.gs` | `Modules/Params.gs` |
| 2 | `Utils.gs` | `Modules/Utils.gs` |
| 3 | `Core.gs` | `Modules/Core.gs` |
| 4 | `I18n.gs` | `Modules/I18n.gs` |
| 5 | `Telegram.gs` | `Modules/Telegram.gs` |
| 6 | `UI.gs` | `Modules/UI.gs` |
| 7 | `Api.gs` | `Modules/Api.gs` |
| 8 | `AI.gs` | `Modules/AI.gs` |
| 9 | `Channel.gs` | `Modules/Channel.gs` |
| 10 | `Deploy.gs` | `Modules/Deploy.gs` |
| 11 | `Commands.gs` | `Modules/Commands.gs` |
| 12 | `Manage.gs` | `Modules/Manage.gs` |
| 13 | `Triggers.gs` | `Modules/Triggers.gs` |
| 14 | `MaoBot.gs` | `Modules/MaoBot.gs` |
| 15 | `appsscript.json` | `appsscript.json`（覆盖原有内容） |

> ⚠️ **顺序很重要！** 特别是 `Params.gs` 必须在第一位。
> 新建文件时把默认的 `代码.gs` 改名或删除即可。

**方式 B · clasp 一键推送（推荐，日常改完直接推）**

```bash
cd "Apps Script/MaoBot@ProVersion"
npm install
cp .clasp.json.example .clasp.json
# 打开 .clasp.json，把 scriptId 换成你的项目 ID
# （在 GAS 编辑器里：项目设置 → 脚本 ID；或直接跑 clasp clone <scriptId>）
npm run push      # = build（摊平到 dist/）+ clasp push
```

> 💡 想更省事就直接配 CI：仓库根目录的 `.github/workflows/maobot-pro.yml`
> 会在 push 到 `main` 时自动跑测试 + 推送 + 发版。只需加一个 Secret：`CLASPRC_JSON`。

---

#### 第四步 · 填写参数

> ⚠️ **密钥不再写在 `Params.gs` 里。** 为了能安全开源，`Params.gs` 现在只保留空占位，
> 真实密钥放在 `Modules/Secrets.gs`（被 `.gitignore` 排除，不进仓库）。下面这些值的填法见
> 下方「🔐 密钥放 `Secrets.gs`」一节。

打开 `Modules/Secrets.gs`，编辑里面的 `PROJECT_SECRETS`（没有这个文件就先
`cp Modules/Secrets.gs.example Modules/Secrets.gs`）：

```javascript
var PROJECT_SECRETS = {
  // ① Google 表格 ID
  EXECID: "第二步记下的那串字符",

  // ② Telegram Bot Token
  BOTID: "第一步 BotFather 给你的 Token",

  // ③ 你的 Telegram 数字 ID（部署完成后私聊机器人发 /id 获取）
  KingId: "",

  // ④ 机器人自身数字 ID（/id 里显示的那个 Bot ID）
  botIdAlone: "",
};
// 下面几行把真实值覆盖回 Params.gs 的空占位，不用你管
```

> `KingId` 用于「私人消息推送」——别人私聊机器人或群里发言时，消息会同步转发给你。
> 不需要这个功能可以留空。`botIdAlone` 留空只会轻微降级（引用识别不精确），不会报错。

#### 🔐 密钥放 `Secrets.gs`（不进公开仓库）

把真实密钥从 `Params.gs` 挪到 `Modules/Secrets.gs`，是「能安全把源码推到 GitHub」的关键：

- `Modules/Secrets.gs` —— 你的真实密钥，**已被 `.gitignore` 排除，绝不进仓库**；运行时由它把值覆盖回 `Params.gs` 的空占位。
- `Modules/Secrets.gs.example` —— 占位模板（可提交）。clone 后：
  ```bash
  cp Modules/Secrets.gs.example Modules/Secrets.gs
  ```
  然后填你自己的 `PROJECT_SECRETS`。
- `Params.gs` —— 只保留空占位（`EXECID` / `BOTID` / `KingId` / `botIdAlone` / `geminiKey` / `webappUrl`），**已可安全提交**。

> ⚠️ 别把 `Modules/Secrets.gs` 提交到任何公开仓库。它只在你本地和你的**私有** GAS 部署里存在
> （`clasp push` 时 `dist/Secrets.gs` 会一起推上去，但那只是你的私人项目，公网看不到）。

`Tools/keep-remote-values.js`（push 前的空值保护）现在会**跳过这 6 个外移的密钥**，
所以 `Params.gs` 永远是干净的空占位，不会因为某次 push 又被写回真值。

**可选的品牌信息**（同一文件里的 `BRAND`）：

```javascript
var BRAND = {
  name: "MaoBot",     // 机器人在消息里显示的名字
  repo: "",           // 源码仓库链接
  channel: "",        // 频道链接
  group: "",          // 群聊链接
  site: "",           // 官网
  wxName: "", wxUrl: "",  // 公众号（留空则不显示相关按钮）
  supportBot: "",     // 申诉机器人
};
```
留空的项会**自动隐藏对应按钮**，不会出现死链。

**（可选）接入免费大模型**

不需要任何配置，机器人已经能用（会走免密钥的兜底源）。想用**支持看图**的 Gemini
（免费 1500 次/天，是目前免费源里唯一支持视觉的），去
<https://aistudio.google.com/apikey> 点两下拿一个密钥，填进来即可：

```javascript
ai: {
  provider: "gemini",
  geminiKey: "AIza...你的密钥",   // ← 填到 Secrets.gs 的 PROJECT_SECRETS.geminiKey（运行时覆盖此处空占位）
  // 想更稳就多填几个，自动组成故障转移链：
  groqKey: "",        // console.groq.com   免费额度，推理极快
  cerebrasKey: "",    // cloud.cerebras.ai  速度最快
  openrouterKey: "",  // openrouter.ai      有 :free 系列
  // …
}
```

配好后在 Telegram 里发 `/models`，能看到全部 12 家模型、当前转移顺序与今日剩余额度。

> 🔒 **隐私说明**：**只有你填了密钥的模型才会被调用**。
> 免密钥的 `pollinations` 默认**被排除在故障转移链之外**，
> 避免你的内容被静默发给一个你没配置过的第三方。要用必须显式打开 `allowKeylessFallback`。

---

#### 第五步 · 部署为 Web 应用

1. 右上角 **部署 → 新建部署**
2. 左侧齿轮选 **Web 应用**
3. 配置：
   - 说明：`MaoBot v2`
   - **执行身份：我**
   - **具有应用访问权限的用户：任何人** ⚠️ 必须选「任何人」，否则 Telegram 无法回调
4. 点 **部署**，授权（会提示"此应用未经验证"，点 **高级 → 转到项目(不安全)**，这是你自己的脚本）
5. 复制生成的 **Web 应用网址**，形如
   `https://script.google.com/macros/s/AKfycb.../exec`

> ⚠️ **认准结尾的 `/exec`**
>
> GAS 里同一个 Web 应用有两个地址：
>
> | 结尾 | 叫什么 | 谁能访问 | 能用吗 |
> |:-----|:-------|:---------|:-------|
> | `/dev` | 测试部署（头部部署） | **只有你自己的 Google 账号** | ❌ Telegram 访问不了 |
> | `/exec` | 正式部署 | 按部署时选的权限（我们选「任何人」） | ✅ 用这个 |
>
> 具体差别是：`/dev` 每次打开都是**最新代码**、不用重新部署，但它要求浏览器已登录 Google；
> Telegram 的服务器没有你的登录态，请求会被 Google 挡回去。
>
> **最坑的地方**：`setWebhook` 这一步照样会返回成功，Telegram 只记录地址不校验可用性，
> 所以日志里**一句报错都没有**，现象是"机器人部署完成但发消息毫无反应"。
> 如果你按老教程在代码里写 `ScriptApp.getService().getUrl()`，
> 在编辑器里运行时拿到的**恰恰就是 `/dev`**。
>
> **ProVersion 已经处理好了**：`setupWebhook()` 不再直接取运行时地址，而是三级解析，
> 优先从 Apps Script 部署列表里挑 versionNumber 最高的 `/exec`，并能明确挡掉 `/dev`。
> 你只需要：部署一次 → 运行 `onBotInit()`。

> 🐞 **补充一个曾困扰很久的坑（现已根治）**：GAS 的 `/exec` 对 **POST 请求架构上永远返回 302**
> 到 `script.googleusercontent.com/macros/echo`，而 Telegram 不跟随重定向 → 看到 302 就判投递失败，
> 表现就是「部署后第一条能回、后面全哑」。这与「执行身份 / 访问权限」那两栏**无关**
> （匿名 GET 跟随后能拿到 200 和页面，权限一直是好的）。代码里把 `doPost` 返回值从
> `ContentService` 改成 `HtmlService.createHtmlOutput(...)` 后直接回 200，Webhook 实时可用。
> 详细见 `CHANGELOG.md` 与 `README.md` 的「关键经验」一节。
>
> 拿到地址后建议做一次验证：在浏览器**无痕窗口**里打开这个 `/exec` 地址，
> 如果显示的是你自己的页面内容而不是 Google 登录页，说明权限设置正确。

---

#### 第六步 · 一键初始化 🎉

在编辑器顶部函数下拉框里依次选择并运行：

**① `initDatabase`**

自动建表 / 补表，输出新建了哪些工作表。

**② `onBotInit`**

一次跑完剩下所有事：

```
① 数据表：就绪（新建 8 个）
② 命令菜单：已注册 27 条
③ 调度器：已安装（共 2 个触发器）
④ Webhook：已绑定 https://script.google.com/macros/s/.../exec

配置检查：EXECID ✅ / BOTID ✅ / KingId ⚠️未填
```

**如果 ④ 显示未绑定**，日志里会直接跟在下面告诉你怎么办。三种常见情况：

**情况一：`未绑定 - 授权不足……` + `检测到你手上的是 /dev 测试地址`**

这表示**读部署列表被拒了**，所以只能看到 `/dev`。
⚠️ 注意：**这不代表你没建过部署**，别再白建一次。

```
【方案 A · 修授权，之后全自动】
1. 打开 https://script.google.com/home/usersettings 把「Google Apps Script API」设为开启
2. 打开 https://myaccount.google.com/permissions 删掉本项目的访问权限
3. 回到编辑器随便运行一个函数，重新授权（会再弹一次同意页）
4. 重跑 setupWebhook()

【方案 B · 手工绑一次，一劳永逸】
Web 应用的 /exec 地址是永久固定的，同一个部署推多少新版本都不会变，
只有「删除部署后重建」才会变。所以绑一次就够了，不用每次部署都改。
把这个地址发给我就行：/webhook bind <你的 /exec 地址>

【方案 C · 应急才用，别长期跑】
运行 switchToPolling() 换成轮询模式，完全不依赖 Web 应用地址。
⚠️ 每分钟拉一次 = 每天 1440 次执行，消费者账号每天总共只有 90 分钟运行时长。
```

**情况二：只有 /dev，没有提到授权不足** —— 说明确实还没建正式部署，
去第五步「新建部署」做一遍。

**情况三：「还没检测到 Web 应用部署」** —— 第五步完全没做，回去补上。

> 💡 **关键认知：`/exec` 地址只需绑一次。**
>
> 一个部署的地址是**永久固定**的：推新版本、发 `/push` 多少次都不会变，
> 只有「删除部署后重新新建」才会换地址。
>
> 而且手工绑定存在**脚本属性**里，不在 `Params.gs` ——
> 这样 `/push` 热更新覆盖代码时也不会把地址冲掉。
>
> 三条绑定相关的指令：
>
> | 指令 | 作用 |
> |:-----|:-----|
> | `/webhook` | 查看状态 + 「当前地址 vs 应该用的地址」对照 |
> | `/webhook bind <地址>` | 手工绑定一次（校验 /exec、拒绝 /dev） |
> | `/webhook unbind` | 清掉手工绑定，回到自动解析 |
> | `/webhook scan` | 绕过缓存重新扫描部署列表并重绑 |
>
> **千万别填 `/dev`** —— 代码会直接拒绝并报错，这是故意的：
> 悄悄用错地址比报错更难排查。

---

#### 第七步 · 验证

1. Telegram 里私聊你的机器人，发送 `/start`
2. 应该会收到带按钮的功能卡片
3. 点左下角 **☰ 菜单按钮**，能看到全部指令列表
4. 发送 `/health`（需先填 KingId）或把你自己的 ID 填进 `KingId` 后再发一次

自检会逐项告诉你还差什么。

---

#### 第八步 · 把机器人拉进群（可选）

1. 把机器人拉进你的群
2. **设为管理员**，并确认勾选这些权限：
   - ✅ 删除消息
   - ✅ 封禁用户
   - ✅ 限制成员
   - ✅ 置顶消息
   - ✅ 邀请用户（生成邀请链接需要）
   - ✅ 管理视频聊天（可选）

> 不设管理员也能用，但 `/ban` `/mute` `/purge` `/pin` 会失败并提示"请确认我已拥有管理员权限"。

3. 群里发送 `/manage` 打开管理面板，按需开关功能：
   - 敏感词过滤
   - 入群欢迎 / 退群提示
   - 入群验证
   - 反刷屏

---

#### 第九步 · 配置内容

**关键字自动回复** —— `key_params` 表（第 4 行起填写）

| 关键字 | 标识块 | 内容块1 | 内容块2… |
|:-------|:-------|:--------|:---------|
| `说明书,使用指南` | `HTML` | `<b>这是说明书</b>` | `第二段内容` |
| `官网` | `HTML` | `<a>https://example.com</a>` | |
| `视频教程` | `VideoMessage` | 视频文件ID | `跟着做就行 🎬` |

- **关键字**：多个关键字用**英文逗号**分隔
- **标识块**：`HTML` / `MarkdownV2` / `GraphicMessage` / `VideoMessage`
- 多个内容块会**分条连续发送**
- 获取文件 ID：把图片/视频发给机器人，回复该消息发送 `/file`

> 修改配置后发送 `/reload` 立即生效，否则默认 3 小时缓存过期。

**敏感词库** —— `sensitive_words` 表

| 绝杀词（触发即封禁） | 敏感词（触发即删除） |
|:---------------------|:---------------------|

- 直接填**明文**即可（会以 Base64 存储，防误读）
- 也可以用指令动态增删：`/word add 广告词 sensitive`
- 敏感词在 3 小时内累计触发 3 次会自动封禁（`CONFIG.security` 可调）

**群组屏蔽列表** —— `authority_management` 表第 3 行

第 3 行第 2 列起填写群组 ID（以 `-100` 开头），这些群的消息**不会**推送给主人。

---

#### 🔁 从官方版迁移

| 项目 | 是否需要处理 |
|:-----|:-------------|
| `db_telegram` 历史消息 | ✅ 直接沿用 |
| `key_params` 关键字配置 | ✅ 直接沿用（格式完全一致） |
| `sensitive_words` 敏感词 | ✅ 直接沿用 |
| `authority_management` 屏蔽群组 | ✅ 直接沿用 |
| `chat_settings` 等 4 张新表 | 🔧 运行 `initDatabase()` 自动创建 |
| `Params.gs` 参数 | 🔧 把 `EXECID` / `BOTID` / `KingId` / `botIdAlone` 填到你自己的 `Modules/Secrets.gs`（`Params.gs` 已是空占位） |
| 原 `Params.gs` 其余配置 | ⚠️ 结构已变，见新 `CONFIG` 对象 |

迁移后**必须重新执行第五、六步**（部署 Web 应用 + 运行 `onBotInit`），
因为旧部署指向的还是旧代码。

---

#### 🛠 常用维护函数

在 GAS 编辑器里手动运行：

| 函数 | 作用 |
|:-----|:-----|
| `onBotInit()` | 一键初始化（建表 + 菜单 + 调度器 + Webhook） |
| `initDatabase()` | 仅建表 / 补表，不覆盖已有数据 |
| `diagnose()` | 打印配置、表格、Bot 连通性、触发器、队列情况 |
| `setupWebhook()` | 重新绑定 Webhook |
| `removeWebhook()` | 解绑 Webhook |
| `installScheduler()` | 安装 / 修复调度器（幂等） |
| `debugRunQueue()` | 手动执行一轮任务队列 |
| `debugPushToKing()` | 测试主人推送链路是否通 |
| `syncCommandsToTelegram()` | 重新同步命令菜单 |
| `switchToPolling()` | 切换到轮询模式（无法暴露 Web 应用时用） |
| `switchToWebhook()` | 切回 Webhook 模式 |

---

#### 🔄 改完代码怎么同步到线上

机器人跑起来之后，改代码是最常做的事。**不要一个一个复制粘贴** —— 按改动类型选路：

| 你改了什么 | 怎么做 | 代价 |
|:-----------|:-------|:-----|
| 开关 / 关键词 / 敏感词 / 群规 / 频道监听规则 | 改 Google 表格，然后在 Telegram 里发 `/reload` | 零 |
| `Modules/` 下的 `.gs` 代码 | `bash Tools/push.sh --deploy` | 一条命令 |
| 没装 Node，或装不上 npm 包 | `node Tools/bundle.js` 后粘贴一次 | 一次粘贴 |
| 希望提交即自动上线 | 仓库根的 GitHub Actions 工作流 | 配一次 Secret |

**方案 A · 配置热更新（覆盖 90% 的日常改动）**

开关、关键词、敏感词、群规全都在表格里，和代码无关。改完发 `/reload` 清缓存即可，
**不需要碰 Apps Script 编辑器**。

**方案 B · clasp 一条命令（推荐）**

首次配置，只做一次：

```text
① 开启 Apps Script API ── https://script.google.com/home/usersettings
   （这一步就是之前「授权不足」报错的根因，开了它自动解析部署列表才能用）
② npm i -g @google/clasp
③ clasp login                （会打开浏览器选 Google 账号）
④ 复制 .clasp.json.example 为 .clasp.json，把 scriptId 换成你的项目 ID
   scriptId 在「⚙️ 项目设置」里，或看地址栏 /home/projects/<这一串>/edit
```

之后每次改完：

```bash
bash Tools/push.sh              # 自检 → 构建 → 推送
bash Tools/push.sh --deploy     # 再建版本 + 更新部署，让线上真正生效
```

脚本会自动：检查 node / clasp / 登录状态 / scriptId → 构建 `dist/` →
跑重复声明检查（不通过直接拒绝推送）→ `clasp push --force` →
**回读校验**（把线上代码拉回来跟本地逐字节比，不一致直接判定推送失败）。

> ⚠️ **`clasp push` 是「同步」不是「追加」**：本地 `dist/` 里没有的文件，线上会被删除。
> 这是故意的 —— 线上残留的旧文件会和本次代码重名，而 GAS 所有 `.gs` 共享一个扁平全局作用域，
> 同名函数**不报错、只按文件顺序静默覆盖**，属于最难查的一类线上故障。

> 🚨 **「push 了却没同步」的头号原因：`.claspignore` 里的 `**/*`**
>
> 这条只看一眼输出是不够的 —— `clasp push` 成功时可能什么都不推：
>
> ```text
> Script is already up to date.     ← 退出码 0，但线上没变
> ```
>
> 踩坑经过：`.claspignore` 里为了「防止误推本地文件」写了 `**/*`，
> 而它按 gitignore 语义把 `dist/` **整个目录**排除了（下面写的 `!dist/**` 救不回来，
> 因为 `dist/` 这个父目录自己已经被 ignore）。于是 clasp 认为本地没文件可推，
> 直接说「已是最新」退出 0。
>
> 当时的现象：改了 `Commands / Deploy / Params / Triggers` 四个文件，
> 命令全绿，打开 GAS 编辑器代码还是旧的 —— 本地 `Params` 有 `webappUrl` 那行，
> 线上没有，看起来就像「同步失败」。
>
> **认准三条**：
> 1. `.claspignore` 里**不许有 `**/*`**，推送范围由 `.clasp.json` 的 `rootDir: "./dist"` 决定就够了。
> 2. push.sh 结尾的**回读校验**才是最终裁判，不靠退出码、也不靠那句文本。
>    它会真把线上代码拉回来比对，不一致就报错列出文件：
>
>    ```text
>    ❌ 线上回读 有 4 个文件跟线上对不上：
>         · Commands: 本地 44789B / 线上 39200B
>    ```
> 3. 想手动验一次：`node Tools/verify-push.js`（`--offline` 只做本地产物检查，不联网）。
>
> 顺带一提：线上文件名可能是 `Params.js` 而不是 `Params.gs`，**不是 bug** ——
> clasp 更新同名文件时沿用线上已有的扩展名。

> 💡 **别在 GAS 网页编辑器里手工改代码 / 改配置**
>
> push 是「以本地为准」的覆盖，你在网页里手填的东西下次 push 会被打回本地的值。
> 最典型的就是 `CONFIG.deploy.webappUrl`：在网页里填了 `/exec` 地址，
> 一 push 又被本地的空字符串覆盖，于是「刚填的地址又没了」。
>
> 正确姿势：
> · 改配置 → 改本地 `Modules/Params.gs` 再 push，或者干脆改表格 + `/reload`
> · 只想要个 `/exec` 地址 → 私聊机器人发 `/webhook bind <地址>`，
>   它存进脚本属性，**热更新和 push 都冲不掉**，一次就够

##### 🔒 第七课 · 配置空值保护：为什么你的 EXECID 会被 push 冲掉

先说清机制，再看解法 —— 这样你就不会把「工具行为」当成「工具坏了」。

**`clasp push` 是整文件覆盖，没有字段级合并。** 它不理解「这一行是我改的、
那一行是空占位」，它只会把线上整个 `Params.gs` 换成你本地那份。于是：

```js
// 你在 GAS 网页里把这里填好了
var EXECID = "1AbC2dEf3GhI4jKlMnOpQrStUv5WxYz";

// 但你本地 Modules/Params.gs 还是空占位
var EXECID = "";          // ← push 之后，线上被改回这一行
```

这不是 bug，是所有用 clasp 同步配置的项目都会踩的坑。
**一个更隐蔽的版本**：先用别的方式（手工粘贴 bundle）在网页上填好了，
几天后跑了一次 `push.sh`，配置全没了 —— 整段填好的东西被空占位吞掉。

**解法已经内置了**：`push.sh` 在推送前会跑一步**空值保护**：

```text
④ 配置空值保护（别把你填过的值 push 没了）
  取线上 Params 做空值保护
  已保留你在线上手填的 3 项，写回本地源码：
       · EXECID = 1AbC2d…
       · BOTID  = 12345678…oken
       · KingId = 778899
  这些值现在进本地源码了，以后 build / push 都带得走，不会被还原。
```

规则就一条：

| 本地 | 线上 | 发生什么 |
|:--|:--|:--|
| 空占位 `""` | 有值 | **采用线上值**，写回本地源码 → 保住 |
| 有值 | 任意 | 保持本地（你故意填的）→ push 照常覆盖线上 |

几个容易没搞明白的点：

- **为什么写回源码而不是只写 `dist/`？**
  只写产物的话，`node Tools/build.js` 会从 `Modules/` 重新生成、把值冲掉。
  所以 `Modules/Params.gs` 和 `dist/Params.gs` 两个文件一起改。
- **那以后本地就有密钥了？** 现在密钥放在 `Modules/Secrets.gs`（被 `.gitignore` 排除），
  `Params.gs` 永远是干净的空占位，可以直接提交到 GitHub。`keep-remote-values` 也会跳过这 6 个
  外移的密钥，所以某次 push 不会把它们又写回 `Params.gs`。不想用 Secrets.gs 也能只改表格 + `/reload`，
  或者把 `webappUrl` 交给 `/webhook bind`（存脚本属性，push 冲不掉）。
- **它在什么时候跑？** 每次 `bash Tools/push.sh` 都会自动跑，你不用管。
  单独验一次：`node Tools/keep-remote-values.js`。
- **拉不到线上会怎样？** 直接**失败退出、不推送**（退出码 1），
  不会闷头把你的值覆盖掉。

**配置项从头到尾别手改**，用向导更快也更不容易填错位置：

```bash
node Tools/setup-config.js            # 交互填写（只问没填的）
node Tools/setup-config.js --show     # 只看当前值，Token 会打码
```

> ⚠️ **推送 ≠ 生效**：Web 应用部署跑的是**固定版本快照**，不是 HEAD。
> 只覆盖代码而不更新部署，线上行为不会变 —— 这是「推了代码却没生效」的真正原因。
> 加 `--deploy`，或到「部署 → 管理部署 → ✏️ 编辑 → 版本选新版本 → 部署」。

**方案 C · 单文件粘贴（零依赖兜底）**

```bash
node Tools/bundle.js
```

产出 `dist-bundle/MaoBot.gs`：14 个模块合并成**一个文件**（约 11,500 行）。
在编辑器里：

```text
① 删掉所有旧的 .gs 文件（留着会和新代码重名冲突）
② 新建一个文件，命名 MaoBot
③ 把 dist-bundle/MaoBot.gs 全选粘进去，Ctrl/Cmd + S 保存
④ 项目设置里用 dist-bundle/appsscript.json 覆盖清单
```

合并顺序由 `Tools/modules.js` 里唯一一份 `ORDER` 表决定，`build.js` 与 `bundle.js` 共用，
所以「clasp 推的顺序」和「手工粘贴的顺序」不可能不一致；脚本还会校验合并前后顶层函数数量一致。

**首次推送或 `oauthScopes` 有变动时**，需要在编辑器里随便运行一个函数（比如 `diagnose()`）
完成一次重新授权，否则会出现「授权不足」类报错。

---

#### 🌐 中英文切换

机器人支持**按聊独立**切换中文 / 英文，**不调用翻译接口**（英文是代码里预置的静态文案）。

```text
/lang           查看当前语言
/lang en       本聊切英文
/lang zh       切回中文
```

- **私聊**里任何人都能改自己的语言；**群聊**里只有管理员 / Bot 主人能改（防滥用），改的是「这个群」的语言，不影响其他群和你自己的私聊；
- 语言按聊持久化（脚本缓存 24h + `chat_settings` 表），切完**本条之后的回复即生效**；
- 已双语化的部分：`/start` `/help` `/menu` `/id` `/ping` `/mode` `/health` `/lang` 及「未匹配内容」的兜底文案；`/help` 与 `/menu` 的分类名、指令描述与用法也随语言切换。
- 实现位置：`Modules/I18n.gs`（`L(zh, en)` 助手 + `getLang/setLang` + `I18N_CMD_EN` 指令英文表）。

---

#### ❓ 常见问题

**Q：机器人完全没反应**

按顺序查：
1. `diagnose()` 看 `getMe` 是否成功 → 失败说明 `BOTID` 填错
2. `diagnose()` 看 `Webhook` 是否为空 → 为空说明没绑定，运行 `setupWebhook()`
3. Web 应用访问权限是否选了「任何人」
4. 改过代码后要**重新部署**（部署 → 管理部署 → 编辑 → 版本选"新版本" → 部署）
5. 发一条 `/webhook`，看它报的「当前绑定地址」是不是 `/dev` 结尾 ——
   是的话直接运行 `setupWebhook()` 重绑（详见第五步的说明，这是最常见的坑）

**Q：`onBotInit()` 打印出来的是 `/dev` 结尾的地址**

说明脚本没能自动拿到正式地址。别去改代码，直接在 Telegram 里
发 `/webhook bind <你的 /exec 地址>` 绑一次即可（**只需一次**）。
想让它以后能自动解析，再按第六步「情况一」修一下授权。

**Q：每次重新部署都要改一次 `webappUrl` 吗？**

**不用。** 这是最容易误解的一点：

- 同一个部署，推新版本 / `/push` 热更新 → **地址不变**
- 只有「删除部署后重新新建」→ 地址才变

而且手工绑定存在**脚本属性**里（不是 `Params.gs`），
所以 `/push` 覆盖代码也冲不掉它。绑一次就长期有效。

**Q：怎么确认 `/exec` 地址真的对外可用**

开一个浏览器**无痕窗口**访问该地址：
- 显示你自己的页面内容（或纯文本提示）→ 权限正确
- 跳出 Google 登录页 → 权限没选「任何人」，回第五步改

**Q：`授权不足：缺少 script.projects / script.deployments 权限`**

这说明读部署列表被拒，**不代表你没建过部署**。按第六步「情况一」的方案 A 修授权，
或直接 `/webhook bind <地址>` / `switchToPolling()` 绕开。

**Q：点按钮一直转圈**

这是原版的经典问题，ProVersion 已修复。如果你还在用官方版代码，属于预期行为。

**Q：入群欢迎不生效**

1. 群里发送 `/manage` → 功能开关 → 开启「入群欢迎」
2. 确认机器人是群管理员
3. 旧版（官方版）因使用了已废弃的 `new_chat_participant` 字段，**永远不生效**，属已知缺陷

**Q：`/ban` 提示权限不足**

机器人必须是群管理员，且勾选了「封禁用户」权限。

**Q：想跑本地测试**

```bash
bash Tests/run.sh
```
只需要 Node.js，不联网、不消耗 GAS 配额。

**Q：严重卡顿 / 响应慢**

1. 打开 `Params.gs`，确认 `CONFIG.cache.enabled` 是 `true`（默认值）
2. 定期清理 `db_telegram` 表，或设置 `CONFIG.storage.keepDays`
3. 敏感词库建议控制在 2000 条以内

---

#### ⚠️ 免责声明

- 本项目仅用于学习研究，请勿用于任何商业或非法目的
- 请遵守 Telegram 服务条款与当地法律法规
- 敏感词库 Base64 存储仅用于防误读，**不是加密**，请勿存放真正的机密内容
- 部署后产生的任何后果由使用者自行承担
