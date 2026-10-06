/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Core.gs — 基础设施层：表格读写、缓存、日志、任务队列、幂等、限流
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 一、表格访问
 * --------------------------------------------------------------------------*/

/** 单次请求内复用 Spreadsheet 句柄，避免重复 openById 的配额消耗 */
var __SS_CACHE__ = null;

/**
 * 获取电子表格。
 * ⭐ 修复：原版混用 getActiveSpreadsheet() 与 openById(EXECID)，
 *    当脚本是"独立项目"（未绑定表格）时 getActiveSpreadsheet() 返回 null，
 *    会直接在 doPost 里抛异常导致整条消息无响应。这里统一优先 openById。
 */
function getSS() {
  if (__SS_CACHE__) return __SS_CACHE__;
  var ss = null;
  if (EXECID) {
    try {
      ss = SpreadsheetApp.openById(EXECID);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
  }
  __SS_CACHE__ = ss;
  return ss;
}

/** 安全取工作表；不存在时返回 null 而不是抛异常 */
function getSheetOrNull(name) {
  var ss = getSS();
  if (!ss) return null;
  return ss.getSheetByName(name);
}

/** 读取整表为二维数组 */
function readSheet(name) {
  var sheet = getSheetOrNull(name);
  if (!sheet) return [];
  try {
    return sheet.getDataRange().getValues() || [];
  } catch (e) {
    return [];
  }
}

/**
 * 各工作表占用的表头行数。数据必须从「表头行数 + 1」开始写入。
 * ⭐ 为什么必须显式声明而不是直接用 appendRow：
 *    Google 的 appendRow 会写在 getLastRow()+1，而 getLastRow() 会跳过末尾的空行。
 *    官方版的 db_telegram 前 3 行是表头、第 3 行常常是空的，
 *    此时 appendRow 会把数据写进第 3 行，与"表头"重叠，
 *    后续按偏移量 3 读取的代码就会漏掉第一条数据。
 */
var SHEET_HEADER_ROWS = {
  db_telegram: 3,
  key_params: 3,
  authority_management: 2,
  sensitive_words: 2,
  chat_settings: 1,
  warn_records: 1,
  error_log: 1,
  task_queue: 1,
  channel_watch: 3,
};

/** 某张表第一条数据应写入的行号 */
function firstDataRow(name) {
  return (SHEET_HEADER_ROWS[name] || 1) + 1;
}

/**
 * 追加一行数据，保证不会覆盖表头。
 */
function appendRow(name, values) {
  var sheet = getSheetOrNull(name);
  if (!sheet) {
    // 表被删了 / 从没建过 —— 自动补建再写，别让数据凭空消失
    sheet = ensureSheet(name);
    if (!sheet) return false;
  }
  try {
    var target = Math.max(sheet.getLastRow() + 1, firstDataRow(name));
    sheet.getRange(target, 1, 1, values.length).setValues([values]);
    return true;
  } catch (e) {
    logError("appendRow:" + name, e);
    return false;
  }
}

/** 批量追加行（一次写入，比逐行 appendRow 快一个数量级） */
function appendRows(name, rows) {
  var sheet = getSheetOrNull(name);
  if (!sheet) {
    sheet = ensureSheet(name); // 表缺失时自动补建，避免整批数据静默丢失
    if (!sheet) return false;
  }
  if (!rows || !rows.length) return false;
  try {
    var start = Math.max(sheet.getLastRow() + 1, firstDataRow(name));
    sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
    return true;
  } catch (e) {
    logError("appendRows:" + name, e);
    return false;
  }
}

/**
 * 确保工作表存在且表头正确，返回该表。
 *
 * ⭐ 表不存在时会**自动建出来**（结构从 sheetSchemas() 取，取不到再用 headers）。
 *    原来是「不存在就 insertSheet 一张空表」，什么都没写进去 ——
 *    于是 db_telegram 缺表时 appendRow 静默返回 false，
 *    消息存了个寂寞，日志里连条错误都没有，
 *    用户只看到「机器人没反应」，根本无从判断是脚本没跑还是表没建。
 *    现在：缺表 → 自动建 → 写表头 → 正常存数据。
 *
 * @param {string} name    表名
 * @param {string[]} [headers] 备选表头（sheetSchemas 里没这套表时才用）
 */
function ensureSheet(name, headers) {
  var ss = getSS();
  if (!ss) return null;

  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    // ---- 表不存在：先找出该长什么样 ----
    var rows = null;
    if (typeof sheetSchemas === "function") {
      try {
        var schemas = sheetSchemas();
        rows = schemas ? schemas[name] || null : null;
      } catch (e) {
        rows = null;
      }
    }
    if (!rows && headers && headers.length) rows = [headers];

    if (!rows || !rows.length) {
      logError("ensureSheet", "工作表「" + name + "」不存在，代码里也没有它的结构定义，没法自动建");
      return null;
    }

    try {
      var w = rows[0].length;
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, rows.length, w).setValues(rows);
      logInfo("ensureSheet", "已自动创建工作表「" + name + "」并写入 " + rows.length + " 行表头");
    } catch (e) {
      logError("ensureSheet:" + name, e);
      return null;
    }
  }

  if (headers && headers.length) {
    var first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var need = headers.some(function (h, i) {
      return String(first[i] || "") !== h;
    });
    if (need) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

/** 取某列最后一个非空行号 */
function lastRowInColumn(sheet, column) {
  if (!sheet) return 0;
  var values = sheet.getRange(1, column, sheet.getMaxRows(), 1).getValues();
  for (var r = values.length - 1; r >= 0; r--) {
    if (values[r][0] !== "") return r + 1;
  }
  return 0;
}

/* ----------------------------------------------------------------------------
 * 二、缓存
 * --------------------------------------------------------------------------*/

var __CACHE__ = null;
function cacheStore() {
  if (!__CACHE__) __CACHE__ = CacheService.getScriptCache();
  return __CACHE__;
}

/**
 * 通用"读缓存失败则回源"。
 * ⭐ 修复：原版 `cacheExpirationStatus` 默认 true 时每轮都先 remove 再 get，
 *    等于缓存从未生效，每次消息都全量扫表（GAS 表格读取很慢，这是卡顿主因）。
 */
function cached(key, ttlSeconds, producer) {
  if (!cfg("cache.enabled", true)) return producer();
  var store = cacheStore();
  try {
    var hit = store.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {
    /* 缓存内容损坏，回源 */
  }
  var value = producer();
  try {
    var json = JSON.stringify(value);
    // CacheService 单键上限 100KB，超了就不缓存（避免抛错）
    if (json && json.length < 95000) {
      store.put(key, json, ttlSeconds || cfg("cache.ttlSeconds", 10800));
    }
  } catch (e) {
    /* 忽略序列化失败 */
  }
  return value;
}

/** 主动失效缓存 */
function cacheDrop(keys) {
  try {
    cacheStore().removeAll([].concat(keys));
  } catch (e) {}
}

/* ----------------------------------------------------------------------------
 * 三、错误日志
 * --------------------------------------------------------------------------*/

/**
 * 写入 error_log。
 * 同一错误码 5 分钟内只记一次，避免刷屏把表格撑爆。
 */
function logError(where, err, extra) {
  try {
    if (!cfg("log.errors", true)) return;
    var message = err && err.message ? err.message : String(err);
    var sig = md5(where + "|" + message);
    if (cacheStore().get("errsig:" + sig)) return;
    cacheStore().put("errsig:" + sig, "1", 300);

    appendRow(SHEET.errors, [
      nowStr(),
      where || "-",
      message,
      extra ? clip(typeof extra === "string" ? extra : JSON.stringify(extra), 400) : "",
    ]);

    if (cfg("log.verbose", false)) console.error("[" + where + "] " + message);
  } catch (e) {
    /* 日志本身失败绝不能再抛错 */
  }
}

/** 信息日志（仅出现在 GAS 执行记录里，不写表） */
function logInfo(tag, data) {
  if (!cfg("log.verbose", false)) return;
  try {
    console.log("[" + tag + "] " + (typeof data === "string" ? data : JSON.stringify(data)));
  } catch (e) {}
}

/* ----------------------------------------------------------------------------
 * 四、幂等 —— 防 Telegram 重推导致的重复响应
 * --------------------------------------------------------------------------*/

/**
 * Telegram 在没及时收到 200 时会重推同一个 update。
 * 原版没有去重，会造成机器人重复回复同一条消息。
 */
function isDuplicateUpdate(updateId) {
  if (updateId === null || updateId === undefined) return false;
  var key = "upd:" + updateId;
  try {
    if (cacheStore().get(key)) return true;
    cacheStore().put(key, "1", 300);
  } catch (e) {}
  return false;
}

/* ----------------------------------------------------------------------------
 * 五、用户级限流
 * --------------------------------------------------------------------------*/

/**
 * 返回 true 表示"被限流了"。
 * 用 CacheService 计数器实现滑动窗口的近似版本（够用且零成本）。
 */
function isRateLimited(userId, key, seconds) {
  if (!seconds || seconds <= 0) return false;
  var k = "rl:" + key + ":" + userId;
  try {
    if (cacheStore().get(k)) return true;
    cacheStore().put(k, "1", seconds);
  } catch (e) {}
  return false;
}

/* ----------------------------------------------------------------------------
 * 六、任务队列（自动删除等延时任务的骨架）
 * --------------------------------------------------------------------------*/

/**
 * ⭐ 架构级改进：
 * 原版为了"60 秒后删除机器人消息"，给每条消息创建一个一次性时间触发器，
 * 受 GAS「普通账号最多 20 个触发器」限制，只能靠 createDelayedTriggerWithParams
 * 里那套"数数、删触发器、循环执行"的补偿逻辑硬扛，代码晦涩且高并发必崩。
 *
 * 现在改为：任务写进 task_queue 表 + 一个每分钟触发的调度器统一消费。
 * 触发器永远只需要 1 个，任务数量不再有上限。
 */
function enqueueTask(kind, payload, runAtUnix) {
  if (!cfg("autoDelete.enabled", true)) return false;
  return appendRow(SHEET.tasks, [
    "pending", // 状态
    runAtUnix || unixNow(), // 执行时间（unix 秒）
    kind, // 类型
    JSON.stringify(payload || {}), // 参数
    nowStr(), // 创建时间
    "", // 完成时间
  ]);
}

/** 取出一批到期任务（返回 [{row, kind, payload}]） */
function fetchDueTasks(limit) {
  var sheet = getSheetOrNull(SHEET.tasks);
  if (!sheet) return [];
  var data = [];
  try {
    data = sheet.getDataRange().getValues() || [];
  } catch (e) {
    return [];
  }
  var now = unixNow();
  var out = [];
  for (var i = 1; i < data.length && out.length < limit; i++) {
    var row = data[i];
    if (String(row[0]) !== "pending") continue;
    if (Number(row[1]) > now) continue;
    var payload = {};
    try {
      payload = JSON.parse(row[3] || "{}");
    } catch (e) {}
    out.push({ row: i + 1, kind: String(row[2]), payload: payload });
  }
  return out;
}

/** 标记任务完成 */
function markTaskDone(sheet, rowIndex) {
  try {
    sheet.getRange(rowIndex, 1).setValue("done");
    sheet.getRange(rowIndex, 6).setValue(nowStr());
  } catch (e) {}
}

/** 清理已完成的旧任务行（防止表无限膨胀） */
function purgeOldTasks(keepRows) {
  var sheet = getSheetOrNull(SHEET.tasks);
  if (!sheet) return;
  try {
    var last = sheet.getLastRow();
    if (last <= (keepRows || 500) + 1) return;
    var delCount = last - (keepRows || 500);
    sheet.deleteRows(2, delCount);
  } catch (e) {
    logError("purgeOldTasks", e);
  }
}

/* ----------------------------------------------------------------------------
 * 七、统计辅助
 * --------------------------------------------------------------------------*/

/** 统计今天某群某人的发言次数 */
function countUserMessagesToday(userId, chatId) {
  var data = readSheet(SHEET.storage);
  var total = 0;
  for (var i = data.length - 1; i >= 3; i--) {
    var row = data[i];
    if (!row[0]) continue;
    if (!isSameDay(row[0])) break; // 逆序遇到非今天即可停
    if (String(row[1]) === String(userId) && String(row[6]) === String(chatId)) total++;
  }
  return total;
}

/** 统计今天某群的话痨榜 [{userId, userName, total}] */
function chatterboxRank(chatId, limit) {
  var data = readSheet(SHEET.storage);
  var map = {};
  for (var i = data.length - 1; i >= 3; i--) {
    var row = data[i];
    if (!row[0]) continue;
    if (!isSameDay(row[0])) break;
    if (String(row[6]) !== String(chatId)) continue;
    var uid = String(row[1] || "");
    if (!uid) continue;
    if (!map[uid]) {
      map[uid] = {
        userId: uid,
        userName: String(row[3] || row[2] || uid),
        userNameKey: String(row[2] || ""),
        total: 0,
      };
    }
    map[uid].total++;
  }
  return sortByFieldDesc(map, "total").slice(0, limit || 20);
}

/** 最近 N 小时某用户在某群的违规次数 */
function recentViolationCount(userId, chatId, hours) {
  var data = readSheet(SHEET.storage);
  var since = new Date(Date.now() - (hours || 3) * 3600 * 1000);
  var count = 0;
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (!row[0]) continue;
    var t = new Date(row[0]);
    if (isNaN(t.getTime())) continue;
    if (t < since) break;
    if (
      String(row[1]) === String(userId) &&
      String(row[6]) === String(chatId) &&
      String(row[4] || "").indexOf("敏感词触发删除") !== -1
    ) {
      count++;
    }
  }
  return count;
}

/** 取某用户在某群最近 24h 的消息 ID 列表（批量清理用） */
function recentMessageIds(userId, chatId, hours) {
  var data = readSheet(SHEET.storage);
  var since = new Date(Date.now() - (hours || 24) * 3600 * 1000);
  var out = [];
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (!row[0]) continue;
    var t = new Date(row[0]);
    if (isNaN(t.getTime())) continue;
    if (t < since) break;
    if (String(row[1]) === String(userId) && String(row[6]) === String(chatId)) {
      var mid = row[9];
      if (mid !== "" && mid !== undefined && mid !== null) out.push(String(mid));
    }
  }
  return uniq(out);
}
