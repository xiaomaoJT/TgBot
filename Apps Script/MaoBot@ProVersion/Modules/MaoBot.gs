/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  MaoBot.gs — 入口 doPost + 全量 update 路由 + 关键字回复引擎
 * ----------------------------------------------------------------------------
 *  相比原版的变化：
 *    · 支持全部 update 类型（原版只处理 message / callback_query / channel_post，
 *      遇到 inline_query、my_chat_member 等会在 `userMessage.message.hasOwnProperty`
 *      处直接抛异常）；
 *    · update_id 幂等去重，避免 Telegram 重推造成重复回复；
 *    · 消息处理流程改为清晰的中间件链：安全 → 反刷屏 → 指令 → 关键字 → 兜底；
 *    · 关键字回复支持真正的多段发送、长度切分、HTML 自动转义。
 * ============================================================================
 */

/* ============================================================================
 * 一、入口
 * ==========================================================================*/

/* ⚠️⚠️ 302 这件事的最终结论（2026-10-05，查 Google 官方社区 + StackOverflow 后定稿）
 *
 *  【真相】GAS 的 /exec 对 **POST 请求架构上永远回 302**：
 *      请求先打到 Google 前端 → 302 → script.googleusercontent.com/macros/echo
 *      → 真正的响应内容在 echo 那里（而且 echo 只认 GET）。
 *      浏览器/curl -L/fetch 会自动跟随重定向，所以感觉不到；
 *      **Telegram 不跟随重定向，看到 302 直接判投递失败** → 机器人哑掉。
 *      Google 官方社区原话："HTTP POST requests always redirect (302) for
 *      GAS Web Apps. The client has to be able to follow the redirect."
 *
 *  【解法】doPost 的返回值从 ContentService 换成 **HtmlService**：
 *      ContentService → 302 中转；HtmlService → **直接 200、不重定向**。
 *      StackOverflow 高赞答案原话："By returning HtmlService.createHtmlOutput(),
 *      it will return a 200 response, with no redirections. This made
 *      Apps Script doPost work as a webhook destination."
 *      ⚠️ 2026-10-05 上午试过一次说"无效"，那是被**固定版本部署跑旧快照**骗了
 *         （push 了但没 --deploy，线上还是老代码）——不是方案本身的问题。
 *         以后凡是验证"改了代码有没有用"，先跑 node Tools/verify-push.js。
 *
 *  【备用】真要是 HtmlService 也不行，再退轮询（switchToPolling）：
 *      时间触发器的执行身份恒为「我」，整个 Web App 链路都不用碰，
 *      代价是每分钟才跑一次，延迟 0~60 秒。
 */
function doPost(e) {
  RUNTIME.t0 = Date.now();
  var update = null;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return htmlOk("no payload");
    }

    try {
      update = JSON.parse(e.postData.contents);
    } catch (err) {
      logError("doPost:parse", err);
      return htmlOk("bad json");
    }

    handleUpdate(update);
    markDone();
  } catch (err) {
    logError("doPost", err, update ? { update_id: update.update_id } : null);
    // 原来这里只 logError —— 用户侧表现就是「发指令完全没反应」，
    // 而日志在 GAS 编辑器里，不主动提示的话根本无从查起。
    reportFailure(update, err);
  }
  // 必须尽快、且以 200（而非 302）返回，否则 Telegram 会判定投递失败并重推
  return htmlOk("ok");
}

/**
 * Webhook 响应的唯一正确姿势 —— 必须用 HtmlService。
 *
 * ContentService 会被 GAS 前端改成 302 + echo 中转（浏览器透明、Telegram 致命）；
 * HtmlService 直接 200。内容本身没人看，Telegram 只看状态码。
 */
function htmlOk(text) {
  try {
    return HtmlService.createHtmlOutput(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>MaoBot</title></head><body><pre>" +
        esc(String(text == null ? "" : text)) +
        "</pre></body></html>"
    );
  } catch (e) {
    // 极端兜底：连 HtmlService 都用不了的话，只能回到 ContentService
    return ContentService.createTextOutput(String(text == null ? "" : text));
  }
}

/**
 * Web App 的 GET 入口。
 *
 * 为什么必须存在：Telegram 只发 POST，本来用不到 doGet，
 * 但 GAS Web App 有个反直觉的行为 —— **浏览器直接访问 /exec 时，GAS 找的是
 * doGet，找不到就抛「找不到脚本函数：doGet」**。曾经把这个页面误判成故障，
 * 白白排查了一轮。
 *
 * 所以它只做一件事：把当前接入状态原样吐出来，打开 /exec 就能自检。
 */
function doGet(e) {
  var mode = typeof accessMode === "function" ? accessMode() : "unknown";
  var lines = [
    "MaoBot · ProVersion   运行中 ✅",
    "",
    "接收模式：" + (mode === "polling" ? "轮询（时间触发器，延迟 0~60 秒）" : "Webhook（实时）"),
    "接收通道：doPost —— Telegram 走的就是它",
    "",
    "【自检】在这个地址后面发一条 POST，看返回码：",
    "  curl -s -o /dev/null -w '%{http_code}\\n' -X POST <本地址> \\",
    "    -H 'Content-Type: application/json' -d '{\"update_id\":-1}'",
    "  · 200 = 通道正常（HtmlService 直返，Telegram 能收到）",
    "  · 302 = 又回了 ContentService 的老路，Webhook 会被 Telegram 判失败",
    "",
    "【已知坑】GAS 的 /exec 对 POST 架构上会 302 中转（macros/echo），",
    "  而 Telegram 不跟随重定向 —— 所以 doPost 必须用 HtmlService 返回，",
    "  这样才能直接 200。细节见 Modules/MaoBot.gs 顶部注释。",
    "",
    "【兜底】Webhook 万一又不可用：Telegram 里发 /mode polling 切轮询，",
    "  或直接在编辑器运行 switchToPolling()。",
    "",
    "本文 Thor 生成于 " + new Date().toISOString()
  ];
  return htmlOk(lines.join("\n"));
}

/* ----------------------------------------------------------------------------
 * 耗时埋点 —— 「响应很慢」这种事不量化就没法优化
 * --------------------------------------------------------------------------*/

/** 阶段打点 */
function mark(tag) {
  RUNTIME.marks.push({ tag: tag, at: Date.now() });
  return Date.now();
}

/** 收尾：把总耗时记进缓存，/health 里能看到 */
function markDone() {
  var dur = RUNTIME.t0 ? Date.now() - RUNTIME.t0 : -1;
  RUNTIME.duration = dur;
  logInfo("perf", "总耗时 " + dur + "ms " + (RUNTIME.stages || []).join(" → "));
  if (dur >= 0) {
    try {
      cacheStore().put("perf:last", String(dur), 3600);
      cacheStore().put("perf:at", nowStr(), 3600);
      // 超过 5 秒才留慢记录，避免缓存里全是噪音
      if (dur > 5000) cacheStore().put("perf:slow", String(dur), 21600);
    } catch (e) {}
  }
}

/**
 * 出错时给用户一句人话。
 * 只对「指令类消息」回话：群里普通聊天出错不该刷屏，
 * 而指令是用户明确在等的操作，石沉大海最伤体验。
 */
function reportFailure(update, err) {
  try {
    var msg =
      update && (update.message || update.edited_message || (update.callback_query && update.callback_query.message));
    if (!msg || !msg.chat || !msg.chat.id) return;

    var text = String(msg.text || msg.caption || "").trim();
    if (text.charAt(0) !== "/") return; // 非指令，静默（避免群聊刷屏）

    var em = err && err.message ? err.message : String(err);
    var dur = RUNTIME.t0 ? Date.now() - RUNTIME.t0 : -1;
    var body = [
      uiCode(clip(em, 220)),
      "",
      uiKV("耗时", (dur >= 0 ? dur + " ms" : "未知") + "　·　update " + (update ? update.update_id : "-")),
      "",
      "<i>排查：① 私聊发 /health 看自检　② GAS 编辑器 → 执行记录 看堆栈</i>",
      "<i>　　　③ 表格 error_log 表里有完整错误</i>",
    ];
    tg("sendMessage", {
      chat_id: msg.chat.id,
      text: uiCard({ status: "fail", title: "这条指令没能处理完", body: body }),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  } catch (e) {
    // 连报错都发不出去就算了，绝不能在这里再抛
  }
}

/** 脚本属性读写（setValue 类型不存在时会自动新建，这里包一层容错） */
function setProp(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, String(value));
  } catch (e) {}
}

function getProp(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key) || "";
  } catch (e) {
    return "";
  }
}

/** 供轮询模式 / 本地调试复用 */
function handleUpdate(update) {
  if (!update) return;

  // 设定本请求的当前语言（供 L() 使用）：按 chatId 从 chat_settings 读取，
  // 私聊 / 群各自独立；读不到则回落默认中文。失败也不影响主流程。
  try {
    var __chat = get(update, "message.chat.id")
      || get(update, "callback_query.message.chat.id")
      || get(update, "channel_post.chat.id")
      || get(update, "edited_message.chat.id")
      || get(update, "my_chat_member.chat.id");
    setCurrentLang(getLang({ chatId: __chat }));
  } catch (e) {
    setCurrentLang(DEFAULT_LANG);
  }

  // 幂等：同一个 update 只处理一次
  if (isDuplicateUpdate(update.update_id)) {
    logInfo("dedupe", "跳过重复 update " + update.update_id);
    return;
  }

  RUNTIME.update = update;
  RUNTIME.updateId = update.update_id;

  /* ---- 1. 回调按钮 ---- */
  if (update.callback_query) {
    var cq = update.callback_query;
    var cqCtx = buildCtx(cq.message, "callback", update);
    cqCtx.callbackId = cq.id;
    cqCtx.callbackData = cq.data || "";
    cqCtx.userId = String(get(cq, "from.id", cqCtx.userId));
    cqCtx.userName = userNameOf(cq.from) || cqCtx.userName;
    cqCtx.isKing = String(cqCtx.userId) === String(KingId);
    handleCallback(cqCtx);
    return;
  }

  /* ---- 2. 内联查询 ---- */
  if (update.inline_query) {
    handleInlineQuery(update.inline_query);
    return;
  }

  /* ---- 3. 机器人自身成员状态变化（被拉群 / 被踢） ---- */
  if (update.my_chat_member) {
    handleMyChatMember(update.my_chat_member);
    return;
  }

  /* ---- 4. 入群申请 ---- */
  if (update.chat_join_request) {
    handleJoinRequest(update.chat_join_request);
    return;
  }

  /* ---- 5. 频道消息 ---- */
  if (update.channel_post) {
    handleChannelPost(update.channel_post, "channel_post");
    return;
  }
  if (update.edited_channel_post) {
    handleChannelPost(update.edited_channel_post, "edited_channel_post");
    return;
  }

  /* ---- 6. 消息编辑 ---- */
  if (update.edited_message) {
    var eCtx = buildCtx(update.edited_message, "edited_message", update);
    if (cfg("storage.enabled", true)) saveStorage(eCtx, "消息编辑");
    return;
  }

  /* ---- 7. 普通消息 ---- */
  var msg = update.message;
  if (!msg) {
    logInfo("update", "未处理的 update 类型: " + Object.keys(update).join(","));
    return;
  }

  var ctx = buildCtx(msg, "message", update);

  // 入群 / 退群 / 群组变更 先处理
  if (msg.new_chat_members) {
    if (cfg("storage.enabled", true)) saveStorage(ctx, "入群事件");
    handleJoin(ctx);
    return;
  }
  if (msg.left_chat_member) {
    if (cfg("storage.enabled", true)) saveStorage(ctx, "退群事件");
    handleLeave(ctx);
    return;
  }

  // 不处理其它机器人（除非显式开启）
  if (get(msg, "from.is_bot", false) && !cfg("king.pushBots", false)) {
    return;
  }

  // 消息存储
  // ⚠️ 指令类消息（/xxx）在**群聊**里跳过存储：不值得为它多写一次表格，
  //    这也是「指令要等一下才有反应」的主要来源之一。
  //    ⭐ 例外：私聊指令要留痕 —— 「我给机器人发了 /ping，表里怎么没有？」
  //    是一种很常见的困惑（指令本来就不入表，看起来像"私聊完全没被记录"）。
  //    私聊只有一个人，多写一行对用户是自查价值，不是噪音。
  var isCmdMsg = String(ctx.text || "").trim().charAt(0) === "/";
  var logCmdMsg = isCmdMsg && ctx.isPrivate && cfg("storage.privateCommands", true);
  if ((!isCmdMsg || logCmdMsg) && cfg("storage.enabled", true)) {
    // 表被删了 / 从没建过就顺手续上，别让消息静默写丢
    // （appendRow 里也会兜底建，这里先探一次是为了少一次 getSheetByName 之外的开销）
    ensureSheet(SHEET.storage);
    saveStorage(ctx, isCmdMsg ? resolvedStorageType(ctx) + "·指令" : resolvedStorageType(ctx));
  }

  // 推送给主人
  if (!isCmdMsg) pushToKing(ctx);

  /* ---- 7.1 安全过滤（敏感词）---- */
  if (securityFilter(ctx)) return;

  /* ---- 7.2 反刷屏 ---- */
  if (antiFloodCheck(ctx)) return;

  /* ---- 7.3 图片 / 视频 ID 便捷查询（兼容原版 #photoid 用法）---- */
  var cap = String(msg.caption || "").trim().toLowerCase();
  if (cap === "#photoid" || cap === "#videoid") {
    var c = detectContent(msg);
    if (c.fileId) {
      sendCard(
        ctx,
        uiCard({
          status: "ok",
          title: "文件 ID 已提取",
          subtitle: "类型：" + c.label,
          body: [
            uiCode(c.fileId),
            "",
            "<i>可填入关键字表的 GraphicMessage / VideoMessage 内容块。</i>",
          ],
        })
      );
      return;
    }
  }

  /* ---- 7.4 指令路由 ---- */
  var cmdResult = runCommand(ctx);
  if (cmdResult !== undefined) {
    deliverResult(ctx, cmdResult);
    return;
  }

  /* ---- 7.5 关键字自动回复 ---- */
  // ⚠️ 约定：undefined = 未命中（继续走兜底）；null = 已命中并自行发送完毕
  var kwResult = matchKeyword(ctx);
  if (kwResult !== undefined) {
    deliverResult(ctx, kwResult);
    return;
  }

  /* ---- 7.6 兜底 ---- */
  fallbackReply(ctx);
}

/* ============================================================================
 * 二、上下文构建
 * ==========================================================================*/

function userNameOf(user) {
  if (!user) return "";
  return [user.first_name || "", user.last_name || ""].join("") || user.username || String(user.id);
}

function buildCtx(msg, kind, update) {
  var chat = (msg && msg.chat) || {};
  var from = (msg && msg.from) || {};

  var chatId = String(chat.id || "");
  var userId =
    chat.type === "private" ? String(from.id || "") : String(from.id || chatId);

  return {
    update: update,
    kind: kind,
    message: msg,
    messageId: msg ? String(msg.message_id) : null,
    chat: chat,
    chatId: chatId,
    chatType: chat.type || "unknown",
    chatTitle: chat.title || [from.first_name || "", from.last_name || ""].join(""),
    isGroup: String(chat.id || "").indexOf("-") === 0,
    isPrivate: chat.type === "private",
    threadId: msg ? msg.message_thread_id || null : null,
    from: from,
    userId: userId,
    userName: userNameOf(from),
    userNameKey: from.username ? "@" + from.username : "",
    text: msg ? msg.text || "" : "",
    reply: msg ? msg.reply_to_message || null : null,
    isKing: String(userId) === String(KingId) && !!KingId,
    isBotOwner: null, // 惰性求值
  };
}

function resolvedStorageType(ctx) {
  if (ctx.isPrivate) return "私聊消息";
  if (ctx.chatType === "group" || ctx.chatType === "supergroup") return "群聊消息";
  return "其它消息";
}

/**
 * 把指令/关键字处理器返回的东西统一发出去。
 * 返回值可以是：字符串 / {text, markup} / {rich:{md,html}} / {photo} / null（已自行发送）
 *
 * 路由规则（本轮新增）：
 *   · 返回 {rich}  → 优先富消息，失败自动降级 HTML
 *   · ctx.cmdEph   → 该指令标记了「个人查询」，群内改走临时消息（仅本人可见）
 */
function deliverResult(ctx, result) {
  if (result === null || result === undefined) return;

  // 群内「仅本人可见」的路由判定
  var useEph = false;
  if (ctx.isGroup && ctx.cmdEph && cfg("ui.ephemeral", true)) {
    // 群级开关（默认开）—— 管理员可在 /settings 里关掉
    useEph = getChatSetting(ctx.chatId, "eph", "on") === "on";
  }

  /* ---- 富消息结果 ---- */
  if (result.rich) {
    var richExtra = { reply_markup: result.markup !== undefined ? result.markup : defaultInlineKeyboard(ctx) };
    if (result.replyTo) richExtra.reply_parameters = { message_id: result.replyTo };
    if (useEph) {
      sendEphemeralRich(ctx, result.rich, cfg("autoDelete.delaySeconds", 60), richExtra);
    } else {
      sendRichResult(ctx, result.rich, richExtra);
    }
    return;
  }

  /* ---- 纯文本/HTML 结果 ---- */
  if (typeof result === "string") {
    if (useEph) {
      sendEphemeral(ctx, result, cfg("autoDelete.delaySeconds", 60), {
        reply_markup: defaultInlineKeyboard(ctx),
      });
    } else {
      sendCard(ctx, result, { reply_markup: defaultInlineKeyboard(ctx) });
    }
    return;
  }

  /* ---- 图片结果 ---- */
  if (result.photo) {
    tgSendPhoto(ctx, result.photo, result.caption || "", { reply_markup: result.markup });
    return;
  }

  /* ---- {text, markup} 结果 ---- */
  if (result.text) {
    var extra = {
      reply_markup: result.markup !== undefined ? result.markup : defaultInlineKeyboard(ctx),
      reply_parameters: result.replyTo ? { message_id: result.replyTo } : undefined,
    };
    if (useEph) {
      sendEphemeral(ctx, result.text, cfg("autoDelete.delaySeconds", 60), extra);
    } else {
      sendCard(ctx, result.text, extra);
    }
    return;
  }
}

/** 默认的跟随按钮（自动过滤未配置的链接） */
function defaultInlineKeyboard(ctx) {
  var rows = [];
  if (BRAND.repo) rows.push([btnUrl("📦 源码仓库", BRAND.repo)]);
  if (BRAND.channel) {
    rows.push([btnUrl("📣 加入频道", BRAND.channel)]);
  }
  if (ctx.isGroup && ctx.isPrivate === false) {
    rows.push([btn("🎛 功能面板", ["menu", "main"])]);
  }
  return kb(rows);
}

/* ============================================================================
 * 三、兜底回复
 * ==========================================================================*/

function fallbackReply(ctx) {
  // 只在"私聊"或"回复机器人"或"被 @ 提及"时才回应，避免群里刷屏
  var mentioned = false;
  try {
    mentioned = (ctx.message.entities || []).some(function (en) {
      return en.type === "mention";
    });
  } catch (e) {}
  var replyingBot =
    ctx.reply && String(get(ctx.reply, "from.id", "")) === String(botIdAlone);

  if (!ctx.isPrivate && !replyingBot && !mentioned) return;

  // 回复机器人消息 → 走 AI 续聊
  if (replyingBot) {
    var prompt = ctx.text || readableContent(ctx.message);
    if (!aiStatus().ok) return;
    withTyping(ctx, "typing", function () {});
    var r = apiAIText(prompt, ctx);
    if (r.ok) {
      sendRichResult(
        ctx,
        richCard({ icon: "🤖", title: "AI 回复", blocks: [blkQuote(r.text)] }),
        { reply_markup: defaultInlineKeyboard(ctx) }
      );
    } else {
      sendCard(ctx, uiFail("暂时无法回复", ["<i>" + esc(r.text) + "</i>"]));
    }
    return;
  }

  // 普通兜底
  var body = [
    L("我没有找到与 <b>" + esc(clip(ctx.text, 40)) + "</b> 匹配的内容。",
      "I couldn't find anything matching <b>" + esc(clip(ctx.text, 40)) + "</b>."),
    "",
    uiItem(L("发送 " + uiCmd("/help") + " 查看全部功能",
      "Send " + uiCmd("/help") + " to see all features")),
    uiItem(L("发送 " + uiCmd("/menu") + " 打开功能面板",
      "Send " + uiCmd("/menu") + " to open the panel")),
  ];
  if (aiStatus().ok) {
    body.push(uiItem(L("用 " + uiCmd("/ai 你的问题") + " 直接问 AI",
      "Or ask AI directly with " + uiCmd("/ai your question"))));
  }

  sendCard(
    ctx,
    uiCard({ icon: THEME.title, title: L("未匹配到内容", "No match found"), body: body }),
    { reply_markup: defaultInlineKeyboard(ctx) }
  );
}

/* ============================================================================
 * 四、关键字回复引擎
 * ==========================================================================*/

/**
 * 读取关键字表并构建回复列表。
 * 表结构（与原版兼容）：
 *   A 列：关键字（英文逗号分隔，支持多个）
 *   B 列：标识块 = HTML / MarkdownV2 / GraphicMessage / VideoMessage
 *   C 列起：内容块 1、内容块 2…（多段会连续发送）
 */
function buildKeywords() {
  var data = readSheet(SHEET.keywords);
  var list = [];
  if (!data || data.length <= 3) return list;

  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    var rawKey = String(row[0] || "").trim();
    if (!rawKey) continue;

    var keywords = rawKey
      .split(/[,，]/)
      .map(function (k) {
        return k.trim();
      })
      .filter(Boolean);
    if (!keywords.length) continue;

    var mode = String(row[1] || "HTML").trim();
    var blocks = row.slice(2).filter(function (b) {
      return b !== "" && b !== null && b !== undefined;
    });

    var item = { keywords: keywords, mode: mode, raw: rawKey };
    var blockTexts = blocks.map(function (b) {
      return String(b);
    });

    if (mode === "GraphicMessage" || mode === "VideoMessage") {
      var mediaLines = String(blockTexts[0] || "")
        .split("\n")
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean);
      var caption = String(blockTexts[1] || "");
      item.media = mediaLines.map(function (url, idx) {
        var m = {
          type: mode === "GraphicMessage" ? "photo" : "video",
          media: url,
        };
        if (idx === mediaLines.length - 1 && caption) {
          m.caption = caption;
          m.parse_mode = "MarkdownV2";
        }
        return m;
      });
      item.blocks = [];
    } else if (mode === "MarkdownV2") {
      item.blocks = blockTexts.map(escMdSafe);
    } else {
      // HTML：逐行处理 <a> 简写语法
      item.blocks = blockTexts.map(function (txt) {
        return String(txt)
          .split("\n")
          .map(convertShortLink)
          .join("\n");
      });
    }

    if (!item.blocks.length && !(item.media && item.media.length)) {
      item.blocks = ["<i>该关键字内容为空，请检查表格配置。</i>"];
    }

    list.push(item);
  }
  return list;
}

/** 支持表格里写 `<a>https://x.com</a>` 这种简写 → 变成真正的超链接 */
function convertShortLink(line) {
  var s = String(line);
  var m = s.match(/^<a>(https?:\/\/[^\s<]+)<\/a>$/);
  if (m) return aLink(m[1], m[1]);
  // 行内出现 <a>url</a> 时，把它变成"整行可点"
  var m2 = s.match(/<a>(https?:\/\/[^\s<]+)<\/a>/);
  if (m2) {
    var rest = s.replace(m2[0], "").trim();
    return aLink(m2[1], rest || m2[1]);
  }
  return s;
}

/** MarkdownV2 内容：转义会破坏用户已写好的格式，这里只做换行规整 */
function escMdSafe(text) {
  return String(text);
}

function loadKeywords() {
  return cached("keyParamsList", cfg("cache.ttlSeconds", 10800), buildKeywords);
}

/**
 * 关键字匹配。
 * @return {undefined|null}
 *   undefined 表示未命中，调用方应继续走兜底回复；
 *   null 表示已命中，且回复已由本函数直接发出。
 */
function matchKeyword(ctx) {
  var text = ctx.text;
  if (!text) return undefined;

  var list = loadKeywords();
  if (!list.length) return undefined;

  // 群聊里没有 @ 机器人时，只有"纯关键字消息"才回复，避免误触
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var hit = item.keywords.some(function (k) {
      if (!k) return false;
      // 短关键字（≤2 字）要求完全相等，避免"好"这种词到处误触发
      if (k.length <= 2) return text.trim() === k;
      return text.indexOf(k) !== -1;
    });
    if (!hit) continue;

    // 媒体组类型
    if (item.media && item.media.length) {
      if (item.media.length === 1 && item.media[0].type === "photo") {
        tgSendPhoto(ctx, item.media[0].media, item.media[0].caption || "", {
          reply_markup: defaultInlineKeyboard(ctx),
        });
        return null;
      }
      if (item.media.length === 1 && item.media[0].type === "video") {
        tg(
          "sendVideo",
          {
            chat_id: ctx.chatId,
            video: item.media[0].media,
            caption: item.media[0].caption || "",
            parse_mode: item.media[0].caption ? "MarkdownV2" : undefined,
            reply_markup: defaultInlineKeyboard(ctx),
          }
        );
        return null;
      }
      tgSendMediaGroup(ctx, item.media);
      return null;
    }

    // 文本类型：第 1 段带按钮，其余段落依次发送
    var first = item.blocks[0] || "";
    var rest = item.blocks.slice(1);
    var parseMode = item.mode === "MarkdownV2" ? "MarkdownV2" : "HTML";

    var sent = tg("sendMessage", {
      chat_id: ctx.chatId,
      text: first,
      parse_mode: parseMode,
      reply_markup: defaultInlineKeyboard(ctx),
      link_preview_options: { is_disabled: false },
      reply_parameters: ctx.messageId ? { message_id: Number(ctx.messageId) } : undefined,
    });

    rest.forEach(function (b) {
      tg("sendMessage", {
        chat_id: ctx.chatId,
        text: b,
        parse_mode: parseMode,
        link_preview_options: { is_disabled: false },
      });
    });

    // 群聊里关键字回复过多会打扰，超过 2 段的自动清理
    if (sent && ctx.isGroup && rest.length >= 2) {
      scheduleAutoDelete(ctx.chatId, sent.message_id, 120);
    }
    return null;
  }
  return undefined;
}

/* ============================================================================
 * 五、消息存储
 * ==========================================================================*/

function saveStorage(ctx, typeLabel) {
  try {
    var c = detectContent(ctx.message);
    var content = c.key === "text" ? ctx.text : c.label + (ctx.message.caption ? " " + ctx.message.caption : "");
    var source =
      (ctx.chatType === "supergroup" || ctx.chatType === "group" ? ctx.chatTitle : "") +
      "(" +
      (ctx.isPrivate ? "私聊消息" : ctx.chatType === "channel" ? "频道消息" : "群聊消息") +
      ")";

    appendRow(SHEET.storage, [
      nowStr(),
      String(ctx.userId),
      ctx.userNameKey,
      ctx.userName,
      typeLabel || "自动回复",
      source,
      String(ctx.chatId),
      clip(content, 500),
      cfg("storage.storeJson", true) ? JSON.stringify(ctx.message) : "",
      String(ctx.messageId || ""),
    ]);
  } catch (e) {
    logError("saveStorage", e);
  }
}

/* ============================================================================
 * 六、主人推送
 * ==========================================================================*/

function pushToKing(ctx) {
  if (!KingId) return;

  var type = kingTypeEffective();
  if (type === 5) return;
  if (type === 3 && !ctx.isPrivate) return;
  if (type === 4 && !ctx.isGroup) return;

  // 不推主人自己的消息
  if (String(ctx.userId) === String(KingId) && ctx.isPrivate) return;

  // 屏蔽列表
  if (getIgnoredChatIds().indexOf(String(ctx.chatId)) !== -1) return;

  var c = detectContent(ctx.message);
  var maxLen = cfg("king.maxTextLength", 120);
  var summary = readableContent(ctx.message);

  var fromName = ctx.userName;
  var fromLink = "tg://user?id=" + ctx.userId;

  var chatLine;
  if (ctx.isPrivate) {
    chatLine = "来自 [私聊]";
  } else {
    var link = get(ctx.chat, "username", "")
      ? "https://t.me/" + ctx.chat.username
      : ctx.isGroup && String(ctx.chatId).indexOf("-100") === 0
      ? null
      : null;
    chatLine =
      (link ? aLink(link, "[群聊] " + ctx.chatTitle) : "[群聊] " + ctx.chatTitle) +
      " · " +
      uiMono(ctx.chatId);
  }

  var text = [
    "<b>" + THEME.title + " 捕捉到新消息</b>",
    "",
    uiKV("用户", fromName + (ctx.userNameKey ? " " + ctx.userNameKey : "")),
    uiKV("用户 ID", String(ctx.userId)),
    uiKV("类型", c.label),
    uiKV("位置", chatLine),
    uiKV("时间", nowStr()),
    "",
    uiSection("内容", "📝"),
    "<blockquote>" + esc(clip(summary, maxLen)) + "</blockquote>",
    "",
    "<i>原始数据：" + esc(clip(JSON.stringify(ctx.message), 600)) + "</i>",
  ].join("\n");

  tg("sendMessage", {
    chat_id: KingId,
    text: text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: kb([
      [
        btn("👤 用户资料", ["king", "user", ctx.userId]),
        btn("🔗 原消息", ["king", "goto", ctx.chatId, ctx.messageId]),
      ],
      [btn("🔨 封禁该用户", ["king", "ban", ctx.chatId, ctx.userId])],
    ]),
  });

  // 媒体原样转发
  if (cfg("king.detail", true) && c.fileId) {
    var methodMap = {
      photo: "sendPhoto",
      video: "sendVideo",
      animation: "sendAnimation",
      document: "sendDocument",
      audio: "sendAudio",
      voice: "sendVoice",
      sticker: "sendSticker",
      video_note: "sendVideoNote",
    };
    var method = methodMap[c.key];
    if (method) {
      var fieldMap = {
        sendPhoto: "photo",
        sendVideo: "video",
        sendAnimation: "animation",
        sendDocument: "document",
        sendAudio: "audio",
        sendVoice: "voice",
        sendSticker: "sticker",
        sendVideoNote: "video_note",
      };
      var payload = { chat_id: KingId };
      payload[fieldMap[method]] = c.fileId;
      if (ctx.message.caption) payload.caption = ctx.message.caption;
      tg(method, payload, { silent: true });
    } else {
      // 其它类型（位置/名片/投票等）直接转发原消息
      tg(
        "forwardMessage",
        { chat_id: KingId, from_chat_id: ctx.chatId, message_id: ctx.messageId },
        { silent: true }
      );
    }
  }
}

/* ============================================================================
 * 七、频道 / 机器人状态 / 入群申请 / 内联模式
 * ==========================================================================*/

function handleChannelPost(post, kind) {
  try {
    var chat = post.chat || {};
    var c = detectContent(post);
    var content = c.key === "text" ? post.text : c.label;

    appendRow(SHEET.storage, [
      nowStr(),
      String(chat.id),
      "[频道]",
      chat.title || "",
      kind === "edited_channel_post" ? "频道消息(编辑)" : "频道消息",
      "(频道消息)",
      String(chat.id),
      clip(content, 500),
      cfg("storage.storeJson", true) ? JSON.stringify(post) : "",
      String(post.message_id || ""),
    ]);

    // ⭐ 关键词推送：命中「频道 × 关键词 × 目标会话」规则的帖子转发出去
    var pushed = channelFanout(post, kind);
    if (pushed) logInfo("channel", "推送 " + pushed + " 条 · " + (chat.title || chat.id));

    // 频道消息也推送给主人（受 KingType 控制）
    var type = cfg("king.type", 1);
    if (KingId && (type === 1 || type === 2) && getIgnoredChatIds().indexOf(String(chat.id)) === -1) {
      tg("sendMessage", {
        chat_id: KingId,
        text:
          "<b>" + THEME.title + " 频道新动态</b>\n\n" +
          uiKV("频道", chat.title || "") +
          "\n" +
          uiKV("时间", nowStr()) +
          "\n\n<blockquote>" +
          esc(clip(content, 200)) +
          "</blockquote>",
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (e) {
    logError("handleChannelPost", e);
  }
}

function handleMyChatMember(mcm) {
  try {
    var chat = mcm.chat || {};
    var newStatus = get(mcm, "new_chat_member.status", "");
    var oldStatus = get(mcm, "old_chat_member.status", "");
    if (newStatus === oldStatus) return;

    var msg;
    if (newStatus === "administrator" || newStatus === "member") {
      msg =
        "<b>✅ 机器人状态变更</b>\n\n" +
        uiKV("群组", chat.title || "") +
        "\n" +
        uiKV("群组 ID", String(chat.id)) +
        "\n" +
        uiKV("状态", newStatus === "administrator" ? "已设为管理员" : "已加入") +
        "\n\n" +
        (newStatus !== "administrator" ? "<i>⚠️ 未授予管理员权限，封禁/禁言/删消息等功能不可用。</i>" : "");
    } else if (newStatus === "left" || newStatus === "kicked") {
      msg =
        "<b>⚠️ 机器人已被移出群组</b>\n\n" +
        uiKV("群组", chat.title || "") +
        "\n" +
        uiKV("群组 ID", String(chat.id)) +
        "\n" +
        uiKV("状态", newStatus === "kicked" ? "被踢出" : "主动退出");
      cacheDrop(["chatset:" + chat.id, "admins:" + chat.id]);
    } else {
      return;
    }

    if (KingId) {
      tg("sendMessage", {
        chat_id: KingId,
        text: msg,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (e) {
    logError("handleMyChatMember", e);
  }
}

function handleJoinRequest(req) {
  try {
    var chat = req.chat || {};
    var user = req.from || {};
    var name = userNameOf(user);

    if (KingId) {
      tg(
        "sendMessage",
        {
          chat_id: KingId,
          text:
            "<b>🚪 新的入群申请</b>\n\n" +
            uiKV("群组", chat.title || "") +
            "\n" +
            uiKV("申请人", name + (user.username ? " @" + user.username : "")) +
            "\n" +
            uiKV("用户 ID", String(user.id)) +
            "\n" +
            uiKV("时间", nowStr()),
          parse_mode: "HTML",
          reply_markup: kb([
            [
              btn("✅ 通过", ["jreq", "ok", chat.id, user.id]),
              btn("❌ 拒绝", ["jreq", "no", chat.id, user.id]),
            ],
          ]),
          link_preview_options: { is_disabled: true },
        },
        { silent: true }
      );
    }
  } catch (e) {
    logError("handleJoinRequest", e);
  }
}

/**
 * 内联模式：在任意聊天框输入 @你的机器人 关键词 即可直接分享内容。
 * 需要在 BotFather 里执行 /setinline 开启。
 */
function handleInlineQuery(iq) {
  try {
    var q = String(iq.query || "").trim();
    var results = [];

    // 结果 1：把用户输入直接发出去
    if (q) {
      results.push({
        type: "article",
        id: "echo-1",
        title: "发送：" + clip(q, 40),
        description: "直接把这段文字发送到当前聊天",
        input_message_content: { message_text: q },
      });
    }

    // 结果 2：查天气
    if (q) {
      results.push({
        type: "article",
        id: "weather-1",
        title: "查询「" + clip(q, 24) + "」的天气",
        description: "由 " + (BRAND.name || "Bot") + " 提供",
        input_message_content: {
          message_text: "🌦 正在查询 " + q + " 的天气…（发送后由机器人回复）",
        },
      });
    }

    // 结果 3：分享机器人
    results.push({
      type: "article",
      id: "share-1",
      title: "分享 " + (BRAND.name || "Bot") + " 给好友",
      description: "推荐这个多功能 Telegram 机器人",
      input_message_content: {
        message_text:
          "推荐一个实用的 Telegram 机器人：" +
          (BRAND.name || "Bot") +
          (BRAND.repo ? "\n" + BRAND.repo : ""),
      },
    });

    if (BRAND.channel) {
      results.push({
        type: "article",
        id: "channel-1",
        title: "📣 频道：" + clip(BRAND.name || "", 20),
        description: "点击查看频道",
        input_message_content: { message_text: BRAND.channel },
      });
    }

    tgAnswerInline(iq.id, results.slice(0, 10));
  } catch (e) {
    logError("handleInlineQuery", e);
  }
}

/* ============================================================================
 * 八、轮询模式（无法暴露 Web 应用时的替代方案）
 * ==========================================================================*/

/**
 * 拉取并处理更新。
 * 适用于：GAS Web 应用无法公开访问、或作为 Webhook 的兜底。
 * 用法：给本函数装一个"每分钟"的时间触发器。
 * ⚠️ 不要与 Webhook 同时启用，否则会互相抢占更新。
 */
function pollUpdates() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty("poll_offset");
  var offset = Number(raw || 0);

  /* ⭐ 自动让位：Webhook 一旦可用（绑了地址），轮询就必须退出。
       为什么必须退出而不是"两个都留着"：
         Telegram 规定 webhook 与 getUpdates 互斥 —— 绑了 webhook 还去 getUpdates，
         会一直拿 409 Conflict，一条消息也拉不到。留着不但没用，还会让人误以为
         "有兜底"，结果 Webhook 哪天坏了机器人还是哑的（轮询其实早被 409 卡死）。
       所以这里直接删掉自己的触发器：
         Webhook 活着 → 轮询自杀，走实时链路；
         Webhook 哪天又坏了 → runDailyMaintenance 里的 ensureReachable() 再把轮询装回来。 */
  try {
    var wh = tgGetWebhookInfo();
    if (wh && wh.url) {
      var n = killPollTriggers();
      setProp("mb_mode", "webhook");
      logInfo(
        "pollUpdates",
        "检测到 Webhook 已启用（" + wh.url + "），轮询自动退出" + (n ? "（移除触发器 " + n + " 个）" : "")
      );
      return 0;
    }
  } catch (e) {
    /* 探测失败就当没 webhook，继续轮询 */
  }

  var updates = tgGetUpdates(offset, 20);
  if (!updates || !updates.length) return 0;

  // ⭐ 首次接入轮询（switchToPolling 已经 deleteWebhook(drop_pending=true)，
  //    队列此时是空的）水位线从 0 开始刚好等于"当前时刻"，一条都不会漏。
  //    如果是手动装触发器（没清过 pending），0 会让 getUpdates 从头回灌历史 ——
  //    这里打个招呼，别让人以为是机器人抽风在刷屏。
  if (!raw) {
    logInfo(
      "pollUpdates",
      "首次轮询：水位线从 0 起。若机器人开始刷屏重复回复，改用 switchToPolling() 重装（它会先清空积压）"
    );
  }

  var handled = 0;
  updates.forEach(function (u) {
    try {
      handleUpdate(u);
      handled++;
    } catch (e) {
      logError("pollUpdates", e, { update_id: u.update_id });
    }
    offset = u.update_id + 1;
  });

  // ⭐ 批量处理完了才推进水位线：中间崩一条也不至于整批丢掉重放
  props.setProperty("poll_offset", String(offset));
  return handled;
}

/** 删掉已装的轮询触发器（必须先收集再删：边遍历边删会漏删） */
function killPollTriggers() {
  var kill = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === "pollUpdates";
  });
  kill.forEach(function (t) {
    try { ScriptApp.deleteTrigger(t); } catch (e) {}
  });
  return kill.length;
}

/** 切换为轮询模式：删掉 Webhook，并装一个每分钟的轮询触发器
 *  ⚠️ 关键优势：轮询由时间触发器驱动，执行身份恒为「我」，
 *     完全不依赖 Web 应用的「谁可以访问 / 执行身份」两项权限，
 *     因此不受 GAS Web App 权限配置错误导致 302 的影响。 */
function switchToPolling() {
  // ⭐ 顺序不能换：必须先清 Webhook，再装轮询，否则这两者会抢同一批 update。
  tgDeleteWebhook(true); // drop_pending_updates=true：清空 Telegram 那边积压的旧消息
  var killed = killPollTriggers();
  ScriptApp.newTrigger("pollUpdates").timeBased().everyMinutes(1).create();
  setProp("mb_mode", "polling");
  setProp("mb_mode_at", String(Date.now())); // 供 ensureReachable 判断 24h 内别再自动切
  setProp("poll_offset", ""); // 让第一次轮询从"当前时刻"起算

  return [
    "✅ 已切换到【轮询模式】",
    "",
    "· 已删除 Webhook 并清空 Telegram 积压（" + (killed ? "移除旧触发器 " + killed + " 个；" : "") + "）",
    "· 已装「每分钟」轮询触发器 —— 执行身份恒为「我」，",
    "  彻底绕开 Web 应用的「谁可以访问 / 执行身份」两项权限",
    "· 代价：最长约 1 分钟延迟（绝大多数消息 10~20 秒内就回）",
    "",
    "现在去私聊机器人发一句纯文字（不要以 / 开头），",
    "等 20 秒，db_telegram 里应该能看到" + "「私聊消息」" + "那一行。",
  ].join("\n");
}

/** 切回 Webhook 模式：卸掉轮询触发器并重新绑定当前部署 */
function switchToWebhook() {
  var killed = killPollTriggers();
  var r = setupWebhook();
  if (r.ok) {
    setProp("mb_mode", "webhook");
    setProp("mb_mode_at", String(Date.now())); // 手动切过 → 24h 内自愈不插手
  } else {
    setProp("mb_mode", "unknown");
  }
  return r.ok
    ? "已切回 Webhook 模式：" + r.url + (killed ? "（移除轮询触发器 " + killed + " 个）" : "")
    : "切换失败：" + r.error;
}

/** 当前接入模式（polling / webhook / unknown） */
function accessMode() {
  var m = getProp("mb_mode");
  return m || "webhook";
}

/** 当前接入模式（只读，供 CLI 远程调用判断状态） */
function modeDiag() {
  var props = PropertiesService.getScriptProperties();
  var triggers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return {
    mode: accessMode(),
    webhook: typeof tgGetWebhookInfo === "function" ? tgGetWebhookInfo() : null,
    triggerCount: triggers.length,
    triggers: triggers,
    hasPolling: triggers.indexOf("pollUpdates") !== -1,
    pollOffset: Number(props.getProperty("poll_offset") || 0)
  };
}

/* ============================================================================
 * 私人推送开关（存脚本属性 —— 改一次就长期生效，热更新和 push 都冲不掉）
 * ==========================================================================*/

/**
 * 当前生效的推送范围。
 * 优先读 /king 指令写进脚本属性的值，没有才回落到 Params.gs 里的 CONFIG.king.type。
 * 存属性而不是改代码，是因为「太吵了先关掉」这种需求必须在不改代码的前提下能立刻生效。
 */
function kingTypeEffective() {
  try {
    var v = PropertiesService.getScriptProperties().getProperty("mb_king_type");
    if (v !== null && v !== "") {
      var n = Number(v);
      if (n >= 1 && n <= 5) return n;
    }
  } catch (e) {}
  return Number(cfg("king.type", 1)) || 1;
}

/** 写推送范围；mode="reset" 表示交还给 Params.gs 的配置 */
function kingTypeSet(mode) {
  if (mode === "reset") {
    try {
      PropertiesService.getScriptProperties().deleteProperty("mb_king_type");
    } catch (e) {}
    return 0;
  }
  try {
    PropertiesService.getScriptProperties().setProperty("mb_king_type", String(mode));
  } catch (e) {}
  return Number(mode) || 0;
}

var KING_TYPE_LABEL = {
  1: "全部消息（私聊 + 群聊，最吵）",
  2: "私聊 + 群聊（同上，保留兼容）",
  3: "仅私聊",
  4: "仅群聊",
  5: "关闭私人推送",
};
