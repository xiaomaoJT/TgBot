/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Commands.gs — 指令注册表 + 路由 + 帮助菜单 + 回调处理
 * ----------------------------------------------------------------------------
 *  原版的问题：所有指令挤在 processReplyWord 的一个 switch(id) 里，
 *  用 `key.indexOf("/ban") != -1` 判断，导致：
 *    · 消息里随便出现 "/ban" 三个字符就会误触发；
 *    · 新增一个功能要从 Params.gs 的 commandWord 数组、switch 分支、
 *      /help 文案三个地方各改一遍，极难维护；
 *    · 帮助文本是硬编码字符串，永远和实际功能对不上。
 *
 *  现在改为「声明式注册表」：加一个指令 = 加一条记录，
 *  帮助菜单与 Telegram 命令面板自动同步。
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 一、指令注册表
 * ----------------------------------------------------------------------------
 * cmd      : 主指令名（不含前缀）
 * alias    : 别名数组
 * desc     : 一句话说明（会同步到 Telegram 命令面板，≤ 256 字符）
 * cat      : 帮助菜单分类
 * level    : public 所有人 | admin 群管理员/Bot主人 | owner 仅Bot主人
 * usage    : 用法字符串（仅用于帮助展示与参数校验）
 * examples : 示例数组
 * menu     : 是否出现在 Telegram 命令面板（true/false）
 * eph      : 群内是否用「临时消息」回复（仅触发者可见，Bot API 10.2+）
 *            ⭐ 只给「答案只对本人有意义」的指令加这个标记。
 *            管理类动作必须保持公开 —— 群员需要看到违规处理确实发生了。
 * handler  : function(ctx, args)
 * --------------------------------------------------------------------------*/
const COMMANDS = [
  /* ---- 基础 ---- */
  { cmd: "start", alias: [], cat: "基础", level: "public", menu: true,
    desc: "开始使用 / 显示主菜单", handler: cmdStart },
  { cmd: "help", alias: ["h", "?"], cat: "基础", level: "public", menu: true,
    desc: "查看完整功能说明", usage: "/help [分类]", handler: cmdHelp },
  { cmd: "menu", alias: ["m"], cat: "基础", level: "public", menu: true,
    desc: "打开交互式功能面板", handler: cmdMenu },
  { cmd: "id", alias: ["myid", "whoami"], cat: "基础", level: "public", menu: true, eph: true,
    desc: "查看各类 ID（用户/群组/消息）", handler: cmdId },
  { cmd: "ping", alias: [], cat: "基础", level: "public", menu: true, eph: true,
    desc: "检测机器人存活与响应延迟", handler: cmdPing },
  { cmd: "lang", alias: [], cat: "基础", level: "public", menu: true, eph: true,
    desc: "切换机器人语言（中文 / 英文）", usage: "/lang [zh|en]", handler: cmdLang },

  /* ---- 查询 ---- */
  { cmd: "weather", alias: ["w", "tq"], cat: "查询", level: "public", menu: true,
    desc: "查询城市天气", usage: "/weather <城市>", examples: ["/weather 北京", "/weather Tokyo"],
    handler: function (ctx, args) { return apiWeather(args); } },
  { cmd: "hot", alias: [], cat: "查询", level: "public", menu: true,
    desc: "查看各平台热榜", usage: "/hot <平台>", examples: ["/hot weibo", "/hot zhihu"],
    handler: function (ctx, args) { return apiHot(args); } },
  { cmd: "ai", alias: ["chat", "gpt"], cat: "查询", level: "public", menu: true,
    desc: "与 AI 对话", usage: "/ai <问题> ｜ /ai clear 清空上下文",
    examples: ["/ai 用一句话解释黑洞", "/ai clear"],
    handler: function (ctx, args) { return apiAI(args, ctx); } },
  { cmd: "ip", alias: [], cat: "查询", level: "public", menu: true, eph: true,
    desc: "查询 IP 归属地", usage: "/ip [IP]", examples: ["/ip", "/ip 8.8.8.8"],
    handler: function (ctx, args) { return apiIP(args); } },
  { cmd: "phone", alias: [], cat: "查询", level: "public", menu: false, eph: true,
    desc: "识别手机号运营商", usage: "/phone <号码>", examples: ["/phone 13800138000"],
    handler: function (ctx, args) { return apiPhone(args); } },
  { cmd: "hitokoto", alias: ["yy", "yiyan"], cat: "娱乐", level: "public", menu: true,
    desc: "随机一言", handler: function () { return apiHitokoto(); } },
  { cmd: "dujitang", alias: ["djt"], cat: "娱乐", level: "public", menu: true,
    desc: "来一碗毒鸡汤", handler: function () { return apiDujitang(); } },
  { cmd: "qinghua", alias: ["sao"], cat: "娱乐", level: "public", menu: false,
    desc: "随机土味情话", handler: function () { return apiQinghua(); } },
  { cmd: "fortune", alias: ["xz"], cat: "娱乐", level: "public", menu: true,
    desc: "抽今日一签", handler: function (ctx) { return apiFortune(ctx); } },
  { cmd: "dice", alias: [], cat: "娱乐", level: "public", menu: true,
    desc: "掷个骰子", handler: function () { return apiDice(); } },
  { cmd: "coin", alias: [], cat: "娱乐", level: "public", menu: false,
    desc: "抛硬币", handler: function () { return apiCoin(); } },
  { cmd: "roll", alias: [], cat: "娱乐", level: "public", menu: false,
    desc: "生成随机数", usage: "/roll [最小-最大]", examples: ["/roll", "/roll 1-6"],
    handler: function (ctx, args) { return apiRoll(args); } },

  /* ---- 工具 ---- */
  { cmd: "calc", alias: [], cat: "工具", level: "public", menu: true, eph: true,
    desc: "计算数学表达式", usage: "/calc <表达式>", examples: ["/calc (1+2)*3^2"],
    handler: cmdCalc },
  { cmd: "tr", alias: ["translate"], cat: "工具", level: "public", menu: true,
    desc: "中英互译", usage: "/tr <文本>", examples: ["/tr hello world"],
    handler: function (ctx, args) { return apiTranslate(args); } },
  { cmd: "short", alias: ["suo"], cat: "工具", level: "public", menu: true,
    desc: "生成短链接", usage: "/short <链接>", examples: ["/short https://github.com"],
    handler: function (ctx, args) { return apiShort(args); } },
  { cmd: "qr", alias: [], cat: "工具", level: "public", menu: true,
    desc: "把文本/链接转成二维码图片", usage: "/qr <内容>", examples: ["/qr https://t.me"],
    handler: cmdQr },
  { cmd: "img", alias: ["pic"], cat: "工具", level: "public", menu: false,
    desc: "随机图片", usage: "/img [关键词]", handler: cmdImg },
  { cmd: "t", alias: ["ts", "time"], cat: "工具", level: "public", menu: false, eph: true,
    desc: "时间戳与日期互转", usage: "/t [时间戳|日期]", handler: function (ctx, args) { return apiTimestamp(args); } },
  { cmd: "file", alias: ["fileid", "getid"], cat: "工具", level: "public", menu: true, eph: true,
    desc: "获取媒体文件 ID（回复媒体消息使用）", handler: cmdFileId },

  /* ---- 群组 ---- */
  { cmd: "info", alias: ["chat"], cat: "群组", level: "public", menu: true,
    desc: "查看当前群组信息", handler: cmdChatInfo },
  { cmd: "stat", alias: [], cat: "群组", level: "public", menu: true,
    desc: "查看今日群活跃统计", handler: cmdStat },
  { cmd: "top", alias: ["hl"], cat: "群组", level: "public", menu: true,
    desc: "话痨排行榜", handler: cmdTop },
  { cmd: "rules", alias: [], cat: "群组", level: "public", menu: true,
    desc: "查看群规", handler: cmdRules },
  { cmd: "report", alias: [], cat: "群组", level: "public", menu: false,
    desc: "举报违规消息（回复目标消息使用）", handler: cmdReport },

  /* ---- 管理（群管理员 / Bot主人）---- */
  { cmd: "manage", alias: ["admin"], cat: "管理", level: "admin", menu: true,
    desc: "打开群管理面板", handler: cmdManagePanel },
  { cmd: "ban", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "封禁用户（回复消息使用）", usage: "/ban [时长] 如 30m/2h/3d，留空=永久",
    handler: function (ctx, args) { return cmdBanAction(ctx, args); } },
  { cmd: "unban", alias: ["release", "unmute"], cat: "管理", level: "admin", menu: true,
    desc: "解除封禁或禁言", usage: "/unban [用户ID]（回复消息时可不填）", handler: cmdUnbanAction },
  { cmd: "mute", alias: ["restrict"], cat: "管理", level: "admin", menu: true,
    desc: "禁言用户", usage: "/mute [时长] 回复消息使用", handler: cmdMuteAction },
  { cmd: "kick", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "移出群聊（可再次加入）", handler: cmdKickAction },
  { cmd: "warn", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "警告用户，累计 3 次自动移出", usage: "/warn [原因] 回复消息使用", handler: cmdWarnAction },
  { cmd: "warns", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "查看用户警告记录", handler: cmdWarnsList },
  { cmd: "resetwarn", alias: ["clearwarn"], cat: "管理", level: "admin", menu: false,
    desc: "清空用户警告记录", handler: cmdWarnReset },
  { cmd: "pin", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "置顶消息 / 一键置顶群规", usage: "/pin [text] 或回复消息使用", handler: cmdPinAction },
  { cmd: "unpin", alias: [], cat: "管理", level: "admin", menu: false,
    desc: "取消置顶", handler: cmdUnpinAction },
  { cmd: "purge", alias: ["del", "clean"], cat: "管理", level: "admin", menu: true,
    desc: "批量清理该用户近 24 小时消息", usage: "/purge 回复目标用户消息使用", handler: cmdPurgeAction },
  { cmd: "invite", alias: [], cat: "管理", level: "admin", menu: true,
    desc: "生成群邀请链接", usage: "/invite [时长] [次数]", handler: cmdInviteAction },
  { cmd: "settings", alias: ["set"], cat: "管理", level: "admin", menu: true,
    desc: "本群功能开关面板 / 设置群规",
    usage: "/settings ｜ /settings rules <群规内容>",
    examples: ["/settings", "/settings rules 1. 禁止广告 2. 禁止刷屏"],
    handler: cmdSettingsPanel },
  { cmd: "broadcast", alias: ["bc"], cat: "管理", level: "owner", menu: false,
    desc: "向所有已知会话广播消息（仅 Bot 主人）", handler: cmdBroadcast },
  { cmd: "auth", alias: ["authority", "权限"], cat: "管理", level: "owner", menu: false,
    desc: "权限名单管理：群组屏蔽列表 / 管理员列表 的查看·新增·修改·删除",
    usage: "/auth [block|admin] [list|add|del|edit] [参数]",
    examples: [
      "/auth block list（查看屏蔽群，带跳转）",
      "/auth block add -1001234567890",
      "/auth block del -1001234567890",
      "/auth block edit -1001234567890 -1009876543210",
      "/auth admin list（查看管理员，带跳转）",
      "/auth admin add 959711390",
    ],
    handler: cmdAuth },

  /* ---- 频道监听 ---- */
  { cmd: "ch", alias: ["channel", "pd"], cat: "频道", level: "admin", menu: true,
    desc: "频道监听：新帖查询与关键词推送",
    usage: "/ch [list|add|del|key|on|off|test|log]",
    examples: [
      "/ch（查看监听列表）",
      "/ch add -1001234567890 小米,红米",
      "/ch add（先转发一条频道消息）",
      "/ch key -1001234567890 发布会",
      "/ch off -1001234567890",
      "/ch log 0",
    ],
    handler: apiChannel },

  /* ---- AI 能力层（多个免费大模型，自动故障转移）---- */
  { cmd: "sum", alias: ["tldr", "summary"], cat: "AI", level: "public", menu: true,
    desc: "智能摘要：长文本 / 转发消息 / 网页链接",
    usage: "/sum [内容或链接]（留空则总结你回复的那条消息）",
    examples: ["/sum（回复长消息使用）", "/sum https://example.com/post"],
    handler: cmdAISummary },
  { cmd: "ask", alias: ["qa"], cat: "AI", level: "public", menu: true,
    desc: "针对某条消息提问（需回复目标消息）",
    usage: "/ask <问题>（先回复要提问的那条消息）",
    examples: ["回复合同后 /ask 里面的违约责任是什么"],
    handler: cmdAIAsk },
  { cmd: "code", alias: ["dev"], cat: "AI", level: "public", menu: true,
    desc: "写代码 / 解释代码 / 排查报错",
    usage: "/code <需求>（回复报错信息可直接排查）",
    examples: ["/code Python 用 pandas 读 CSV 并画柱状图"],
    handler: cmdAICode },
  { cmd: "polish", alias: ["pol", "rewrite"], cat: "AI", level: "public", menu: true,
    desc: "润色改写，可选风格",
    usage: "/polish [风格] <文本>　风格：正式 / 口语 / 简洁 / 专业 / 英文 / 邮件",
    examples: ["/polish 正式 这个方案我觉得不太行", "/polish 邮件 会议改到明天下午三点"],
    handler: cmdAIPolish },
  { cmd: "see", alias: ["ocr", "vision"], cat: "AI", level: "public", menu: true,
    desc: "看图：描述画面 / 提取文字（回复图片使用）",
    usage: "/see [具体要求]（需回复一张图片）",
    handler: cmdAISee },
  { cmd: "digest", alias: ["zd"], cat: "AI", level: "public", menu: true,
    desc: "总结本群最近的消息",
    usage: "/digest [条数，默认 100]",
    examples: ["/digest", "/digest 200"],
    handler: cmdAIDigest },
  { cmd: "todo", alias: ["act"], cat: "AI", level: "public", menu: true,
    desc: "从消息/聊天记录里提取待办事项",
    usage: "/todo（回复消息）或 /todo <文本>",
    handler: cmdAITodo },
  { cmd: "models", alias: ["aiinfo"], cat: "AI", level: "public", menu: true,
    desc: "查看已接入的大模型与今日剩余额度", handler: cmdAIModels },

  /* ---- 维护（仅 Bot 主人）---- */
  { cmd: "health", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "运行自检：配置、Webhook、数据表、触发器", handler: cmdHealth },
  { cmd: "webhook", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "查看/设置 Webhook 状态", handler: cmdWebhook },
  { cmd: "sync", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "同步命令菜单到 Telegram", handler: cmdSyncMenu },
  { cmd: "reload", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "清空缓存并重新加载配置", handler: cmdReload },
  { cmd: "push", alias: ["upgrade"], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "热更新：从远端清单拉取最新代码",
    usage: "/push [check|status|apply]",
    examples: ["/push check", "/push apply", "/push status"],
    handler: apiDeploy },
  { cmd: "word", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "敏感词管理：/word add|del|list [词] [ban|sensitive]", handler: cmdWordManage },
  { cmd: "kw", alias: ["keyword", "keywords"], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "关键词表自检：解析出几条、为什么匹配不到", handler: cmdKeywords },
  { cmd: "db", alias: ["tables"], cat: "维护", level: "owner", menu: false, eph: true,
    desc: "数据表体检：哪张表缺失/没数据（/db init 可自动补齐缺失的表）",
    usage: "/db 或 /db init",
    handler: cmdDBDoctor },
  { cmd: "king", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    usage: "/king [off|private|group|all|reset]",
    examples: ["/king off", "/king private", "/king status"],
    desc: "私人推送开关（太吵时先关掉）", handler: cmdKing },
  { cmd: "mode", alias: [], cat: "维护", level: "owner", menu: false, eph: true,
    usage: "/mode 或 /mode polling|webhook",
    examples: ["/mode", "/mode polling", "/mode webhook"],
    desc: "查看 / 切换接入模式（轮询 or Webhook）", handler: cmdMode },
];

/** 指令查找索引（含别名） */
var __CMD_INDEX__ = null;
function commandIndex() {
  if (__CMD_INDEX__) return __CMD_INDEX__;
  var idx = {};
  COMMANDS.forEach(function (c) {
    idx[c.cmd] = c;
    (c.alias || []).forEach(function (al) {
      idx[al] = c;
    });
  });
  __CMD_INDEX__ = idx;
  return idx;
}

function findCommand(name) {
  return commandIndex()[String(name || "").toLowerCase()] || null;
}

/* ----------------------------------------------------------------------------
 * 二、解析用户输入
 * --------------------------------------------------------------------------*/

var __PREFIXES__ = null;
function commandPrefixes() {
  if (!__PREFIXES__) __PREFIXES__ = cfg("command.prefixes", ["/"]);
  return __PREFIXES__;
}

/**
 * 从消息文本中解析指令。
 * ⭐ 相比原版的 indexOf 模糊匹配，这里要求消息**必须以指令前缀开头**，
 *    彻底消除"消息里含 /ban 就误触发"的问题。
 * @return {{cmd:string, args:string, raw:string}|null}
 */
function parseCommand(text) {
  var s = String(text || "").trim();
  if (!s) return null;

  var prefixes = commandPrefixes();
  var matched = null;
  for (var i = 0; i < prefixes.length; i++) {
    if (s.indexOf(prefixes[i]) === 0) {
      matched = prefixes[i];
      break;
    }
  }
  if (!matched) return null;

  var rest = s.slice(matched.length);
  if (!rest) return null;

  // 支持 /cmd@BotName 形式（群聊里 Telegram 会这样发）
  var m = rest.match(/^([A-Za-z_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/);
  if (!m) return null;

  var name = m[1].toLowerCase();
  if (!findCommand(name)) return null;

  return {
    cmd: name,
    args: (m[2] || "").trim(),
    raw: s,
  };
}

/* ----------------------------------------------------------------------------
 * 三、权限判定
 * --------------------------------------------------------------------------*/

/** 取群管理员 ID 列表（带 5 分钟缓存，避免每条消息都打 API） */
function getAdminIds(chatId) {
  if (!chatId || String(chatId).indexOf("-") === -1) return [];
  return cached("admins:" + chatId, 300, function () {
    var list = tgGetAdmins(chatId) || [];
    return list
      .filter(function (a) {
        // 匿名管理员（群组身份）没有 user.id，跳过
        return a && a.user && a.user.id;
      })
      .map(function (a) {
        return String(a.user.id);
      });
  });
}

function isChatAdmin(ctx) {
  if (!ctx.isGroup) return false;
  if (ctx.isKing) return true;
  return getAdminIds(ctx.chatId).indexOf(String(ctx.userId)) !== -1;
}

/** 检查权限，不通过时返回提示卡片（调用方 return 它即可） */
function checkLevel(ctx, level) {
  if (level === "owner") {
    if (!ctx.isKing) return uiNoPerm("Bot 主人");
    return null;
  }
  if (level === "admin") {
    if (!ctx.isGroup) {
      return ctx.isKing ? null : uiNoPerm("群管理员（该指令需在群聊内使用）");
    }
    if (!isChatAdmin(ctx)) return uiNoPerm("群管理员 / Bot 主人");
    return null;
  }
  return null;
}

/* ----------------------------------------------------------------------------
 * 四、指令分发
 * --------------------------------------------------------------------------*/

/**
 * 执行指令。
 * @return {string|{text,markup}|null|undefined}
 *   undefined 表示"这不是一条指令"，调用方应继续走关键字逻辑；
 *   null 表示"指令已处理，但机器人已经自己发过消息了"。
 */
function runCommand(ctx) {
  var parsed = parseCommand(ctx.text);
  if (!parsed) return undefined;

  var def = findCommand(parsed.cmd);
  if (!def) return undefined;

  ctx.command = parsed.cmd;
  ctx.args = parsed.args;
  // 该指令的回复是否走「群内仅本人可见」（由 deliverResult 消费）
  ctx.cmdEph = !!def.eph;
  ctx.cmdDesc = def.desc || "";

  // 冷却
  if (
    !(cfg("command.exemptAdmins", true) && isChatAdmin(ctx)) &&
    isRateLimited(ctx.userId, "cmd", cfg("command.rateLimitSeconds", 2))
  ) {
    // 原来这里是 return undefined（静默）—— 用户连发几条时，后面几条石沉大海，
    // 表现出来就是「指令没反应」。现在明确回一句，并告知要等多久。
    var wait = Math.max(1, Math.ceil(cfg("command.rateLimitSeconds", 2) || 2));
    return uiWarn("指令太快了", [
      "<i>同一账号 " + wait + " 秒内只处理一条指令，这是防刷屏的默认设置。</i>",
      "",
      "等 " + wait + " 秒再发一次；不确定指令长什么样就先发 " + uiCmd("/menu") + "。",
    ]);
  }

  var permError = checkLevel(ctx, def.level);
  if (permError) return permError;

  var started = Date.now();
  var result;
  try {
    result = def.handler(ctx, parsed.args);
  } catch (e) {
    logError("cmd:" + def.cmd, e, { chat: ctx.chatId, user: ctx.userId });
    return uiFail("指令执行出错", [
      "<i>" + esc(e.message || String(e)) + "</i>",
      "",
      "已记录到 error_log，可在表格中查看详情。",
    ]);
  }

  logInfo("cmd", def.cmd + " " + (Date.now() - started) + "ms");
  return result;
}

/* ----------------------------------------------------------------------------
 * 五、基础指令实现
 * --------------------------------------------------------------------------*/

function cmdStart(ctx) {
  if (ctx.isGroup) {
    return cmdMenu(ctx);
  }
  return [
    "<b>" + THEME.title + " " + esc(BRAND.name || "Bot") + " " + L("已就绪", "is ready") + "</b>",
    "",
    L("你好 <b>" + esc(ctx.userName) + "</b>，我是一个运行在 Telegram 上的多功能机器人。",
      "Hi <b>" + esc(ctx.userName) + "</b>, I'm a multi-purpose bot running on Telegram."),
    "",
    uiSection(L("快速上手", "Getting started"), "🚀"),
    uiItem(L("发送 " + uiCmd("/help") + " 查看全部功能",
      "Send " + uiCmd("/help") + " to see all features")),
    uiItem(L("发送 " + uiCmd("/menu") + " 打开交互面板",
      "Send " + uiCmd("/menu") + " to open the panel")),
    uiItem(L("直接发送关键字也能得到回复",
      "Just send a keyword and I may reply")),
    "",
    uiDiv(),
    "<i>" + L("你的 ID：" + uiMono(ctx.userId), "Your ID: " + uiMono(ctx.userId)) + "</i>",
  ].join("\n");
}

/** 帮助菜单可见指令（过滤掉 owner 专属） */
function helpVisibleCommands() {
  return COMMANDS.filter(function (c) {
    return c.level !== "owner";
  });
}

/** 帮助菜单的分类清单 */
function helpCategories() {
  var cats = [];
  helpVisibleCommands().forEach(function (c) {
    if (cats.indexOf(c.cat) === -1) cats.push(c.cat);
  });
  return cats;
}

/** 构造某分类下的帮助条目（每项可能占 2 行） */
function helpLines(cat) {
  return helpVisibleCommands()
    .filter(function (c) {
      return !cat || c.cat === cat;
    })
    .map(function (c) {
      var usage = cmdUsageI18n(c);
      return (
        uiItem("<b>" + esc(cmdDescI18n(c)) + "</b>\n   " + uiMono(usage)) +
        (c.alias && c.alias.length ? " <i>(" + esc(c.alias.join(", ")) + ")</i>" : "")
      );
    });
}

function helpTotalPages(cat) {
  return Math.max(1, Math.ceil(helpLines(cat).length / 8));
}

/** 帮助菜单正文 */
function buildHelpText(cat, page) {
  var lines = helpLines(cat);
  var pg = paginate(lines, page, 8);
  var cats = helpCategories();

  return uiCard({
    icon: "📖",
    title: cat ? catI18n(cat) + (L(" 类指令", " commands")) : L("全部功能", "All features"),
    subtitle:
      L("共 ", "Total ") + lines.length + L(" 项", " commands") +
      " · " + (pg.page + 1) + "/" + pg.totalPages + L(" 页", " pages") +
      (cat ? "" : L(" · 可点下方按钮切换分类", " · tap a button below to switch category")),
    body: pg.slice.length ? pg.slice : ["<i>" + L("该分类暂无指令", "No commands in this category") + "</i>"],
    footer: L("指令前缀支持 / 与 ! · 分类：", "Prefix / or ! · Categories: ") + cats.map(catI18n).join(" / "),
  });
}

function cmdHelp(ctx, args) {
  var cat = String(args || "").trim();
  // 允许用英文分类名查（先翻回中文内部名）
  if (cat) {
    var zhCat = null;
    Object.keys(I18N_CAT_EN).forEach(function (k) {
      if (I18N_CAT_EN[k] === cat) zhCat = k;
    });
    if (zhCat) cat = zhCat;
    else if (helpCategories().indexOf(cat) === -1) cat = "";
  }
  return { text: buildHelpText(cat, 0), markup: helpKeyboard(cat, 0) };
}

/** 帮助菜单键盘：分类切换 + 翻页 */
function helpKeyboard(cat, page) {
  var cats = helpCategories();
  var total = helpTotalPages(cat);
  var p = Math.max(0, Math.min(total - 1, Number(page) || 0));

  var rows = [];
  var row = [];
  cats.forEach(function (c) {
    var label = catI18n(c);
    row.push(btn(c === cat ? "· " + label + " ·" : label, ["hcat", c === cat ? "-" : c]));
    if (row.length === 3) {
      rows.push(row);
      row = [];
    }
  });
  if (row.length) rows.push(row);

  if (total > 1) {
    rows.push([
      p > 0 ? btn("◀️", ["hpage", cat || "-", p - 1]) : { text: "　", callback_data: cbPack("noop") },
      btn((p + 1) + "/" + total, ["noop"]),
      p < total - 1 ? btn("▶️", ["hpage", cat || "-", p + 1]) : { text: "　", callback_data: cbPack("noop") },
    ]);
  }
  if (cat) rows.push([btn(L("◀️ 返回全部", "◀️ Back to all"), ["hcat", "-"])]);
  return kb(rows);
}

function cmdMenu(ctx) {
  var body = [
    uiSection(L("我能做什么", "What I can do"), "🧭"),
    uiItem(L("查询：天气 / 热榜 / IP / 翻译 / AI 对话",
      "Lookup: weather / trends / IP / translate / AI chat")),
    uiItem(L("娱乐：一言 / 毒鸡汤 / 今日一签 / 骰子",
      "Fun: one-liners / chicken soup / fortune / dice")),
    uiItem(L("工具：计算器 / 短链 / 二维码 / 随机图片 / 时间戳",
      "Tools: calculator / short link / QR / random image / timestamp")),
    uiItem(L("群组：群信息 / 活跃统计 / 话痨榜 / 群规",
      "Group: info / stats / leaderboard / rules")),
    "",
    "<i>" + L("群管理员还可用管理指令与违规处理。",
      "Group admins also get admin commands & moderation.") + "</i>",
  ];

  var rows = [
    [btn(L("🔍 查询工具", "🔍 Lookup"), ["menu", "query"]), btn(L("🎮 娱乐互动", "🎮 Fun"), ["menu", "fun"])],
    [btn(L("🧰 实用工具", "🧰 Tools"), ["menu", "tool"]), btn(L("👥 群组功能", "👥 Group"), ["menu", "group"])],
  ];
  if (ctx.isGroup && isChatAdmin(ctx)) {
    rows.push([btn("🛡 群管理面板", ["panel", "main"])]);
  }
  rows.push([btn("📖 完整帮助", ["hcat", "-"])]);
  if (BRAND.channel) rows.push([btnUrl("📣 关注频道", BRAND.channel)]);

  return {
    text: uiCard({
      icon: "🎛",
      title: BRAND.name || "Bot" + " 功能面板",
      subtitle: ctx.isGroup ? esc(ctx.chatTitle || "") : "私聊模式",
      body: body,
    }),
    markup: kb(rows),
  };
}

function cmdId(ctx) {
  var body = [
    uiKV(L("你的用户 ID", "Your user ID"), ctx.userId, "👤"),
    uiKV(L("当前会话 ID", "Current chat ID"), ctx.chatId, "💬"),
    uiKV(L("会话类型", "Chat type"), ctx.chatType, "🏷"),
    uiKV(L("消息 ID", "Message ID"), ctx.messageId || "-", "✉️"),
  ];
  if (ctx.threadId) body.push(uiKV(L("话题 ID", "Thread ID"), ctx.threadId, "🧵"));
  if (ctx.isGroup && ctx.reply) {
    body.push("");
    body.push(uiSection(L("被回复者", "Replied user"), THEME.info));
    body.push(uiKV(L("用户 ID", "User ID"), get(ctx, "reply.from.id", "-"), "👤"));
    body.push(uiKV(L("昵称", "Name"), [get(ctx, "reply.from.first_name", ""), get(ctx, "reply.from.last_name", "")].join(""), "🏷"));
    body.push(uiKV(L("消息 ID", "Message ID"), get(ctx, "reply.message_id", "-"), "✉️"));
  }
  body.push("");
  body.push("<i>" + L("点击 ID 即可复制。群组 ID 以 - 开头（超级群通常以 -100 开头）。",
    "Tap an ID to copy. Group IDs start with - (supergroups usually with -100).") + "</i>");

  return uiCard({
    icon: "🆔",
    title: L("身份与会话信息", "Identity & chat info"),
    subtitle: ctx.userName,
    body: body.map(function (x) {
      return typeof x === "string" ? x.replace(/：<\/b>(\-?\d+)/, "：</b><code>$1</code>") : x;
    }),
  });
}

function cmdPing(ctx) {
  var t0 = Date.now();
  var me = tgGetMe();
  var tgMs = Date.now() - t0;

  var t1 = Date.now();
  readSheet(SHEET.storage);
  var dbMs = Date.now() - t1;

  return uiCard({
    status: "ok",
    title: L("Pong! 机器人存活", "Pong! Bot is alive"),
    body: [
      uiKV(L("Telegram API", "Telegram API"), tgMs + " ms", "⚡"),
      uiKV(L("数据库读取", "DB read"), dbMs + " ms", "🗄"),
      uiKV(L("机器人", "Bot"), me ? "@" + (me.username || me.first_name) : L("未连通 ❌", "unreachable ❌"), "🤖"),
      uiKV(L("运行环境", "Runtime"), "Google Apps Script", "☁️"),
    ],
    footer: nowStr(),
  });
}

/* ----------------------------------------------------------------------------
 * 六、工具类指令
 * --------------------------------------------------------------------------*/

function cmdCalc(ctx, args) {
  if (!args) return uiUsage("/calc", "/calc <表达式>", ["/calc (1+2)*3", "/calc 2^10"]);
  var r = safeCalc(args);
  if (!r.ok) return uiFail("计算失败", [esc(r.error)]);
  return uiCard({
    icon: "🧮",
    title: "计算结果",
    body: [uiMono(args + " = " + r.value)],
    footer: "支持 + - * / % ^ 与括号",
  });
}

function cmdQr(ctx, args) {
  if (!args) return uiUsage("/qr", "/qr <文本或链接>", ["/qr https://t.me"]);
  var ok = tgSendPhoto(ctx, qrUrl(args), "<b>" + THEME.title + " 二维码已生成</b>\n\n<code>" + esc(clip(args, 80)) + "</code>");
  if (!ok) return uiFail("二维码生成失败", ["请稍后再试。"]);
  return null; // 已经直接发出图片
}

function cmdImg(ctx, args) {
  var seed = args ? args + "-" + Date.now() : String(Date.now());
  var ok = tgSendPhoto(
    ctx,
    randomImageUrl(seed),
    "<b>" + THEME.title + " 随机图片</b>" + (args ? "\n<i>关键词：" + esc(args) + "</i>" : "")
  );
  if (!ok) return uiFail("图片获取失败", ["请稍后再试。"]);
  return null;
}

function cmdFileId(ctx) {
  if (!ctx.reply) {
    return uiUsage("/file", "/file（需回复一条媒体消息）", ["回复图片/视频/文件后发送 /file"]);
  }
  var c = detectContent(ctx.reply);
  if (!c.fileId) {
    return uiWarn("该消息没有可提取的文件", [
      "被回复的消息类型是 <b>" + esc(c.label) + "</b>，不包含文件 ID。",
    ]);
  }
  return uiCard({
    status: "ok",
    title: "文件 ID 提取成功",
    subtitle: "类型：" + c.label,
    body: [
      uiCode(c.fileId),
      "",
      "<i>该 ID 可填入关键字回复表的 GraphicMessage / VideoMessage 类型中使用。</i>",
    ],
  });
}

/* ----------------------------------------------------------------------------
 * 七、群组信息类
 * --------------------------------------------------------------------------*/

function cmdChatInfo(ctx) {
  if (!ctx.isGroup) {
    return uiWarn("该指令仅在群聊中可用", ["群组 ID 需要真实的群会话才能获取。"]);
  }
  return withTyping(ctx, "typing", function () {
    var chat = tgGetChat(ctx.chatId);
    var count = tgGetMemberCount(ctx.chatId);
    var admins = tgGetAdmins(ctx.chatId);
    var body = [];

    if (chat) {
      body.push(uiKV("群名称", chat.title || "-", "🏷"));
      body.push(uiKV("群组 ID", chat.id, "🆔"));
      if (chat.username) body.push(uiKV("公开链接", "https://t.me/" + chat.username, "🔗"));
      body.push(uiKV("群类型", chat.type, "📁"));
      if (chat.description) body.push(uiKV("简介", clip(chat.description, 90), "📝"));
      body.push(
        uiKV(
          "已设权限",
          [
            chat.permissions && chat.permissions.can_send_messages === false ? "全员禁言" : "正常发言",
            chat.slow_mode_delay ? "慢速模式 " + chat.slow_mode_delay + "s" : "",
            chat.has_protected_content ? "禁止转发" : "",
          ]
            .filter(Boolean)
            .join(" / ") || "默认",
          "⚙️"
        )
      );
    }
    if (count !== null) body.push(uiKV("成员数", String(count), "👥"));
    if (admins && admins.length) {
      body.push("");
      body.push(uiSection("管理员（" + admins.length + "）", "🛡"));
      admins.slice(0, 8).forEach(function (a) {
        var name = [get(a, "user.first_name", ""), get(a, "user.last_name", "")].join("");
        var title = a.custom_title ? " · " + a.custom_title : "";
        body.push(uiItem(esc(name || get(a, "user.username", "-")) + "<i>" + esc(title) + "</i>"));
      });
      if (admins.length > 8) body.push("<i>… 其余 " + (admins.length - 8) + " 位已省略</i>");
    }
    body.push("");
    body.push("<i>成员列表出于隐私考虑不提供。</i>");

    return uiCard({ icon: "🏛", title: "群组信息", body: body, footer: nowStr() });
  });
}

function cmdStat(ctx) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var today = countChatMessagesToday(ctx.chatId);
  var rank = chatterboxRank(ctx.chatId, 5);

  var body = [
    uiKV("群组", clip(ctx.chatTitle || "", 40), "🏷"),
    uiKV("今日总消息", String(today), "💬"),
    uiKV("活跃人数", String(rank.length), "👥"),
  ];
  if (rank.length) {
    body.push("");
    body.push(uiSection("今日 Top 5", "🏆"));
    var medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    rank.forEach(function (u, i) {
      body.push(medals[i] + " " + esc(clip(u.userName, 18)) + " · <b>" + u.total + "</b> 条");
    });
  }
  return uiCard({
    icon: "📊",
    title: "群活跃统计",
    subtitle: todayStr(),
    body: body,
    footer: uiSource("本地消息库"),
  });
}

/** 今日该会话消息总数（新增，原版只有每人维度） */
function countChatMessagesToday(chatId) {
  var data = readSheet(SHEET.storage);
  var total = 0;
  for (var i = data.length - 1; i >= 3; i--) {
    var row = data[i];
    if (!row[0]) continue;
    if (!isSameDay(row[0])) break;
    if (String(row[6]) === String(chatId)) total++;
  }
  return total;
}

function cmdTop(ctx) {
  if (!ctx.isGroup) return uiWarn("话痨排行榜仅在群聊中可用");
  var rank = chatterboxRank(ctx.chatId, 20);
  if (!rank.length) return uiEmpty("今日还没有人发言");
  var medals = ["🥇", "🥈", "🥉"];
  var body = rank.map(function (u, i) {
    var tag = i < 3 ? medals[i] : (i + 1 < 10 ? " " + (i + 1) + "." : i + 1 + ".");
    return tag + " " + esc(clip(u.userName, 18)) + " · <b>" + u.total + "</b> 条";
  });
  return uiCard({
    icon: "💬",
    title: "今日话痨榜",
    subtitle: (ctx.chatTitle || "") + " · " + todayStr(),
    body: body,
    footer: uiSource("本地消息库"),
  });
}

function cmdRules(ctx) {
  var rules = getChatSetting(ctx.chatId, "rules", "");
  if (!rules) {
    return uiWarn("本群尚未设置群规", [
      "管理员可发送 " + uiCmd("/settings") + " 或在表格的 <code>chat_settings</code> 表中配置。",
    ]);
  }
  return uiCard({ icon: "📜", title: "群规", body: [uiQuote(rules)] });
}

function cmdReport(ctx) {
  if (!ctx.isGroup) return uiWarn("举报功能仅在群聊中可用");
  if (!ctx.reply) return uiUsage("/report", "/report（回复要举报的消息）", ["回复违规消息后发送 /report"]);
  if (!KingId) return uiFail("未配置接收人", ["请先在 Params.gs 中填写 <code>KingId</code>。"]);

  var target = get(ctx.reply, "from", {});
  var text = readableContent(ctx.reply);

  var notice =
    "<b>🚨 收到一条举报</b>\n\n" +
    uiKV("群组", clip(ctx.chatTitle || "", 40)) +
    "\n" +
    uiKV("举报人", ctx.userName + " (" + ctx.userId + ")") +
    "\n" +
    uiKV("被举报人", (target.first_name || "") + (target.last_name || "") + " (" + (target.id || "-") + ")") +
    "\n" +
    uiKV("消息内容", clip(text, 200)) +
    "\n" +
    uiKV("时间", nowStr());

  tg("sendMessage", {
    chat_id: KingId,
    text: notice,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });

  // 把原消息转发给主人，便于取证
  if (ctx.reply.message_id) {
    tg("forwardMessage", {
      chat_id: KingId,
      from_chat_id: ctx.chatId,
      message_id: ctx.reply.message_id,
    }, { silent: true });
  }

  return uiOK("举报已提交", ["管理员会尽快处理，感谢你维护群内秩序。"]);
}

/* ----------------------------------------------------------------------------
 * 八、维护类指令
 * --------------------------------------------------------------------------*/

function cmdHealth(ctx) {
  var problems = [];
  var body = [];

  // 配置检查
  var confOk = !!EXECID && !!BOTID;
  body.push(uiKV(L("基础配置", "Config"), confOk ? L("正常", "OK") : L("缺失 EXECID / BOTID", "EXECID / BOTID missing"), confOk ? "✅" : "❌"));
  if (!confOk) problems.push(L("在 Params.gs 中补全 EXECID 与 BOTID", "Fill EXECID & BOTID in Params.gs"));

  body.push(uiKV("KingId", KingId ? L("已配置", "set") : L("未配置（私人推送不可用）", "unset (owner push off)"), KingId ? "✅" : "⚠️"));
  body.push(uiKV("botIdAlone", botIdAlone ? L("已配置", "set") : L("未配置（引用识别降级）", "unset (reply detection degraded)"), botIdAlone ? "✅" : "⚠️"));

  // 表格检查
  var ss = getSS();
  body.push(uiKV(L("数据表", "Spreadsheet"), ss ? L("可访问", "reachable") : L("不可访问", "unreachable"), ss ? "✅" : "❌"));
  if (!ss) problems.push(L("检查 EXECID 是否正确、脚本是否有该表格权限", "Check EXECID and spreadsheet access permission"));

  var missing = [];
  [SHEET.storage, SHEET.keywords, SHEET.authority, SHEET.sensitive, SHEET.chatSettings, SHEET.warns, SHEET.errors, SHEET.tasks, SHEET.channels].forEach(
    function (n) {
      if (!getSheetOrNull(n)) missing.push(n);
    }
  );
  body.push(
    uiKV(L("工作表", "Sheets"), missing.length ? L("缺少 " + missing.length + " 个", missing.length + " missing") : L("全部就绪", "all ready"), missing.length ? "⚠️" : "✅")
  );
  if (missing.length) problems.push(L("运行 initDatabase() 自动创建缺失工作表：", "Run initDatabase() to create missing sheets: ") + missing.join(", "));

  // 机器人连通
  var me = tgGetMe();
  body.push(uiKV(L("Bot 接口", "Bot API"), me ? "@" + me.username : L("不可达", "unreachable"), me ? "✅" : "❌"));
  if (!me) problems.push(L("Bot Token 无效或网络不通", "Bot Token invalid or network down"));

  // Webhook
  var wh = tgGetWebhookInfo();
  var whOk = wh && wh.url;
  body.push(uiKV(L("Webhook", "Webhook"), whOk ? clip(wh.url, 45) : L("未设置", "not set"), whOk ? "✅" : "❌"));
  if (!whOk) problems.push(L("运行 setupWebhook() 绑定 Web 应用地址", "Run setupWebhook() to bind the web app URL"));
  if (wh && wh.last_error_message) {
    body.push(uiKV(L("最近错误", "Last error"), clip(wh.last_error_message, 60), "⚠️"));
  }
  if (wh && wh.pending_update_count) {
    body.push(uiKV(L("积压更新", "Pending updates"), String(wh.pending_update_count), "⏳"));
  }

  /* ---- 部署可达性：Telegram 到底能不能拿到 200 ----
     302 = 部署的「谁可以访问」没设成「任何人」，这是「完全没反应」的头号原因 */
  try {
    var pd = deployProbeDiag();
    body.push(uiKV(L("部署可达性", "Deploy reachable"), clip(pd.probe.verdict, 60), pd.probe.ok ? "✅" : "❌"));
    if (!pd.probe.ok && pd.probe.fix) problems.push(pd.probe.fix);
    // ⭐ 匿名链路不可用时，别让人再跟权限下拉死磕 —— 直接指路轮询
    if (!pd.probe.ok && /302|401/.test(String(pd.probe.verdict))) {
      problems.push(L("Webhook 匿名调用被 GAS 重定向（", "Webhook anonymous call is redirected by GAS (") + clip(String(pd.probe.verdict), 40) + L("）：每次 push 新代码它都会重新失效。想稳定就运行 switchToPolling() 切轮询。",
        "): it breaks again on every code push. For stability run switchToPolling() to switch to polling."));
    }
    if (pd.lastError) {
      problems.push(L("Telegram 侧投递报错：", "Telegram delivery error: ") + clip(pd.lastError, 70) + L("（修好上面那条就会自动恢复）", " (auto-recovers once the above is fixed)"));
    }
    if (pd.pending) {
      problems.push(L("有 ", "") + pd.pending + L(" 条更新卡在队列，修好权限后会自动补投", " updates stuck in queue; they'll redeliver once permission is fixed"));
    }
  } catch (e) {
    body.push(uiKV(L("部署可达性", "Deploy reachable"), L("探测失败：", "probe failed: ") + clip(String(e.message || e), 40), "⚠️"));
  }

  // 触发器
  var triggers = ScriptApp.getProjectTriggers();
  var clockTriggers = triggers.filter(function (t) {
    return t.getHandlerFunction() === "runScheduler";
  });
  body.push(uiKV(L("调度器", "Scheduler"), clockTriggers.length ? L("已安装（", "installed (") + clockTriggers.length + L("）", ")") : L("未安装", "not installed"), clockTriggers.length ? "✅" : "⚠️"));
  if (!clockTriggers.length) problems.push(L("运行 installScheduler() 安装定时调度器", "Run installScheduler() to install the timer"));

  var pending = 0;
  try {
    pending = fetchDueTasks(500).length;
  } catch (e) {}
  body.push(uiKV(L("待处理任务", "Due tasks"), String(pending), "📋"));

  // ⚠️ Webhook 和轮询并存 = 同一批消息被拉两遍
  //    幂等虽然能挡住重复回复，但白搭两次 API 调用、还可能写重一行表。
  var polling = triggers.filter(function (t) {
    return t.getHandlerFunction() === "pollUpdates";
  });
  if (polling.length) {
    body.push(uiKV(L("轮询触发器", "Polling trigger"), L("存在 ", "exists: ") + polling.length + L(" 个", ""), "⚠️"));
    problems.push(L("同时开着 Webhook 和轮询，会重复拉同一批消息。要实时就跑 switchToWebhook() 停掉轮询。",
      "Webhook and polling are both on — messages get pulled twice. For real-time, run switchToWebhook() to stop polling."));
  } else {
    body.push(uiKV(L("轮询触发器", "Polling trigger"), L("无（采用 Webhook 实时模式）", "none (Webhook real-time mode)"), "✅"));
  }

  /* ---- 性能：「响应很慢」得有数据才看得见 ---- */
  var lastMs = Number(cacheStore().get("perf:last") || 0);
  var at = cacheStore().get("perf:at");
  body.push(
    uiKV(
      L("上次处理耗时", "Last handling time"),
      lastMs ? lastMs + " ms" + (at ? "（" + at + "）" : "") : L("暂无记录", "no record"),
      !lastMs ? "ℹ️" : lastMs > 5000 ? "⚠️" : "✅"
    )
  );
  if (lastMs > 5000) {
    problems.push(L("单条消息处理超过 5 秒。先关掉表格里用不到的功能（关键词/存储），再试一次 /health 看耗时是否降下来",
      "A message took over 5s. Disable unused sheet features (keywords/storage), then re-run /health to see if latency drops"));
  }

  // 关键表规模：表越大，每次读取越慢
  var sizes = [];
  [SHEET.keywords, SHEET.sensitive, SHEET.authority, SHEET.storage].forEach(function (n) {
    var s = getSheetOrNull(n);
    if (s) {
      try {
        sizes.push(n + " " + Math.max(0, s.getLastRow() - 1) + L(" 行", " rows"));
      } catch (e) {}
    }
  });
  if (sizes.length) body.push(uiKV(L("表规模", "Table size"), sizes.join(" · "), "ℹ️"));

  return uiCard({
    icon: "🩺",
    title: L("运行自检", "Self-check"),
    subtitle: problems.length
      ? L("发现 " + problems.length + " 个待处理项", problems.length + " issue(s) to fix")
      : L("一切正常", "All good"),
    body: body.concat(
      problems.length
        ? ["", uiSection(L("建议操作", "Suggested actions"), THEME.info)].concat(
            problems.map(function (p, i) {
              return uiItem(esc(p), i + 1);
            })
          )
        : []
    ),
    footer: nowStr(),
  });
}

function cmdWebhook(ctx, args) {
  var raw = String(args || "").trim();
  var sub = raw.split(/\s+/)[0].toLowerCase();
  var rest = raw.slice(sub.length).trim();

  if (sub === "bind" || sub === "set") return cmdWebhookBind(ctx, rest);
  if (sub === "unbind" || sub === "clear") return cmdWebhookUnbind(ctx);
  if (sub === "scan" || sub === "refresh") return cmdWebhookScan(ctx);
  if (sub === "help") return webhookUsage();

  return cmdWebhookStatus(ctx);
}

function webhookUsage() {
  return uiUsage("/webhook", "/webhook [bind <地址> | unbind | scan]", [
    "/webhook　查看绑定状态与地址对照",
    "/webhook bind <https://…/exec>　手工绑定，只做一次",
    "/webhook unbind　清掉手工绑定，回到自动解析",
    "/webhook scan　重新扫描部署列表（绕过缓存）",
    "",
    "<i>/exec 地址是永久固定的：同一个部署推多少新版本都不变，</i>",
    "<i>只有删除部署后重建才会变 —— 所以 bind 一次就够了。</i>",
  ]);
}

/** 手工绑定：把 /exec 地址存进脚本属性（热更新覆盖不到） */
function cmdWebhookBind(ctx, arg) {
  var url = String(arg || "").trim().replace(/^[<（(]+|[>）)]+$/g, "");

  if (!url) {
    return uiFail("要给我地址才能绑", [
      "用法：" + uiMono("/webhook bind https://script.google.com/macros/s/…/exec"),
      "",
      "<i>地址在「部署 → 管理部署」里能看到，必须 /exec 结尾。</i>",
    ]);
  }

  var bad = deployWebappUrlValidate(url);
  if (bad) {
    return uiFail("这个地址用不了", [
      esc(bad),
      "",
      "<i>你给我的：" + uiMono(clip(url, 80)) + "</i>",
      "<i>提示：/dev 结尾的是「测试部署」，只有你自己登录着 Google 才能访问。</i>",
    ]);
  }

  var wh = setupWebhook(url);
  if (!wh.ok) return uiFail("绑定失败", [esc(wh.error || "未知错误")]);

  var check = tgGetWebhookInfo();
  var live = String(get(check, "url", "") || "");

  return {
    rich: richCard({
      status: live === url ? "ok" : "warn",
      title: live === url ? "绑定成功" : "已保存但需要确认",
      subtitle: clip(url, 60),
      blocks: [
        blkKV("💾", "存放位置", "脚本属性（热更新冲不掉）"),
        blkKV("🔗", "Telegram 实际绑定", live || "（空）"),
        blkKV("🔎", "地址来源", deploySourceLabel(wh.source)),
        blkDiv(),
        blkP("现在私聊机器人发 " + inC("/ping") + " 试试。收不到就发 " + inC("/webhook scan") + " 重新扫描。"),
      ],
    }),
  };
}

function cmdWebhookUnbind(ctx) {
  deployWebappUrlSetManual("");
  deployWebappUrlForget();
  return uiOK("已清除手工绑定", [
    "下次会回到自动解析（部署列表 → 运行时自报）。",
    "",
    "<i>Telegram 侧的绑定没有动，机器人照常工作。</i>",
  ]);
}

function cmdWebhookScan(ctx) {
  deployWebappUrlForget();
  var r = deployWebappUrlResolve();

  if (!r.ok) {
    return uiFail("仍然没找到正式地址", [
      esc(r.error),
      "",
      "<i>最快的办法：直接用 /webhook bind <你的 /exec 地址> 手工绑一次。</i>",
    ]);
  }

  var wh = setupWebhook();
  return {
    rich: richCard({
      status: wh.ok ? "ok" : "warn",
      title: wh.ok ? "已重新绑定" : "找到了地址但绑定失败",
      subtitle: clip(r.url, 60),
      blocks: [
        blkKV("🔎", "地址来源", deploySourceLabel(r.source)),
        blkKV("🔗", "Telegram 绑定", get(tgGetWebhookInfo(), "url", "") || "（空）"),
        wh.dev ? blkKV("ℹ️", "顺带发现", "存在 /dev 测试地址，已忽略") : null,
      ],
    }),
  };
}

function cmdWebhookStatus(ctx) {
  var wh = tgGetWebhookInfo();
  if (!wh) return uiFail("无法获取 Webhook 信息", ["请检查 BOTID 是否正确。"]);

  var d = deployWebappDiag();
  var r = d.resolved;

  var blocks = [
    blkKV("🔗", "当前绑定", wh.url || "（未设置）"),
    blkKV("🎯", "正式地址", r.ok ? r.url : "（未能取到）"),
    blkKV("🔎", "地址来源", deploySourceLabel(r.source)),
    blkKV("⏳", "待处理更新", String(wh.pending_update_count || 0)),
    blkKV(
      "⚠️",
      "最近错误",
      wh.last_error_message ? clip(wh.last_error_message, 80) : "无"
    ),
    blkKV("🕐", "错误时间", wh.last_error_date ? formatDate(new Date(wh.last_error_date * 1000)) : "—"),
  ];

  /* 只在对不上的时候才提示，避免平时刷一堆无用警告 */
  if (d.boundIsDev) {
    blocks.push(blkDiv());
    blocks.push(
      blkQuote(
        "当前绑定的是 /dev 测试地址，Telegram 访问不了。用 /webhook bind <你的 /exec 地址> 换掉，或发 /webhook scan 自动重扫。"
      )
    );
  } else if (d.mismatch) {
    blocks.push(blkDiv());
    blocks.push(blkQuote("绑定的地址与当前部署不一致（多半是重建过部署）。发 /webhook scan 覆盖即可。"));
  } else if (!r.ok && r.scopeError) {
    blocks.push(blkDiv());
    blocks.push(
      blkQuote(
        "读不到部署列表（授权不足），所以没法自动找 /exec 地址。要么修授权，要么用 /webhook bind 手工绑一次，要么 switchToPolling() 不用地址。"
      )
    );
  } else if (!r.ok && !wh.url) {
    blocks.push(blkDiv());
    blocks.push(blkQuote("还没绑定。请先「部署 → 新建部署 → Web 应用（权限：任何人）」，再发 /webhook scan。"));
  }

  return {
    rich: richCard({
      // ⚠️ 这里刻意不传 icon：richCard 只在 icon 缺省时才用 status 推导图标，
      //    两个都传会让 status 变成摆设 —— 状态卡片最忌讳"看着一片绿其实是故障"。
      status: wh.url && !d.boundIsDev ? "ok" : "warn",
      title: "Webhook 状态",
      subtitle: wh.url ? "已绑定" : "未绑定",
      blocks: blocks,
      footer: "/webhook bind <地址> 手工绑一次即可，不必每次部署都改",
    }),
  };
}

function deploySourceLabel(src) {
  if (src === "manual") return "手工绑定（脚本属性，热更新冲不掉）";
  if (src === "config") return "Params.gs 手工配置";
  if (src === "cache") return "本地缓存（6 小时内有效）";
  if (src === "api") return "Apps Script 部署列表（自动）";
  if (src === "service") return "运行时自报（非 /dev）";
  return "未取到";
}

function cmdSyncMenu(ctx) {
  var r = syncCommandsToTelegram();
  return r.ok
    ? uiOK("命令菜单已同步", ["共注册 " + r.count + " 条指令，私聊机器人时点左下角按钮即可看到。"])
    : uiFail("同步失败", [esc(r.error || "未知错误")]);
}

function cmdReload(ctx) {
  cacheDrop([
    "keyParamsList",
    "authorityList",
    "sensitiveWords",
    "sensitiveWordsMap",
    "admins:" + ctx.chatId,
  ]);
  return uiOK("缓存已清空", [
    "下次读取将回源到表格，最新配置立即生效。",
    "",
    uiKV("时间", nowStr()),
  ]);
}

function cmdWordManage(ctx, args) {
  var parts = String(args || "").trim().split(/\s+/);
  var action = (parts[0] || "list").toLowerCase();
  var word = parts[1] || "";
  var type = (parts[2] || "sensitive").toLowerCase();

  if (action === "add") {
    if (!word) return uiUsage("/word add", "/word add <词> [ban|sensitive]", ["/word add 广告 sensitive"]);
    addSensitiveWord(word, type);
    cacheDrop(["sensitiveWords", "sensitiveWordsMap"]);
    return uiOK("已添加", [uiKV("类型", type === "ban" ? "绝杀词" : "敏感词"), uiKV("内容", word)]);
  }
  if (action === "del") {
    if (!word) return uiUsage("/word del", "/word del <词> [ban|sensitive]");
    var ok = removeSensitiveWord(word, type);
    cacheDrop(["sensitiveWords", "sensitiveWordsMap"]);
    return ok ? uiOK("已删除", [uiKV("内容", word)]) : uiFail("未找到该词");
  }
  if (action === "list") {
    var ban = getWordList("ban");
    var sen = getWordList("sensitive");
    return uiCard({
      icon: "🚫",
      title: "敏感词库",
      subtitle: "绝杀词 " + ban.length + " 条 · 敏感词 " + sen.length + " 条",
      body: [
        uiSection("绝杀词（触发即封禁）", "☠️"),
        uiCode(ban.slice(0, 30).join("  ") || "（空）"),
        "",
        uiSection("敏感词（触发即删除）", "⚠️"),
        uiCode(sen.slice(0, 30).join("  ") || "（空）"),
        sen.length > 30 ? "\n<i>… 仅展示前 30 条</i>" : "",
      ],
    });
  }
  return uiUsage("/word", "/word add|del|list [词] [ban|sensitive]");
}

function cmdBroadcast(ctx, args) {
  var text = String(args || "").trim();
  if (!text) return uiUsage("/broadcast", "/broadcast <消息内容>（支持 HTML）");

  var chats = knownChatIds();
  if (!chats.length) return uiFail("没有可广播的会话");
  if (chats.length > 200) chats = chats.slice(0, 200);

  var ok = 0;
  var fail = 0;
  chats.forEach(function (cid) {
    var r = tg(
      "sendMessage",
      {
        chat_id: cid,
        text: "<b>" + THEME.title + " 广播</b>\n\n" + text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      },
      { silent: true, retry: 0 }
    );
    if (r) ok++;
    else fail++;
  });

  return uiOK("广播完成", [
    uiKV("成功", String(ok), "✅"),
    uiKV("失败", String(fail), "❌"),
    uiKV("总计", String(chats.length), "📋"),
  ]);
}

/* ============================================================================
 * 关键词表自检 —— 「填了关键词却不回复」时用它定位
 * ==========================================================================*/

/**
 * /kw —— 把关键词表到底被解析成了什么样摊开给你看。
 *
 * 为什么需要它：关键词不回复有五种原因，而它们在聊天里看起来一模一样 ——
 *   ① 表不存在  ② 数据写在了第 1~3 行（被当标题吃掉）  ③ 关键字列写错位置
 *   ④ 标识块拼错（默认按 HTML 解析）  ⑤ 缓存没刷新
 * 这个指令一次把五种全排掉，省得来回猜。
 */
/**
 * /db —— 数据表体检
 *
 * 起因：曾经「db_telegram 表根本没建」和「机器人没反应」长得一模一样 ——
 * 消息进得来、指令回得来，唯独存不进表，日志里连一条错误都没有。
 * 这个指令把所有表的存亡一次报清，缺的直接 /db init 补出来。
 */
/**
 * /mode —— 查看 / 切换接入模式。
 *
 * 为什么要有这条指令：
 *   GAS 的匿名调用（Webhook 走的正是这条路）会因为「部署未授权」被 302 掉，
 *   而且**每次 push 新代码都会重新失效**。表现就是「机器人时灵时不灵」。
 *   轮询靠时间触发器，执行身份恒为「我」，一次切换长期稳定。
 *   以后再遇到「消息进不来」，直接 /mode polling 自救，不用去翻部署权限。
 */
function cmdMode(ctx) {
  var want = String((ctx.args || "").trim()).toLowerCase();

  if (want === "polling" || want === "poll") {
    return switchToPolling();
  }
  if (want === "webhook") {
    return switchToWebhook();
  }

  var diag = modeDiag();
  var wh = diag.webhook || {};
  var cur = diag.mode || "webhook";
  var label = cur === "polling"
    ? L("轮询（时间触发器驱动，稳定）", "Polling (time-triggered, stable)")
    : L("Webhook（实时，但受匿名授权影响）", "Webhook (real-time, but affected by anonymous auth)");

  var lines = [
    L("接入模式：", "Access mode: ") + label,
    "",
    L("模式        : ", "Mode        : ") + cur,
    L("触发器      : ", "Triggers    : ") + (diag.triggers.join(" · ") || L("无", "none")),
    L("Webhook     : ", "Webhook     : ") + (wh.url || L("(未绑定)", "(not set)")),
    L("Telegram 积压: ", "Pending     : ") + String(wh.pending_update_count || 0),
    L("最近投递    : ", "Last delivery: ") + (wh.last_error_message ? clip(wh.last_error_message, 56) : L("无报错", "no error")),
  ];

  if (cur === "webhook" && /302|401/.test(String(wh.last_error_message || ""))) {
    lines.push("", L("⚠️ Telegram 投递被 GAS 重定向了 —— 机器人会时灵时不灵。",
      "⚠️ Telegram delivery is redirected by GAS — the bot may work intermittently."),
      L("建议直接：/mode polling", "Recommend: /mode polling"));
  }

  lines.push("", L("切换：/mode polling（推荐）　｜　/mode webhook",
    "Switch: /mode polling (recommended)  |  /mode webhook"));
  return lines.join("\n");
}

function cmdDBDoctor(ctx) {
  var raw = String((ctx && ctx.text) || "").trim();
  var doInit = /init|fix|建/i.test(raw);

  var body = [];
  var need = [];

  if (doInit) {
    var r = initSheets();
    body.push(uiSection(r.ok ? "已补齐缺失的数据表" : "补表没全，缺的还是缺", r.ok ? THEME.ok : THEME.warn));
    body.push(uiKV("新建", r.created.length ? r.created.join("、") : "无（都已存在）", r.created.length ? "🆕" : "ℹ️"));
    body.push(uiKV("已有", r.existing.length + " 张", "✅"));
    if (r.failed && r.failed.length) {
      body.push(uiKV("失败", r.failed.join("、"), "❌"));
      body.push("原因通常是：EXECID 指向的 spreadsheet 打不开，或当前执行身份没有写权限。");
    }
    body.push("");
  }

  var ssOk = true;
  try {
    ssOk = !!getSS();
  } catch (e) {
    ssOk = false;
  }

  if (!ssOk) {
    body.push(uiSection("拿不到电子表格", THEME.warn));
    body.push("EXECID 填了吗？本项目所有表都在那一张 Google 表里。");
    body.push(uiCode("/webhook  /health  可查看配置"));
    return uiCard({ status: "fail", title: "数据表体检 —— 连表格都打不开", body: body });
  }

  for (var name of requiredSheets()) {
    var sh = getSheetOrNull(name);
    if (!sh) { need.push(name); continue; }
    var n = 0;
    try {
      var vals = sh.getDataRange().getValues();
      n = vals.length || 0;
    } catch (e) {
      n = -1;
    }
    body.push(uiKV(name, n === 0 ? "空表（只有表头，正常）" : n + " 行", n < 0 ? "⚠️" : "✅"));
  }

  body.push("");
  if (need.length) {
    body.push(uiSection("这些表缺了：" + need.join("、"), THEME.warn));
    body.push("运行 " + uiCode("/db init") + " 自动建出来（也能去 GAS 编辑器跑一次 " + uiCode("onBotInit()") + "）。");
  } else {
    body.push(uiSection("9 张表齐全 ✅", THEME.ok));
  }

  var dbRow = 0;
  var dbsh = getSheetOrNull(SHEET.storage);
  if (dbsh) {
    try {
      dbRow = dbsh.getDataRange().getValues().length;
    } catch (e) {}
  }
  if (dbRow <= 3) {
    body.push("");
    body.push(uiSection("db_telegram 目前还没有数据", THEME.warn));
    body.push("这是正常的 —— 它只在<b>非指令</b>消息进来时才写。");
    body.push("先发一条普通消息（比如「脚本合集」）再来看，或者发 " + uiCode("/ping") + " 自检。");
  }

  return uiCard({
    status: need.length ? "warn" : "ok",
    title: "数据表体检",
    body: body,
  });
}

function cmdKeywords(ctx) {
  var body = [];
  var sh = getSheetOrNull(SHEET.keywords);

  if (!sh) {
    return uiCard({
      status: "fail",
      title: "关键词表不存在",
      body: [
        "找不到工作表 " + uiCode(SHEET.keywords),
        "",
        "① 确认 EXECID 指向的是你填关键词的那张表",
        "② 在 GAS 编辑器里运行一次 " + uiCode("onBotInit()") + " 会自动建表",
        "",
        "本项目所有表都在这一张 Google 表格里，别建到别的文件去。",
      ],
    });
  }

  var raw = readSheet(SHEET.keywords);
  body.push(uiKV("工作表", SHEET.keywords, "✅"));
  body.push(uiKV("总行数", String(raw.length), "ℹ️"));
  body.push(uiKV("数据从哪行读", "第 4 行起（第 1~3 行是标题 / 表头 / 写法说明）", "ℹ️"));

  // 第 4 行开始有几行填了关键字
  var filled = 0;
  for (var i = 3; i < raw.length; i++) {
    if (String(raw[i] && raw[i][0] ? raw[i][0] : "").trim()) filled++;
  }
  body.push(uiKV("填了关键字的行", filled + " 行", filled ? "✅" : "❌"));

  var list = buildKeywords();
  body.push(uiKV("解析出规则", list.length + " 条", list.length ? "✅" : "❌"));

  if (!list.length) {
    body.push("");
    body.push(uiSection("解析出 0 条 —— 挨条对一下", THEME.warn));
    body.push("· 关键字必须写在第 1 列，且从 <b>第 4 行</b>开始（第 1~3 行被当标题吃掉）");
    body.push("· 多个关键字用<b>英文逗号</b>分隔，例如 " + uiCode("脚本合集, 脚本, 合集"));
    body.push("· 一个字的关键字要求<b>完全相等</b>才触发（防止「好」这种词到处误触）");
    body.push("· 改完表格要发 " + uiCode("/reload") + " 清缓存，否则最长要等 " + Math.round((cfg("cache.ttlSeconds", 10800) || 0) / 60) + " 分钟");
    return uiCard({ status: "warn", title: "关键词表自检", body: body, footer: nowStr() });
  }

  body.push("");
  body.push(uiSection("规则预览（前 8 条）", THEME.info));
  for (var k = 0; k < Math.min(8, list.length); k++) {
    var it = list[k];
    var kind = it.media && it.media.length ? "媒体 " + it.media.length + " 个" : "文本 " + it.blocks.length + " 块";
    body.push(uiItem(esc(clip(it.raw, 36)) + "  →  " + esc(it.mode || "HTML") + " · " + kind, k + 1));
  }
  if (list.length > 8) body.push("<i>…还有 " + (list.length - 8) + " 条</i>");

  body.push("");
  body.push(uiSection("群里怎么才会触发", THEME.info));
  body.push("· 私聊：直接发关键字即可");
  body.push("· 群聊：需要 @机器人，或消息里<b>只包含</b>这些关键字（防误触）");
  body.push("· 改完表格记得发 " + uiCode("/reload"));

  return uiCard({ status: "ok", title: "关键词表自检", body: body, footer: nowStr() });
}

/**
 * /king —— 私人推送开关。
 *
 * 为什么必须能远程关：`CONFIG.king.type = 1` 是「群里每条消息都推给主人」，
 * 一旦机器人进了活跃群，主人会被淹没在「捕捉到新消息」里。
 * 而这种「先关掉、回头再开」的需求，不该要求用户去改代码再 push 一遍。
 * 设置写进脚本属性，所以热更新、push 都冲不掉。
 */
function cmdKing(ctx, args) {
  var sub = String(args || "").trim().toLowerCase();

  if (sub) {
    if (sub === "off" || sub === "close" || sub === "0" || sub === "关闭") kingTypeSet(5);
    else if (sub === "private" || sub === "私聊") kingTypeSet(3);
    else if (sub === "group" || sub === "群聊") kingTypeSet(4);
    else if (sub === "on" || sub === "all" || sub === "1" || sub === "全部") kingTypeSet(1);
    else if (sub === "reset" || sub === "default" || sub === "恢复默认") kingTypeSet("reset");
    else {
      return uiUsage("/king", "/king [off|private|group|all|reset]", [
        "/king off",
        "/king private",
        "/king all",
        "/king reset",
      ]);
    }
  }

  var cur = kingTypeEffective();
  var fromProps = true;
  try {
    fromProps = PropertiesService.getScriptProperties().getProperty("mb_king_type") !== null;
  } catch (e) {}

  var body = [
    uiKV("私人推送", KING_TYPE_LABEL[cur] || String(cur), cur === 5 ? "🔕" : "🔔"),
    uiKV("设置位置", fromProps ? "脚本属性（push 冲不掉）" : "Params.gs 里的 CONFIG.king.type", "ℹ️"),
  ];

  if (cur === 5) {
    body.push("");
    body.push("已关闭：群里说话不再推给你，但机器人在群里照常工作（关键词、群管都正常）。");
  } else if (cur === 1) {
    body.push("");
    body.push(uiSection("太吵的话", THEME.warn));
    body.push("· " + uiCmd("/king private") + " 只推送私聊（推荐，最常用）");
    body.push("· " + uiCmd("/king off") + " 彻底关掉，群里彻底安静");
  } else {
    body.push("");
    body.push(uiCmd("/king all") + " 恢复成全部推送　" + uiCmd("/king off") + " 彻底关掉");
  }

  return uiCard({
    status: cur === 5 ? "warn" : "ok",
    title: "私人推送开关",
    body: body,
    footer: "改完立即生效，不用 push",
  });
}
