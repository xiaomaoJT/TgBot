/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Utils.gs — 通用工具函数（无副作用，可放心复用）
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 一、文本与转义
 * --------------------------------------------------------------------------*/

/**
 * HTML 转义。
 * ⭐ 关键修复：原版把第三方接口返回的文本直接拼进 HTML 消息，
 *    一旦内容里出现 < > & 就会导致 Telegram 返回 400 "can't parse entities"，
 *    整条回复静默丢失。所有动态内容现在都必须先过这里。
 */
function esc(input) {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 仅转义属性值里的引号场景（用于 href="..."） */
function escAttr(input) {
  return esc(input).replace(/"/g, "&quot;");
}

/** 构造安全的外链标签（链接与文字都做了转义） */
function aLink(url, text) {
  if (!url) return esc(text);
  return '<a href="' + escAttr(url) + '">' + esc(text) + "</a>";
}

/** 构造行内代码块 */
function aCode(text) {
  return "<code>" + esc(text) + "</code>";
}

/**
 * MarkdownV2 转义。
 * Telegram MarkdownV2 要求转义 18 个特殊字符，漏一个就整条消息发送失败。
 */
function escMd(input) {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * 把 HTML 片段降级为 MarkdownV2 纯文本。
 * 原版是粗暴地把标签替换成 *，遇到 <a href> 会产出垃圾字符。
 */
function htmlToMd(input) {
  if (!input) return "";
  var text = String(input)
    .replace(/<a\s+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<(b|strong)>/gi, "*")
    .replace(/<\/(b|strong)>/gi, "*")
    .replace(/<(i|em)>/gi, "_")
    .replace(/<\/(i|em)>/gi, "_")
    .replace(/<(code|pre)>/gi, "`")
    .replace(/<\/(code|pre)>/gi, "`")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return escMd(text);
}

/** 按显示宽度截断（中文算 2 宽），末尾补省略号 */
function clip(text, max) {
  if (!text) return "";
  var s = String(text).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/** 把长文本切成 Telegram 可接受的多段（留出标签余量） */
function splitText(text, limit) {
  var max = limit || 3800;
  var s = String(text || "");
  if (s.length <= max) return [s];
  var parts = [];
  while (s.length > 0) {
    if (s.length <= max) {
      parts.push(s);
      break;
    }
    var cut = s.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = max;
    parts.push(s.slice(0, cut));
    s = s.slice(cut).replace(/^\n+/, "");
  }
  return parts;
}

/** 生成进度条，如 ██████░░░░ 60% */
function bar(percent, width) {
  var w = width || 10;
  var p = Math.max(0, Math.min(100, Number(percent) || 0));
  var filled = Math.round((p / 100) * w);
  return "█".repeat(filled) + "░".repeat(w - filled) + " " + p.toFixed(0) + "%";
}

/** 星级（0-5） */
function stars(n) {
  var v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

/* ----------------------------------------------------------------------------
 * 二、时间
 * --------------------------------------------------------------------------*/

/** 当前时间字符串 yyyy/MM/dd HH:mm:ss */
function nowStr() {
  return formatDate(new Date());
}

/** 按配置时区格式化 */
function formatDate(date, pattern) {
  var tz = cfg("timezone", "Asia/Shanghai");
  return Utilities.formatDate(date || new Date(), tz, pattern || "yyyy/MM/dd HH:mm:ss");
}

/** 仅日期 */
function todayStr() {
  return formatDate(new Date(), "yyyy/MM/dd");
}

/** ⭐ 修复原版 `date.getseconds()` 拼写错误导致的 NaN 时间戳 */
function unixNow() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 解析时长表达为"N 秒后的 unix 时间戳"
 * 支持：30s 5m 2h 3d 1w ；传入空返回 0（= 永久）
 */
function parseDuration(text) {
  if (!text) return 0;
  var t = String(text).toLowerCase().replace(/\s+/g, "");
  var m = t.match(/^(\d+(?:\.\d+)?)([smhdw])$/);
  if (!m) return 0;
  var n = parseFloat(m[1]);
  var unit = m[2];
  var mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[unit];
  return Math.floor(Date.now() / 1000 + n * mult);
}

/** 把秒数变成"1天2小时3分"这种可读文本 */
function humanDuration(seconds) {
  var s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s === 0) return "0秒";
  var d = Math.floor(s / 86400);
  var h = Math.floor((s % 86400) / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var out = [];
  if (d) out.push(d + "天");
  if (h) out.push(h + "小时");
  if (m) out.push(m + "分");
  if (sec && !d) out.push(sec + "秒");
  return out.join("");
}

/** 判断给定时间是否与今天同一天 */
function isSameDay(input) {
  var d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return false;
  var n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/* ----------------------------------------------------------------------------
 * 三、随机
 * --------------------------------------------------------------------------*/

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(list) {
  if (!list || !list.length) return null;
  return list[randInt(0, list.length - 1)];
}

/** 带种子的确定性随机（用于 /img 之类的可复现随机） */
function hashSeed(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ----------------------------------------------------------------------------
 * 四、对象 / 数组
 * --------------------------------------------------------------------------*/

/** 按对象的某个数值字段降序排序，返回 [value, ...] */
function sortByFieldDesc(obj, field) {
  return Object.keys(obj)
    .map(function (k) {
      return obj[k];
    })
    .sort(function (x, y) {
      return (y[field] || 0) - (x[field] || 0);
    });
}

/** 数组去重并保持顺序 */
function uniq(arr) {
  var seen = {};
  var out = [];
  (arr || []).forEach(function (v) {
    var k = String(v);
    if (k && !seen[k]) {
      seen[k] = true;
      out.push(v);
    }
  });
  return out;
}

/** 安全取值：get(obj, "a.b.c", 默认值) */
function get(obj, path, fallback) {
  var segs = String(path).split(".");
  var cur = obj;
  for (var i = 0; i < segs.length; i++) {
    if (cur === null || cur === undefined) return fallback;
    cur = cur[segs[i]];
  }
  return cur === undefined ? fallback : cur;
}

/** 分页 */
function paginate(list, page, size) {
  var per = size || 10;
  var arr = list || [];
  var totalPages = Math.max(1, Math.ceil(arr.length / per));
  var p = Math.max(0, Math.min(totalPages - 1, (Number(page) || 0)));
  return {
    slice: arr.slice(p * per, p * per + per),
    page: p,
    totalPages: totalPages,
    total: arr.length,
    hasPrev: p > 0,
    hasNext: p < totalPages - 1,
  };
}

/* ----------------------------------------------------------------------------
 * 五、消息类型识别
 * --------------------------------------------------------------------------*/

/** 统一的"内容类型"识别，返回 { key, label, fileId } */
function detectContent(msg) {
  if (!msg) return { key: "unknown", label: "未知消息", fileId: null };
  if (msg.text) return { key: "text", label: "文本", fileId: null };
  if (msg.photo) {
    var ps = msg.photo;
    return { key: "photo", label: "图片", fileId: ps[ps.length - 1].file_id };
  }
  if (msg.video) return { key: "video", label: "视频", fileId: msg.video.file_id };
  if (msg.animation) return { key: "animation", label: "动图", fileId: msg.animation.file_id };
  if (msg.document) return { key: "document", label: "文件", fileId: msg.document.file_id };
  if (msg.audio) return { key: "audio", label: "音频", fileId: msg.audio.file_id };
  if (msg.voice) return { key: "voice", label: "语音", fileId: msg.voice.file_id };
  if (msg.video_note) return { key: "video_note", label: "视频留言", fileId: msg.video_note.file_id };
  if (msg.sticker) return { key: "sticker", label: "贴纸", fileId: msg.sticker.file_id };
  if (msg.location) return { key: "location", label: "位置", fileId: null };
  if (msg.contact) return { key: "contact", label: "名片", fileId: null };
  if (msg.poll) return { key: "poll", label: "投票", fileId: null };
  if (msg.dice) return { key: "dice", label: "骰子", fileId: null };
  if (msg.new_chat_members) return { key: "join", label: "入群", fileId: null };
  if (msg.left_chat_member) return { key: "leave", label: "退群", fileId: null };
  if (msg.pinned_message) return { key: "pin", label: "置顶变更", fileId: null };
  return { key: "unknown", label: "未知消息", fileId: null };
}

/** 文本/图片说明等"可读内容" */
function readableContent(msg) {
  if (!msg) return "";
  var c = detectContent(msg);
  if (c.key === "text") return msg.text || "";
  if (msg.caption) return "[" + c.label + "] " + msg.caption;
  return "[" + c.label + "]";
}

/* ----------------------------------------------------------------------------
 * 六、哈希 / 编码
 * --------------------------------------------------------------------------*/

function b64encode(str) {
  return Utilities.base64Encode(
    Utilities.newBlob(String(str)).getBytes()
  );
}

function b64decode(str) {
  try {
    return Utilities.newBlob(Utilities.base64Decode(str)).getDataAsString();
  } catch (e) {
    return "";
  }
}

function md5(str) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(str))
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

/* ----------------------------------------------------------------------------
 * 七、表达式计算（/calc 用，纯手写解析器，绝不使用 eval）
 * --------------------------------------------------------------------------*/

/**
 * 安全四则运算 + 幂 + 括号。
 * 白名单字符校验 + 递归下降解析，杜绝 eval 注入。
 */
function safeCalc(expr) {
  var s = String(expr || "").replace(/\s+/g, "");
  if (!s) return { ok: false, error: "表达式为空" };
  if (!/^[0-9+\-*/%^().]+$/.test(s)) {
    return { ok: false, error: "仅支持数字与 + - * / % ^ ( )" };
  }

  var pos = 0;

  function peek() {
    return s[pos];
  }
  function eat(ch) {
    if (s[pos] === ch) {
      pos++;
      return true;
    }
    return false;
  }
  function parseExpr() {
    var v = parseTerm();
    while (pos < s.length && (peek() === "+" || peek() === "-")) {
      var op = s[pos++];
      var r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() {
    var v = parsePow();
    while (pos < s.length && (peek() === "*" || peek() === "/" || peek() === "%")) {
      var op = s[pos++];
      var r = parsePow();
      if ((op === "/" || op === "%") && r === 0) throw new Error("除数不能为 0");
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  }
  function parsePow() {
    var v = parseUnary();
    if (peek() === "^") {
      pos++;
      return Math.pow(v, parsePow());
    }
    return v;
  }
  function parseUnary() {
    if (eat("-")) return -parseUnary();
    if (eat("+")) return parseUnary();
    return parseAtom();
  }
  function parseAtom() {
    if (eat("(")) {
      var v = parseExpr();
      if (!eat(")")) throw new Error("括号不匹配");
      return v;
    }
    var start = pos;
    while (pos < s.length && /[0-9.]/.test(peek())) pos++;
    if (start === pos) throw new Error("表达式格式错误");
    return parseFloat(s.slice(start, pos));
  }

  try {
    var result = parseExpr();
    if (pos !== s.length) return { ok: false, error: "表达式格式错误" };
    if (!isFinite(result)) return { ok: false, error: "结果超出范围" };
    return {
      ok: true,
      value: Math.round(result * 1e10) / 1e10,
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
