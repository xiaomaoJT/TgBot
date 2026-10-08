/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Manage.gs — 群组管理 + 安全防护 + 会话设置 + 回调路由
 * ============================================================================
 */

/* ============================================================================
 * 一、会话级设置（chat_settings 表：chat_id | key | value | updated）
 * ==========================================================================*/

/**
 * 会话级设置的默认值。
 * ⚠️ 故意写成函数而不是常量：常量会在「文件加载时」求值，
 *    如果用户把本文件排在 Params.gs 前面，CONFIG 还没赋值就会读到 undefined。
 *    延迟到调用时求值可以彻底规避文件顺序问题。
 */
function chatSettingDefaults() {
  return {
    welcome: cfg("welcome.enabled", false) ? "on" : "off", // 入群欢迎
    left: cfg("welcome.enabled", false) ? "on" : "off", // 退群提示
    verify: cfg("verify.enabled", false) ? "on" : "off", // 入群验证
    antiflood: cfg("antiFlood.enabled", false) ? "on" : "off", // 反刷屏
    filter: "on", // 敏感词过滤
    autodelete: "on", // 机器人消息自动删除
    eph: "on", // ⭐ 个人查询指令用「临时消息」回复（群内仅本人可见，Bot API 10.2+）
    rules: "", // 群规内容
  };
}

function getAllChatSettings(chatId) {
  var data = readSheet(SHEET.chatSettings);
  var out = {};
  var defaults = chatSettingDefaults();
  Object.keys(defaults).forEach(function (k) {
    out[k] = defaults[k];
  });
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId)) {
      out[String(data[i][1])] = data[i][2];
    }
  }
  return out;
}

function getChatSetting(chatId, key, fallback) {
  var v = getAllChatSettings(chatId)[key];
  if (v === undefined || v === "") {
    return fallback !== undefined ? fallback : chatSettingDefaults()[key];
  }
  return v;
}

function isChatFeatureOn(chatId, key) {
  return getChatSetting(chatId, key, "off") === "on";
}

function setChatSetting(chatId, key, value) {
  var sheet = getSheetOrNull(SHEET.chatSettings);
  if (!sheet) return false;
  var data = [];
  try {
    data = sheet.getDataRange().getValues();
  } catch (e) {}
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId) && String(data[i][1]) === String(key)) {
      sheet.getRange(i + 1, 3).setValue(value);
      sheet.getRange(i + 1, 4).setValue(nowStr());
      cacheDrop(["chatset:" + chatId]);
      return true;
    }
  }
  appendRow(SHEET.chatSettings, [String(chatId), key, value, nowStr()]);
  cacheDrop(["chatset:" + chatId]);
  return true;
}

/* ============================================================================
 * 二、敏感词库（sensitive_words 表：A=绝杀词 B=敏感词，Base64，数据从第 3 行起）
 * ==========================================================================*/

/** 读取指定类型的词表（自动解密） */
function getWordList(type) {
  var data = readSheet(SHEET.sensitive);
  var col = type === "ban" ? 0 : 1;
  var out = [];
  for (var i = 2; i < data.length; i++) {
    var cell = data[i][col];
    if (cell === "" || cell === undefined || cell === null) continue;
    var w = b64decode(String(cell));
    if (w) out.push(w);
  }
  return out;
}

/** 全部词（绝杀词 + 敏感词）去重 */
function getAllWords() {
  return cached("sensitiveWords", cfg("cache.ttlSeconds", 10800), function () {
    return uniq(getWordList("ban").concat(getWordList("sensitive")));
  });
}

function addSensitiveWord(word, type) {
  var w = String(word || "").trim();
  if (!w) return false;
  var sheet = getSheetOrNull(SHEET.sensitive);
  if (!sheet) return false;
  var col = type === "ban" ? 1 : 2;
  var row = Math.max(lastRowInColumn(sheet, col) + 1, 3);
  sheet.getRange(row, col).setValue(b64encode(w));
  cacheDrop(["sensitiveWords", "sensitiveWordsMap"]);
  return true;
}

function removeSensitiveWord(word, type) {
  var w = String(word || "").trim();
  var sheet = getSheetOrNull(SHEET.sensitive);
  if (!sheet || !w) return false;
  var col = type === "ban" ? 1 : 2;
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 2; i--) {
    if (b64decode(String(data[i][col - 1] || "")) === w) {
      sheet.getRange(i + 1, col).setValue("");
      cacheDrop(["sensitiveWords", "sensitiveWordsMap"]);
      return true;
    }
  }
  return false;
}

/**
 * DFA 敏感词匹配。
 * ⭐ 性能修复：原版每收到一条消息就重建一次 Trie 树（O(词库大小)），
 *    词库一大就拖垮整个 doPost。现在把构建结果序列化进缓存，只在词库变化时重建。
 */
function buildDFA(words) {
  var root = {};
  (words || []).forEach(function (word) {
    if (!word) return;
    var node = root;
    for (var i = 0; i < word.length; i++) {
      var ch = word.charAt(i).toLowerCase();
      if (!node[ch]) node[ch] = {};
      node = node[ch];
    }
    node["$"] = 1; // 词尾标记
  });
  return root;
}

function getDFA() {
  return cached("sensitiveWordsMap", cfg("cache.ttlSeconds", 10800), function () {
    return buildDFA(getAllWords());
  });
}

/** 需要跳过的干扰字符（防止 "广@告" 绕过） */
var __IGNORE_CHARS__ = null;
function ignoreCharMap() {
  if (__IGNORE_CHARS__) return __IGNORE_CHARS__;
  var chars =
    " \t\r\n~!@#$%^&*()_+-=【】、{}|;:'\",.<>/?，。、《》？：；！…—·～￥·（）「」『』【】";
  var m = {};
  for (var i = 0; i < chars.length; i++) m[chars.charCodeAt(i)] = true;
  __IGNORE_CHARS__ = m;
  return m;
}

/**
 * 检测文本中的敏感词。
 * @return {{words:string[], hasBan:boolean}}
 */
function detectWords(text) {
  var content = String(text || "");
  if (!content) return { words: [], hasBan: false };

  var root = getDFA();
  var ignore = ignoreCharMap();
  var banList = getWordList("ban");
  var banMap = {};
  banList.forEach(function (w) {
    banMap[w.toLowerCase()] = true;
  });

  var found = [];
  var hasBan = false;
  var i = 0;
  var len = content.length;

  while (i < len) {
    if (ignore[content.charCodeAt(i)]) {
      i++;
      continue;
    }
    var node = root;
    var j = i;
    var last = -1;
    while (j < len) {
      var code = content.charCodeAt(j);
      if (ignore[code]) {
        j++;
        continue;
      }
      var ch = content.charAt(j).toLowerCase();
      if (!node[ch]) break;
      node = node[ch];
      if (node["$"]) last = j;
      j++;
    }
    if (last >= 0) {
      var word = content.slice(i, last + 1).toLowerCase();
      found.push(word);
      if (banMap[word]) hasBan = true;
      i = last + 1;
    } else {
      i++;
    }
  }

  return { words: uniq(found), hasBan: hasBan };
}

/* ============================================================================
 * 三、安全防护：违规处理
 * ==========================================================================*/

/**
 * 消息安全过滤主入口。命中则删除、告警、必要时封禁。
 * @return {boolean} 是否已拦截
 */
function securityFilter(ctx) {
  if (!ctx.isGroup) return false;
  if (!isChatFeatureOn(ctx.chatId, "filter")) return false;
  if (isChatAdmin(ctx)) return false; // 管理员不拦

  var text = ctx.text || "";
  if (cfg("security.detectInQuotedText", true) && ctx.reply) {
    text += " " + (ctx.reply.text || ctx.reply.caption || "");
  }

  var hit = detectWords(text);
  if (!hit.words.length) return false;

  // 删掉违规消息
  tgDeleteMessage(ctx.chatId, ctx.messageId);

  var who = "<a href='tg://user?id=" + escAttr(ctx.userId) + "'>" + esc(ctx.userName) + "</a>";

  // 记录一次违规
  appendRow(SHEET.storage, [
    nowStr(),
    String(ctx.userId),
    ctx.userNameKey || "",
    ctx.userName || "",
    "主动发起(敏感词触发删除)",
    "(群聊消息)" + (ctx.chatTitle || ""),
    String(ctx.chatId),
    clip(ctx.text || "", 200),
    "",
    String(ctx.messageId || ""),
  ]);

  if (hit.hasBan) {
    // 绝杀词：直接封禁
    tgBanMember(ctx.chatId, ctx.userId, 0);
    if (cfg("security.notifyOnBan", true)) {
      var banMsg = uiCard({
        icon: "🚨",
        title: "绝杀词触发 · 已永久封禁",
        body: [
          uiKV("用户", ctx.userName),
          uiKV("用户 ID", String(ctx.userId)),
          uiKV("触发词数", String(hit.words.length)),
          "",
          "<i>该用户已被永久封禁，其近期消息正在清理中。</i>",
        ],
      });
      var sent = sendCard(ctx, banMsg);
      if (sent) scheduleAutoDelete(ctx.chatId, sent.message_id, 30);
    }
    deleteRecentMessages(ctx.chatId, String(ctx.userId), 24);
    return true;
  }

  // 普通敏感词：累计计数，达到阈值自动封禁
  var threshold = cfg("security.autoBanThreshold", 3);
  var windowHours = cfg("security.autoBanWindowHours", 3);
  var count = recentViolationCount(ctx.userId, ctx.chatId, windowHours);

  var body = [
    uiKV("用户", ctx.userName),
    uiKV("违规次数", count + " / " + threshold + "（" + windowHours + " 小时内）"),
  ];

  if (count >= threshold - 1) {
    tgBanMember(ctx.chatId, ctx.userId, 0);
    body.push("");
    body.push("<b>已达阈值，该用户已被自动封禁。</b>");
    body.push("<i>申诉请联系管理员。</i>");
    var sent2 = sendCard(ctx, uiCard({ icon: "🚫", title: "违规处理通知", body: body }));
    if (sent2) scheduleAutoDelete(ctx.chatId, sent2.message_id, 30);
    deleteRecentMessages(ctx.chatId, String(ctx.userId), 24);
  } else {
    body.push("");
    body.push("<i>请文明发言，继续违规将被移出群聊。</i>");
    var sent3 = sendCard(ctx, uiCard({ icon: THEME.warn, title: "违规警告", body: body }));
    if (sent3) scheduleAutoDelete(ctx.chatId, sent3.message_id, 30);
  }

  return true;
}

/** 删除某用户近 N 小时的消息（批量 API，一次最多 100 条） */
function deleteRecentMessages(chatId, userId, hours) {
  var ids = recentMessageIds(userId, chatId, hours);
  if (!ids.length) return 0;
  // 分批，避免单次请求过大
  for (var i = 0; i < ids.length; i += 100) {
    tgDeleteMessages(chatId, ids.slice(i, i + 100));
  }
  return ids.length;
}

/* ============================================================================
 * 四、反刷屏
 * ==========================================================================*/

function antiFloodCheck(ctx) {
  if (!ctx.isGroup) return false;
  if (!isChatFeatureOn(ctx.chatId, "antiflood")) return false;
  if (isChatAdmin(ctx)) return false;

  var limit = cfg("antiFlood.limit", 8);
  var window = cfg("antiFlood.windowSeconds", 10);
  var key = "fl:" + ctx.chatId + ":" + ctx.userId;

  var record = null;
  try {
    var raw = cacheStore().get(key);
    if (raw) record = JSON.parse(raw);
  } catch (e) {}

  var now = Date.now();
  if (!record || now - record.start > window * 1000) {
    record = { start: now, count: 0 };
  }
  record.count++;
  try {
    cacheStore().put(key, JSON.stringify(record), Math.max(1, window));
  } catch (e) {}

  if (record.count <= limit) return false;

  var action = cfg("antiFlood.action", "mute");
  var who = "<a href='tg://user?id=" + escAttr(ctx.userId) + "'>" + esc(ctx.userName) + "</a>";

  if (action === "mute") {
    var mins = cfg("antiFlood.muteMinutes", 10);
    tgMuteMember(ctx.chatId, ctx.userId, mins * 60);
    var sent = sendCard(
      ctx,
      uiCard({
        icon: THEME.warn,
        title: "检测到刷屏",
        body: [
          uiKV("用户", ctx.userName),
          uiKV("操作", "禁言 " + mins + " 分钟"),
          "",
          "<i>请放慢发言速度。</i>",
        ],
      })
    );
    if (sent) scheduleAutoDelete(ctx.chatId, sent.message_id, 20);
  } else if (action === "kick") {
    tgKickMember(ctx.chatId, ctx.userId);
    var sent2 = sendCard(ctx, uiCard({ icon: THEME.warn, title: "刷屏已被移出群聊", body: [uiKV("用户", ctx.userName)] }));
    if (sent2) scheduleAutoDelete(ctx.chatId, sent2.message_id, 20);
  } else {
    var sent3 = sendCard(ctx, uiCard({ icon: THEME.warn, title: "请勿刷屏", body: [uiKV("用户", ctx.userName)] }));
    if (sent3) scheduleAutoDelete(ctx.chatId, sent3.message_id, 20);
  }

  // 重置计数，避免连续触发
  try {
    cacheStore().remove(key);
  } catch (e) {}
  return true;
}

/* ============================================================================
 * 五、入群 / 退群
 * ==========================================================================*/

function handleJoin(ctx) {
  var members = get(ctx.message, "new_chat_members", []) || [];
  // 机器人自己加入群聊
  var selfJoined = members.some(function (m) {
    return m.is_bot && (String(m.id) === String(botIdAlone));
  });
  if (selfJoined) {
    var me = tgGetMe();
    sendCard(
      ctx,
      uiCard({
        icon: "🤖",
        title: "感谢把我拉进群！",
        body: [
          "我是 <b>" + esc(BRAND.name || "Bot") + "</b>。",
          "",
          uiItem("发送 " + uiCmd("/help") + " 查看全部功能"),
          uiItem("发送 " + uiCmd("/menu") + " 打开功能面板"),
          uiItem("管理员发送 " + uiCmd("/manage") + " 打开管理面板"),
          "",
          "<i>建议把我设为管理员，否则无法执行封禁/禁言/删消息等操作。</i>",
        ],
      })
    );
    return true;
  }

  var names = members
    .filter(function (m) {
      return !m.is_bot;
    })
    .map(function (m) {
      return [m.first_name || "", m.last_name || ""].join("");
    })
    .filter(Boolean);

  if (!names.length) return false;

  var count = tgGetMemberCount(ctx.chatId);

  // 入群验证
  if (isChatFeatureOn(ctx.chatId, "verify")) {
    members.forEach(function (m) {
      if (m.is_bot) return;
      requestVerify(ctx, m);
    });
    return true;
  }

  // 入群欢迎
  if (isChatFeatureOn(ctx.chatId, "welcome")) {
    var text = getChatSetting(ctx.chatId, "welcomeText", cfg("welcome.text", ""));
    var rendered = String(text)
      .replace(/\{name\}/g, esc(names.join("、").replace(/[<>&]/g, "")))
      .replace(/\{chat\}/g, esc(ctx.chatTitle || ""))
      .replace(/\{count\}/g, count === null ? "?" : String(count));
    sendCard(ctx, rendered);
  }
  return true;
}

function handleLeave(ctx) {
  if (!isChatFeatureOn(ctx.chatId, "left")) return false;
  var m = get(ctx.message, "left_chat_member", null);
  if (!m) return false;
  var name = [m.first_name || "", m.last_name || ""].join("");
  var text = getChatSetting(ctx.chatId, "leftText", cfg("welcome.leftText", ""));
  sendCard(
    ctx,
    String(text).replace(/\{name\}/g, esc(name)).replace(/\{chat\}/g, esc(ctx.chatTitle || ""))
  );
  return true;
}

/** 发起入群验证：先禁言，等用户点按钮 */
function requestVerify(ctx, member) {
  var timeout = cfg("verify.timeoutSeconds", 120);
  tgMuteMember(ctx.chatId, member.id, timeout + 30);

  var name = [member.first_name || "", member.last_name || ""].join("");
  var text = String(getChatSetting(ctx.chatId, "verifyText", cfg("verify.text", ""))).replace(
    /\{timeout\}/g,
    String(timeout)
  );

  var sent = tg("sendMessage", {
    chat_id: ctx.chatId,
    text:
      "<b>" + THEME.warn + " 入群验证</b>\n\n" +
      "<a href='tg://user?id=" + escAttr(member.id) + "'>" + esc(name) + "</a>，" +
      esc(text),
    parse_mode: "HTML",
    reply_markup: kb([[btn("✅ 我是真人", ["verify", String(member.id)])]]),
    link_preview_options: { is_disabled: true },
  });

  if (sent) {
    enqueueTask(
      "verifyTimeout",
      { chat_id: String(ctx.chatId), user_id: String(member.id), message_id: String(sent.message_id) },
      unixNow() + timeout
    );
  }
}

/* ============================================================================
 * 六、管理指令实现
 * ==========================================================================*/

/** 统一的"取目标用户"逻辑：优先回复消息，其次 /cmd <id> */
function resolveTarget(ctx, args) {
  if (ctx.reply && ctx.reply.from) {
    return {
      id: String(ctx.reply.from.id),
      name: [ctx.reply.from.first_name || "", ctx.reply.from.last_name || ""].join("") || String(ctx.reply.from.id),
      messageId: ctx.reply.message_id,
      viaReply: true,
    };
  }
  var m = String(args || "").match(/(\d{5,})/);
  if (m) return { id: m[1], name: m[1], messageId: null, viaReply: false };
  return null;
}

function cmdBanAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) {
    return uiUsage("/ban", "/ban [时长]（回复目标用户的消息）", ["/ban", "/ban 30m", "/ban 3d"]);
  }
  if (String(target.id) === String(botIdAlone)) return uiFail("不能对自己下手 🙂");
  if (isChatAdmin({ chatId: ctx.chatId, userId: target.id, isGroup: true, isKing: false })) {
    return uiFail("对方是管理员，无法封禁");
  }

  // 时长：从参数里抠出来，同时兼容 /ban 30m 和 /ban 123456789 30m
  var durMatch = String(args || "").match(/(\d+\s*[smhdw])/i);
  var until = durMatch ? parseDuration(durMatch[1].replace(/\s/g, "")) : 0;
  var label = durMatch ? humanDuration(durMatch[1].replace(/\s/g, "") === "" ? 0 : (until - unixNow())) : "永久";

  var r = tgBanMember(ctx.chatId, target.id, until);
  if (!r) return uiFail("封禁失败", ["请确认我已拥有「封禁用户」管理员权限。"]);

  sendCard(
    ctx,
    uiCard({
      icon: "🔨",
      title: "封禁通知",
      body: [
        uiKV("用户", target.name),
        uiKV("用户 ID", target.id),
        uiKV("时长", until ? label : "永久"),
        uiKV("操作人", ctx.userName),
      ],
    })
  );
  if (target.messageId) tgDeleteMessage(ctx.chatId, target.messageId);
  return null;
}

function cmdUnbanAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/unban", "/unban [用户ID]（或回复消息）", ["/unban 123456789"]);

  tgUnbanMember(ctx.chatId, target.id);
  tgUnmuteMember(ctx.chatId, target.id);
  return uiOK("已解除限制", [
    uiKV("用户", target.name),
    uiKV("用户 ID", target.id),
    uiKV("操作人", ctx.userName),
  ]);
}

function cmdMuteAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/mute", "/mute [时长]（回复目标用户）", ["/mute 10m", "/mute 1h"]);

  var durMatch = String(args || "").match(/(\d+\s*[smhdw])/i);
  var seconds = durMatch ? Math.max(30, parseDuration(durMatch[1].replace(/\s/g, "")) - unixNow()) : 3600;

  var r = tgMuteMember(ctx.chatId, target.id, seconds);
  if (!r) return uiFail("禁言失败", ["请确认我已拥有「限制成员」管理员权限。"]);

  return uiOK("已禁言", [
    uiKV("用户", target.name),
    uiKV("时长", humanDuration(seconds)),
    uiKV("操作人", ctx.userName),
  ]);
}

function cmdKickAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/kick", "/kick（回复目标用户）");
  if (String(target.id) === String(botIdAlone)) return uiFail("不能踢我自己 🙂");

  var r = tgKickMember(ctx.chatId, target.id);
  if (!r) return uiFail("移出失败", ["请确认我已拥有「封禁用户」管理员权限。"]);

  sendCard(
    ctx,
    uiCard({
      icon: "👋",
      title: "已移出群聊",
      body: [uiKV("用户", target.name), uiKV("操作人", ctx.userName), "", "<i>该用户可通过邀请链接重新加入。</i>"],
    })
  );
  if (target.messageId) tgDeleteMessage(ctx.chatId, target.messageId);
  return null;
}

/* ---- 警告系统 ---- */

function getWarns(chatId, userId) {
  var data = readSheet(SHEET.warns);
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(chatId) && String(data[i][2]) === String(userId) && String(data[i][6]) === "active") {
      out.push({ row: i + 1, time: data[i][0], reason: data[i][5], by: data[i][4], name: data[i][3] });
    }
  }
  return out;
}

function addWarn(chatId, userId, userName, byId, reason) {
  appendRow(SHEET.warns, [
    nowStr(),
    String(chatId),
    String(userId),
    userName || "",
    String(byId || ""),
    reason || "未说明",
    "active",
  ]);
}

function clearWarns(chatId, userId) {
  var sheet = getSheetOrNull(SHEET.warns);
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(chatId) && String(data[i][2]) === String(userId) && String(data[i][6]) === "active") {
      sheet.getRange(i + 1, 7).setValue("cleared");
      n++;
    }
  }
  return n;
}

var WARN_LIMIT = 3;

function cmdWarnAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/warn", "/warn [原因]（回复目标用户）", ["/warn 广告刷屏"]);
  if (String(target.id) === String(botIdAlone)) return uiFail("不能警告我自己 🙂");

  var reason = String(args || "").replace(/\d{5,}/, "").trim() || "未说明";
  addWarn(ctx.chatId, target.id, target.name, ctx.userId, reason);

  var list = getWarns(ctx.chatId, target.id);
  var count = list.length;
  var who = "<a href='tg://user?id=" + escAttr(target.id) + "'>" + esc(target.name) + "</a>";

  if (count >= WARN_LIMIT) {
    tgKickMember(ctx.chatId, target.id);
    clearWarns(ctx.chatId, target.id);
    var sent = sendCard(
      ctx,
      uiCard({
        icon: "🚷",
        title: "警告已达上限 · 已移出群聊",
        body: [
          uiKV("用户", who.replace(/<[^>]+>/g, "")),
          uiKV("累计警告", String(count)),
          uiKV("最后原因", reason),
          "",
          "<i>警告记录已重置，重新加入后从零开始。</i>",
        ],
      })
    );
    if (sent) scheduleAutoDelete(ctx.chatId, sent.message_id, 30);
    return null;
  }

  var sent2 = sendCard(
    ctx,
    uiCard({
      icon: THEME.warn,
      title: "警告 " + count + " / " + WARN_LIMIT,
      body: [
        uiKV("用户", target.name),
        uiKV("原因", reason),
        uiKV("操作人", ctx.userName),
        "",
        "<i>累计 " + WARN_LIMIT + " 次警告将被移出群聊。</i>",
      ],
    })
  );
  if (sent2) scheduleAutoDelete(ctx.chatId, sent2.message_id, 30);
  return null;
}

function cmdWarnsList(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/warns", "/warns（回复目标用户）");
  var list = getWarns(ctx.chatId, target.id);
  if (!list.length) return uiOK("该用户没有警告记录", [uiKV("用户", target.name)]);

  return uiCard({
    icon: "📋",
    title: "警告记录",
    subtitle: target.name + " · 共 " + list.length + " 条",
    body: list.map(function (w, i) {
      return (
        (i + 1) +
        ". <b>" +
        esc(w.reason) +
        "</b>\n   <i>" +
        esc(formatDate(new Date(w.time))) +
        " · by " +
        esc(String(w.by)) +
        "</i>"
      );
    }),
    footer: "累计 " + WARN_LIMIT + " 次自动移出群聊",
  });
}

function cmdWarnReset(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);
  if (!target) return uiUsage("/resetwarn", "/resetwarn（回复目标用户）");
  var n = clearWarns(ctx.chatId, target.id);
  return uiOK("已清空警告记录", [uiKV("用户", target.name), uiKV("清除条数", String(n))]);
}

/* ---- 置顶 / 清理 / 邀请 ---- */

function cmdPinAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");

  if (ctx.reply && ctx.reply.message_id) {
    var r = tgPinMessage(ctx.chatId, ctx.reply.message_id, true);
    return r ? uiOK("已置顶该消息") : uiFail("置顶失败", ["请确认我已拥有「置顶消息」管理员权限。"]);
  }

  var text = String(args || "").trim();
  if (text === "text" || !text) {
    // 一键置顶群规
    var rules = getChatSetting(ctx.chatId, "rules", "");
    if (!rules) return uiWarn("尚未设置群规", ["请先通过 " + uiCmd("/settings") + " 设置群规内容。"]);
    text = rules;
  }

  var sent = sendCard(ctx, uiCard({ icon: "📌", title: "群公告", body: [uiQuote(text)] }));
  if (!sent) return uiFail("发送失败");
  tgPinMessage(ctx.chatId, sent.message_id, true);
  return null;
}

function cmdUnpinAction(ctx) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  tgUnpinMessage(ctx.chatId, ctx.reply ? ctx.reply.message_id : null);
  return uiOK("已取消置顶");
}

function cmdPurgeAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var target = resolveTarget(ctx, args);

  // 没有指定目标时，至少把当前指令和它回复的那条删掉
  if (!target) {
    if (ctx.reply) {
      tgDeleteMessage(ctx.chatId, ctx.reply.message_id);
      tgDeleteMessage(ctx.chatId, ctx.messageId);
      return null;
    }
    return uiUsage("/purge", "/purge（回复目标用户的消息，清理其近 24 小时发言）");
  }

  var n = deleteRecentMessages(ctx.chatId, target.id, 24);
  tgDeleteMessage(ctx.chatId, ctx.messageId);

  var sent = sendCard(
    ctx,
    uiCard({
      status: n > 0 ? "ok" : "warn",
      title: n > 0 ? "已清理 " + n + " 条消息" : "没有找到可清理的消息",
      body: [
        uiKV("用户", target.name),
        uiKV("时间范围", "最近 24 小时"),
        uiKV("操作人", ctx.userName),
        "",
        "<i>只能清理机器人记录过的消息；超过 48 小时的消息 Telegram 不再允许删除。</i>",
      ],
    })
  );
  if (sent) scheduleAutoDelete(ctx.chatId, sent.message_id, 15);
  return null;
}

function cmdInviteAction(ctx, args) {
  if (!ctx.isGroup) return uiWarn("该指令仅在群聊中可用");
  var parts = String(args || "").trim().split(/\s+/).filter(Boolean);
  var opts = {};
  if (parts[0]) {
    var exp = parseDuration(parts[0]);
    if (exp > 0) opts.expire_date = exp;
  }
  if (parts[1] && /^\d+$/.test(parts[1])) opts.member_limit = parseInt(parts[1], 10);

  var link = tgCreateInviteLink(ctx.chatId, opts);
  if (!link) {
    return uiFail("生成邀请链接失败", ["请确认我已拥有「邀请用户」管理员权限。"]);
  }
  return uiCard({
    status: "ok",
    title: "邀请链接已生成",
    body: [
      uiCode(link.invite_link),
      "",
      uiKV("有效期", link.expire_date ? formatDate(new Date(link.expire_date * 1000)) : "永久", "⏳"),
      uiKV("人数上限", link.member_limit ? String(link.member_limit) : "不限", "👥"),
      uiKV("是否需审批", link.creates_join_request ? "是" : "否", "🚪"),
    ],
    footer: "该链接由 Bot 独立生成，撤销不影响群内其他链接",
  });
}

/* ============================================================================
 * 七、管理面板 / 设置面板（内联键盘）
 * ==========================================================================*/

function cmdManagePanel(ctx) {
  if (!ctx.isGroup) return uiWarn("管理面板仅在群聊中可用");
  return { text: renderManagePanel(ctx), markup: managePanelKeyboard() };
}

function renderManagePanel(ctx) {
  var s = getAllChatSettings(ctx.chatId);
  function flag(k) {
    return s[k] === "on" ? "🟢 开启" : "⚪️ 关闭";
  }
  return uiCard({
    icon: "🛡",
    title: "群管理面板",
    subtitle: esc(ctx.chatTitle || ""),
    body: [
      uiSection("快捷操作（回复消息后使用）", "⚡"),
      uiItem(uiCmd("/ban") + " 封禁 · " + uiCmd("/mute") + " 禁言 · " + uiCmd("/kick") + " 移出"),
      uiItem(uiCmd("/warn") + " 警告 · " + uiCmd("/purge") + " 批量清理"),
      uiItem(uiCmd("/pin") + " 置顶 · " + uiCmd("/invite") + " 邀请链接"),
      "",
      uiSection("本群功能状态", "⚙️"),
      uiItem("敏感词过滤：" + flag("filter")),
      uiItem("机器人消息自动删除：" + flag("autodelete")),
      uiItem("入群欢迎：" + flag("welcome")),
      uiItem("退群提示：" + flag("left")),
      uiItem("入群验证：" + flag("verify")),
      uiItem("反刷屏：" + flag("antiflood")),
      "",
      uiKV("群组 ID", String(ctx.chatId), "🆔"),
      uiKV("管理员数", String(getAdminIds(ctx.chatId).length), "👤"),
    ],
  });
}

function managePanelKeyboard() {
  return kb([
    [btn("⚡ 快捷操作", ["panel", "help"]), btn("⚙️ 功能开关", ["panel", "set"])],
    [btn("📜 群规设置", ["panel", "rules"]), btn("🔄 刷新", ["panel", "main"])],
    [btn("📖 指令帮助", ["hcat", "管理"])],
  ]);
}

function cmdSettingsPanel(ctx) {
  if (!ctx.isGroup) {
    return uiWarn("设置面板仅在群聊中可用", ["群级开关需要真实的群会话才能保存。"]);
  }

  // 文本子指令：/settings rules <群规内容>
  var args = String(ctx.args || "").trim();
  var m = args.match(/^rules?\b\s*([\s\S]*)$/i);
  if (m) {
    var content = (m[1] || "").trim();
    if (!content) {
      return uiUsage("/settings rules", "/settings rules <群规内容>", [
        "/settings rules 1. 禁止广告 2. 禁止刷屏",
      ]);
    }
    setChatSetting(ctx.chatId, "rules", content);
    return uiOK("群规已更新", [
      "该内容会展示在 " + uiCmd("/rules") + " 与 " + uiCmd("/pin") + " 中。",
      "",
      uiQuote(clip(content, 300)),
    ]);
  }

  return { text: renderSettingsPanel(ctx), markup: settingsKeyboard(ctx) };
}

function renderSettingsPanel(ctx) {
  var s = getAllChatSettings(ctx.chatId);
  var rules = s.rules || "";
  return uiCard({
    icon: "⚙️",
    title: "本群功能开关",
    subtitle: "点击按钮即时生效",
    body: [
      uiItem("点击下方按钮切换状态，🟢 为开启。"),
      "",
      uiSection("当前群规", "📜"),
      rules ? uiQuote(String(rules)) : "<i>尚未设置。发送 <code>/settings rules 你的群规内容</code> 即可设置。</i>",
    ],
  });
}

function settingsKeyboard(ctx) {
  var s = getAllChatSettings(ctx.chatId);
  function label(name, text) {
    return (s[name] === "on" ? "🟢 " : "⚪️ ") + text;
  }
  return kb([
    [
      btn(label("filter", "敏感词过滤"), ["panel", "tog", "filter"]),
      btn(label("autodelete", "自动删除"), ["panel", "tog", "autodelete"]),
    ],
    [
      btn(label("welcome", "入群欢迎"), ["panel", "tog", "welcome"]),
      btn(label("left", "退群提示"), ["panel", "tog", "left"]),
    ],
    [
      btn(label("verify", "入群验证"), ["panel", "tog", "verify"]),
      btn(label("antiflood", "反刷屏"), ["panel", "tog", "antiflood"]),
    ],
    [btn(label("eph", "查询仅本人可见"), ["panel", "tog", "eph"])],
    [btn("🔄 刷新", ["panel", "set"])],
  ]);
}

/* ============================================================================
 * 八、回调路由（callback_query 总入口）
 * ==========================================================================*/

/**
 * 处理所有按钮回调。
 * ⭐ 原版只处理了 WXGROUP 一个回调，其它按钮形同虚设；
 *    而且从不调用 answerCallbackQuery，用户点完按钮会转圈到超时。
 */
function handleCallback(ctx) {
  var parts = cbUnpack(ctx.callbackData);
  var ns = parts[0] || "";
  var t0 = Date.now();

  try {
    switch (ns) {
      case "noop":
        tgAnswerCallback(ctx.callbackId, "");
        return;

      case "menu":
        handleMenuCallback(ctx, parts[1]);
        return;

      case "hcat":
        handleHelpCallback(ctx, parts[1] === "-" ? "" : parts[1], 0);
        return;

      case "hpage":
        handleHelpCallback(ctx, parts[1] === "-" ? "" : parts[1], parts[2]);
        return;

      case "hot":
        handleHotCallback(ctx, parts[1], parts[3]);
        return;

      case "panel":
        handlePanelCallback(ctx, parts);
        return;

      case "verify":
        handleVerifyCallback(ctx, parts[1]);
        return;

      case "jreq":
        handleJoinRequestCallback(ctx, parts);
        return;

      case "king":
        handleKingCallback(ctx, parts);
        return;

      case "cbx":
        handleQuickCommand(ctx, parts[1]);
        return;

      case "ch":
        channelHandleCallback(ctx, parts);
        return;

      case "wx":
        handleWxCallback(ctx);
        return;

      default:
        tgAnswerCallback(ctx.callbackId, "该按钮已失效，请重新发送指令。", false);
        return;
    }
  } catch (e) {
    logError("handleCallback:" + ns, e);
    tgAnswerCallback(ctx.callbackId, "处理出错，请重试。", false);
  } finally {
    logInfo("callback", ns + " " + (Date.now() - t0) + "ms");
  }
}

function handleMenuCallback(ctx, cat) {
  var map = {
    query: {
      title: "🔍 查询工具",
      rows: [
        [btn("🌦 天气", ["hcat", "查询"]), btn("🔥 热榜", ["hot", "weibo", "p", "0"])],
        [btn("🤖 AI 对话", ["hcat", "查询"]), btn("🌐 IP 查询", ["hcat", "查询"])],
      ],
      hint:
        "直接发送指令即可，例如 <code>/weather 北京</code>、<code>/ai 你好</code>、<code>/hot zhihu</code>",
    },
    fun: {
      title: "🎮 娱乐互动",
      rows: [
        [btn("📝 一言", ["cbx", "hitokoto"]), btn("🍵 毒鸡汤", ["cbx", "dujitang"])],
        [btn("🔮 今日一签", ["cbx", "fortune"]), btn("🎲 掷骰子", ["cbx", "dice"])],
      ],
      hint: "也可以直接使用 <code>/hitokoto</code>、<code>/dujitang</code>、<code>/fortune</code>、<code>/dice</code>",
    },
    tool: {
      title: "🧰 实用工具",
      rows: [
        [btn("🧮 计算器", ["cbx", "calc"]), btn("🌍 翻译", ["cbx", "tr"])],
        [btn("🔗 短链", ["cbx", "short"]), btn("🕐 时间戳", ["cbx", "t"])],
      ],
      hint: "用法示例：<code>/calc 2^10</code>、<code>/tr hello</code>、<code>/short https://t.me</code>",
    },
    group: {
      title: "👥 群组功能",
      rows: [
        [btn("🏛 群信息", ["cbx", "info"]), btn("📊 活跃统计", ["cbx", "stat"])],
        [btn("💬 话痨榜", ["cbx", "top"]), btn("📜 群规", ["cbx", "rules"])],
      ],
      hint: "群信息与统计需要机器人有读取群信息的权限。",
    },
  };

  var cfgItem = map[cat];
  if (!cfgItem) {
    tgAnswerCallback(ctx.callbackId, "未知分类");
    return;
  }

  cfgItem.rows.push([btn("◀️ 返回主菜单", ["menu", "main"])]);
  var text = uiCard({
    icon: "🎛",
    title: cfgItem.title,
    body: [cfgItem.hint],
  });

  tgEditText(ctx.chatId, ctx.messageId, text, { reply_markup: kb(cfgItem.rows) });
  tgAnswerCallback(ctx.callbackId, "");
}

function handleHelpCallback(ctx, cat, page) {
  var text = buildHelpText(cat || "", Number(page) || 0);
  tgEditText(ctx.chatId, ctx.messageId, text, { reply_markup: helpKeyboard(cat || "", Number(page) || 0) });
  tgAnswerCallback(ctx.callbackId, "");
}

function handleHotCallback(ctx, key, page) {
  var r = apiHot(key, Number(page) || 0);
  if (!r || !r.text) {
    tgAnswerCallback(ctx.callbackId, "获取失败");
    return;
  }
  tgEditText(ctx.chatId, ctx.messageId, r.text, { reply_markup: r.markup });
  tgAnswerCallback(ctx.callbackId, "已更新");
}

function handlePanelCallback(ctx, parts) {
  var action = parts[1] || "main";
  var arg = parts[2] || "";

  // 权限：必须是群管理员
  var adminCtx = {
    chatId: ctx.chatId,
    userId: ctx.userId,
    isGroup: true,
    isKing: ctx.isKing,
  };
  if (!isChatAdmin(adminCtx)) {
    tgAnswerCallback(ctx.callbackId, "只有群管理员可以操作。", true);
    return;
  }

  if (action === "tog") {
    // ⚠️ 必须用 getAllChatSettings（它合并了默认值）。
    //    若用 getChatSetting(..., "off")，默认开启的开关会显示 🟢 却读成 off，
    //    点一下反而把状态写成 on，看起来"点不动"。
    var cur = getAllChatSettings(ctx.chatId)[arg] || "off";
    var next = cur === "on" ? "off" : "on";
    setChatSetting(ctx.chatId, arg, next);
    tgAnswerCallback(ctx.callbackId, (next === "on" ? "已开启" : "已关闭") + " " + arg);
    var text = renderSettingsPanel(ctx);
    tgEditText(ctx.chatId, ctx.messageId, text, { reply_markup: settingsKeyboard(ctx) });
    return;
  }

  if (action === "help") {
    tgAnswerCallback(ctx.callbackId, "");
    tgEditText(ctx.chatId, ctx.messageId, renderManagePanel(ctx), {
      reply_markup: kb([
        [btn("⚙️ 功能开关", ["panel", "set"])],
        [btn("◀️ 返回", ["panel", "main"])],
      ]),
    });
    return;
  }

  if (action === "rules") {
    tgAnswerCallback(ctx.callbackId, "");
    tgEditText(ctx.chatId, ctx.messageId, renderSettingsPanel(ctx), {
      reply_markup: settingsKeyboard(ctx),
    });
    return;
  }

  if (action === "set") {
    tgAnswerCallback(ctx.callbackId, "");
    var t2 = renderSettingsPanel(ctx);
    tgEditText(ctx.chatId, ctx.messageId, t2, { reply_markup: settingsKeyboard(ctx) });
    return;
  }

  // main
  tgAnswerCallback(ctx.callbackId, "");
  tgEditText(ctx.chatId, ctx.messageId, renderManagePanel(ctx), {
    reply_markup: managePanelKeyboard(),
  });
}

function handleVerifyCallback(ctx, targetUserId) {
  if (String(ctx.userId) !== String(targetUserId)) {
    tgAnswerCallback(ctx.callbackId, "这是别人的验证按钮哦～", true);
    return;
  }
  tgUnmuteMember(ctx.chatId, ctx.userId);
  tgAnswerCallback(ctx.callbackId, "验证通过，欢迎！", false);

  var name = ctx.userName || String(ctx.userId);
  var text = uiCard({
    status: "ok",
    title: "验证通过",
    subtitle: name,
    body: ["<i>已恢复发言权限，祝你在群里聊得愉快。</i>"],
  });
  tgEditText(ctx.chatId, ctx.messageId, text);
}

function handleWxCallback(ctx) {
  if (!BRAND.wxUrl) {
    tgAnswerCallback(ctx.callbackId, "未配置相关信息。", true);
    return;
  }
  tgAnswerCallback(ctx.callbackId, "");
  var ok = tgSendPhoto(ctx, BRAND.wxUrl, "<b>" + esc(BRAND.wxName || "扫码关注") + "</b>");
  if (!ok) tgAnswerCallback(ctx.callbackId, "图片发送失败", true);
}

/**
 * 管理面板里的「快捷指令」按钮：把按钮点击转换成一次指令执行。
 * 这样面板按钮和文本指令走的是同一套实现，不会出现两套逻辑不一致。
 */
function handleQuickCommand(ctx, cmdName) {
  var def = findCommand(String(cmdName || "").toLowerCase());
  if (!def) {
    tgAnswerCallback(ctx.callbackId, "未知指令");
    return;
  }
  var permError = checkLevel(ctx, def.level);
  if (permError) {
    tgAnswerCallback(ctx.callbackId, "权限不足", true);
    return;
  }
  tgAnswerCallback(ctx.callbackId, "");
  var result;
  try {
    result = def.handler(ctx, "");
  } catch (e) {
    logError("quickcmd:" + cmdName, e);
    tgAnswerCallback(ctx.callbackId, "执行出错", true);
    return;
  }
  // 结果发成一条新消息，保留原面板不动
  if (typeof result === "string") {
    sendCard(ctx, result);
  } else if (result && result.text) {
    sendCard(ctx, result.text, { reply_markup: result.markup });
  }
}

/** Bot 主人从私聊推送里点的操作按钮 */
function handleKingCallback(ctx, parts) {
  if (!ctx.isKing) {
    tgAnswerCallback(ctx.callbackId, "仅 Bot 主人可操作。", true);
    return;
  }
  var action = parts[1];

  if (action === "ban") {
    var chatId = parts[2];
    var userId = parts[3];
    var r = tgBanMember(chatId, userId, 0);
    tgAnswerCallback(ctx.callbackId, r ? "已封禁" : "封禁失败", !r);
    if (r) {
      tg("sendMessage", {
        chat_id: chatId,
        text:
          "<b>🔨 管理员操作</b>\n\n该用户已被移出并封禁。\n<i>操作来源：Bot 主人</i>",
        parse_mode: "HTML",
      });
      deleteRecentMessages(chatId, userId, 24);
    }
    return;
  }

  if (action === "user") {
    tgAnswerCallback(ctx.callbackId, "");
    sendCard(
      ctx,
      uiCard({
        icon: "👤",
        title: "用户信息",
        body: [
          uiKV("用户 ID", String(parts[2])),
          "",
          "<i>可用于 /unban &lt;用户ID&gt; 等指令。</i>",
        ],
      })
    );
    return;
  }

  if (action === "goto") {
    tgAnswerCallback(ctx.callbackId, "消息 #" + parts[3] + " · 会话 " + parts[2], true);
    return;
  }

  tgAnswerCallback(ctx.callbackId, "");
}

/** 入群申请审批 */
function handleJoinRequestCallback(ctx, parts) {
  if (!ctx.isKing) {
    tgAnswerCallback(ctx.callbackId, "仅 Bot 主人可操作。", true);
    return;
  }
  var decision = parts[1];
  var chatId = parts[2];
  var userId = parts[3];

  var r =
    decision === "ok"
      ? tgApproveJoinRequest(chatId, userId)
      : tgDeclineJoinRequest(chatId, userId);

  tgAnswerCallback(ctx.callbackId, r ? "已处理" : "处理失败", !r);
  if (r) {
    tgEditText(
      ctx.chatId,
      ctx.messageId,
      (decision === "ok" ? "✅ 已通过" : "❌ 已拒绝") +
        " 用户 <code>" +
        esc(userId) +
        "</code> 的入群申请\n<i>" +
        esc(nowStr()) +
        "</i>"
    );
  }
}

/* ============================================================================
 * 八·壹、权限名单管理（/auth）：群组屏蔽列表 & 管理员列表
 * ==========================================================================*/

/**
 * /auth —— 管理 authority_management 中的两张名单（仅 Bot 主人）：
 *   群组屏蔽列表（第 3 行）：入群申请与群消息不再推送给主人
 *   管理员列表（第 4 行）：手动维护的管理员 ID（注：权限校验当前仍以 Telegram 官方
 *                         getChatAdministrators 自动获取为准，此表为可视化/备用名单）
 * 子命令：list 查看（带跳转）｜add 新增｜del 删除｜edit 修改
 */
function cmdAuth(ctx, args) {
  if (!ctx.isKing) {
    return uiCard({
      status: "warn",
      icon: "🔒",
      title: "仅 Bot 主人可用",
      body: ["/auth 用于管理「群组屏蔽列表」与「管理员列表」。"],
    });
  }

  var listType = String((args && args[0]) || "").toLowerCase();
  var op = String((args && args[1]) || "list").toLowerCase();
  var isBlock =
    listType === "block" || listType === "屏蔽" || listType === "屏蔽列表";
  var isAdmin =
    listType === "admin" || listType === "管理员" || listType === "管理员列表";

  if (!isBlock && !isAdmin) {
    return uiUsage(
      "/auth",
      "/auth [block|admin] [list|add|del|edit] [参数]",
      [
        "/auth block list",
        "/auth block add -1001234567890",
        "/auth admin list",
        "/auth admin add 959711390",
      ]
    );
  }

  var rowIndex = isBlock ? 3 : 4;
  var label = isBlock ? "群组屏蔽列表" : "管理员列表";
  var kind = isBlock ? "group" : "user";
  var list = authorityRowValues(rowIndex);

  /* ---- 查看 ---- */
  if (op === "list" || op === "ls" || op === "查看" || op === "show") {
    var body = [
      uiKV("名单", label, "📋"),
      uiKV("条目数", String(list.length), "🔢"),
    ];
    if (list.length) {
      body.push("");
      for (var i = 0; i < list.length; i++) {
        var link = resolveJumpLink(kind, list[i]);
        var line = i + 1 + ". <code>" + esc(list[i]) + "</code>";
        if (link) line += ' <a href="' + escAttr(link) + '">打开 ↗</a>';
        body.push(line);
      }
    } else {
      body.push("");
      body.push(
        "<i>" +
          (isBlock
            ? "列表为空：所有群的入群申请与群消息都会推送给主人。"
            : "列表为空。") +
          "</i>"
      );
    }
    body.push("");
    body.push(
      "<i>/auth " +
        (isBlock ? "block" : "admin") +
        " add &lt;ID&gt; 新增 · del &lt;ID&gt; 删除 · edit &lt;旧&gt; &lt;新&gt; 修改</i>"
    );
    return uiCard({
      icon: isBlock ? "🚫" : "🛡",
      title: label + "（查看）",
      body: body,
    });
  }

  /* ---- 新增 ---- */
  if (op === "add" || op === "新增" || op === "加") {
    var addId = String((args && args[2]) || "").trim();
    if (!addId)
      return uiUsage(
        "/auth " + (isBlock ? "block" : "admin") + " add",
        "请附带 ID",
        ["/auth " + (isBlock ? "block" : "admin") + " add -1001234567890"]
      );
    if (list.indexOf(addId) !== -1)
      return uiCard({
        status: "ok",
        icon: isBlock ? "🚫" : "🛡",
        title: "已存在",
        body: ["<code>" + esc(addId) + "</code> 已在" + label + "中。"],
      });
    list.push(addId);
    var okA = setAuthorityRowValues(rowIndex, list);
    return uiCard({
      status: okA ? "ok" : "warn",
      icon: isBlock ? "🚫" : "🛡",
      title: okA ? "已新增" : "写入失败",
      body: [
        "<code>" + esc(addId) + "</code>" + (okA ? " 已加入" + label + "。" : ""),
        okA && isBlock
          ? "该群的入群申请与群消息不再推送给主人。"
          : "",
      ].filter(Boolean),
    });
  }

  /* ---- 删除 ---- */
  if (op === "del" || op === "delete" || op === "rm" || op === "删除" || op === "移除") {
    var delId = String((args && args[2]) || "").trim();
    if (!delId)
      return uiUsage(
        "/auth " + (isBlock ? "block" : "admin") + " del",
        "请附带 ID",
        ["/auth " + (isBlock ? "block" : "admin") + " del -1001234567890"]
      );
    var di = list.indexOf(delId);
    if (di === -1)
      return uiCard({
        status: "ok",
        icon: isBlock ? "🚫" : "🛡",
        title: "不在列表中",
        body: ["<code>" + esc(delId) + "</code> 不在" + label + "中。"],
      });
    list.splice(di, 1);
    var okD = setAuthorityRowValues(rowIndex, list);
    return uiCard({
      status: okD ? "ok" : "warn",
      icon: isBlock ? "🚫" : "🛡",
      title: okD ? "已删除" : "写入失败",
      body: [
        "<code>" + esc(delId) + "</code>" + (okD ? " 已从" + label + "移除。" : ""),
      ].filter(Boolean),
    });
  }

  /* ---- 修改 ---- */
  if (op === "edit" || op === "modify" || op === "修改" || op === "改") {
    var oldId = String((args && args[2]) || "").trim();
    var newId = String((args && args[3]) || "").trim();
    if (!oldId || !newId)
      return uiUsage(
        "/auth " + (isBlock ? "block" : "admin") + " edit",
        "请附带 旧ID 新ID",
        [
          "/auth " +
            (isBlock ? "block" : "admin") +
            " edit -1001234567890 -1009876543210",
        ]
      );
    var ei = list.indexOf(oldId);
    if (ei === -1)
      return uiCard({
        status: "warn",
        icon: isBlock ? "🚫" : "🛡",
        title: "未找到旧值",
        body: ["<code>" + esc(oldId) + "</code> 不在" + label + "中。"],
      });
    list[ei] = newId;
    var okE = setAuthorityRowValues(rowIndex, list);
    return uiCard({
      status: okE ? "ok" : "warn",
      icon: isBlock ? "🚫" : "🛡",
      title: okE ? "已修改" : "写入失败",
      body: [
        "<code>" +
          esc(oldId) +
          "</code> → <code>" +
          esc(newId) +
          "</code>" +
          (okE ? " 已更新。" : ""),
      ].filter(Boolean),
    });
  }

  return uiUsage(
    "/auth",
    "/auth [block|admin] [list|add|del|edit] [参数]",
    ["/auth block list", "/auth block add -1001234567890", "/auth admin list"]
  );
}

/* ============================================================================
 * 九、其它公共工具
 * ==========================================================================*/

/** 所有已知会话 ID（用于广播） */
function knownChatIds() {
  var ids = [];
  var data = readSheet(SHEET.storage);
  for (var i = 3; i < data.length; i++) {
    var cid = String(data[i][6] || "");
    if (cid) ids.push(cid);
  }
  // 加上显式配置了设置的群
  var cs = readSheet(SHEET.chatSettings);
  for (var j = 1; j < cs.length; j++) {
    if (cs[j][0]) ids.push(String(cs[j][0]));
  }
  return uniq(ids).filter(function (x) {
    return /^-?\d+$/.test(x);
  });
}

/**
 * 同步命令菜单到 Telegram。
 * 这是官方提供的"命令面板"能力，用户点输入框左边的按钮就能看到全部指令。
 * 原版完全没有利用这个特性，用户根本不知道机器人有哪些功能。
 */
function syncCommandsToTelegram() {
  var list = COMMANDS.filter(function (c) {
    return c.menu && c.level === "public";
  }).map(function (c) {
    return {
      command: c.cmd,
      description: clip(c.desc, 250),
    };
  });

  // Telegram 限制最多 100 条
  list = list.slice(0, 100);

  var r = tgSetMyCommands(list);

  // 管理员专用命令用另一个 scope，私聊管理员时也能看到
  var adminList = COMMANDS.filter(function (c) {
    return c.menu && c.level === "admin";
  }).map(function (c) {
    return { command: c.cmd, description: clip(c.desc, 250) };
  });
  if (adminList.length) {
    tg(
      "setMyCommands",
      { commands: adminList.slice(0, 100), scope: { type: "all_chat_administrators" } },
      { silent: true }
    );
  }

  if (BRAND.name) tgSetMyName(BRAND.name);

  var desc =
    (BRAND.name || "Bot") +
    " — 群管理、敏感词过滤、天气热榜、AI 对话、实用工具一站式 Telegram 机器人。";
  tgSetMyDescription(desc);
  tgSetMyShortDescription(clip(desc, 118));

  return r ? { ok: true, count: list.length } : { ok: false, error: "setMyCommands 调用失败", count: 0 };
}
