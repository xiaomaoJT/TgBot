/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  UI.gs — 统一消息外观层
 * ----------------------------------------------------------------------------
 *  原版的回复是「一行行字符串硬拼接 + 到处 <b></b> + 手动 \n\n 排版」，
 *  导致三个问题：
 *    1. 样式不统一，同一类信息在不同指令下长得完全不一样；
 *    2. 动态内容未转义，含 < > & 时 Telegram 直接报 400，消息静默丢失；
 *    3. 超过 4096 字符直接发送失败，没有任何截断/分段处理。
 *
 *  本模块提供卡片式 DSL，把排版、转义、分段、按钮全收敛到一处。
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 一、基础零件
 * --------------------------------------------------------------------------*/

/** 分隔线 */
function uiDiv() {
  return (
    "<i>" + THEME.divider.repeat(THEME.dividerCount || 14) + "</i>"
  );
}

/** 标题行 */
function uiTitle(text, icon) {
  return "<b>" + (icon === undefined ? THEME.title : icon) + " " + esc(text) + "</b>";
}

/** 小标题 */
function uiSection(text, icon) {
  return "<b>" + (icon ? icon + " " : "") + esc(text) + "</b>";
}

/** 键值行：✅ 状态：正常 */
function uiKV(label, value, icon) {
  return (icon ? icon + " " : "") + "<b>" + esc(label) + "：</b>" + esc(value);
}

/** 列表项 */
function uiItem(text, index) {
  var prefix = index === undefined ? THEME.bullet : index + ".";
  return prefix + " " + text;
}

/** 引用块（Telegram 官方 blockquote） */
function uiQuote(text) {
  return "<blockquote>" + esc(text) + "</blockquote>";
}

/** 代码块 */
function uiCode(text, lang) {
  return (
    '<pre><code class="language-' +
    escAttr(lang || "text") +
    '">' +
    esc(text) +
    "</code></pre>"
  );
}

/** 行内代码 */
function uiMono(text) {
  return "<code>" + esc(text) + "</code>";
}

/** 可点击指令提示（用户点一下就能复制） */
function uiCmd(cmd) {
  return "<code>" + esc(cmd) + "</code>";
}

/* ----------------------------------------------------------------------------
 * 二、卡片组装
 * --------------------------------------------------------------------------*/

/**
 * 统一卡片。
 * @param {object} o
 *   icon     标题图标
 *   title    标题
 *   subtitle 副标题（小字）
 *   body     正文（已构造好的 HTML 数组或字符串）
 *   footer   页脚
 *   quote    引用块
 *   status   "ok" | "fail" | "warn" | "info" 会自动带图标
 */
function uiCard(o) {
  var opt = o || {};
  var parts = [];

  var icon = opt.icon;
  if (opt.status && icon === undefined) {
    icon = { ok: THEME.ok, fail: THEME.fail, warn: THEME.warn, info: THEME.info }[opt.status];
  }

  if (opt.title) parts.push(uiTitle(opt.title, icon));
  if (opt.subtitle) parts.push("<i>" + esc(opt.subtitle) + "</i>");

  if (opt.body) {
    var body = Array.isArray(opt.body) ? opt.body : [opt.body];
    body = body.filter(function (x) {
      return x !== null && x !== undefined && x !== "";
    });
    if (parts.length && body.length) parts.push("");
    parts = parts.concat(body);
  }

  if (opt.quote) {
    parts.push("");
    parts.push(uiQuote(opt.quote));
  }

  if (opt.footer) {
    parts.push("");
    parts.push(uiDiv());
    parts.push("<i>" + esc(opt.footer) + "</i>");
  }

  return parts.join("\n");
}

function uiOK(title, body, footer) {
  return uiCard({ status: "ok", title: title, body: body, footer: footer });
}

function uiFail(title, body, footer) {
  return uiCard({ status: "fail", title: title, body: body, footer: footer });
}

function uiWarn(title, body, footer) {
  return uiCard({ status: "warn", title: title, body: body, footer: footer });
}

function uiInfo(title, body, footer) {
  return uiCard({ status: "info", title: title, body: body, footer: footer });
}

/** 第三方接口结果的统一"出处"页脚 */
function uiSource(name) {
  return "数据来源：" + name + " · 已由 " + (BRAND.name || "Bot") + " 加工";
}

/* ----------------------------------------------------------------------------
 * 三、键盘构造
 * --------------------------------------------------------------------------*/

/** 内联按钮：回调型 */
function btn(text, data) {
  return { text: text, callback_data: cbPack(data) };
}

/** 内联按钮：链接型（url 为空时自动降级为提示按钮，避免 400） */
function btnUrl(text, url) {
  if (!url) return { text: text, callback_data: cbPack("noop") };
  return { text: text, url: url };
}

/** 内联按钮：打开小程序/网页应用 */
function btnWebApp(text, url) {
  return { text: text, web_app: { url: url } };
}

/** 组装内联键盘，顺带过滤掉空行 */
function kb(rows) {
  var clean = (rows || [])
    .map(function (r) {
      return (r || []).filter(Boolean);
    })
    .filter(function (r) {
      return r.length > 0;
    });
  return clean.length ? { inline_keyboard: clean } : undefined;
}

/**
 * 回调数据打包。
 * ⚠️ Telegram 硬限制 callback_data ≤ 64 字节，超了整条消息发送失败。
 *    这里统一用 "|" 分隔并做长度保护。
 *    支持传入数组（会被展开），便于 pagerRow 这类"前缀数组 + 参数"的写法。
 */
function cbPack() {
  var flat = [];
  Array.prototype.slice.call(arguments).forEach(function (x) {
    if (Array.isArray(x)) {
      x.forEach(function (y) {
        if (y !== undefined && y !== null && y !== "") flat.push(String(y));
      });
    } else if (x !== undefined && x !== null && x !== "") {
      flat.push(String(x));
    }
  });
  var s = flat.join("|");
  if (s.length > 64) {
    logError("cbPack", "callback_data 超长被截断: " + s);
    s = s.slice(0, 64);
  }
  return s;
}

/** 解析回调数据 */
function cbUnpack(data) {
  return String(data || "").split("|");
}

/** 分页按钮行 */
function pagerRow(prefix, page, totalPages) {
  if (totalPages <= 1) return [];
  return [
    page > 0 ? btn("◀️ 上一页", [prefix, "p", page - 1]) : { text: "　", callback_data: cbPack("noop") },
    btn(page + 1 + "/" + totalPages, ["noop"]),
    page < totalPages - 1
      ? btn("下一页 ▶️", [prefix, "p", page + 1])
      : { text: "　", callback_data: cbPack("noop") },
  ];
}

/** 分组跳页按钮（页数多时用） */
function pagerJumpRow(prefix, page, totalPages) {
  if (totalPages <= 5) return [];
  var out = [];
  var step = Math.max(1, Math.floor(totalPages / 5));
  for (var i = 0; i < totalPages; i += step) {
    out.push(
      i === page ? btn("· " + (i + 1) + " ·", [prefix, "p", i]) : btn(String(i + 1), [prefix, "p", i])
    );
  }
  return out.slice(0, 8);
}

/* ----------------------------------------------------------------------------
 * 四、发送封装（自动分段 / 自动删除 / 打字状态）
 * --------------------------------------------------------------------------*/

/**
 * 发送卡片消息。
 * 超过 4096 字符会自动切成多条发送，不会像原版那样直接丢消息。
 * @param {object} ctx
 * @param {string} text
 * @param {object} [extra] 额外的 sendMessage 参数（可含 reply_markup）
 */
function sendCard(ctx, text, extra) {
  var opt = extra || {};
  var chunks = splitText(text, 3800);
  var first = null;

  for (var i = 0; i < chunks.length; i++) {
    var isLast = i === chunks.length - 1;
    var payload = {
      chat_id: ctx.chatId,
      text: chunks[i],
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    };
    if (opt.reply_markup && isLast) payload.reply_markup = opt.reply_markup;
    if (opt.reply_parameters) payload.reply_parameters = opt.reply_parameters;
    if (opt.disable_notification) payload.disable_notification = true;
    if (ctx.threadId) payload.message_thread_id = ctx.threadId;

    var res = tg("sendMessage", payload);
    if (i === 0) first = res;
    if (!res && i > 0) break;
  }

  // 群聊里机器人刷屏很打扰，超过 2 段的自动安排延时清理
  if (opt.autoDelete && ctx.isGroup && first) {
    scheduleAutoDelete(ctx.chatId, first.message_id, opt.autoDelete);
  }
  return first;
}

/**
 * 发送并自动删除（群聊场景的"阅后即焚"）。
 *
 * ⭐ 现改为「临时消息优先」：
 *    Bot API 10.2 起官方支持群内仅指定用户可见的消息，别人**根本看不到**，
 *    因此不再需要"先发出来再定时删掉"这套事后补救。
 *    不可用时自动降级为原来的「发送后 N 秒删除」方案。
 *
 * @param {object} ctx
 * @param {string} text
 * @param {number} [seconds] 降级方案下的删除延迟
 * @param {object} [extra] { reply_markup, toUserId, callbackQueryId, forcePublic }
 */
function sendEphemeral(ctx, text, seconds, extra) {
  var opt = extra || {};

  // 私聊里不需要"临时"，直接发即可
  if (!ctx.isGroup) return sendCard(ctx, text, { reply_markup: opt.reply_markup });

  // ① 优先走官方临时消息
  if (cfg("ui.ephemeral", true) && !opt.forcePublic && tgCapOk("ephemeral")) {
    var eph = tgSendEphemeral(ctx, text, opt.toUserId || ctx.userId, {
      callbackQueryId: opt.callbackQueryId,
      reply_markup: opt.reply_markup,
    });
    if (eph) return eph;
  }

  // ② 降级：公开发送 + 定时删除
  if (!cfg("ui.ephemeralFallback", true) && !opt.forcePublic) return null;
  var res = sendCard(ctx, text, { reply_markup: opt.reply_markup });
  if (res && ctx.isGroup) {
    scheduleAutoDelete(ctx.chatId, res.message_id, seconds || cfg("autoDelete.delaySeconds", 60));
  }
  return res;
}

/** 把某条消息加入延时删除队列 */
function scheduleAutoDelete(chatId, messageId, seconds) {
  if (!cfg("autoDelete.enabled", true)) return;
  if (cfg("autoDelete.groupsOnly", true) && String(chatId).indexOf("-") === -1) return;
  enqueueTask(
    "deleteMessage",
    { chat_id: String(chatId), message_id: String(messageId) },
    unixNow() + (seconds || cfg("autoDelete.delaySeconds", 60))
  );
}

/**
 * 带"正在输入"提示的耗时操作包装。
 * 官方 sendChatAction 只能维持约 5 秒，这里在操作前后各打一次，
 * 让用户明确知道机器人在干活（原版完全没有这个反馈）。
 */
function withTyping(ctx, action, fn) {
  try {
    tgSendChatAction(ctx.chatId, action || "typing");
  } catch (e) {}
  var started = Date.now();
  var result = fn();
  var elapsed = Date.now() - started;
  if (elapsed > 2500) {
    try {
      tgSendChatAction(ctx.chatId, action || "typing");
    } catch (e) {}
  }
  return result;
}

/* ----------------------------------------------------------------------------
 * 五、语义化模板
 * --------------------------------------------------------------------------*/

/** 参数缺失 / 用法错误 */
function uiUsage(cmd, usage, examples) {
  var body = [uiKV(L("用法", "Usage"), usage)];
  if (examples && examples.length) {
    body.push("");
    body.push(uiSection(L("示例", "Examples"), THEME.info));
    examples.forEach(function (e) {
      body.push(uiMono(e));
    });
  }
  return uiCard({
    status: "warn",
    title: L("参数不正确", "Invalid arguments"),
    subtitle: cmd,
    body: body,
  });
}

/** 权限不足 */
function uiNoPerm(need) {
  return uiCard({
    status: "fail",
    title: L("权限不足", "Permission denied"),
    body: [
      uiKV("所需权限", need || "群管理员 / Bot 主人"),
      "",
      "<i>请由群管理员或 Bot 主人执行该操作。</i>",
    ],
  });
}

/** 操作成功回执 */
function uiAction(ok, text) {
  return uiCard({
    status: ok ? "ok" : "fail",
    title: text,
    body: ok ? ["<i>操作已生效。</i>"] : [],
  });
}

/** 空结果 */
function uiEmpty(text) {
  return uiCard({ status: "info", title: text || "暂无数据", body: [] });
}

/** 带进度的加载提示（用于分步展开的交互） */
function uiProgress(label, percent) {
  return uiCard({
    icon: THEME.loading,
    title: label,
    body: [uiMono(bar(percent))],
  });
}

/** 简单的两列表格（等宽对齐靠 pre 块实现） */
function uiTable(headers, rows) {
  var widths = headers.map(function (h, i) {
    var w = String(h).length;
    rows.forEach(function (r) {
      w = Math.max(w, String(r[i] === undefined ? "" : r[i]).length);
    });
    return w;
  });
  function line(cells) {
    return cells
      .map(function (c, i) {
        var s = String(c === undefined ? "" : c);
        return s + " ".repeat(Math.max(0, widths[i] - s.length));
      })
      .join("  ");
  }
  var out = [line(headers), widths.map(function (w) { return "-".repeat(w); }).join("--")];
  rows.forEach(function (r) {
    out.push(line(r));
  });
  return uiCode(out.join("\n"), "text");
}

/** 结果列表 + 分页（返回 {text, markup}） */
function uiPagedList(title, items, page, perPage, prefix) {
  var pg = paginate(items, page, perPage || 10);
  var body = [];
  if (!pg.total) {
    body.push("<i>暂无数据</i>");
  } else {
    pg.slice.forEach(function (it, i) {
      body.push((pg.page * (perPage || 10) + i + 1) + ". " + it);
    });
  }
  var rows = [pagerRow(prefix, pg.page, pg.totalPages), pagerJumpRow(prefix, pg.page, pg.totalPages)];
  if (prefix) {
    rows.push([btn("🔄 刷新", [prefix, "p", pg.page])]);
  }
  var text = uiCard({
    title: title,
    subtitle: pg.total ? "共 " + pg.total + " 条 · 第 " + (pg.page + 1) + "/" + pg.totalPages + " 页" : "",
    body: body,
  });
  return { text: text, markup: kb(rows) };
}

/* ============================================================================
 * 六、富消息层（Bot API 10.1+ Rich Messages）
 * ============================================================================
 *  核心设计：**不写 Markdown 解析器**。
 *
 *  富消息要 GFM Markdown，老账号只认 HTML。如果先拼 Markdown、失败时再反向
 *  解析回 HTML，必然有保真度损失（表格最容易崩），而且解析器本身就是新的
 *  故障点。这里改用「结构化块 + 行内片段」作为唯一数据源，一次生成两份产物：
 *
 *      richCard({...}) → { md: "...", html: "..." }
 *
 *  md 交给 sendRichMessage，html 交给降级路径 sendMessage。
 *  两边由同一份源数据渲染，永远不会出现"富消息好看、降级版难看"的割裂。
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 * 6.1 GFM 转义
 * ----------------------------------------------------------------------------
 *  ⚠️ 与 MarkdownV2 的区别：GFM 只有极少数几个字符需要转义，
 *     不再需要 `escMd()` 那套 18 字符地狱。这里只处理真正会影响结构的字符。
 * --------------------------------------------------------------------------*/

function mdEsc(input) {
  if (input === null || input === undefined) return "";
  var s = String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // 行内始终有语义的字符（| 只影响表格，留到表格单元格里单独处理）
    .replace(/([\\`*_\[\]])/g, "\\$1");
  // 行首的块级标记必须转义，否则普通文本会被解析成标题 / 列表 / 引用
  return s.replace(/^([ \t]*)(#{1,6}|[>+-]|\d+\.)(\s)/gm, "$1\\$2$3");
}

/** 只允许 http(s) / tg 协议，顺带去掉会截断 Markdown 链接的字符 */
function safeUrl(url) {
  var u = String(url === null || url === undefined ? "" : url).trim();
  if (!/^(https?:\/\/|tg:\/\/)/i.test(u)) return "";
  return u.replace(/[\s)]/g, "");
}

/* ----------------------------------------------------------------------------
 * 6.2 行内片段
 * ----------------------------------------------------------------------------
 *  一个片段就是一小段带格式的文字。字符串会被自动当成纯文本处理。
 * --------------------------------------------------------------------------*/

function inT(v) { return { k: "t", v: v }; }            // 纯文本（自动转义）
function inB(v) { return { k: "b", v: v }; }            // 加粗
function inC(v) { return { k: "c", v: v }; }            // 行内代码
function inA(v, url) { return { k: "a", v: v, url: url }; } // 链接

function segOf(x) {
  if (x === null || x === undefined) return inT("");
  if (typeof x === "object" && x.k) return x;
  return inT(x);
}

/** 片段 → Markdown（传入数组则按顺序拼接，方便一行里混排多种格式） */
function inMd(x) {
  if (Array.isArray(x)) return x.map(inMd).join("");
  var s = segOf(x);
  if (s.k === "b") return "**" + mdEsc(s.v) + "**";
  if (s.k === "c") return "`" + String(s.v == null ? "" : s.v).replace(/[`\n]/g, " ") + "`";
  if (s.k === "a") {
    var u = safeUrl(s.url);
    return u ? "[" + mdEsc(s.v) + "](" + u + ")" : mdEsc(s.v);
  }
  return mdEsc(s.v);
}

/** 片段 → HTML（降级路径） */
function inHtml(x) {
  if (Array.isArray(x)) return x.map(inHtml).join("");
  var s = segOf(x);
  if (s.k === "b") return "<b>" + esc(s.v) + "</b>";
  if (s.k === "c") return "<code>" + esc(s.v) + "</code>";
  if (s.k === "a") return safeUrl(s.url) ? aLink(safeUrl(s.url), s.v) : esc(s.v);
  return esc(s.v);
}

/** 片段 → 纯文本（给 <pre> 等宽表格用） */
function inPlain(x) {
  if (Array.isArray(x)) return x.map(inPlain).join("");
  var s = segOf(x);
  return String(s.v === null || s.v === undefined ? "" : s.v);
}

/* ----------------------------------------------------------------------------
 * 6.3 块级构造
 * --------------------------------------------------------------------------*/

function blkP(text) { return { k: "p", v: text }; }
function blkKV(icon, label, value) { return { k: "kv", icon: icon, label: label, value: value }; }
function blkUL(items) { return { k: "ul", items: items || [] }; }
function blkOL(items) { return { k: "ol", items: items || [] }; }
function blkTable(headers, rows, aligns) {
  return { k: "table", headers: headers || [], rows: rows || [], aligns: aligns || [] };
}
function blkQuote(text) { return { k: "q", v: text }; }
function blkDiv() { return { k: "div" }; }
function blkCode(text, lang) { return { k: "code", v: text, lang: lang || "text" }; }

/** 需要与上下文之间留空行的块（kv 是紧凑行，不留空行） */
function isLooseBlock(b) {
  if (typeof b === "string") return true;
  if (!b) return false;
  return b.k !== "kv";
}

/* ----------------------------------------------------------------------------
 * 6.4 表格渲染
 * --------------------------------------------------------------------------*/

/** 单元格 → Markdown（| 在这里才需要转义） */
function cellMd(x) {
  var s = (x && typeof x === "object" && x.k) ? inMd(x) : mdEsc(x);
  return " " + s.replace(/\n/g, " ").replace(/\|/g, "\\|") + " ";
}

/** GFM 表格。对齐：l 左 / r 右 / c 居中，默认第一列左、其余居中 */
function tableMd(headers, rows, aligns) {
  if (!headers || !headers.length) return "";
  var al = aligns || [];
  function alignOf(i) {
    var a = al[i] || (i === 0 ? "l" : "c");
    if (a === "r" || a === "right") return "---:";
    if (a === "c" || a === "center") return ":---:";
    return ":---";
  }
  var out = [
    "|" + headers.map(cellMd).join("|") + "|",
    "|" + headers.map(function (_, i) { return alignOf(i); }).join("|") + "|",
  ];
  (rows || []).forEach(function (r) {
    var cells = [];
    for (var i = 0; i < headers.length; i++) cells.push(cellMd(r ? r[i] : ""));
    out.push("|" + cells.join("|") + "|");
  });
  return out.join("\n");
}

/** 表格的 HTML 降级：复用等宽 <pre> 方案（就是升级前的观感） */
function tableHtml(b) {
  var headers = (b.headers || []).map(inPlain);
  if (!headers.length) return "";
  var rows = (b.rows || []).map(function (r) {
    var out = [];
    for (var i = 0; i < headers.length; i++) out.push(inPlain(r ? r[i] : ""));
    return out;
  });
  return uiTable(headers, rows);
}

/* ----------------------------------------------------------------------------
 * 6.5 块级渲染
 * --------------------------------------------------------------------------*/

function blockMd(b) {
  if (typeof b === "string") return mdEsc(b);
  if (!b) return "";
  switch (b.k) {
    case "p":
      return inMd(b.v);
    case "kv":
      return (b.icon ? b.icon + " " : "") + "**" + mdEsc(b.label) + "：**" + inMd(b.value);
    case "ul":
      return b.items.map(function (x) { return "- " + inMd(x); }).join("\n");
    case "ol":
      return b.items.map(function (x, i) { return (i + 1) + ". " + inMd(x); }).join("\n");
    case "table":
      return tableMd(b.headers, b.rows, b.aligns);
    case "q":
      return "> " + inMd(b.v).replace(/\n/g, "\n> ");
    case "div":
      return "---";
    case "code":
      return "```" + (b.lang || "text") + "\n" + String(b.v == null ? "" : b.v) + "\n```";
    default:
      return "";
  }
}

function blockHtml(b) {
  if (typeof b === "string") return esc(b);
  if (!b) return "";
  switch (b.k) {
    case "p":
      return inHtml(b.v);
    case "kv":
      return (b.icon ? b.icon + " " : "") + "<b>" + esc(b.label) + "：</b>" + inHtml(b.value);
    case "ul":
      return b.items.map(function (x) { return THEME.bullet + " " + inHtml(x); }).join("\n");
    case "ol":
      return b.items.map(function (x, i) { return (i + 1) + ". " + inHtml(x); }).join("\n");
    case "table":
      return tableHtml(b);
    case "q":
      return uiQuote(inPlain(b.v));
    case "div":
      return uiDiv();
    case "code":
      return uiCode(String(b.v == null ? "" : b.v), b.lang);
    default:
      return "";
  }
}

/* ----------------------------------------------------------------------------
 * 6.6 卡片组装
 * --------------------------------------------------------------------------*/

function normalizeBlocks(input) {
  var arr = Array.isArray(input) ? input : (input ? [input] : []);
  return arr.filter(function (b) {
    return b !== null && b !== undefined && b !== "";
  });
}

/**
 * 生成一份「双产物」卡片。
 * @param {object} o
 *   status   ok|fail|warn|info —— 自动配图标
 *   icon     自定义图标（优先于 status）
 *   title    标题（渲染为 ## 二级标题）
 *   subtitle 副标题（斜体小字）
 *   blocks   块数组（见 blk* 构造器；也可直接写字符串 = 一个段落）
 *   body     blocks 的别名（兼容旧写法）
 *   quote    引用块
 *   footer   页脚
 * @return {{md:string, html:string}}
 */
function richCard(o) {
  var opt = o || {};
  var icon = opt.icon;
  if (opt.status && icon === undefined) {
    icon = { ok: THEME.ok, fail: THEME.fail, warn: THEME.warn, info: THEME.info }[opt.status];
  }

  var blocks = normalizeBlocks(
    opt.blocks !== undefined ? opt.blocks : opt.body
  );

  /* ---- Markdown 版 ---- */
  var md = [];
  if (opt.title) md.push("## " + (icon ? icon + " " : "") + mdEsc(opt.title));
  if (opt.subtitle) md.push("_" + mdEsc(opt.subtitle) + "_");

  var prev = null;
  blocks.forEach(function (b) {
    var s = blockMd(b);
    if (s === "") return;
    if (md.length && (isLooseBlock(prev) || isLooseBlock(b))) md.push("");
    md.push(s);
    prev = b;
  });

  if (opt.quote) {
    md.push("");
    md.push("> " + mdEsc(opt.quote).replace(/\n/g, "\n> "));
  }
  if (opt.footer) {
    md.push("");
    md.push("---");
    md.push("_" + mdEsc(opt.footer) + "_");
  }

  /* ---- HTML 版（降级路径）---- */
  var html = uiCard({
    icon: icon,
    title: opt.title,
    subtitle: opt.subtitle,
    body: blocks.map(blockHtml).filter(function (x) { return x !== ""; }),
    quote: opt.quote,
    footer: opt.footer,
  });

  return { md: md.join("\n"), html: html };
}

/* ----------------------------------------------------------------------------
 * 6.7 发送封装（含自动降级）
 * --------------------------------------------------------------------------*/

/**
 * 发送双产物卡片：优先富消息，失败自动降级为 HTML。
 * @return {object|null} Telegram Message 对象
 */
function sendRichResult(ctx, r, extra) {
  if (!r) return null;
  var opt = extra || {};
  if (cfg("ui.rich", true) && tgCapOk("rich")) {
    var res = tgSendRich(ctx, r.md, opt);
    if (res) return res;
  }
  if (cfg("ui.richFallback", true)) return sendCard(ctx, r.html, opt);
  return null;
}

/** 只把正文部分发出去（不要标题/页脚），用于拼在提示语后面 */
function sendRichBody(ctx, blocks, extra) {
  return sendRichResult(ctx, richCard({ blocks: blocks }), extra);
}

/**
 * 群内"仅本人可见"的富消息。
 * 依次尝试：富+临时 → HTML+临时 → 公开发送+定时删除。
 *
 * ⚠️ 第 3 条路径是必需的兜底：官方要求非回调场景下机器人必须是群管理员，
 *    而很多群并不会给机器人管理员权限。
 */
function sendEphemeralRich(ctx, r, seconds, extra) {
  if (!r) return null;
  var opt = extra || {};

  // 私聊：不需要临时消息
  if (!ctx.isGroup) return sendRichResult(ctx, r, { reply_markup: opt.reply_markup });

  var canEph = cfg("ui.ephemeral", true) && !opt.forcePublic && tgCapOk("ephemeral");

  if (canEph) {
    // ① 富消息 + 临时
    if (cfg("ui.rich", true) && tgCapOk("rich")) {
      var ephParams = opt.callbackQueryId
        ? { callback_query_id: String(opt.callbackQueryId) }
        : { receiver_user_id: Number(opt.toUserId || ctx.userId) };
      var e1 = tgSendRich(ctx, r.md, {
        ephemeral_message_parameters: ephParams,
        reply_markup: opt.reply_markup,
      });
      if (e1) return e1;
    }
    // ② HTML + 临时
    var e2 = tgSendEphemeral(ctx, r.html, 0, {
      toUserId: opt.toUserId,
      callbackQueryId: opt.callbackQueryId,
      reply_markup: opt.reply_markup,
    });
    if (e2) return e2;
  }

  // ③ 兜底：公开发送 + 定时删除
  var pub = sendRichResult(ctx, r, { reply_markup: opt.reply_markup });
  if (pub && cfg("ui.ephemeralFallback", true) && ctx.isGroup) {
    scheduleAutoDelete(ctx.chatId, pub.message_id, seconds || cfg("autoDelete.delaySeconds", 60));
  }
  return pub;
}

/** 用富消息原地编辑（翻页）；失败时退化为 HTML 编辑 */
function editRichResult(chatId, messageId, r, markup) {
  if (!r) return null;
  if (cfg("ui.rich", true) && tgCapOk("rich")) {
    var res = tgEditRich(chatId, messageId, r.md, markup ? { reply_markup: markup } : undefined);
    if (res) return res;
  }
  return tgEditText(chatId, messageId, r.html, markup ? { reply_markup: markup } : undefined);
}

