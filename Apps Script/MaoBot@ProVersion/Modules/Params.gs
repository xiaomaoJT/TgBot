/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  ---------------------------------------------------------------------------
 *  Params.gs — 配置中心
 *
 *  ⚠️ 这是整个项目【唯一】需要你手动修改的文件，其余模块开箱即用。
 *
 *  部署顺序（Google Apps Script 中文件顺序建议）：
 *    Params.gs → Utils.gs → Core.gs → Telegram.gs → UI.gs
 *    → Api.gs → Commands.gs → Manage.gs → Triggers.gs → MaoBot.gs
 * ============================================================================
 *
 *  ⚠️ 不要改动本文件里 `globalThis.__CONFIG_LOADED__` 及以下「系统区」的内容。
 * ============================================================================
 */

/* ============================================================================
 * ❶ 必填参数 — 不填机器人无法工作
 * ==========================================================================*/

// Google 表格 ID（表格网址 /d/ 与 /edit 之间那一串）
var EXECID = ""; // ⚠️ 真实值在 Modules/Secrets.gs（被 .gitignore 排除，不提交仓库）

// Telegram Bot Token（@BotFather 给你的那串，形如 123456:AAE...）
var BOTID = ""; // ⚠️ 真实值在 Modules/Secrets.gs（被 .gitignore 排除，不提交仓库）

// 你的 Telegram 数字 ID（私聊机器人发送 /id 获取）。私人推送功能必填。
var KingId = ""; // ⚠️ 真实值在 Modules/Secrets.gs（被 .gitignore 排除，不提交仓库）

// 机器人自身数字 ID（用于识别"用户回复了机器人消息"）。填错只会轻微降级，不会报错。
var botIdAlone = ""; // 留空只会轻微降级（引用识别不精确），不报错。真实值在 Modules/Secrets.gs（不提交仓库）

/* ============================================================================
 * ❷ 品牌信息 — 换成你自己的
 * ==========================================================================*/

var BRAND = {
  name: "MaoBot", // 机器人在消息里显示的名字
  repo: "https://github.com/xiaomaoJT/TgBot", // 源码仓库地址（留空则隐藏相关按钮）
  channel: "https://t.me/ListenToMao", // 频道链接，如 https://t.me/xxx
  group: "https://t.me/hSuMjrQppKE5MWU9", // 群聊链接
  site: "http://mp.weixin.qq.com/mp/homepage?__biz=MzI3MjE3NTc4OA==&hid=1&sn=69f77280608382e9ab1e6afac8c2a881&scene=18#wechat_redirect", // 官网/博客链接
  wxName: "小帽集团", // 公众号名称（留空隐藏）
  wxUrl: "http://mp.weixin.qq.com/mp/homepage?__biz=MzI3MjE3NTc4OA==&hid=1&sn=69f77280608382e9ab1e6afac8c2a881&scene=18#wechat_redirect", // 公众号链接
  supportBot: "https://t.me/Xiao_MaoMao_bot", // 申诉/反馈机器人链接
};

/* ============================================================================
 * ❸ 功能开关 — 按需开关，全部有默认值
 * ==========================================================================*/

var CONFIG = {
  // 时区（影响日志时间、每日清理时间）
  timezone: "Asia/Shanghai",

  /* ---- 缓存 ---- */
  cache: {
    enabled: true, // ⭐ 修复：原版恒为 true 导致缓存永久失效
    ttlSeconds: 180 * 60, // 关键字 / 权限 / 敏感词 缓存时长
  },

  /* ---- 权限 ---- */
  permission: {
    releaseToAdmins: true, // 群管理员自动获得管理指令权限（自动拉取群管列表）
  },

  /* ---- 主人消息推送 ---- */
  king: {
    // 1 全部 | 2 私聊+群聊 | 3 仅私聊 | 4 仅群聊 | 5 关闭
    type: 1,
    detail: true, // 是否转发原媒体（图片/视频/音频/贴纸/文件）
    pushBots: false, // 是否也推送其他机器人发的消息
    maxTextLength: 120, // 私聊推送里"简要内容"截断长度
  },

  /* ---- 消息自动删除 ---- */
  autoDelete: {
    enabled: true,
    delaySeconds: 60, // 机器人回复/警告发出后多久自动删除
    groupsOnly: true, // 仅群聊内执行（私聊里删了用户会看不到）
    maxPerRound: 20, // 单轮调度最多处理多少条删除请求（防超时）
  },

  /* ---- 消息外观（Bot API 9.4 ~ 10.3 新能力）---- */
  ui: {
    // ⭐ Rich Messages（Bot API 10.1+）：用 GFM Markdown 发送，服务端渲染
    //    真表格 / 多级标题 / 列表 / 分隔线 —— 取代原来「用等宽空格拼表格」的做法
    //    限制：单条 32768 字符、最多 500 个块、表格最多 20 列
    rich: true,
    // Rich 发送失败时自动降级为 HTML（⚠️ 建议保持 true，否则老账号会收不到消息）
    richFallback: true,
    richMaxChars: 30000, // 主动截断阈值（留出安全余量给 32768 上限）

    // ⭐ 临时消息（Bot API 10.2+）：群内仅指定用户可见，天然不刷屏
    //    ⚠️ 非按钮回调触发的场景要求机器人是群管理员，否则会失败并自动降级
    ephemeral: true,
    // 临时消息不可用时，降级为「发送后 N 秒删除」（即旧的 autoDelete 方案）
    ephemeralFallback: true,
  },

  /* ---- 反刷屏 ---- */
  antiFlood: {
    enabled: false,
    limit: 8, // 窗口内允许的最大发言数
    windowSeconds: 10, // 统计窗口
    action: "mute", // mute 禁言 | kick 踢出 | warn 仅警告
    muteMinutes: 10, // mute 时长（分钟）
  },

  /* ---- 入群验证（按钮验证）---- */
  verify: {
    enabled: false,
    timeoutSeconds: 120, // 超时未点击则踢出
    text: "点击下方按钮完成验证，{timeout} 秒内未验证将被移出群聊。",
  },

  /* ---- 入群欢迎 / 退群提示 ---- */
  welcome: {
    enabled: false,
    text:
      "👏 <b>欢迎 {name}</b> 加入 <b>{chat}</b>！\n" +
      "本群第 <b>{count}</b> 位成员，有问题可直接发指令 <code>/help</code> 查看功能。",
    leftText: "👋 <b>{name}</b> 离开了群聊，江湖再见。",
  },

  /* ---- 指令 ---- */
  command: {
    prefixes: ["/", "!"], // 支持的指令前缀
    rateLimitSeconds: 2, // 同一用户指令冷却（秒），0 = 关闭
    exemptAdmins: true, // 管理员不受冷却限制
    autoRegisterMenu: true, // 启动时自动调用 setMyCommands 注册命令菜单
  },

  /* ---- AI 对话 ---- */
  ai: {
    // 主模型。可选值见 AI.gs 的 AI_PROVIDERS，或直接发 /models 查看：
    //   gemini | groq | cerebras | mistral | openrouter | github
    //   together | sambanova | huggingface | cloudflare | custom | pollinations
    provider: "gemini",

    /* ---- 各免费大模型的密钥 ----
     * ⭐ 填哪个哪个就自动生效。填多个 → 自动组成「故障转移链」：
     *    主模型失败（限流 / 超时 / 报错）时按顺序切下一个，用户无感知。
     *    只使用你填了密钥的模型，不会把你的内容发给你没配置的服务。
     *    全部留空时降级到免密钥的 pollinations（可关闭，见 allowKeylessFallback）。
     */
    geminiKey: "", // ⭐ 推荐首选：aistudio.google.com　免费 1500 次/天，支持看图。真实值在 Modules/Secrets.gs（不提交仓库）
    groqKey: "", // console.groq.com　免费额度，推理极快
    cerebrasKey: "", // cloud.cerebras.ai　免费额度，速度最快
    mistralKey: "", // console.mistral.ai　免费额度
    openrouterKey: "", // openrouter.ai　有 :free 系列模型
    githubToken: "", // github.com/settings/tokens　GitHub Models，免费
    togetherKey: "", // api.together.xyz　部分模型免费
    sambanovaKey: "", // cloud.sambanova.ai　免费额度
    hfToken: "", // huggingface.co/settings/tokens　推理 API 免费额度

    // Cloudflare Workers AI（额度按"神经元"计，需账号 ID + Token）
    cloudflareAccountId: "",
    cloudflareToken: "",

    // 自定义 OpenAI 兼容端点（DeepSeek / 智谱 / 通义 / 本地 Ollama 都能接）
    customBaseUrl: "",
    customKey: "",
    customModel: "",

    /* ---- 调度策略 ---- */
    failover: true, // 主模型失败时自动切到下一个「你已配置密钥」的模型
    allowKeylessFallback: false, // 是否允许回落到免密钥的 pollinations（默认关，避免内容外泄）
    modelOverride: {}, // 覆盖某个模型的默认型号，如 { groq: "llama-3.1-8b-instant" }

    /* ---- 通用 ---- */
    system: "你是一个运行在 Telegram 上的中文助手，回答简洁、分点、不超过 300 字。",
    maxChars: 3500, // 回复截断长度
    historyTurns: 6, // 多轮对话保留的轮数（0 = 无记忆）
    stream: true, // ⭐ 流式反馈：调用前先亮"思考中"气泡，用户不必干等
    dailyQuota: 1200, // 全局每日调用上限（本地保护，防止把免费额度烧光）
    limits: {}, // 按模型覆盖上限，如 { gemini: 800, groq: 500 }
    timeoutMs: 500, // 触发 AI 前的"正在输入"提示时长

    /* ---- 工作类任务（摘要 / 代码 / 看图 / 群聊总结）---- */
    taskProvider: "", // 指定干活用的模型；看图必须选支持视觉的（gemini 支持）
    maxInputChars: 12000, // 单次投喂模型的最大输入长度
    digestMessages: 100, // /digest 默认总结多少条群消息
  },

  /* ---- 频道监听 / 关键词推送 ---- */
  channel: {
    enabled: true, // 总开关
    includeMedia: true, // 用 copyMessage 把原帖的图/视频一并搬到目标会话
    maxPushPerPost: 5, // 一条新帖最多推给几个目标（防止规则写错把自己刷爆）
    dedupeMinutes: 30, // 同一帖对同一目标的去重窗口（编辑重推不会重复打扰）
  },

  /* ---- 热更新 ---- */
  deploy: {
    // 脚本 ID。留空则自动用 ScriptApp.getScriptId()，一般不用填
    scriptId: "",
    // ⚠️ Web 应用正式地址（/exec 结尾）。留空 = 自动解析（推荐）。
    //   只有在「自动解析拿不到」或「多部署想指定其中一个」时才需要填。
    //   千万别填 /dev 结尾的地址——那是测试部署，Telegram 访问不了。
    webappUrl: "", // 留空 = 自动解析（推荐）。真实值在 Modules/Secrets.gs（不提交仓库）
    // 远端源码清单（JSON）。留空则从 BRAND.repo 推导 GitHub raw 地址
    // 格式：{ "version":"1.1.0", "note":"说明", "files":[{"name":"Utils","url":"…"}] }
    manifestUrl: "",
    manifestPath: "deploy/manifest.json",
    branch: "main",
    autoRelease: true, // 推送后自动建版本 + 把默认部署切到新版本
  },

  /* ---- 安全 ---- */
  security: {
    // 敏感词触发次数达到阈值后自动封禁
    autoBanThreshold: 3,
    autoBanWindowHours: 3,
    detectInQuotedText: true, // 是否连带检查引用内容
    notifyOnBan: true, // 封禁后是否在群里公告
  },

  /* ---- 每日维护 ---- */
  maintenance: {
    // ⭐ 接入自愈：每天维护时发现 Telegram 投递仍被 GAS 重定向（302），
    //    就自动删 Webhook + 装轮询触发器，机器人自己恢复。
    //    为什么默认开：GAS 每次 push 新代码都会重置匿名授权，
    //    Webhook 这条路在这台机器上会反复失效（表现=「发了没反应」）。
    //    想只用手选模式：改 false，或 /mode webhook 后 24 小时内不会自动切。
    autoSwitchPolling: true,
  },

  /* ---- 日志与诊断 ---- */
  log: {
    errors: true, // 是否把异常写入 error_log 表
    maxRows: 2000, // error_log 超过多少行自动清理旧数据
    verbose: false, // 是否在"执行记录"里打印详细信息
  },

  /* ---- 消息存储 ---- */
  storage: {
    enabled: true, // 是否把消息写入 db_telegram
    storeJson: true, // 是否存储原始 JSON（体积大，可关闭省空间）
    keepDays: 0, // 自动清理多少天前的记录，0 = 不清理
    // ⭐ 私聊里的 /xxx 指令也写进 db_telegram。
    //   群聊指令仍然跳过（避免几群人刷指令把表撑爆），
    //   私聊只你一个人，留痕是自查价值 —— 「我发了 /ping，表里怎么没有？」
    privateCommands: true,
  },
};

/* ============================================================================
 * ❹ 工作表名 — 与你的 Google 表格对应
 * ==========================================================================*/

var SHEET = {
  storage: "db_telegram",
  keywords: "key_params",
  authority: "authority_management",
  sensitive: "sensitive_words",
  chatSettings: "chat_settings",
  warns: "warn_records",
  errors: "error_log",
  tasks: "task_queue",
  channels: "channel_watch",
};

/* ============================================================================
 * ❺ UI 主题 — 想换个风格改这里就够了
 * ==========================================================================*/

var THEME = {
  title: "🕹", // 卡片标题图标
  divider: "─", // 分隔线字符
  dividerCount: 14, // 分隔线长度
  bullet: "•",
  ok: "✅",
  fail: "❌",
  warn: "⚠️",
  info: "💡",
  loading: "⏳",
  arrow: "›",
};

/* ============================================================================
 * ❻ 键盘布局 — 底部键盘 & 常用内联按钮
 * ==========================================================================*/

// 聊天窗口底部常驻键盘（reply keyboard）
var REPLY_KEYBOARD = {
  keyboard: [
    [{ text: "/help" }, { text: "/menu" }, { text: "/id" }],
    [{ text: "/weather 北京" }, { text: "/hot weibo" }, { text: "/ai 你好" }],
    [{ text: "/ip" }, { text: "/qr https://t.me" }, { text: "/stat" }],
  ],
  resize_keyboard: true, // 自适应高度
  one_time_keyboard: false,
  is_persistent: true,
  input_field_placeholder: "输入指令或关键字…",
};

// 通用消息跟随内联按钮（自动过滤空链接）
var INLINE_LINKS = [
  [
    { text: "📦 源码仓库", url: "REPO" },
    { text: "📣 频道", url: "CHANNEL" },
  ],
  [{ text: "💬 交流群", url: "GROUP" }],
];

/* ============================================================================
 * ❼ 系统区 — 请勿修改
 * ==========================================================================*/

/** 单例标记，防止重复初始化 */
var __CONFIG_LOADED__ = true;

/** 运行时全局状态（每次请求会重置） */
var RUNTIME = {
  update: null,
  updateId: null,
  kind: null,
  spamCount: {},
  // 耗时诊断：t0 请求起点 / marks 打点 / duration 总耗时 / stages 阶段串
  t0: 0,
  marks: [],
  duration: -1,
  stages: [],
};

/**
 * 读取配置（带默认值合并，避免用户配置缺项导致崩溃）
 * 想临时覆盖某项：CONFIG_OVERRIDE = { "antiFlood.enabled": true }
 */
var CONFIG_OVERRIDE = {};

function cfg(path, fallback) {
  if (Object.prototype.hasOwnProperty.call(CONFIG_OVERRIDE, path)) {
    return CONFIG_OVERRIDE[path];
  }
  var segs = String(path).split(".");
  var cur = CONFIG;
  for (var i = 0; i < segs.length; i++) {
    if (cur == null) return fallback;
    cur = cur[segs[i]];
  }
  return cur === undefined ? fallback : cur;
}

/** 列出所有内联按钮链接，供 UI 层过滤空值 */
function inlineLinkTargets() {
  return {
    REPO: BRAND.repo,
    CHANNEL: BRAND.channel,
    GROUP: BRAND.group,
    SITE: BRAND.site,
    WX: BRAND.wxUrl,
    SUPPORT: BRAND.supportBot,
  };
}

/**
 * AI 是否可用。
 * 具体实现见 AI.gs 的 aiChainStatus()（它会遍历注册表，挑出所有已配置密钥的模型）。
 * 返回 { ok:boolean, provider:string, reason:string, chain:string[] }
 */
function aiStatus() {
  if (typeof aiChainStatus === "function") return aiChainStatus();
  return { ok: false, provider: "", reason: "AI.gs 未加载", chain: [] };
}

/** provider 的中文显示名（用于消息页脚） */
function aiProviderName(provider) {
  if (typeof aiProviderTitle === "function") return aiProviderTitle(provider);
  return String(provider || "-");
}

