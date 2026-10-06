/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Triggers.gs — 调度器 / 部署助手 / 数据库初始化
 * ----------------------------------------------------------------------------
 *  ⭐ 这是本次改造中"架构收益"最大的一块。
 *
 *  原版做法（MaoBot.gs 的 createDelayedTriggerWithParams 等 5 个函数）：
 *    为了实现"60 秒后删除机器人消息"，每条消息都创建一个一次性时间触发器。
 *    但 GAS 普通账号硬限制「每个项目最多 20 个触发器」，于是不得不用
 *    「数触发器数量 → 若超了就把最老的提前执行 → 再补建」这套补偿逻辑硬扛。
 *    后果：并发一高就丢任务；代码极难读懂；README 里直接把这条列为已知缺陷
 *    （"受限于GAS，高并发仅支持20次/30s"）。
 *
 *  现在做法：
 *    任务写进 task_queue 表，全局只装 **1 个** 每分钟触发一次的调度器来消费。
 *    触发器数量恒为 1，任务数量上限只取决于表格行数。
 * ============================================================================
 */

/* ============================================================================
 * 一、调度器
 * ==========================================================================*/

/**
 * 安装/修复调度器。幂等：重复运行不会产生多个触发器。
 */
function installScheduler() {
  uninstallScheduler();

  ScriptApp.newTrigger("runScheduler").timeBased().everyMinutes(1).create();

  // 每日维护：凌晨 3 点左右，用 3-4 点的小时触发器实现
  ScriptApp.newTrigger("runDailyMaintenance")
    .timeBased()
    .atHour(3)
    .nearMinute(10)
    .everyDays(1)
    .create();

  return { ok: true, triggers: ScriptApp.getProjectTriggers().length };
}

function uninstallScheduler() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === "runScheduler" || fn === "runDailyMaintenance") {
      ScriptApp.deleteTrigger(t);
    }
  });
}

/** 调度器主循环：每分钟被触发一次 */
function runScheduler() {
  var lock = LockService.getScriptLock();
  // 拿不到锁说明上一轮还在跑，直接跳过，避免重复执行
  if (!lock.tryLock(5000)) return;
  try {
    var tasks = fetchDueTasks(60);
    if (!tasks.length) return;

    var sheet = getSheetOrNull(SHEET.tasks);
    var maxPerRound = cfg("autoDelete.maxPerRound", 20);
    var processed = 0;

    // 同类任务合并：删除消息可以批量调用官方 deleteMessages
    var deleteBuckets = {};

    tasks.forEach(function (task) {
      if (processed >= maxPerRound) return;
      try {
        switch (task.kind) {
          case "deleteMessage":
            var cid = String(task.payload.chat_id);
            if (!deleteBuckets[cid]) deleteBuckets[cid] = [];
            deleteBuckets[cid].push(task.payload.message_id);
            break;

          case "verifyTimeout":
            handleVerifyTimeout(task.payload);
            break;

          case "unmute":
            tgUnmuteMember(task.payload.chat_id, task.payload.user_id);
            break;

          default:
            logInfo("task", "未知任务类型 " + task.kind);
        }
        if (sheet) markTaskDone(sheet, task.row);
        processed++;
      } catch (e) {
        logError("task:" + task.kind, e, task.payload);
        if (sheet) markTaskDone(sheet, task.row);
      }
    });

    // 统一执行删除
    Object.keys(deleteBuckets).forEach(function (cid) {
      tgDeleteMessages(cid, deleteBuckets[cid]);
    });

    logInfo("scheduler", "处理 " + processed + " 个任务");
  } catch (e) {
    logError("runScheduler", e);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/** 入群验证超时：还没验证就移出 */
function handleVerifyTimeout(payload) {
  var member = tgGetMember(payload.chat_id, payload.user_id);
  if (!member) return;
  // creator / administrator 说明已经通过了（或者本来就是管理员）
  if (member.status === "creator" || member.status === "administrator") return;
  // 只有仍处于 restricted 状态才踢，避免误伤已通过验证的用户
  if (member.status === "restricted" || member.status === "member") {
    if (member.status === "restricted") {
      tgKickMember(payload.chat_id, payload.user_id);
      tgDeleteMessage(payload.chat_id, payload.message_id);
      var t = tg("sendMessage", {
        chat_id: payload.chat_id,
        text: "<i>⏳ 一位未完成验证的用户已被移出群聊。</i>",
        parse_mode: "HTML",
      });
      if (t) scheduleAutoDelete(payload.chat_id, t.message_id, 15);
    }
  }
}

/* ============================================================================
 * 二、每日维护
 * ==========================================================================*/

function runDailyMaintenance() {
  try {
    // 0. 接入自愈：Webhook 被 GAS 302 掉时自动切轮询
    //    （每次 push 新代码都会让 GAS 的匿名授权失效，机器人会重新变哑，
    //     与其等用户发现，不如每天维护时自己修一次）
    ensureReachable();

    // 1. 清理已完成的任务行
    purgeOldTasks(300);

    // 2. 清理过量的错误日志
    trimSheet(SHEET.errors, cfg("log.maxRows", 2000));

    // 3. 按需清理历史消息
    var keepDays = cfg("storage.keepDays", 0);
    if (keepDays > 0) cleanOldStorage(keepDays);

    // 4. 清空过期警告（超过 30 天的 active 记录标记为 expired）
    expireOldWarns(30);

    // 5. 刷新缓存，让表格里的改动第二天一定生效
    cacheDrop(["keyParamsList", "sensitiveWords", "sensitiveWordsMap", "authorityList"]);

    logInfo("maintenance", "每日维护完成 " + nowStr());
  } catch (e) {
    logError("runDailyMaintenance", e);
  }
}

/**
 * 接入自愈 —— 「机器人突然不回话了」的兜底。
 *
 * 背景（2026-10-05 实测）：
 *   Telegram 把 update 推给 GAS 的 Web 应用，GAS 回一个 302 跳到 macros/echo，
 *   Telegram 不跟随重定向，直接判投递失败并重试 → 用户看到的就是
 *   「时灵时不灵」「发了没反应」。而 GAS 每次 push 新代码都会重置这个授权，
 *   所以问题会反复出现。
 *
 * 做法：每天维护时看一眼 Telegram 侧的错误，发现还在 302 就自动切轮询。
 *   · 轮询由时间触发器驱动，执行身份恒为「我」，不受这条链路影响；
 *   · 24 小时内不重复打扰 —— 用户刚手动选过模式（/mode webhook）就尊重他的选择。
 *
 * @return {string} 本次判定结果
 */
function ensureReachable() {
  if (!cfg("maintenance.autoSwitchPolling", true)) return "off";

  var props = PropertiesService.getScriptProperties();
  var lastManual = Number(props.getProperty("mb_mode_at") || 0);
  var HOUR = 3600 * 1000;
  if (lastManual && Date.now() - lastManual < 24 * HOUR) return "waiting:24h";

  try {
    var hasPoll = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getHandlerFunction() === "pollUpdates";
    });
    if (hasPoll) return "polling";

    var wh = tgGetWebhookInfo() || {};
    if (!wh.url) return "no-webhook";
    if (!/302|401/.test(String(wh.last_error_message || ""))) return "ok";

    // 真的被重定向了 —— 清积压 + 装轮询，一次到位
    tgDeleteWebhook(true);
    if (!killPollTriggers()) {
      ScriptApp.newTrigger("pollUpdates").timeBased().everyMinutes(1).create();
    }
    setProp("mb_mode", "polling");
    logInfo(
      "ensureReachable",
      "Webhook 被 GAS 重定向（" + wh.last_error_message + "），已自动切到轮询。切回：/mode webhook"
    );
    return "switched";
  } catch (e) {
    logError("ensureReachable", e);
    return "error";
  }
}

/** 只保留最近 N 行 */
function trimSheet(name, keepRows) {
  var sheet = getSheetOrNull(name);
  if (!sheet) return;
  try {
    var last = sheet.getLastRow();
    if (last <= keepRows + 1) return;
    sheet.deleteRows(2, last - keepRows);
  } catch (e) {
    logError("trimSheet:" + name, e);
  }
}

/** 清理超过 N 天的消息记录 */
function cleanOldStorage(days) {
  var sheet = getSheetOrNull(SHEET.storage);
  if (!sheet) return;
  try {
    var data = sheet.getDataRange().getValues();
    var cutoff = new Date(Date.now() - days * 86400000);
    var firstOldRow = -1;
    for (var i = 3; i < data.length; i++) {
      var t = new Date(data[i][0]);
      if (!isNaN(t.getTime()) && t < cutoff) {
        firstOldRow = i;
        break;
      }
    }
    if (firstOldRow < 0) return;
    var count = 0;
    for (var j = firstOldRow; j < data.length; j++) {
      var t2 = new Date(data[j][0]);
      if (!isNaN(t2.getTime()) && t2 < cutoff) count++;
      else break;
    }
    if (count > 0) sheet.deleteRows(firstOldRow + 1, count);
  } catch (e) {
    logError("cleanOldStorage", e);
  }
}

function expireOldWarns(days) {
  var sheet = getSheetOrNull(SHEET.warns);
  if (!sheet) return;
  try {
    var data = sheet.getDataRange().getValues();
    var cutoff = new Date(Date.now() - days * 86400000);
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][6]) !== "active") continue;
      var t = new Date(data[i][0]);
      if (!isNaN(t.getTime()) && t < cutoff) sheet.getRange(i + 1, 7).setValue("expired");
    }
  } catch (e) {
    logError("expireOldWarns", e);
  }
}

/* ============================================================================
 * 三、部署助手
 * ==========================================================================*/

/**
 * 一键绑定 Webhook。
 *
 * 需要先把脚本「部署为 Web 应用（访问权限：任何人）」，然后运行本函数。
 * 原版要求用户手动拼 https://api.telegram.org/bot<TOKEN>/setWebhook?url=...
 * 粘贴到浏览器，是新手最容易出错的环节；这里全自动。
 *
 * ⚠️ 注意：地址**不能**用 ScriptApp.getService().getUrl() 直接取 ——
 *    在编辑器里运行时它返回的是 /dev 测试地址，Telegram 访问不了，
 *    表现为「绑定成功但机器人毫无反应」。统一走 deployWebappUrlResolve()，
 *    它会优先拿部署列表里的 /exec 地址，并挡掉 /dev。
 *
 * @param {string} [explicitUrl] 直接指定 /exec 地址（可选）。
 *                               传了它等于「手工绑定」，会存进脚本属性，
 *                               下次热更新覆盖代码也不会丢。
 * @return {{ok:boolean, url:string, source:string, dev:string, error:string, hint:string, info:object}}
 */
function setupWebhook(explicitUrl) {
  var saved = "";
  if (explicitUrl !== undefined && explicitUrl !== null && String(explicitUrl).trim() !== "") {
    var put = deployWebappUrlSetManual(explicitUrl);
    if (!put.ok) return { ok: false, url: "", error: put.error, hint: "地址不合法，没有写入。" };
    saved = put.url;
  }

  var r = deployWebappUrlResolve();

  if (!r.ok) {
    return {
      ok: false,
      url: "",
      error: r.error,
      dev: r.dev,
      scopeError: !!r.scopeError,
      hint: deployWebappHint(r),
    };
  }

  var set = tgSetWebhook(r.url);
  var info = tgGetWebhookInfo();

  var result = {
    ok: !!set,
    url: r.url,
    source: r.source,
    info: info,
    dev: r.dev || "",
    saved: saved,
    error: "",
  };
  if (!set) result.error = "Telegram 拒绝了本次绑定（请检查 BOTID / 网络）";
  return result;
}

/**
 * 地址取不到时，给一句能直接照做的提示（错误信息最怕只说"失败了"）。
 *
 * ⚠️ 这里刻意区分两种情况：
 *   - 授权不足 → 部署列表根本读不到，跟"有没有建部署"无关，
 *     不能再指用户去"新建一次部署"（他很可能已经建过了，白折腾）
 *   - 真的没部署 → 才让去新建
 */
function deployWebappHint(r) {
  var lines = [];

  if (r && r.scopeError) {
    lines.push("读不到部署列表（授权不足），所以只能看到 /dev 测试地址 —— 这不代表你没建过部署。");
    lines.push("");
    lines.push("【方案 A · 修授权，之后全自动】");
    lines.push("1. 打开 https://script.google.com/home/usersettings 把「Google Apps Script API」设为开启");
    lines.push("2. 打开 https://myaccount.google.com/permissions 删掉本项目的访问权限");
    lines.push("3. 回到编辑器随便运行一个函数，重新授权（会再弹一次同意页）");
    lines.push("4. 重跑 setupWebhook()");
    lines.push("");
    lines.push("【方案 B · 手工绑一次，一劳永逸】");
    lines.push("Web 应用的 /exec 地址是**永久固定**的，同一个部署推多少新版本都不会变，");
    lines.push("只有「删除部署后重建」才会变。所以绑一次就够了，不用每次部署都改。");
    lines.push("把这个地址发给我就行：/webhook bind <你的 /exec 地址>");
    lines.push("（存在脚本属性里，/push 热更新覆盖代码也冲不掉）");
    lines.push("");
    lines.push("【方案 C · 应急才用，别长期跑】");
    lines.push("运行 switchToPolling() 换成轮询模式，完全不依赖 Web 应用地址。");
    lines.push("⚠️ 代价要说清楚：每分钟拉一次 = 每天 1440 次执行，");
    lines.push("   消费者账号每天总共只有 90 分钟运行时长，这会把配额吃掉一大块。");
    lines.push("   适合「先跑起来验证功能」，验证完请换回 Webhook。");
    return lines.join("\n");
  }

  if (r && r.dev) {
    return (
      "检测到你手上的是 /dev 测试地址（" +
      clip(r.dev, 90) +
      "），它需要 Google 登录才能访问，Telegram 用不了。\n" +
      "  请到「部署 → 新建部署 → 齿轮选 Web 应用 → 执行身份：我 → 访问权限：任何人」，\n" +
      "  部署后把 /exec 结尾的网址发给我：/webhook bind <地址>\n" +
      "  或直接重跑 setupWebhook()（会自动从部署列表里取）。"
    );
  }

  return (
    "还没检测到 Web 应用部署。请先在右上角「部署 → 新建部署」里选择 Web 应用类型，\n" +
    "  访问权限必须选「任何人」，部署完成后把 /exec 地址发给我：/webhook bind <地址>。"
  );
}

function removeWebhook() {
  return tgDeleteWebhook(true);
}

/**
 * 通用入口：第一次部署时跑这一个函数就够了。
 * 依次完成：建表 → 自检 → 注册命令菜单 → 安装调度器 → 绑定 Webhook
 */
function onBotInit() {
  var report = [];

  var db = initDatabase();
  report.push("① 数据表：" + (db.ok ? "就绪（新建 " + db.created.length + " 个）" : "失败 - " + db.error));

  var menu = syncCommandsToTelegram();
  report.push("② 命令菜单：" + (menu.ok ? "已注册 " + menu.count + " 条" : "失败 - " + menu.error));

  var trg = installScheduler();
  report.push("③ 调度器：" + (trg.ok ? "已安装（共 " + trg.triggers + " 个触发器）" : "失败"));

  var wh = setupWebhook();
  report.push("④ Webhook：" + (wh.ok ? "已绑定 " + wh.url : "未绑定 - " + (wh.error || "请先部署为 Web 应用")));
  if (!wh.ok && wh.hint) {
    report.push("");
    report.push("【怎么修】");
    report.push(wh.hint);
  } else if (wh.ok && wh.dev) {
    // 取到正式地址了，但也顺带发现了 /dev，提醒一句别手滑填错
    report.push("");
    report.push("✅ 已自动跳过 /dev 测试地址，用的是正式部署地址（来源：" + wh.source + "）");
  }

  report.push("");
  report.push("配置检查：EXECID " + (EXECID ? "✅" : "❌") + " / BOTID " + (BOTID ? "✅" : "❌") + " / KingId " + (KingId ? "✅" : "⚠️未填"));

  var text = report.join("\n");
  console.log(text);
  if (KingId) {
    tg("sendMessage", {
      chat_id: KingId,
      text: "<b>🚀 " + esc(BRAND.name || "Bot") + " 初始化完成</b>\n\n" + esc(text).replace(/\n/g, "\n"),
      parse_mode: "HTML",
    });
  }
  return text;
}

/* ============================================================================
 * 四、数据库初始化
 * ==========================================================================*/

/**
 * 各工作表结构定义。
 * ⚠️ 关键约束：db_telegram / key_params 的前 3 行为表头（数据从第 4 行起），
 *    sensitive_words / authority_management 的前 2 行为表头（数据从第 3 行起）
 *    —— 这是为了与官方版的既有数据表 100% 兼容，所有读取代码都按这个偏移量写。
 *    每一行的列数必须一致，否则 setValues 会因维度不匹配抛错。
 */
function sheetSchemas() {
  function pad(arr, width) {
    var out = arr.slice();
    while (out.length < width) out.push("");
    return out;
  }
  var DB_COLS = 10;
  var dbHeader = ["发起时间", "用户ID", "用户名称", "用户昵称", "消息类型", "消息来源", "来源ID", "消息内容", "消息JSON", "消息ID"];

  return {
    db_telegram: [
      pad(["📌 消息存储表 · 机器人自动写入，请勿手工编辑"], DB_COLS),
      pad(dbHeader, DB_COLS),
      pad(["↓ 以下为机器人自动写入的数据 ↓"], DB_COLS),
    ],
    key_params: [
      ["📌 关键字自动回复配置表", "", "", ""],
      ["关键字（英文逗号分隔）", "标识块", "内容块1", "内容块2…"],
      ["", "HTML / MarkdownV2 / GraphicMessage / VideoMessage", "", ""],
    ],
    authority_management: [
      ["📌 权限控制表", "", ""],
      ["类型", "IDs", ""],
      ["群组屏蔽列表（这些群的消息不推送给主人）", "", ""],
      ["管理员列表（已改为官方接口自动获取，此处可留空）", "", ""],
    ],
    sensitive_words: [
      ["📌 敏感词库 · Base64 加密存储", ""],
      ["绝杀词（触发即封禁）", "敏感词（触发即删除）"],
    ],
    chat_settings: [["会话ID", "设置项", "值", "更新时间"]],
    warn_records: [["时间", "会话ID", "用户ID", "用户昵称", "操作人ID", "原因", "状态"]],
    error_log: [["时间", "位置", "错误信息", "上下文"]],
    task_queue: [["状态", "执行时间", "类型", "参数", "创建时间", "完成时间"]],
    channel_watch: [
      ["📌 频道监听规则表 · 用 /ch add 自动写入，也可手工编辑"],
      ["频道ID", "频道名称", "推送目标", "关键词", "状态", "备注", "添加时间"],
      ["留空关键词 = 该频道每条新帖都推送；推送目标留空 = 推送给 Bot 主人", "", "", "", "", "", ""],
    ],
  };
}

/** 兼容旧引用 */
const SHEET_SCHEMAS = sheetSchemas();

/** 本项目依赖的数据表（缺了任何一张，对应功能都会静默失效） */
function requiredSheets() {
  return Object.keys(sheetSchemas());
}

/**
 * 一次性补齐全部数据表（幂等：已经存在的表不动，只补缺的）。
 *
 * ⭐ 存在的意义：这套代码以前**没有任何自动建表入口** ——
 *    sheetSchemas() 把 9 张表的结构写得清清楚楚，却没有任何地方调用它。
 *    于是「db_telegram 表根本没建」和「机器人没反应」长得很像：
 *    消息照样进得来、指令照样回，只是存不进表。
 *    全新部署时先跑一遍这个，就不用自己去 Google Sheet 里手工建表了。
 *
 * @returns {{ok:boolean, created:string[], existing:string[], failed:string[], error:string}}
 */
function initSheets() {
  var ss = getSS();
  if (!ss) {
    return {
      ok: false,
      created: [], existing: [], failed: requiredSheets(),
      error: "拿不到电子表格。EXECID 填了吗？（/webhook 或 node Tools/setup-config.js 可查）",
    };
  }

  var created = [], existing = [], failed = [];
  for (var name of requiredSheets()) {
    if (getSheetOrNull(name)) { existing.push(name); continue; }
    if (ensureSheet(name)) created.push(name);
    else failed.push(name);
  }
  return { ok: !failed.length, created: created, existing: existing, failed: failed };
}

/**
 * 一键初始化（全新部署后跑这一个就够）。
 *
 * 顺序：建表 → 装调度器（1 个每分钟 + 1 个每天维护）→ 绑 webhook → 权限自检。
 *
 * ⚠️ 权限那一项**只能靠 UI**：Apps Script API 改不了部署的 accessConfiguration，
 *    所以这里只做探测 + 给人话结论，不假装能自动改。
 *
 * @returns {object} 一份可以直接给用户看的报告
 */
function bootstrap() {
  var report = { sheets: null, triggers: null, webhook: null, probe: null };

  report.sheets = initSheets();

  try {
    report.triggers = installScheduler();
  } catch (e) {
    report.triggers = { ok: false, error: String(e && e.message || e) };
  }

  // 绑 webhook。⚠️ 地址必须走 deployWebappUrlResolve()：
  // getService().getUrl() 在编辑器里运行时返回的是 /dev 测试地址，
  // Telegram 根本访问不了，会变成「绑定成功但机器人毫无反应」。
  if (typeof deployWebappUrlResolve === "function") {
    try {
      var r = deployWebappUrlResolve();
      var r3 = setupWebhook();
      report.webhook = {
        ok: !!(r3 && r3.ok),
        url: (r3 && r3.url) || "",
        source: (r && r.source) || "",
        error: (r3 && r3.error) || "",
      };
    } catch (e) {
      report.webhook = { ok: false, error: String(e && e.message || e) };
    }
  } else {
    report.webhook = { ok: false, disabled: true, reason: "当前版本没有 deployWebappUrlResolve()" };
  }

  // 部署权限自检（只能探测，改不动 —— Apps Script API 没有这个字段）
  report.probe = {
    exec: typeof deployProbeExec === "function" ? safeProbe() : null,
    note: "若返回 302：去 GAS「部署 → 管理部署 → ✏️ 编辑 → 执行身份 = 以我（部署者）」",
  };

  return report;
}

/** bootstrap 里的探测不希望因为单条错误就把整份报告带走 */
function safeProbe() {
  try {
    var u = deployWebappUrlResolve();
    if (!u.ok) return { code: 0, verdict: "拿不到 /exec 地址", fix: "先部署为 Web 应用" };
    return deployProbeExec(u.url);
  } catch (e) {
    return { code: 0, verdict: "探测失败：" + (e && e.message || e) };
  }
}

/**
 * 建表 / 修表。幂等，可反复运行。
 * ⭐ 只对「本次新建」的表写入表头，绝不覆盖用户已有数据 —— 这保证了
 *    从官方版迁移过来的旧表格可以直接用，不会因为跑一次初始化就被清空。
 */
function initDatabase() {
  try {
    var ss = getSS();
    if (!ss) return { ok: false, error: "无法访问电子表格，请检查 EXECID 是否填写正确、脚本是否有权限" };

    var created = [];
    var schemas = sheetSchemas();

    Object.keys(schemas).forEach(function (name) {
      var isNew = false;
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        isNew = true;
        created.push(name);
      }

      var schema = schemas[name];
      var width = schema.reduce(function (w, row) {
        return Math.max(w, row.length);
      }, 1);

      // 补足行数
      if (sheet.getMaxRows() < schema.length) {
        sheet.insertRowsAfter(sheet.getMaxRows(), schema.length - sheet.getMaxRows());
      }
      // 补足列数
      if (sheet.getMaxColumns() < width) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
      }

      if (isNew) {
        var normalized = schema.map(function (row) {
          var r = row.slice();
          while (r.length < width) r.push("");
          return r;
        });
        sheet.getRange(1, 1, normalized.length, width).setValues(normalized);
        sheet.getRange(1, 1, 1, width).setFontWeight("bold");
        sheet.setFrozenRows(schema.length);
      }
    });

    return { ok: true, created: created };
  } catch (e) {
    logError("initDatabase", e);
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/**
 * 读取"群组屏蔽列表"：这些群的消息不推送给主人。
 * 对应原版的 forGotList（originally 从 authority_management 表读取）。
 */
function getIgnoredChatIds() {
  return cached("authorityList", cfg("cache.ttlSeconds", 10800), function () {
    var data = readSheet(SHEET.authority);
    var list = [];
    // 群组屏蔽列表在第 3 行，从第 2 列开始
    if (data.length >= 3) {
      for (var c = 1; c < data[2].length; c++) {
        var v = String(data[2][c] || "").trim();
        if (v) list.push(v);
      }
    }
    return list;
  });
}

/* ============================================================================
 * 五、诊断入口（在 GAS 编辑器里手动运行）
 * ==========================================================================*/

/** 打印当前配置概览，便于排查 */
function diagnose() {
  var out = [];
  out.push("=== 配置 ===");
  out.push("EXECID: " + (EXECID || "(空)"));
  out.push("BOTID : " + (BOTID ? BOTID.slice(0, 8) + "…" : "(空)"));
  out.push("KingId: " + (KingId || "(空)"));
  out.push("botIdAlone: " + (botIdAlone || "(空)"));
  out.push("=== 表格 ===");
  var ss = getSS();
  out.push("可访问: " + !!ss);
  if (ss) out.push("工作表: " + ss.getSheets().map(function (s) { return s.getName(); }).join(", "));
  out.push("=== Bot ===");
  var me = tgGetMe();
  out.push("getMe: " + (me ? "@" + me.username + " (" + me.id + ")" : "失败"));
  var wh = tgGetWebhookInfo();
  out.push("Webhook: " + (wh && wh.url ? wh.url : "未设置"));
  /* 光看 getWebhookInfo 不够：绑的是 /dev 时 Telegram 也认为"已设置" */
  if (wh && deployIsDevUrl(wh.url)) {
    out.push("⚠️ 上面绑的是 /dev 测试地址，Telegram 访问不了 —— 运行 setupWebhook() 重绑");
  }
  var wr = deployWebappUrlResolve();
  out.push("正式地址: " + (wr.ok ? wr.url : "未能取到（" + wr.error + "）"));
  if (wr.ok) out.push("地址来源: " + deploySourceLabel(wr.source));
  out.push("=== 触发器 ===");
  ScriptApp.getProjectTriggers().forEach(function (t) {
    out.push(" - " + t.getHandlerFunction() + " [" + t.getEventType() + "]");
  });
  out.push("=== 队列 ===");
  out.push("待处理任务: " + fetchDueTasks(500).length);

  var text = out.join("\n");
  console.log(text);
  return text;
}

/** 手动触发一次任务队列（调试用） */
function debugRunQueue() {
  runScheduler();
  return "已执行一轮调度，剩余任务：" + fetchDueTasks(500).length;
}

/** 手动发一条测试消息给主人 */
function debugPushToKing() {
  if (!KingId) return "未配置 KingId";
  var r = tg("sendMessage", {
    chat_id: KingId,
    text: "<b>✅ 推送链路测试成功</b>\n\n" + nowStr(),
    parse_mode: "HTML",
  });
  return r ? "已发送" : "发送失败";
}
