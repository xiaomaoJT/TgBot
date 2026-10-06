/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Channel.gs — 频道消息监听 · 历史查询 · 关键词推送
 * ----------------------------------------------------------------------------
 *  补齐 To-Do 第 2 项。原版只把 channel_post 往表里塞一行就结束了，
 *  既查不出来，也没法"某个频道发了含某个关键词的帖子就通知我"。
 *
 *  这里提供的三件事：
 *    ① 监听 —— 机器人是频道管理员时，频道每条新帖都会进入处理管线；
 *    ② 查询 —— /ch log 按时间倒序查频道历史消息（带分页）；
 *    ③ 推送 —— 按「频道 × 关键词 × 目标会话」三个维度配置转发规则，
 *               命中即推送到指定群 / 私聊，图文原样搬运。
 *
 *  ⚠️ 前提：Telegram 只把频道的 channel_post 推给「该频道的管理员」。
 *     用 @BotFather 之外的方式把机器人加成频道管理员即可（无需额外权限）。
 * ============================================================================
 */

/* ============================================================================
 * 一、订阅表读写
 * ==========================================================================*/

/** "a,b，c|d e" → ["a","b","c","d","e"]，去空去重（空格也算分隔，符合命令行直觉） */
function chSplitList(raw) {
  var s = String(raw === null || raw === undefined ? "" : raw);
  if (!s.trim()) return [];
  var seen = {};
  var out = [];
  s.split(/[,，|、;；\s]+/).forEach(function (x) {
    var v = String(x).trim();
    if (!v) return;
    var k = v.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    out.push(v);
  });
  return out;
}

/**
 * 读取全部监听规则。
 * 表结构：频道ID | 频道名称 | 推送目标 | 关键词 | 状态 | 备注 | 添加时间
 *   · 推送目标留空 = 推送给 Bot 主人（KingId）
 *   · 关键词留空 = 该频道所有新帖都推送
 */
function channelSubs() {
  return cached("channelSubs", 120, function () {
    var rows = readSheet(SHEET.channels);
    var out = [];
    var start = firstDataRow(SHEET.channels) - 1;
    for (var i = start; i < rows.length; i++) {
      var r = rows[i] || [];
      var id = String(r[0] === null || r[0] === undefined ? "" : r[0]).trim();
      if (!id) continue;
      out.push({
        chatId: id,
        title: String(r[1] || "").trim(),
        targets: chSplitList(r[2]),
        keywords: chSplitList(r[3]),
        enabled: String(r[4] || "on").trim().toLowerCase() !== "off",
        note: String(r[5] || "").trim(),
        addedAt: String(r[6] || "").trim(),
        row: i + 1, // 1-based 表格行号，写回时用
      });
    }
    return out;
  });
}

function channelSubsDrop() {
  cacheDrop(["channelSubs"]);
}

/** 只取某个频道的规则（可能有多条，例如不同关键词推不同群） */
function channelSubsOf(chatId) {
  var key = String(chatId);
  return channelSubs().filter(function (s) {
    return String(s.chatId) === key;
  });
}

function channelSubCount() {
  var all = channelSubs();
  return {
    total: all.length,
    enabled: all.filter(function (s) {
      return s.enabled;
    }).length,
    channels: all.length,
  };
}

/** 新增或覆盖一条规则 */
function channelSubSave(sub) {
  var sheet = getSheetOrNull(SHEET.channels);
  if (!sheet) {
    // 表还没建（例如没跑过 initDatabase）→ 就地补建，保持表头行数一致
    initDatabase();
    sheet = getSheetOrNull(SHEET.channels);
  }
  if (!sheet) return false;

  var row = [
    String(sub.chatId),
    String(sub.title || ""),
    (sub.targets || []).join(","),
    (sub.keywords || []).join(","),
    sub.enabled === false ? "off" : "on",
    String(sub.note || ""),
    sub.addedAt || nowStr(),
  ];

  // 已存在同频道 → 就地更新，避免表里堆重复行
  var existed = channelSubsOf(sub.chatId);
  try {
    if (existed.length) {
      sheet.getRange(existed[0].row, 1, 1, row.length).setValues([row]);
      // 同频道多出来的旧行清掉（保留第一条）
      for (var i = existed.length - 1; i >= 1; i--) {
        sheet.getRange(existed[i].row, 1, 1, row.length).setValues([["", "", "", "", "", "", ""]]);
      }
    } else {
      var at = Math.max(sheet.getLastRow() + 1, firstDataRow(SHEET.channels));
      sheet.getRange(at, 1, 1, row.length).setValues([row]);
    }
  } catch (e) {
    logError("channelSubSave", e);
    return false;
  }
  channelSubsDrop();
  return true;
}

/** 删除某频道的全部规则 */
function channelSubRemove(chatId) {
  var sheet = getSheetOrNull(SHEET.channels);
  if (!sheet) return false;
  var list = channelSubsOf(chatId);
  if (!list.length) return false;
  try {
    list.forEach(function (s) {
      sheet.getRange(s.row, 1, 1, 7).setValues([["", "", "", "", "", "", ""]]);
    });
  } catch (e) {
    logError("channelSubRemove", e);
    return false;
  }
  channelSubsDrop();
  return true;
}

/* ============================================================================
 * 二、匹配与内容提取
 * ==========================================================================*/

/**
 * 关键词匹配。
 * ⚠️ 与群内关键字自动回复（matchKeyword）的规则**故意不同**：
 *    那边要防"消息里随便出现一个短词就被机器人插话"，所以 ≤2 字的词要求整句相等；
 *    这边是用户主动订阅的规则，命中即推送才符合预期，
 *    所以一律用「忽略大小写的子串包含」，不做长度限制。
 */
function chMatchText(text, keywords) {
  var kws = keywords || [];
  if (!kws.length) return true; // 没设关键词 = 全量推送
  var low = String(text === null || text === undefined ? "" : text).toLowerCase();
  if (!low) return false;
  return kws.some(function (k) {
    return low.indexOf(String(k).toLowerCase()) !== -1;
  });
}

/** 命中的关键词（用于在推送卡片里标明"为什么推给我"） */
function chHitKeywords(text, keywords) {
  var kws = keywords || [];
  if (!kws.length) return [];
  var low = String(text === null || text === undefined ? "" : text).toLowerCase();
  if (!low) return [];
  return kws.filter(function (k) {
    return low.indexOf(String(k).toLowerCase()) !== -1;
  });
}

/** 频道帖子的可读正文 */
function channelPostText(post) {
  if (!post) return "";
  if (post.text) return String(post.text);
  if (post.caption) return String(post.caption);
  if (post.poll) return "（投票）" + String(get(post, "poll.question", ""));
  var c = detectContent(post);
  return c && c.label ? "（" + c.label + "）" : "";
}

/** 是否带媒体（用来决定要不要 copyMessage 把原图搬过来） */
function channelHasMedia(post) {
  var c = detectContent(post);
  return !!(c && c.fileId);
}

/**
 * 生成原帖链接。
 * 公开频道 → t.me/<username>/<id>；
 * 私有频道 → t.me/c/<去掉 -100 前缀的内部 id>/<id>（点开需已是成员）。
 */
function channelPostLink(post) {
  var chat = (post && post.chat) || {};
  var mid = String((post && post.message_id) || "");
  if (!mid) return "";
  if (chat.username) return "https://t.me/" + chat.username + "/" + mid;
  var bare = String(chat.id || "").replace(/^-100/, "").replace(/^-/, "");
  return bare ? "https://t.me/c/" + bare + "/" + mid : "";
}

/* ============================================================================
 * 三、推送
 * ==========================================================================*/

/** 去重：同一条帖子对同一个目标只推一次（编辑重推不重复打扰） */
function chPushMark(key, ttlSeconds) {
  try {
    if (cacheStore().get(key)) return false;
    cacheStore().put(key, "1", ttlSeconds || 1800);
  } catch (e) {
    /* 缓存不可用时宁可重复也不漏推 */
  }
  return true;
}

/**
 * 把一条频道帖子推给一个目标会话。
 * @return {boolean} 是否真的发出去了
 */
function channelPushPost(post, kind, sub, targetId, opts) {
  var opt = opts || {};
  var key = "chp:" + sub.chatId + ":" + post.message_id + ":" + targetId;
  if (!opt.force && !chPushMark(key, Number(cfg("channel.dedupeMinutes", 30)) * 60)) {
    return false;
  }

  var chat = post.chat || {};
  var text = channelPostText(post);
  var link = channelPostLink(post);
  var hits = chHitKeywords(text, sub.keywords);
  var target = String(targetId);

  var buttons = [];
  if (link) buttons.push([btnUrl("📄 查看原帖", link)]);
  buttons.push([btn("🔕 暂停该频道监听", ["ch", "off", sub.chatId])]);

  var blocks = [
    blkKV("📣", "频道", chat.title || sub.title || sub.chatId),
    blkKV("🕒", "时间", nowStr()),
  ];
  if (hits.length) blocks.push(blkKV("🔑", "命中", hits.join("、")));
  if (kind === "edited_channel_post") blocks.push(blkKV("✏️", "状态", "该帖已被编辑"));

  // 不带媒体时，正文直接写进卡片；带媒体则由 copyMessage 原样搬运
  if (!channelHasMedia(post) || !cfg("channel.includeMedia", true)) {
    if (text) blocks.push(blkDiv(), blkP(clip(text, 1800)));
  }

  var card = richCard({
    icon: "📡",
    title: "频道动态",
    subtitle: clip(String(chat.title || sub.chatId), 40),
    blocks: blocks,
    footer: "命中监听规则 · " + (sub.keywords.length ? "关键词 " + sub.keywords.join("/") : "全部新帖"),
  });

  var ctx = {
    chatId: target,
    userId: String(KingId || ""),
    isGroup: target.indexOf("-") === 0,
    chatType: target.indexOf("-") === 0 ? "supergroup" : "private",
  };

  var sent = sendRichResult(ctx, card, buttons.length ? { reply_markup: kb(buttons) } : undefined);
  var okSent = !!sent;

  // 图文原样搬运
  if (okSent && channelHasMedia(post) && cfg("channel.includeMedia", true)) {
    var copied = tg("copyMessage", {
      chat_id: target,
      from_chat_id: String(chat.id),
      message_id: Number(post.message_id),
    });
    if (!copied) {
      logInfo("channel", "copyMessage 失败（可能不是频道成员）：" + sub.chatId);
    }
  }

  return okSent;
}

/**
 * 频道新帖的扇出入口。由 handleChannelPost 调用。
 * @return {number} 成功推送条数
 */
function channelFanout(post, kind) {
  if (!cfg("channel.enabled", true)) return 0;
  var subs = channelSubs().filter(function (s) {
    return s.enabled;
  });
  if (!subs.length) return 0;

  var chatId = String(get(post, "chat.id", ""));
  var text = channelPostText(post);
  var maxPush = Math.max(1, Number(cfg("channel.maxPushPerPost", 5)));
  var pushed = 0;

  for (var i = 0; i < subs.length && pushed < maxPush; i++) {
    var s = subs[i];
    if (String(s.chatId) !== chatId) continue;
    if (!chMatchText(text, s.keywords)) continue;

    var targets = s.targets.length ? s.targets : KingId ? [String(KingId)] : [];
    for (var j = 0; j < targets.length && pushed < maxPush; j++) {
      if (channelPushPost(post, kind, s, targets[j])) pushed++;
    }
  }
  return pushed;
}

/* ============================================================================
 * 四、频道解析与查询
 * ==========================================================================*/

/**
 * 把用户输入解析成频道标识。
 * 支持：纯数字 ID、@username、t.me 链接、以及"回复一条转发自频道的消息"。
 * @return {{chatId:string, title:string, source:string}|null}
 */
function channelResolve(ctx, token) {
  var t = String(token || "").trim();
  var src = ctx && ctx.reply ? ctx.reply : null;

  // ① 回复的是转发自频道的消息 → 直接取转发来源
  if (!t && src) {
    var fc =
      get(src, "forward_origin.chat", null) ||
      get(src, "forward_from_chat", null) ||
      null;
    if (fc && fc.id) {
      return { chatId: String(fc.id), title: String(fc.title || fc.username || ""), source: "转发消息" };
    }
  }
  if (!t) return null;

  // ② t.me 链接
  var m = t.match(/^(?:https?:\/\/)?t\.me\/(?:c\/)?([A-Za-z0-9_]+)/i);
  if (m) {
    if (/^\d+$/.test(m[1])) {
      return { chatId: "-100" + m[1], title: "", source: "链接" };
    }
    return { chatId: "@" + m[1], title: "@" + m[1], source: "链接" };
  }

  // ③ @用户名
  if (/^@[A-Za-z0-9_]{4,}$/.test(t)) return { chatId: t, title: t, source: "用户名" };

  // ④ 数字 ID（私有频道形如 -100xxxxxxxxxx）
  if (/^-?\d{6,}$/.test(t)) return { chatId: t, title: "", source: "ID" };

  return null;
}

/**
 * 查询频道历史消息。
 * 直接复用 db_telegram —— handleChannelPost 已经在往里写了，
 * 这里只做筛选与倒序，不需要第二份存储。
 */
function channelRecentPosts(chatId, limit) {
  var want = limit || 20;
  var rows = readSheet(SHEET.storage);
  var start = firstDataRow(SHEET.storage) - 1;
  var key = chatId ? String(chatId) : "";
  var out = [];

  for (var i = rows.length - 1; i >= start && out.length < want; i--) {
    var r = rows[i] || [];
    var type = String(r[4] || "");
    if (type.indexOf("频道消息") === -1) continue;
    if (key && String(r[6] || "") !== key) continue;
    out.push({
      time: String(r[0] || ""),
      chatId: String(r[6] || ""),
      chatTitle: String(r[3] || ""),
      type: type,
      content: String(r[7] || ""),
      messageId: String(r[9] || ""),
      edited: type.indexOf("编辑") !== -1,
    });
  }
  return out;
}

/* ============================================================================
 * 五、指令：/ch
 * ==========================================================================*/

/** /ch 总人口：无参数 → 概览面板 */
function apiChannel(args, ctx) {
  var toks = String(args || "").trim().split(/\s+/).filter(Boolean);
  var sub = (toks.shift() || "").toLowerCase();

  switch (sub) {
    case "":
    case "list":
    case "panel":
      return cmdChannelList(ctx);
    case "add":
      return cmdChannelAdd(ctx, toks.join(" "));
    case "del":
    case "remove":
      return cmdChannelDel(ctx, toks.join(" "));
    case "key":
    case "kw":
      return cmdChannelKey(ctx, toks.join(" "));
    case "on":
      return cmdChannelToggle(ctx, toks.join(" "), true);
    case "off":
      return cmdChannelToggle(ctx, toks.join(" "), false);
    case "test":
      return cmdChannelTest(ctx, toks.join(" "));
    case "log":
      return cmdChannelLog(ctx, toks.join(" "));
    default:
      return cmdChannelList(ctx);
  }
}

/** 订阅列表（真表格） */
function cmdChannelList(ctx) {
  var all = channelSubs();
  if (!all.length) {
    return uiWarn("还没有监听任何频道", [
      "把机器人加为频道管理员后，用下面任意一种方式添加：",
      "",
      uiItem("转发一条该频道的消息给我，然后 /ch add"),
      uiItem(uiCmd("/ch add -1001234567890") + "　按 ID 添加"),
      uiItem(uiCmd("/ch add @channelname") + "　按用户名添加"),
      "",
      "<i>加关键词：</i>" +
        uiMono("/ch add -100xxx 小米,红米") +
        "　—— 只有命中关键词的帖子才会推送。",
    ]);
  }

  var rows = all.map(function (s) {
    return [
      (s.enabled ? "🟢 " : "⚪️ ") + (s.title || s.chatId),
      uiMono(s.chatId),
      s.keywords.length ? s.keywords.join("/") : "全部新帖",
      s.targets.length ? s.targets.join("/") : "Bot 主人",
    ];
  });

  return {
    rich: richCard({
      icon: "📡",
      title: "频道监听列表",
      subtitle: all.filter(function (s) { return s.enabled; }).length + " / " + all.length + " 个频道已启用",
      blocks: [
        blkTable(["频道", "频道 ID", "关键词", "推送到"], rows, ["l", "l", "l", "l"]),
        blkDiv(),
        blkP([
          inT("新增："),
          inC("/ch add <频道ID> [关键词]"),
          inT("　暂停："),
          inC("/ch off <频道ID>"),
        ]),
      ],
      footer: "机器人需为频道管理员才能收到新帖",
    }),
  };
}

function cmdChannelAdd(ctx, args) {
  var toks = String(args || "").split(/\s+/).filter(Boolean);
  var to = "here";
  var rest = [];
  toks.forEach(function (t) {
    if (/^to:/i.test(t)) to = t.slice(3);
    else rest.push(t);
  });

  var src = channelResolve(ctx, rest[0]);
  if (!src) {
    return uiUsage("/ch add", "/ch add <频道ID|@用户名|t.me链接> [关键词…] [to:<目标>]", [
      "转发一条该频道的消息给我，然后发送 /ch add",
      "/ch add -1001234567890 小米,红米,澎湃",
      "/ch add @某频道 to:-1009876543210",
      "",
      "<i>关键词留空 = 该频道每条新帖都推送；</i>",
      "<i>to: 留空 = 推送到当前会话，to:owner = 推送给 Bot 主人。</i>",
    ]);
  }

  var keywords = chSplitList(rest.slice(1).join(" "));
  var targets;
  if (!to || to.toLowerCase() === "here") {
    targets = ctx && ctx.chatId ? [String(ctx.chatId)] : [];
  } else if (to.toLowerCase() === "owner" || to.toLowerCase() === "king") {
    targets = []; // 空 = Bot 主人
  } else {
    targets = chSplitList(to);
  }

  var ok = channelSubSave({
    chatId: src.chatId,
    title: src.title,
    targets: targets,
    keywords: keywords,
    enabled: true,
    addedAt: nowStr(),
  });
  if (!ok) return uiFail("保存失败", ["请检查表格是否可写，或运行 /health 自检。"]);

  return uiOK("已开始监听", [
    uiKV("频道", src.title || src.chatId, "📣"),
    uiKV("频道 ID", uiMono(src.chatId), "🔢"),
    uiKV("识别方式", src.source, "🔎"),
    uiKV("关键词", keywords.length ? keywords.join("、") : "全部新帖", "🔑"),
    uiKV("推送到", targets.length ? targets.join("、") : "Bot 主人私聊", "🎯"),
    "",
    "<i>⚠️ 请确认机器人已被设为该频道管理员，否则收不到新帖。</i>",
    "<i>配好后可以用 " + uiCmd("/ch test " + src.chatId) + " 验证推送链路。</i>",
  ]);
}

function cmdChannelDel(ctx, args) {
  var src = channelResolve(ctx, String(args || "").split(/\s+/)[0]);
  if (!src) return uiUsage("/ch del", "/ch del <频道ID>（也可回复一条转发消息）");
  var existed = channelSubsOf(src.chatId);
  if (!existed.length) return uiWarn("没有这个频道的监听规则", [uiMono(src.chatId)]);
  if (!channelSubRemove(src.chatId)) return uiFail("删除失败");
  return uiOK("已停止监听", [
    uiKV("频道", existed[0].title || src.chatId, "📣"),
    uiKV("频道 ID", uiMono(src.chatId), "🔢"),
  ]);
}

function cmdChannelKey(ctx, args) {
  var toks = String(args || "").split(/\s+/).filter(Boolean);
  var src = channelResolve(ctx, toks[0]);
  if (!src) return uiUsage("/ch key", "/ch key <频道ID> [关键词1,关键词2]（留空关键词=全部推送）");
  var existed = channelSubsOf(src.chatId);
  if (!existed.length) {
    return uiWarn("该频道还没有监听规则", ["先执行 " + uiCmd("/ch add " + src.chatId)]);
  }
  var keywords = chSplitList(toks.slice(1).join(" "));
  var sub = existed[0];
  sub.keywords = keywords;
  if (!channelSubSave(sub)) return uiFail("保存失败");
  return uiOK("关键词已更新", [
    uiKV("频道", sub.title || src.chatId, "📣"),
    uiKV("关键词", keywords.length ? keywords.join("、") : "全部新帖", "🔑"),
  ]);
}

function cmdChannelToggle(ctx, args, on) {
  var src = channelResolve(ctx, String(args || "").split(/\s+/)[0]);
  if (!src) return uiUsage("/ch on|off", "/ch on <频道ID>　/　/ch off <频道ID>");
  var existed = channelSubsOf(src.chatId);
  if (!existed.length) return uiWarn("该频道还没有监听规则");
  existed[0].enabled = on;
  if (!channelSubSave(existed[0])) return uiFail("保存失败");
  return uiAction(on, (on ? "已恢复" : "已暂停") + "监听：" + (existed[0].title || src.chatId));
}

/** 发一条测试消息，验证"机器人能不能往目标会话发消息" */
function cmdChannelTest(ctx, args) {
  var src = channelResolve(ctx, String(args || "").split(/\s+/)[0]);
  if (!src) return uiUsage("/ch test", "/ch test <频道ID>");
  var existed = channelSubsOf(src.chatId);
  if (!existed.length) return uiWarn("该频道还没有监听规则");

  var sub = existed[0];
  var targets = sub.targets.length ? sub.targets : KingId ? [String(KingId)] : [];
  if (!targets.length) {
    return uiWarn("没有可用的推送目标", ["请用 " + uiMono("/ch add " + sub.chatId + " to:<目标会话ID>")]);
  }

  var fake = {
    chat: { id: sub.chatId, title: sub.title || sub.chatId },
    message_id: 0,
  };
  var results = [];
  targets.forEach(function (t) {
    var sent = channelPushPost(fake, "channel_post", sub, t, { force: true });
    results.push([t, sent ? "✅ 已送达" : "❌ 发送失败"]);
  });

  return {
    rich: richCard({
      status: "info",
      icon: "🧪",
      title: "推送链路测试",
      subtitle: sub.title || sub.chatId,
      blocks: [
        blkTable(["目标会话", "结果"], results, ["l", "l"]),
        blkDiv(),
        blkP("若失败：确认机器人已在目标群内，且未被限制发言。"),
      ],
    }),
  };
}

/** 频道历史消息查询（分页） */
function cmdChannelLog(ctx, args) {
  var toks = String(args || "").split(/\s+/).filter(Boolean);
  var page = 0;
  var src = null;
  toks.forEach(function (t) {
    if (/^\d+$/.test(t) && String(t).length <= 3) page = Number(t);
    else if (!src) src = channelResolve(ctx, t);
  });

  return channelLogCard(src ? src.chatId : "", page);
}

function channelLogCard(chatId, page) {
  var per = 8;
  var all = channelRecentPosts(chatId, 200);
  if (!all.length) {
    return uiWarn("没有查到频道消息", [
      chatId ? "频道 " + uiMono(chatId) + " 暂无记录。" : "还没有任何频道消息入库。",
      "",
      "<i>机器人只有在被设为频道管理员之后才能收到新帖；",
      "现在加管理员，只影响之后的帖子。</i>",
    ]);
  }

  var pg = paginate(all, page, per);
  var rows = pg.slice.map(function (p) {
    return [
      p.time,
      (p.edited ? "✏️ " : "") + (p.chatTitle || p.chatId),
      clip(String(p.content).replace(/\n/g, " "), 60),
    ];
  });

  var markup =
    pg.totalPages > 1
      ? kb([
          [
            pg.hasPrev ? btn("◀️ 上一页", ["ch", "log", chatId || "-", pg.page - 1]) : btn("·", ["noop"]),
            btn(pg.page + 1 + " / " + pg.totalPages, ["noop"]),
            pg.hasNext ? btn("下一页 ▶️", ["ch", "log", chatId || "-", pg.page + 1]) : btn("·", ["noop"]),
          ],
        ])
      : undefined;

  return {
    rich: richCard({
      icon: "🗂",
      title: "频道消息记录",
      subtitle: (chatId ? chatId + " · " : "全部频道 · ") + "共 " + pg.total + " 条",
      blocks: [blkTable(["时间", "频道", "内容"], rows, ["l", "l", "l"])],
      footer: "只统计机器人收到过的频道消息",
    }),
    markup: markup,
  };
}

/* ============================================================================
 * 六、按钮回调
 * ==========================================================================*/

/** 处理 ["ch", ...] 回调；返回 true 表示已处理 */
function channelHandleCallback(ctx, parts) {
  var action = parts[1] || "";
  var chatId = parts[2] === "-" ? "" : parts[2] || "";

  if (action === "off") {
    var existed = channelSubsOf(chatId);
    if (!existed.length) {
      tgAnswerCallback(ctx.callbackId, "该监听规则已不存在。", false);
      return true;
    }
    existed[0].enabled = false;
    channelSubSave(existed[0]);
    tgAnswerCallback(ctx.callbackId, "已暂停监听", true);
    var card = richCard({
      status: "info",
      icon: "🔕",
      title: "已暂停监听",
      subtitle: existed[0].title || chatId,
      footer: "用 /ch on " + chatId + " 恢复",
    });
    editRichResult(ctx.chatId, ctx.messageId, card, undefined);
    return true;
  }

  if (action === "log") {
    tgAnswerCallback(ctx.callbackId, "");
    var logCard = channelLogCard(chatId, Number(parts[3] || 0));
    editRichResult(ctx.chatId, ctx.messageId, logCard.rich, logCard.markup);
    return true;
  }

  tgAnswerCallback(ctx.callbackId, "未知操作", false);
  return true;
}
