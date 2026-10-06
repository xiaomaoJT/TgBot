/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Telegram.gs — Telegram Bot API 全量封装
 * ----------------------------------------------------------------------------
 *  设计目标：
 *   1. 覆盖 Bot API 7.x 的常用方法，把"官方能力"真正用起来；
 *   2. 统一错误处理 / 429 限流重试 / 结构化返回，调用方只关心业务；
 *   3. 全部走 JSON body（而非旧的表单拼接），数组参数可原样传入，
 *      避免原版 `media: JSON.stringify([...])` 这类半吊子写法。
 * ============================================================================
 */

const TG_API_ROOT = "https://api.telegram.org/bot";

/** 单次请求重试次数 */
const TG_RETRY = 2;

/* ----------------------------------------------------------------------------
 * 一、底层请求
 * --------------------------------------------------------------------------*/

/**
 * 调用 Bot API。
 * @param {string} method  如 "sendMessage"
 * @param {object} payload 方法参数（会被 JSON 序列化）
 * @param {object} [opts]  { retry, silent }
 * @return {{ok:boolean, result:*, error:string, code:number}}
 */
function tgCallFull(method, payload, opts) {
  var options = opts || {};
  var retry = options.retry === undefined ? TG_RETRY : options.retry;
  var url = TG_API_ROOT + BOTID + "/" + method;
  var body = JSON.stringify(payload || {});

  for (var attempt = 0; attempt <= retry; attempt++) {
    try {
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: body,
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true,
      });
      var code = res.getResponseCode();
      var text = res.getContentText() || "{}";
      var json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = { ok: false, description: "响应非 JSON: " + clip(text, 120) };
      }

      if (code === 200 && json.ok) {
        return { ok: true, result: json.result, error: "", code: code };
      }

      // 429：Telegram 明确告知要等多久，必须尊重，否则会被加重限流
      if (code === 429) {
        var wait =
          get(json, "parameters.retry_after", null) !== null
            ? Number(get(json, "parameters.retry_after", 1)) + 1
            : Math.pow(2, attempt + 1);
        if (attempt < retry) {
          Utilities.sleep(Math.min(wait, 30) * 1000);
          continue;
        }
      }

      // 网络类 5xx 可重试
      if (code >= 500 && attempt < retry) {
        Utilities.sleep(500 * (attempt + 1));
        continue;
      }

      if (!options.silent) {
        logError("tg:" + method, json.description || ("HTTP " + code), {
          code: code,
        });
      }
      return {
        ok: false,
        result: null,
        error: json.description || ("HTTP " + code),
        code: code,
      };
    } catch (e) {
      if (attempt < retry) {
        Utilities.sleep(400 * (attempt + 1));
        continue;
      }
      if (!options.silent) logError("tg:" + method, e);
      return { ok: false, result: null, error: String(e), code: 0 };
    }
  }
  return { ok: false, result: null, error: "unreachable", code: 0 };
}

/** 只要 result 的简版 */
function tg(method, payload, opts) {
  var r = tgCallFull(method, payload, opts);
  return r.ok ? r.result : null;
}

/**
 * 上传本地文件（多部分表单）。
 * payload 中值为 Blob 的字段会作为文件上传，其余作为普通字段。
 */
function tgUpload(method, payload, opts) {
  var url = TG_API_ROOT + BOTID + "/" + method;
  try {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      payload: payload,
      muteHttpExceptions: true,
    });
    var json = JSON.parse(res.getContentText() || "{}");
    if (json.ok) return json.result;
    if (!(opts && opts.silent)) logError("tgUpload:" + method, json.description);
    return null;
  } catch (e) {
    logError("tgUpload:" + method, e);
    return null;
  }
}

/** GET 形式调用（getChatAdministrators / getWebhookInfo 等无 body 的方法） */
function tgGet(method, query, opts) {
  var qs = "";
  if (query) {
    qs =
      "?" +
      Object.keys(query)
        .map(function (k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(query[k]);
        })
        .join("&");
  }
  try {
    var res = UrlFetchApp.fetch(TG_API_ROOT + BOTID + "/" + method + qs, {
      muteHttpExceptions: true,
    });
    var json = JSON.parse(res.getContentText() || "{}");
    if (json.ok) return json.result;
    if (!(opts && opts.silent)) logError("tgGet:" + method, json.description);
    return null;
  } catch (e) {
    logError("tgGet:" + method, e);
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * 二、消息发送（含统一 UI 默认项）
 * --------------------------------------------------------------------------*/

/**
 * 补齐发送默认项：
 *  - 用官方新字段 link_preview_options 取代已废弃的 disable_web_page_preview；
 *  - 自动附带 message_thread_id（话题群支持）；
 *  - 自动补 parse_mode。
 */
function tgDefaults(payload, ctx) {
  var p = payload || {};
  if (p.parse_mode === undefined) p.parse_mode = "HTML";
  if (p.link_preview_options === undefined) {
    p.link_preview_options = { is_disabled: true };
  }
  if (!p.chat_id && ctx) p.chat_id = ctx.chatId;
  // 话题群：把回复落到同一个话题里，否则回复会跑到 General
  if (ctx && ctx.threadId && p.message_thread_id === undefined && !p.reply_parameters) {
    p.message_thread_id = ctx.threadId;
  }
  return p;
}

var tgSendMessage = function (ctx, text, extra) {
  var payload = tgDefaults(Object.assign({ text: text }, extra || {}), ctx);
  return tg("sendMessage", payload);
};

var tgSendPhoto = function (ctx, photo, caption, extra) {
  return tg(
    "sendPhoto",
    tgDefaults({ photo: photo, caption: caption || "" }, Object.assign({}, ctx, extra))
  );
};

var tgSendMediaGroup = function (ctx, media, extra) {
  var p = Object.assign({ media: media }, extra || {});
  if (p.chat_id === undefined) p.chat_id = ctx.chatId;
  if (ctx.threadId && p.message_thread_id === undefined) p.message_thread_id = ctx.threadId;
  return tg("sendMediaGroup", p);
};

var tgSendChatAction = function (chatId, action) {
  return tg(
    "sendChatAction",
    { chat_id: chatId, action: action || "typing" },
    { silent: true }
  );
};

/** 编辑消息文本；用于"翻页/展开"这类原地刷新的交互 */
var tgEditText = function (chatId, messageId, text, extra) {
  var p = Object.assign(
    {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    },
    extra || {}
  );
  return tg("editMessageText", p, { silent: true });
};

/** 只换按钮，不动正文（分页/切页最省流量的做法） */
var tgEditMarkup = function (chatId, messageId, markup) {
  return tg(
    "editMessageReplyMarkup",
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: markup,
    },
    { silent: true }
  );
};

var tgDeleteMessage = function (chatId, messageId) {
  return tg(
    "deleteMessage",
    { chat_id: chatId, message_id: messageId },
    { silent: true }
  );
};

/** Bot API 6.5+ 支持一次删多条，比循环删更省配额 */
var tgDeleteMessages = function (chatId, messageIds) {
  var ids = uniq(messageIds || []).map(Number).filter(function (n) {
    return !isNaN(n);
  });
  if (!ids.length) return null;
  if (ids.length === 1) return tgDeleteMessage(chatId, ids[0]);
  if (ids.length <= 100) {
    return tg(
      "deleteMessages",
      { chat_id: chatId, message_ids: ids },
      { silent: true }
    );
  }
  // 超过 100 条拆批
  var out = null;
  for (var i = 0; i < ids.length; i += 100) {
    out = tg(
      "deleteMessages",
      { chat_id: chatId, message_ids: ids.slice(i, i + 100) },
      { silent: true }
    );
  }
  return out;
};

/* ----------------------------------------------------------------------------
 * 三、回调与交互（原版缺失，导致点按钮一直转圈）
 * --------------------------------------------------------------------------*/

/**
 * ⭐ 原版 bug 修复：收到 callback_query 后必须调用 answerCallbackQuery，
 *    否则客户端按钮会一直显示加载动画（最多 30 秒），体验极差。
 */
function tgAnswerCallback(id, text, showAlert) {
  return tg(
    "answerCallbackQuery",
    {
      callback_query_id: id,
      text: text || "",
      show_alert: !!showAlert,
    },
    { silent: true }
  );
}

/** 内联模式回答 */
function tgAnswerInline(id, results, opts) {
  var p = Object.assign(
    { inline_query_id: id, results: results, cache_time: 30, is_personal: true },
    opts || {}
  );
  return tg("answerInlineQuery", p, { silent: true });
}

/** 给消息加表情回应（Bot API 7.0） */
function tgSetReaction(chatId, messageId, emoji) {
  return tg(
    "setMessageReaction",
    {
      chat_id: chatId,
      message_id: messageId,
      reaction: emoji ? [{ type: "emoji", emoji: emoji }] : [],
    },
    { silent: true }
  );
}

/* ----------------------------------------------------------------------------
 * 四、群组与成员管理
 * --------------------------------------------------------------------------*/

var tgBanMember = function (chatId, userId, untilUnix) {
  return tg("banChatMember", {
    chat_id: chatId,
    user_id: userId,
    until_date: untilUnix || 0,
    revoke_messages: false,
  });
};

var tgUnbanMember = function (chatId, userId) {
  return tg("unbanChatMember", {
    chat_id: chatId,
    user_id: userId,
    only_if_banned: true,
  });
};

/** 禁言（= 撤掉所有发言权限）。seconds 为 0 表示永久 */
var tgMuteMember = function (chatId, userId, seconds) {
  var until = seconds > 0 ? unixNow() + seconds : 0;
  return tg("restrictChatMember", {
    chat_id: chatId,
    user_id: userId,
    until_date: until,
    permissions: {
      can_send_messages: false,
      can_send_audios: false,
      can_send_documents: false,
      can_send_photos: false,
      can_send_videos: false,
      can_send_video_notes: false,
      can_send_voice_notes: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
      can_manage_topics: false,
    },
  });
};

/** 解除禁言（恢复为群默认权限） */
var tgUnmuteMember = function (chatId, userId) {
  return tg("restrictChatMember", {
    chat_id: chatId,
    user_id: userId,
    permissions: {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
      can_invite_users: true,
    },
  });
};

/** 踢出（封禁后立即解封 = 踢出，官方推荐做法） */
function tgKickMember(chatId, userId) {
  var r = tgBanMember(chatId, userId, 0);
  Utilities.sleep(300);
  tgUnbanMember(chatId, userId);
  return r;
};

var tgPromote = function (chatId, userId, rights) {
  return tg(
    "promoteChatMember",
    Object.assign({ chat_id: chatId, user_id: userId }, rights || {})
  );
};

var tgDemote = function (chatId, userId) {
  return tg("promoteChatMember", {
    chat_id: chatId,
    user_id: userId,
    can_manage_chat: false,
    can_delete_messages: false,
    can_manage_video_chats: false,
    can_restrict_members: false,
    can_promote_members: false,
    can_change_info: false,
    can_invite_users: false,
    can_pin_messages: false,
    can_manage_topics: false,
  });
};

var tgPinMessage = function (chatId, messageId, notify) {
  return tg("pinChatMessage", {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: !notify,
  });
};

var tgUnpinMessage = function (chatId, messageId) {
  return tg(
    "unpinChatMessage",
    messageId ? { chat_id: chatId, message_id: messageId } : { chat_id: chatId }
  );
};

var tgGetChat = function (chatId) {
  return tgGet("getChat", { chat_id: chatId });
};

var tgGetAdmins = function (chatId) {
  return tgGet("getChatAdministrators", { chat_id: chatId }, { silent: true }) || [];
};

var tgGetMember = function (chatId, userId) {
  return tgGet(
    "getChatMember",
    { chat_id: chatId, user_id: userId },
    { silent: true }
  );
};

var tgGetMemberCount = function (chatId) {
  var r = tgGet("getChatMemberCount", { chat_id: chatId }, { silent: true });
  return r === null ? null : Number(r);
};

/** 生成群邀请链接（Bot API 官方能力，原版没有） */
var tgCreateInviteLink = function (chatId, opts) {
  return tg(
    "createChatInviteLink",
    Object.assign({ chat_id: chatId }, opts || {}),
    { silent: true }
  );
};

var tgRevokeInviteLink = function (chatId, link) {
  return tg(
    "revokeChatInviteLink",
    { chat_id: chatId, invite_link: link },
    { silent: true }
  );
};

/** 处理入群申请（配合 BotFather 里开启 "Approve new members"） */
var tgApproveJoinRequest = function (chatId, userId) {
  return tg("approveChatJoinRequest", { chat_id: chatId, user_id: userId });
};

var tgDeclineJoinRequest = function (chatId, userId) {
  return tg("declineChatJoinRequest", { chat_id: chatId, user_id: userId });
};

/** 封禁"以频道身份发言"的频道（Bot API 5.5+） */
var tgBanSenderChat = function (chatId, senderChatId) {
  return tg("banChatSenderChat", {
    chat_id: chatId,
    sender_chat_id: senderChatId,
  });
};

var tgLeaveChat = function (chatId) {
  return tg("leaveChat", { chat_id: chatId });
};

/* ----------------------------------------------------------------------------
 * 五、文件
 * --------------------------------------------------------------------------*/

var tgGetFile = function (fileId) {
  return tgGet("getFile", { file_id: fileId }, { silent: true });
};

/** 由 file_id 得到可下载直链 */
function tgFileUrl(fileId) {
  var f = tgGetFile(fileId);
  if (!f || !f.file_path) return null;
  return TG_API_ROOT + BOTID + "/" + f.file_path;
}

/* ----------------------------------------------------------------------------
 * 六、机器人自身配置（命令菜单等 —— 原版完全没有）
 * --------------------------------------------------------------------------*/

/**
 * 注册指令菜单，用户在与机器人私聊时点左下角按钮即可看到。
 */
function tgSetMyCommands(commands, scope) {
  return tg(
    "setMyCommands",
    { commands: commands, scope: scope || { type: "default" } },
    { silent: true }
  );
}

function tgGetMyCommands() {
  return tgGet("getMyCommands", null, { silent: true }) || [];
}

/** 设置聊天菜单按钮（把默认的"菜单"换成指令列表或自定义） */
function tgSetChatMenuButton(menuButton, chatId) {
  var p = menuButton ? { menu_button: menuButton } : {};
  if (chatId) p.chat_id = chatId;
  return tg("setChatMenuButton", p, { silent: true });
}

function tgGetMe() {
  return tgGet("getMe", null, { silent: true });
}

function tgSetMyName(name) {
  return tg("setMyName", { name: name || "" }, { silent: true });
}

function tgSetMyDescription(text) {
  return tg("setMyDescription", { description: text || "" }, { silent: true });
}

function tgSetMyShortDescription(text) {
  return tg(
    "setMyShortDescription",
    { short_description: text || "" },
    { silent: true }
  );
}

/* ----------------------------------------------------------------------------
 * 七、Webhook 自管理（一键部署 / 自检）
 * --------------------------------------------------------------------------*/

function tgSetWebhook(url, secretToken, opts) {
  return tg(
    "setWebhook",
    Object.assign(
      {
        url: url,
        max_connections: 40,
        allowed_updates: [
          "message",
          "edited_message",
          "channel_post",
          "edited_channel_post",
          "callback_query",
          "inline_query",
          "my_chat_member",
          "chat_member",
          "chat_join_request",
          "message_reaction",
        ],
      },
      secretToken ? { secret_token: secretToken } : {},
      opts || {}
    ),
    { silent: true }
  );
}

function tgDeleteWebhook(dropPending) {
  return tg(
    "deleteWebhook",
    { drop_pending_updates: !!dropPending },
    { silent: true }
  );
}

function tgGetWebhookInfo() {
  return tgGet("getWebhookInfo", null, { silent: true });
}

function tgGetUpdates(offset, limit) {
  return tgGet(
    "getUpdates",
    { offset: offset || 0, limit: limit || 10, timeout: 0 },
    { silent: true }
  );
}

/* ----------------------------------------------------------------------------
 * 八、Bot API 9.4 ~ 10.3 新能力
 * ----------------------------------------------------------------------------
 *  本区块封装三项对项目影响最大的新能力：
 *
 *    ① Rich Messages（10.1+）    —— sendRichMessage / sendRichMessageDraft
 *       用 GFM Markdown 发送，Telegram 服务端渲染真表格 / 多级标题 / 列表 /
 *       分隔线 / 折叠引用。取代「用等宽空格手工拼表格」的老做法。
 *
 *    ② 消息草稿（9.5+）          —— sendMessageDraft
 *       一个可反复覆盖的临时预览气泡，用来做"AI 正在思考"的即时反馈。
 *
 *    ③ 临时消息（10.2+）         —— ephemeral_message_parameters
 *       群内仅指定用户可见的回复，天然不刷屏，可替代「发送后定时删除」。
 *
 *  ⚠️ 降级设计（重要）：
 *    这些方法在较旧的 Bot API 服务端上会返回 404 / "method not found"。
 *    为了不让机器人整体哑掉，这里统一做「能力探测 + 缓存标记」：
 *      · 首次失败若是"方法不存在"，写入 6 小时的能力缓存标记；
 *      · 期内所有调用直接返回 null，不再浪费一次 UrlFetch 配额去试错；
 *      · 调用方（UI 层）拿到 null 后自动降级到 HTML 发送。
 *    运行 /reload 或 tgCapReset() 可立即重新探测。
 * --------------------------------------------------------------------------*/

/** 能力探测标记的缓存时长（秒） */
const TG_CAP_TTL = 6 * 3600;

/** 能力开关的缓存键 */
const TG_CAP_KEY = {
  rich: "mb_cap_rich",
  draft: "mb_cap_draft",
  ephemeral: "mb_cap_eph",
};

/**
 * 该能力当前是否可用。
 * 无缓存记录 = 尚未探测过，乐观返回 true（先试一次）。
 */
function tgCapOk(name) {
  var key = TG_CAP_KEY[name];
  if (!key) return true;
  try {
    var v = CacheService.getScriptCache().get(key);
    return v !== "0";
  } catch (e) {
    return true;
  }
}

/** 记录能力探测结果 */
function tgCapSet(name, ok, reason) {
  var key = TG_CAP_KEY[name];
  if (!key) return;
  try {
    CacheService.getScriptCache().put(key, ok ? "1" : "0", TG_CAP_TTL);
  } catch (e) {}
  if (!ok) {
    logInfo("tgcap", name + " 不可用，已自动降级：" + (reason || "未知原因"));
  }
}

/** 清空能力探测标记（/reload 与测试使用） */
function tgCapReset() {
  try {
    CacheService.getScriptCache().removeAll([
      TG_CAP_KEY.rich,
      TG_CAP_KEY.draft,
      TG_CAP_KEY.ephemeral,
    ]);
  } catch (e) {}
}

/**
 * 判断错误是否属于"服务端不认识这个方法"。
 * 只有这种情况才值得写入降级标记；参数写错（400）不应该永久关闭功能。
 */
function tgIsMethodUnsupported(res) {
  if (!res) return false;
  if (res.code === 404) return true;
  var e = String(res.error || "").toLowerCase();
  return (
    e.indexOf("not found") !== -1 ||
    e.indexOf("unknown method") !== -1 ||
    e.indexOf("method not found") !== -1
  );
}

/** 是否属于"这个账号/这个会话不支持该特性"（同样是永久性降级信号） */
function tgIsFeatureUnsupported(res) {
  if (!res) return false;
  var e = String(res.error || "").toLowerCase();
  return (
    e.indexOf("not supported") !== -1 ||
    e.indexOf("unsupported") !== -1 ||
    e.indexOf("method is not available") !== -1
  );
}

/* ---- 8.1 Rich Messages -------------------------------------------------- */

/**
 * 发送富消息（真表格 / 标题 / 列表）。
 * @param {object} ctx
 * @param {string} markdown  GFM Markdown 正文
 * @param {object} [extra]   { reply_markup, reply_parameters, chat_id,
 *                             message_thread_id, disable_notification, ephemeral }
 * @return {object|null} 成功返回 Telegram 的 Message 对象；失败或不可用返回 null
 */
function tgSendRich(ctx, markdown, extra) {
  if (!cfg("ui.rich", true)) return null;
  if (!tgCapOk("rich")) return null;

  var opt = extra || {};
  var text = String(markdown == null ? "" : markdown);
  if (!text) return null;
  text = clip(text, cfg("ui.richMaxChars", 30000));

  var p = {
    chat_id: opt.chat_id || (ctx && ctx.chatId),
    rich_message: opt.rich_message || { markdown: text },
  };
  if (opt.reply_markup) p.reply_markup = opt.reply_markup;
  if (opt.reply_parameters) p.reply_parameters = opt.reply_parameters;
  if (opt.disable_notification) p.disable_notification = true;
  if (opt.ephemeral_message_parameters) {
    p.ephemeral_message_parameters = opt.ephemeral_message_parameters;
  }
  if (opt.message_thread_id) {
    p.message_thread_id = opt.message_thread_id;
  } else if (ctx && ctx.threadId && !opt.reply_parameters) {
    p.message_thread_id = ctx.threadId;
  }

  var r = tgCallFull("sendRichMessage", p, { retry: 1, silent: true });
  if (r.ok) {
    tgCapSet("rich", true);
    return r.result;
  }

  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("rich", false, r.error);
  } else {
    // 参数类错误：本次降级，但不永久关闭（可能是某条消息的 Markdown 有问题）
    logError("tg:sendRichMessage", r.error, { code: r.code });
  }
  return null;
}

/** 富消息草稿（流式预览用），失败返回 null 且不写降级标记（草稿本就是可选增强） */
function tgSendRichDraft(ctx, draftId, markdown, extra) {
  if (!cfg("ui.rich", true) || !cfg("ai.stream", true)) return null;
  if (!tgCapOk("draft")) return null;

  var opt = extra || {};
  var p = {
    chat_id: opt.chat_id || (ctx && ctx.chatId),
    draft_id: Number(draftId),
    rich_message: { markdown: String(markdown || "") },
  };
  if (ctx && ctx.threadId) p.message_thread_id = ctx.threadId;

  var r = tgCallFull("sendRichMessageDraft", p, { retry: 0, silent: true });
  if (r.ok) return r.result;
  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("draft", false, r.error);
  }
  return null;
}

/** 编辑一条已发出的富消息（原地翻页用） */
function tgEditRich(chatId, messageId, markdown, extra) {
  if (!cfg("ui.rich", true)) return null;
  if (!tgCapOk("rich")) return null;
  var opt = extra || {};
  var p = Object.assign(
    {
      chat_id: chatId,
      message_id: messageId,
      rich_message: { markdown: String(markdown || "") },
    },
    opt
  );
  var r = tgCallFull("editMessageText", p, { retry: 1, silent: true });
  if (r.ok) return r.result;
  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("rich", false, r.error);
  }
  return null;
}

/* ---- 8.2 消息草稿（流式输出）-------------------------------------------- */

/**
 * 推送一个临时草稿气泡。
 *
 * ⚠️ 重要限制：GAS 的 UrlFetchApp **不支持消费 SSE 流**（必须等响应完整返回），
 *    所以无法把模型吐出的 token 逐个转发。这里的现实做法是：
 *      1. 调用前先推一个"正在思考"的草稿 → 用户立刻得到反馈（原版是完全静默等待）；
 *      2. 拿到完整答案后，用 sendRichMessage 落成正式消息。
 *    草稿本身是约 30 秒的临时预览，会被后续内容覆盖，不会留在聊天记录里。
 */
function tgSendDraft(ctx, draftId, text, extra) {
  if (!cfg("ai.stream", true)) return null;
  if (!tgCapOk("draft")) return null;

  var opt = extra || {};
  var p = {
    chat_id: opt.chat_id || (ctx && ctx.chatId),
    draft_id: Number(draftId),
    text: String(text == null ? "" : text),
  };
  if (ctx && ctx.threadId) p.message_thread_id = ctx.threadId;

  var r = tgCallFull("sendMessageDraft", p, { retry: 0, silent: true });
  if (r.ok) return r.result;
  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("draft", false, r.error);
  }
  return null;
}

/** 生成一个草稿 ID（同一次生成用同一个 ID，才能覆盖而非新增气泡） */
function tgNewDraftId() {
  return randInt(100000, 9999999);
}

/* ---- 8.3 临时消息（群内仅本人可见）------------------------------------- */

/**
 * 在群内发送「只有指定用户能看到」的消息。
 *
 * ⚠️ 官方约束：如果这次调用不是来自 callback_query 的应答，
 *    则**机器人必须是该群的管理员**，否则会失败（自动降级）。
 *
 * @param {object} ctx
 * @param {string} text
 * @param {string|number} receiverUserId 仅此用户可见
 * @param {object} [extra] 额外参数，可用 callbackQueryId 走按钮回调路径（无需管理员）
 * @return {object|null}
 */
function tgSendEphemeral(ctx, text, receiverUserId, extra) {
  if (!cfg("ui.ephemeral", true)) return null;
  if (!tgCapOk("ephemeral")) return null;
  if (!receiverUserId) return null;

  var opt = extra || {};
  var eph = {};
  if (opt.callbackQueryId) {
    eph.callback_query_id = String(opt.callbackQueryId);
  } else {
    eph.receiver_user_id = Number(receiverUserId);
  }

  var p = {
    chat_id: opt.chat_id || (ctx && ctx.chatId),
    text: String(text == null ? "" : text),
    parse_mode: opt.parse_mode === undefined ? "HTML" : opt.parse_mode,
    link_preview_options: { is_disabled: true },
    ephemeral_message_parameters: eph,
  };
  if (opt.reply_markup) p.reply_markup = opt.reply_markup;
  if (opt.disable_notification) p.disable_notification = true;
  if (ctx && ctx.threadId) p.message_thread_id = ctx.threadId;

  var r = tgCallFull("sendMessage", p, { retry: 1, silent: true });
  if (r.ok) {
    tgCapSet("ephemeral", true);
    return r.result;
  }
  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("ephemeral", false, r.error);
  } else {
    // 常见的 400 是"机器人不是管理员"，属于会话级限制，不写全局降级标记
    logInfo("tg:ephemeral", "临时消息发送失败：" + r.error);
  }
  return null;
}

/** 编辑临时消息（原地刷新，例如翻页） */
function tgEditEphemeralText(chatId, ephemeralMessageId, text, extra) {
  if (!cfg("ui.ephemeral", true)) return null;
  if (!tgCapOk("ephemeral")) return null;
  var opt = extra || {};
  var p = Object.assign(
    {
      chat_id: chatId,
      ephemeral_message_id: ephemeralMessageId,
      text: String(text == null ? "" : text),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    },
    opt
  );
  var r = tgCallFull("editEphemeralMessageText", p, { retry: 1, silent: true });
  if (r.ok) return r.result;
  if (tgIsMethodUnsupported(r) || tgIsFeatureUnsupported(r)) {
    tgCapSet("ephemeral", false, r.error);
  }
  return null;
}

/** 删除临时消息 */
function tgDeleteEphemeral(chatId, ephemeralMessageId) {
  return tg(
    "deleteEphemeralMessage",
    { chat_id: chatId, ephemeral_message_id: ephemeralMessageId },
    { silent: true }
  );
}

