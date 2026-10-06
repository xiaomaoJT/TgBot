/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  I18n.gs — 中英文切换（轻量 i18n）
 * ---------------------------------------------------------------------------
 *  设计原则（与用户约定一致）：
 *    1. 不做【全局】语言自动识别；语言是「每聊独立」的 —— 私聊 / 群各自切换，
 *       互不影响，靠 /lang 指令设置。
 *    2. 不调用任何翻译接口：英文是代码里【预置的静态文案】，不是实时翻译。
 *    3. 用 L(zh, en) 内联助手取当前语言文案；未提供英文时自动回落中文。
 *
 *  当前语言怎么定的：
 *    handleUpdate 在每条消息进入时，按 chatId 从 chat_settings 读出该聊语言，
 *    写进请求级的 __CUR_LANG__。之后所有 L() 都读这个变量，无需处处传 ctx。
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 一、核心助手
 * --------------------------------------------------------------------------*/

/** 全局默认语言（常量，不读接口、不做自动识别） */
var DEFAULT_LANG = "zh";

/** 受支持的语言代码 */
var SUPPORTED_LANGS = ["zh", "en"];

/**
 * 请求级「当前语言」。handleUpdate 每条消息开始时写入，
 * 让 L() 在各处都能直接取，不用把 ctx 一路传下去。
 */
var __CUR_LANG__ = "zh";

function isLangCode(s) {
  return SUPPORTED_LANGS.indexOf(s) !== -1;
}

/** 设定本请求的当前语言（仅 zh / en 生效，其余回落默认） */
function setCurrentLang(lang) {
  __CUR_LANG__ = isLangCode(lang) ? lang : DEFAULT_LANG;
}

/** 读取本请求的当前语言 */
function currentLang() {
  return __CUR_LANG__;
}

/**
 * 读某聊语言：缓存 → chat_settings → 默认。
 * @param {object} ctx 含 chatId
 */
function getLang(ctx) {
  var chatId = ctx && ctx.chatId;
  if (chatId == null) return DEFAULT_LANG;
  chatId = String(chatId);

  // 1) 脚本缓存（跨请求）
  try {
    var c = cacheStore().get("lang:" + chatId);
    if (c === "zh" || c === "en") return c;
  } catch (e) {}

  // 2) chat_settings 持久化（与群设置同一张表）
  try {
    var s = getChatSetting(chatId, "lang", "");
    if (s === "zh" || s === "en") return s;
  } catch (e) {
    /* 表还没建好时回落默认 */
  }

  return DEFAULT_LANG;
}

/** 设置某聊语言（返回是否成功） */
function setLang(chatId, lang) {
  if (!isLangCode(lang)) return false;
  chatId = String(chatId);
  // 缓存（24h）+ 持久化（chat_settings）
  try {
    cacheStore().put("lang:" + chatId, lang, 60 * 60 * 24);
  } catch (e) {}
  try {
    setChatSetting(chatId, "lang", lang);
  } catch (e) {}
  return true;
}

/**
 * 内联翻译助手。
 * @param {string} zh 中文文案
 * @param {string} en 英文文案（可省略；省略 / 空时回落 zh）
 */
function L(zh, en) {
  if (__CUR_LANG__ === "en") return en != null && en !== "" ? en : zh;
  return zh;
}

/* ----------------------------------------------------------------------------
 * 二、指令英文表（desc / usage / examples）
 *    help / menu 渲染时按当前语言取这里的英文，缺字段回落中文原表。
 * --------------------------------------------------------------------------*/

var I18N_CMD_EN = {
  start:     { desc: "Start / show main menu" },
  help:      { desc: "Show full feature guide", usage: "/help [category]" },
  menu:      { desc: "Open the interactive panel" },
  id:        { desc: "Show various IDs (user / group / message)" },
  ping:      { desc: "Check bot liveness & response latency" },

  weather:   { desc: "Query city weather", usage: "/weather <city>", examples: ["/weather Beijing", "/weather Tokyo"] },
  hot:       { desc: "Trending boards across platforms", usage: "/hot <platform>", examples: ["/hot weibo", "/hot zhihu"] },
  ai:        { desc: "Chat with AI", usage: "/ai <question> | /ai clear to reset context" },
  ip:        { desc: "Lookup IP geolocation", usage: "/ip [IP]", examples: ["/ip", "/ip 8.8.8.8"] },
  phone:     { desc: "Detect mobile carrier by number", usage: "/phone <number>", examples: ["/phone 13800138000"] },

  hitokoto:  { desc: "Random one-liner" },
  dujitang:  { desc: "A bowl of poisonous chicken soup" },
  qinghua:   { desc: "Random cheesy pick-up line" },
  fortune:   { desc: "Draw today's fortune" },
  dice:      { desc: "Roll a dice" },
  coin:      { desc: "Flip a coin" },
  roll:      { desc: "Generate a random number", usage: "/roll [min-max]", examples: ["/roll", "/roll 1-6"] },

  calc:      { desc: "Evaluate a math expression", usage: "/calc <expression>", examples: ["/calc (1+2)*3^2"] },
  tr:        { desc: "Translate between Chinese & English", usage: "/tr <text>", examples: ["/tr hello world"] },
  short:     { desc: "Generate a short link", usage: "/short <url>", examples: ["/short https://github.com"] },
  qr:        { desc: "Turn text / URL into a QR image", usage: "/qr <content>", examples: ["/qr https://t.me"] },
  img:       { desc: "Random image", usage: "/img [keyword]" },
  t:         { desc: "Convert between timestamp and date", usage: "/t [timestamp|date]" },
  file:      { desc: "Get media file ID (reply to a media message)" },

  info:      { desc: "Show current group info" },
  stat:      { desc: "Today's group activity stats" },
  top:       { desc: "Chatterbox leaderboard" },
  rules:     { desc: "View group rules" },
  report:    { desc: "Report a violating message (reply to target)" },

  manage:    { desc: "Open group management panel" },
  ban:       { desc: "Ban a user (reply to a message)", usage: "/ban [duration] e.g. 30m/2h/3d, empty=permanent" },
  unban:     { desc: "Unban or unmute", usage: "/unban [userID] (omit if replying to a message)" },
  mute:      { desc: "Mute a user", usage: "/mute [duration] reply to a message" },
  kick:      { desc: "Kick from group (can rejoin)" },
  warn:      { desc: "Warn a user; 3 strikes auto-remove", usage: "/warn [reason] reply to a message" },
  warns:     { desc: "View a user's warning record" },
  resetwarn: { desc: "Clear a user's warning record" },
  pin:       { desc: "Pin a message / pin group rules", usage: "/pin [text] or reply to a message" },
  unpin:     { desc: "Unpin a message" },
  purge:     { desc: "Bulk-delete a user's messages in last 24h", usage: "/purge reply to the target user's message" },
  invite:    { desc: "Generate a group invite link", usage: "/invite [duration] [uses]" },
  settings:  { desc: "Group feature toggles / edit rules", usage: "/settings | /settings rules <rules text>" },
  broadcast: { desc: "Broadcast to all known chats (owner only)" },

  ch:        { desc: "Channel watch: history & keyword push", usage: "/ch [list|add|del|key|on|off|test|log]" },

  sum:       { desc: "Smart summary: long text / forwarded / webpage", usage: "/sum [text or URL] (empty = summarize replied message)" },
  ask:       { desc: "Ask about a specific message (reply required)", usage: "/ask <question> (reply first)" },
  code:      { desc: "Write / explain / debug code", usage: "/code <requirement> (reply error to debug)" },
  polish:    { desc: "Polish & rewrite, with style options", usage: "/polish [style] <text>  styles: formal/casual/brief/pro/english/email" },
  see:       { desc: "Look at an image: describe / OCR (reply to image)", usage: "/see [instruction] (reply an image)" },
  digest:    { desc: "Summarize recent group messages", usage: "/digest [count, default 100]" },
  todo:      { desc: "Extract to-dos from messages / chat", usage: "/todo (reply) or /todo <text>" },
  models:    { desc: "Show connected models & today's quota" },

  health:    { desc: "Self-check: config, webhook, tables, triggers" },
  webhook:   { desc: "View / set webhook status" },
  sync:      { desc: "Sync command menu to Telegram" },
  reload:    { desc: "Clear cache & reload config" },
  push:      { desc: "Hot-update: pull latest code from manifest", usage: "/push [check|status|apply]" },
  word:      { desc: "Manage sensitive words: /word add|del|list [word] [ban|sensitive]" },
  kw:        { desc: "Keyword table self-check" },
  db:        { desc: "Table health check (/db init to auto-create missing)", usage: "/db or /db init" },
  king:      { desc: "Private push toggle (mute when too noisy)", usage: "/king [off|private|group|all|reset]" },
  mode:      { desc: "View / switch access mode (polling or webhook)", usage: "/mode or /mode polling|webhook" },
  lang:      { desc: "Switch bot language (zh / en)", usage: "/lang [zh|en]" },
};

/** 取某指令的英文描述（回落中文原表） */
function cmdDescI18n(c) {
  if (__CUR_LANG__ === "en") {
    var en = I18N_CMD_EN[c.cmd];
    return en && en.desc ? en.desc : c.desc;
  }
  return c.desc;
}

/** 取某指令的英文用法（回落中文原表） */
function cmdUsageI18n(c) {
  if (__CUR_LANG__ === "en") {
    var en = I18N_CMD_EN[c.cmd];
    var u = en && en.usage ? en.usage : c.usage;
    return u || "/" + c.cmd;
  }
  return c.usage || "/" + c.cmd;
}

/* ----------------------------------------------------------------------------
 * 三、分类英文映射（help / menu 用）
 * --------------------------------------------------------------------------*/

var I18N_CAT_EN = {
  "基础": "Basics",
  "查询": "Lookup",
  "娱乐": "Fun",
  "工具": "Tools",
  "群组": "Group",
  "管理": "Admin",
  "维护": "Maintenance",
  "频道": "Channel",
  "AI":   "AI",
};

function catI18n(zh) {
  return (__CUR_LANG__ === "en" && I18N_CAT_EN[zh]) ? I18N_CAT_EN[zh] : zh;
}

/* ----------------------------------------------------------------------------
 * 四、/lang 指令处理器
 * --------------------------------------------------------------------------*/

/**
 * /lang          查看当前语言
 * /lang zh       切到中文
 * /lang en       切到英文
 * 群聊里只有管理员 / Bot 主人能改（避免被滥用）；私聊任何人都能改自己的。
 */
function cmdLang(ctx, args) {
  var want = String((args || "").trim()).toLowerCase();
  var chatId = ctx.chatId;

  // 仅查看
  if (!want) {
    var cur = getLang(ctx);
    var isEn = cur === "en";
    return uiCard({
      status: "info",
      title: L("语言设置", "Language"),
      body: [
        uiKV(L("当前语言", "Current language"), isEn ? "English 🇬🇧" : "中文 🇨🇳", "🌐"),
        "",
        uiItem(L("发送 /lang en 切到英文", "Send /lang en to switch to English")),
        uiItem(L("发送 /lang zh 切回中文", "Send /lang zh to switch back to Chinese")),
        "",
        "<i>" + L("语言按「聊」独立设置，私聊与各个群互不影响。",
                  "Language is set per chat — private chat and each group are independent.") + "</i>",
      ],
      footer: L("切换后本条之后的回复即生效", "Takes effect on replies after this message"),
    });
  }

  if (!isLangCode(want)) {
    return uiUsage("/lang", L("/lang [zh|en]", "/lang [zh|en]"),
      [L("/lang zh", "/lang zh"), L("/lang en", "/lang en")]);
  }

  // 群聊需管理员 / 主人
  if (ctx.isGroup) {
    var ok = cfg("command.exemptAdmins", true) && isChatAdmin(ctx);
    var isOwner = String(ctx.userId) === String(KingId);
    if (!ok && !isOwner) {
      return uiFail(L("权限不足", "Permission denied"),
        [L("群聊里只有管理员或 Bot 主人可以修改语言。",
           "In groups, only an admin or the bot owner can change the language.")]);
    }
  }

  setLang(chatId, want);
  setCurrentLang(want); // 让本条回复也立即用上新语言

  if (want === "en") {
    return uiCard({
      status: "ok",
      title: "Language set to English 🇬🇧",
      body: [
        uiItem("The bot will now reply in English in this chat."),
        uiItem("Send /lang zh to switch back to Chinese."),
      ],
      footer: nowStr(),
    });
  }
  return uiCard({
    status: "ok",
    title: "已切换为中文 🇨🇳",
    body: [
      uiItem("本聊的机器人回复将使用中文。"),
      uiItem("发送 /lang en 可切换为英文。"),
    ],
    footer: nowStr(),
  });
}
