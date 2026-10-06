/* ============================================================
 * GAS 运行时模拟层 —— 仅用于本地验证 MaoBot 逻辑，不属于项目代码
 * ============================================================ */

const TL_CALLS = [];   // Telegram API 调用记录 { method, body }
const EXT_CALLS = [];  // 外部接口调用记录 { url, method, body }
const __store = { cache: new Map(), props: new Map(), parsed: null };

const __routes = [];       // 外部接口的假响应 [{ match, body, code }]
const __failMethods = {};  // Telegram 方法故障注入 { sendRichMessage: 404 }
let __langFail = false;    // 是否让 LanguageApp 抛异常（测降级）
let __ephFail = false;     // 只让"临时消息"这一路失败

/**
 * 注册一条外部接口的假响应。
 * 同一个 match 重复注册时**后者覆盖前者** —— 测试里经常需要"同一个接口换一份返回"，
 * 若按先注册者优先，后面的 mockRoute 会静默失效，断言失败得莫名其妙。
 */
function mockRoute(match, body, code) {
  for (let i = __routes.length - 1; i >= 0; i--) {
    if (__routes[i].match === match) __routes.splice(i, 1);
  }
  __routes.push({ match, body, code: code === undefined ? 200 : code });
}

/** 让某个 Telegram 方法返回错误（测能力降级） */
function mockFailMethod(method, code) {
  __failMethods[method] = code || 404;
}

/**
 * 只让带 ephemeral_message_parameters 的请求返回 400（模拟"机器人不是群管理员"）。
 * 刻意用 400 而非 404：这类失败是会话级限制，不应写入永久降级标记。
 */
function mockFailEphemeral(on) {
  __ephFail = !!on;
}

/** 让 LanguageApp 抛异常（测 MyMemory 降级） */
function mockLangFail(on) {
  __langFail = !!on;
}

/** 清空所有记录与开关，供各测试段之间隔离 */
function mockReset() {
  __store.cache.clear();
  __store.props.clear();
  TL_CALLS.length = 0;
  EXT_CALLS.length = 0;
  __routes.length = 0;
  Object.keys(__failMethods).forEach((k) => delete __failMethods[k]);
  __langFail = false;
  __ephFail = false;
  __serviceUrl = "https://script.google.com/macros/s/MOCK_HEAD_ID/dev";
  __webhookUrl = "https://script.google.com/macros/s/MOCK_EXEC_ID/exec";
}

/** 取最近一次指定方法的调用 */
function lastCall(method) {
  for (let i = TL_CALLS.length - 1; i >= 0; i--) {
    if (TL_CALLS[i].method === method) return TL_CALLS[i];
  }
  return null;
}

/** 统计某方法被调用的次数 */
function callCount(method) {
  return TL_CALLS.filter((c) => c.method === method).length;
}

/** task_queue 表里当前有多少条任务（用于验证降级路径是否排入了定时删除） */
function enqueueTaskCount() {
  const sh = __store.parsed && __store.parsed.getSheetByName("task_queue");
  if (!sh) return 0;
  return Math.max(0, sh.getLastRow() - 1);
}

/** 取最近一次外部请求 */
function lastExt(match) {
  for (let i = EXT_CALLS.length - 1; i >= 0; i--) {
    if (!match || EXT_CALLS[i].url.indexOf(match) !== -1) return EXT_CALLS[i];
  }
  return null;
}

function mockResponse(text, code) {
  const buf = Buffer.from(String(text), "utf8");
  const b = (x) => (x > 127 ? x - 256 : x);
  return {
    getContentText: () => text,
    getResponseCode: () => (code === undefined ? 200 : code),
    getBlob: () => ({
      getBytes: () => Array.from(buf).map(b),
      getContentType: () => "image/jpeg",
    }),
  };
}

const UrlFetchApp = {
  fetch(url, params) {
    const u = String(url);
    const opt = params || {};

    /* ---------- 外部接口 ---------- */
    if (u.indexOf("api.telegram.org") === -1) {
      let body = null;
      if (opt.payload) {
        try {
          body = typeof opt.payload === "string" ? JSON.parse(opt.payload) : opt.payload;
        } catch (e) {
          body = opt.payload;
        }
      }
      EXT_CALLS.push({ url: u, method: opt.method || "get", body, headers: opt.headers || {} });

      for (const r of __routes) {
        if (u.indexOf(r.match) !== -1) {
          return mockResponse(
            typeof r.body === "string" ? r.body : JSON.stringify(r.body),
            r.code
          );
        }
      }
      // 默认：外部接口不可用，用于验证降级分支
      return mockResponse("upstream unavailable", 502);
    }

    /* ---------- Telegram ---------- */
    const m = u.match(/\/bot[^/]+\/([A-Za-z]+)/);
    const method = m ? m[1] : "unknown";
    let body = {};
    if (opt.payload) {
      body = typeof opt.payload === "string" ? JSON.parse(opt.payload) : opt.payload;
    }
    TL_CALLS.push({ method, body, url: u });

    // 故障注入：模拟"服务端不认识这个方法"
    if (__failMethods[method]) {
      const code = __failMethods[method];
      return mockResponse(
        JSON.stringify({
          ok: false,
          error_code: code,
          description: code === 404 ? "Not Found: method not found" : "Bad Request: mock failure",
        }),
        code
      );
    }

    // 故障注入：只有"临时消息"失败，公开发送照常（用于验证三级降级）
    // 描述刻意不含 not supported / not found，模拟的是"机器人没有管理员权限"
    if (__ephFail && body.ephemeral_message_parameters) {
      return mockResponse(
        JSON.stringify({
          ok: false,
          error_code: 400,
          description: "Bad Request: not enough rights to send ephemeral messages",
        }),
        400
      );
    }

    const chatId = body.chat_id;
    const fake = (result) => mockResponse(JSON.stringify({ ok: true, result }), 200);

    if (method === "getMe") return fake({ id: 123456, is_bot: true, first_name: "TestBot", username: "TestBot" });
    if (method === "getWebhookInfo") return fake({ url: __webhookUrl, pending_update_count: 0, max_connections: 40 });
    if (method === "getChatAdministrators")
      return fake([
        { status: "creator", user: { id: 900001, first_name: "群主" } },
        { status: "administrator", user: { id: 900002, first_name: "管理员" }, custom_title: "副手" },
      ]);
    if (method === "getChatMemberCount") return fake(42);
    if (method === "getChat") return fake({ id: Number(chatId) || chatId, title: "测试群", type: "supergroup", username: "testgroup" });
    if (method === "getChatMember") return fake({ status: "member", user: { id: body.user_id } });
    if (method === "getFile") return fake({ file_id: body.file_id, file_path: "photos/mock.jpg", file_size: 1024 });
    if (method === "createChatInviteLink")
      return fake({ invite_link: "https://t.me/+MOCKLINK", expire_date: 0, member_limit: 0, creates_join_request: false });
    if (method === "setMyCommands" || method === "setMyName" || method === "setMyDescription" || method === "setMyShortDescription" || method === "setChatMenuButton")
      return fake(true);
    if (method === "getMyCommands") return fake([]);
    if (method === "getUpdates") return fake([]);
    if (method === "forwardMessage" || method === "copyMessage") return fake({ message_id: 999 });
    return fake({ message_id: TL_CALLS.length, chat: { id: chatId, type: "supergroup" } });
  },
};

/* ---- Utilities ---- */
const Utilities = {
  newBlob(input) {
    // GAS 会传入 string 或 byte[]，两种都要支持
    if (Array.isArray(input)) {
      const buf = Buffer.from(input.map((b) => b & 0xff));
      return {
        getBytes: () => input.slice(),
        getDataAsString: () => buf.toString("utf8"),
      };
    }
    const s = String(input);
    return {
      getBytes: () => Array.from(Buffer.from(s, "utf8")).map((b) => (b > 127 ? b - 256 : b)),
      getDataAsString: () => s,
    };
  },
  base64Encode(bytes) {
    const arr = Array.isArray(bytes) ? bytes : [];
    return Buffer.from(arr.map((b) => b & 0xff)).toString("base64");
  },
  base64Decode(str) {
    return Array.from(Buffer.from(String(str), "base64"));
  },
  computeDigest(algo, str) {
    const crypto = require("crypto");
    const name = algo === "MD5" ? "md5" : "sha256";
    return Array.from(crypto.createHash(name).update(String(str)).digest()).map((b) => (b > 127 ? b - 256 : b));
  },
  formatDate(date, tz, fmt) {
    const d = date instanceof Date ? date : new Date(date);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "Asia/Shanghai",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(d).reduce((a, p) => ((a[p.type] = p.value), a), {});
    return fmt
      .replace("yyyy", parts.year)
      .replace("MM", parts.month)
      .replace("dd", parts.day)
      .replace("HH", parts.hour === "24" ? "00" : parts.hour)
      .replace("mm", parts.minute)
      .replace("ss", parts.second);
  },
  sleep() {},
};

/* ---- CacheService / PropertiesService ---- */
const CacheService = {
  getScriptCache: () => ({
    get: (k) => (__store.cache.has(k) ? __store.cache.get(k) : null),
    put: (k, v) => __store.cache.set(k, v),
    remove: (k) => __store.cache.delete(k),
    removeAll: (ks) => ks.forEach((k) => __store.cache.delete(k)),
  }),
};
/** 设置 getWebhookInfo 返回的"当前绑定地址" */
function mockWebhookUrl(url) {
  __webhookUrl = String(url || "");
}

let __serviceUrl = "https://script.google.com/macros/s/MOCK_HEAD_ID/dev"; // 默认模拟"编辑器里运行" → /dev
let __webhookUrl = "https://script.google.com/macros/s/MOCK_EXEC_ID/exec";

/**
 * 设置 ScriptApp.getService().getUrl() 的返回值。
 * 默认返回 /dev（真实世界里在编辑器里跑就是这个值），
 * 需要模拟"被 Web 应用请求触发"时传 /exec 地址。
 */
function mockServiceUrl(url) {
  __serviceUrl = String(url || "");
}

const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => (__store.props.has(k) ? __store.props.get(k) : null),
    setProperty: (k, v) => __store.props.set(k, v),
    deleteProperty: (k) => __store.props.delete(k),
  }),
};

/* ---- Spreadsheet ---- */
class MockRange {
  constructor(sheet, r, c, nr, nc) {
    Object.assign(this, { sheet, r, c, nr, nc });
  }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet._get(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  setValues(vals) {
    for (let i = 0; i < vals.length; i++)
      for (let j = 0; j < vals[i].length; j++) this.sheet._set(this.r + i, this.c + j, vals[i][j]);
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  getValue() { return this.sheet._get(this.r, this.c); }
  setFontWeight() { return this; }
}

class MockSheet {
  constructor(name) { this.name = name; this.data = []; this.frozen = 0; }
  getName() { return this.name; }
  _get(r, c) {
    const row = this.data[r - 1];
    if (!row) return "";
    const v = row[c - 1];
    return v === undefined || v === null ? "" : v;
  }
  _set(r, c, v) {
    while (this.data.length < r) this.data.push([]);
    const row = this.data[r - 1];
    while (row.length < c) row.push("");
    row[c - 1] = v === undefined || v === null ? "" : v;
  }
  getLastRow() {
    for (let i = this.data.length - 1; i >= 0; i--) {
      const row = this.data[i] || [];
      if (row.some((c) => c !== "" && c !== undefined && c !== null)) return i + 1;
    }
    return 0;
  }
  getMaxRows() { return Math.max(1000, this.data.length); }
  getMaxColumns() { return 30; }
  getDataRange() { return new MockRange(this, 1, 1, Math.max(this.getLastRow(), 1), this.getMaxColumns()); }
  getRange(r, c, nr, nc) { return new MockRange(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); }
  appendRow(values) { const r = this.getLastRow() + 1; values.forEach((v, i) => this._set(r, i + 1, v)); }
  deleteRows(start, count) { this.data.splice(start - 1, count); }
  insertRowsAfter() {}
  setFrozenRows(n) { this.frozen = n; }
}

class MockSpreadsheet {
  constructor() { this.sheets = []; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) { const s = new MockSheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
}
__store.parsed = new MockSpreadsheet();

const SpreadsheetApp = {
  openById: () => __store.parsed,
  getActiveSpreadsheet: () => __store.parsed,
};

/* ---- LanguageApp（Google 官方翻译，免费 5000 次/天）---- */
const LanguageApp = {
  translate(text, source, target) {
    EXT_CALLS.push({
      url: "LanguageApp.translate",
      method: "translate",
      body: { text, source, target },
    });
    if (__langFail) throw new Error("mock: LanguageApp unavailable");
    return "[" + (target || "auto") + "]" + String(text);
  },
};

/* ---- 其它 ---- */
const ScriptApp = {
  getProjectTriggers: () => [],
  deleteTrigger: () => {},
  newTrigger: () => ({
    timeBased: () => ({
      everyMinutes: () => ({ create: () => {} }),
      atHour: () => ({ nearMinute: () => ({ everyDays: () => ({ create: () => {} }) }) }),
      at: () => ({ create: () => {} }),
      everyDays: () => ({ create: () => {} }),
    }),
  }),
  getService: () => ({ getUrl: () => __serviceUrl }),
  getScriptId: () => "MOCK_SCRIPT_ID",
  getOAuthToken: () => "MOCK_OAUTH_TOKEN",
  TriggerSource: { CLOCK: "clock" },
};
const LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
const ContentService = { createTextOutput: (s) => ({ getContent: () => s, s }) };
const HtmlService = { createHtmlOutput: (s) => ({ getContent: () => s, s }) };
const console = globalThis.console;
