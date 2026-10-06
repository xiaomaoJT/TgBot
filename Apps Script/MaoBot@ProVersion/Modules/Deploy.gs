/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Deploy.gs — 热更新（Hot Reload）
 * ----------------------------------------------------------------------------
 *  补齐 To-Do 第 4 项。
 *
 *  一个 GAS 项目「改完代码要生效」有三条路，本模块把三条都铺好：
 *
 *  ① 【配置热更新】—— 零成本，日常 90% 的改动都属于这类
 *     开关 / 关键词 / 敏感词 / 群规都在 Google 表格里，改完发一条 /reload
 *     清掉缓存即可生效，**根本不需要重新部署**。
 *
 *  ② 【代码热更新 · 在线】—— /push 指令（仅 Bot 主人）
 *     从一个远端清单拉取全部源码 → 调 Apps Script API 覆盖脚本内容
 *     → 可选自动建版本 + 切换部署。全程在 Telegram 里完成，不用开电脑。
 *     ⚠️ 需要 appsscript.json 里的 script.projects / script.deployments 授权，
 *        并且需要重新授权一次（首次调用时会弹）。
 *
 *  ③ 【代码热更新 · 本地】—— clasp + GitHub Actions
 *     仓库根目录已附带 `.clasp.json.example`、`Tools/build.js`、
 *     `.github/workflows/deploy.yml`，`git push` 即自动推送。
 *     这条最稳，推荐作为主链路；② 作为"人在外面"时的应急手段。
 *
 *  ⚠️ 诚实的边界：GAS 运行时**读不到自己的源码**，所以 /push 没法在本地
 *     做 diff，只能比对远端清单里的版本号。这不是偷懒，是平台限制。
 * ============================================================================
 */

/* ============================================================================
 * 一、基本信息
 * ==========================================================================*/

/** 当前脚本 ID（用于调 Apps Script API） */
function deployScriptId() {
  var configured = String(cfg("deploy.scriptId", "") || "").trim();
  if (configured) return configured;
  try {
    return String(ScriptApp.getScriptId() || "");
  } catch (e) {
    return "";
  }
}

/**
 * 远端清单地址。
 * 未显式配置时，从 BRAND.repo 推导出 GitHub raw 地址 —— 少填一个配置项。
 * 支持两种仓库写法：https://github.com/<owner>/<repo>（也接受带 .git 的）
 */
function deployManifestUrl() {
  var explicit = String(cfg("deploy.manifestUrl", "") || "").trim();
  if (explicit) return explicit;

  var repo = String(BRAND.repo || "").trim().replace(/\.git$/, "");
  var m = repo.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (!m) return "";
  var branch = String(cfg("deploy.branch", "main") || "main");
  var manifest = String(cfg("deploy.manifestPath", "deploy/manifest.json") || "deploy/manifest.json");
  return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + branch + "/" + manifest;
}

/** 读取远端清单 { version, note, files: [{name, source} | {name, url}] } */
function deployFetchManifest() {
  var url = deployManifestUrl();
  if (!url) {
    return { ok: false, error: "未配置远端清单地址（CONFIG.deploy.manifestUrl 或 BRAND.repo）" };
  }

  var res = httpCallEx(url, { method: "get" });
  if (!res.ok || !res.json) {
    return { ok: false, error: "清单拉取失败：" + (res.text ? clip(res.text, 160) : "HTTP " + res.code) };
  }

  var m = res.json;
  if (!m || !Array.isArray(m.files) || !m.files.length) {
    return { ok: false, error: "清单格式不对：需要 { version, files: [...] }" };
  }
  return { ok: true, url: url, version: String(m.version || "unknown"), note: String(m.note || ""), files: m.files };
}

/* ============================================================================
 * 二、状态记录（Properties，不占表格）
 * ==========================================================================*/

var DEPLOY_STATE_PROP = "mb_deploy_state";

function deployState() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(DEPLOY_STATE_PROP);
    return raw ? JSON.parse(raw) : { version: "", at: "", files: 0, ok: false };
  } catch (e) {
    return { version: "", at: "", files: 0, ok: false };
  }
}

function deployStateSet(state) {
  try {
    PropertiesService.getScriptProperties().setProperty(DEPLOY_STATE_PROP, JSON.stringify(state));
  } catch (e) {}
}

/* ============================================================================
 * 三、在线推送（Apps Script API）
 * ==========================================================================*/

var SCRIPT_API = "https://script.googleapis.com/v1/projects/";

/** 取 OAuth token（需要 script.projects 授权） */
function deployToken() {
  try {
    return String(ScriptApp.getOAuthToken() || "");
  } catch (e) {
    logError("deployToken", e);
    return "";
  }
}

/**
 * 下载清单里的全部文件。
 * @return {{ok:boolean, files:Array, error:string}}
 */
function deployDownloadAll(manifest) {
  var out = [];
  var errors = [];

  manifest.files.forEach(function (f) {
    var name = String(f.name || "").replace(/\.(gs|js|json)$/i, "");
    if (!name) {
      errors.push("条目缺少 name");
      return;
    }
    // 清单里可以直接内嵌源码（source），也可以给一个 url
    var src = typeof f.source === "string" ? f.source : null;
    if (src === null) {
      if (!f.url) {
        errors.push(name + "：既没有 source 也没有 url");
        return;
      }
      var text = httpText(String(f.url));
      if (text === null || text === undefined || text === "") {
        errors.push(name + "：下载失败");
        return;
      }
      src = text;
    }
    out.push({
      name: name,
      type: name === "appsscript" ? "JSON" : "SERVER_JS",
      source: src,
    });
  });

  if (errors.length) return { ok: false, files: out, error: errors.join("；") };
  return { ok: true, files: out, error: "" };
}

/** 调 Apps Script API（统一错误处理） */
function deployApiCall(method, path, payload) {
  var token = deployToken();
  if (!token) return { ok: false, code: 0, error: "拿不到 OAuth token（请重新授权本脚本）" };

  var url = SCRIPT_API + deployScriptId() + path;
  var res = httpCallEx(url, {
    method: method,
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    var msg = res.text || "";
    try {
      var j = JSON.parse(res.text);
      msg = get(j, "error.message", msg);
    } catch (e) {}
    return {
      ok: false,
      code: res.code,
      error: deployHumanError(res.code, msg),
      scopeError: deployIsScopeError(res.code, msg),
      raw: msg,
    };
  }
  return { ok: true, code: res.code, json: res.json || {} };
}

/**
 * 判断是不是"授权/API 开关"类问题。
 * 这类问题的解法是去改 Google Account / Cloud 设置，
 * 跟"没建部署"完全是两码事，必须分开告诉用户 ——
 * 上一版把两者混为一谈，导致用户明明建过部署却被指去"再建一次"。
 */
function deployIsScopeError(code, msg) {
  var m = String(msg || "").toLowerCase();
  if (code === 401) return true;
  if (m.indexOf("insufficient") !== -1) return true;
  if (m.indexOf("authentication scopes") !== -1) return true;
  if (m.indexOf("has not been used in project") !== -1) return true;
  if (m.indexOf("is disabled") !== -1) return true;
  if (m.indexOf("api has not been enabled") !== -1) return true;
  return false;
}

/** 把 API 的报错翻译成人话 */
function deployHumanError(code, msg) {
  var m = String(msg || "");
  var low = m.toLowerCase();
  if (low.indexOf("has not been used in project") !== -1 || low.indexOf("is disabled") !== -1) {
    return "Apps Script API 未开启（Google Cloud 项目里是关闭状态）";
  }
  if (low.indexOf("insufficient") !== -1 || low.indexOf("authentication scopes") !== -1) {
    return "授权不足：缺少 script.projects / script.deployments 权限";
  }
  if (code === 401 || code === 403 || m.indexOf("Permission") !== -1) {
    return "授权不足：缺少 script.projects / script.deployments 权限";
  }
  if (code === 404) return "脚本 ID 不对，或该账号无权访问此项目";
  return "HTTP " + code + "：" + clip(m, 200);
}

/**
 * 用远端清单覆盖当前脚本内容。
 * @param {object} [opt] { version:true 是否顺带建版本与切换部署 }
 */
function deployApply(opt) {
  var options = opt || {};
  var sid = deployScriptId();
  if (!sid) return { ok: false, error: "拿不到脚本 ID（ScriptApp.getScriptId 不可用时可手工填 CONFIG.deploy.scriptId）" };

  var manifest = deployFetchManifest();
  if (!manifest.ok) return manifest;

  var got = deployDownloadAll(manifest);
  if (!got.ok && !got.files.length) return { ok: false, error: got.error };

  var uniq = deployDedupeFiles(got.files);
  if (!uniq.ok) return { ok: false, error: uniq.error };

  var pushed = deployApiCall("PUT", "/content", { files: uniq.files });
  if (!pushed.ok) return { ok: false, error: "覆盖脚本内容失败：" + pushed.error };

  var result = {
    ok: true,
    version: manifest.version,
    note: manifest.note,
    files: uniq.files.length,
    warning: got.error, // 有文件下载失败但剩下的仍推上去了
    released: false,
    deploymentId: "",
  };

  if (options.version) {
    var rel = deployRelease(manifest.version, manifest.note);
    result.released = rel.ok;
    result.deploymentId = rel.deploymentId || "";
    if (!rel.ok) result.warning = (result.warning ? result.warning + "；" : "") + rel.error;
  }

  deployStateSet({
    version: manifest.version,
    at: nowStr(),
    files: uniq.files.length,
    ok: true,
    released: result.released,
  });

  return result;
}

/** 去掉同名重复文件（GAS 同名文件会互相覆盖，宁可先报错也不要静默丢代码） */
function deployDedupeFiles(files) {
  var seen = {};
  var out = [];
  var dup = [];
  (files || []).forEach(function (f) {
    var k = f.name.toLowerCase();
    if (seen[k]) {
      dup.push(f.name);
      return;
    }
    seen[k] = 1;
    out.push(f);
  });
  if (dup.length) return { ok: false, error: "清单里有重复文件：" + dup.join("、"), files: out };
  return { ok: true, files: out, error: "" };
}

/**
 * 建版本 + 把「默认部署」切到新版本。
 * 不改部署的话，Web App 仍然跑旧版本 —— 这是很多人"推了代码却没生效"的真正原因。
 */
function deployRelease(versionLabel, note) {
  var created = deployApiCall("POST", "/versions", {
    description: clip("MaoBot " + (versionLabel || "") + " " + (note || ""), 200),
  });
  if (!created.ok) return { ok: false, error: "建版本失败：" + created.error };

  var num = created.json.versionNumber;
  var list = deployApiCall("GET", "/deployments", null);
  if (!list.ok) return { ok: false, error: "查部署失败：" + list.error, versionNumber: num };

  var deployments = list.json.deployments || [];
  // 优先切"默认部署"（entryPoint 为 WEB_APP 的第一条）
  var target = deployments.filter(function (d) {
    return !d.entryPoint || d.entryPoint === "WEB_APP";
  })[0];
  if (!target) {
    return { ok: true, versionNumber: num, deploymentId: "", error: "" }; // 没有部署可切，不算失败
  }

  var updated = deployApiCall("PUT", "/deployments/" + target.deploymentId, {
    deploymentConfig: {
      scriptId: deployScriptId(),
      versionNumber: num,
      manifestFileName: "appsscript",
      description: "MaoBot " + (versionLabel || ""),
    },
  });
  if (!updated.ok) return { ok: false, error: "切换部署失败：" + updated.error, versionNumber: num };

  return { ok: true, versionNumber: num, deploymentId: target.deploymentId, error: "" };
}

/* ============================================================================
 * 四、指令：/push
 * ==========================================================================*/

function apiDeploy(args, ctx) {
  var sub = String(args || "").trim().toLowerCase();

  if (sub === "info" || sub === "status") return cmdDeployStatus(ctx);
  if (sub === "check") return cmdDeployCheck(ctx);
  if (sub === "apply" || sub === "") return cmdDeployApply(ctx);
  if (sub === "reload") return cmdReload(ctx);

  return uiUsage("/push", "/push [check|status|apply]", [
    "/push check　只查看远端有没有新版本",
    "/push apply　拉取远端源码并覆盖线上脚本",
    "/push status　查看上次热更新记录",
    "",
    "<i>只改配置（开关 / 关键词 / 敏感词）不需要 /push，发 /reload 就够了。</i>",
  ]);
}

function cmdDeployStatus(ctx) {
  var st = deployState();
  return {
    rich: richCard({
      icon: "🚀",
      title: "热更新状态",
      subtitle: st.version ? "上次推送：" + st.version : "还没有推送过",
      blocks: [
        blkKV("🆔", "脚本 ID", uiMono(deployScriptId() || "未知")),
        blkKV("📦", "上次版本", st.version || "—"),
        blkKV("🕒", "推送时间", st.at || "—"),
        blkKV("📄", "文件数", String(st.files || 0)),
        blkKV("🌐", "清单地址", deployManifestUrl() || "未配置"),
        blkDiv(),
        blkP([
          inT("配置文件（开关 / 关键词 / 敏感词）改完发 "),
          inC("/reload"),
          inT(" 即可生效，不必热更新代码。"),
        ]),
      ],
    }),
  };
}

function cmdDeployCheck(ctx) {
  var st = deployState();
  var manifest = deployFetchManifest();
  if (!manifest.ok) {
    return uiWarn("无法确认远端版本", [
      manifest.error,
      "",
      "<i>把 CONFIG.deploy.manifestUrl 指向一个可公开访问的 JSON：</i>",
      uiMono('{"version":"1.1.0","files":[{"name":"Utils","url":"…"}]}'),
    ]);
  }

  var same = st.version && st.version === manifest.version;
  return {
    rich: richCard({
      status: same ? "ok" : "info",
      icon: same ? "✅" : "🆕",
      title: same ? "已是最新" : "发现新版本",
      subtitle: manifest.version + (manifest.note ? " · " + manifest.note : ""),
      blocks: [
        blkKV("📦", "远端版本", manifest.version),
        blkKV("💾", "线上版本", st.version || "（未记录）"),
        blkKV("📄", "文件数", String(manifest.files.length)),
        blkKV("🔗", "清单", manifest.url),
        blkDiv(),
        blkP(same ? "无需操作。" : "/push apply 拉取并覆盖线上脚本。"),
      ],
    }),
  };
}

function cmdDeployApply(ctx) {
  var st = deployState();
  var manifest = deployFetchManifest();
  if (!manifest.ok) {
    return uiWarn("热更新失败", [manifest.error]);
  }
  if (st.version === manifest.version) {
    return uiInfo("远端版本与线上一致", [
      uiKV("版本", manifest.version, "📦"),
      "",
      "<i>想强制覆盖：把远端清单里的 version 改掉后再发一次。</i>",
    ]);
  }

  var r = deployApply({ version: cfg("deploy.autoRelease", true) });
  if (!r.ok) return uiFail("热更新失败", [esc(r.error)]);
  deployWebappUrlForget(); // 部署可能刚被切换，地址缓存作废

  return {
    rich: richCard({
      status: r.warning ? "warn" : "ok",
      icon: "🚀",
      title: "热更新完成",
      subtitle: "版本 " + r.version,
      blocks: [
        blkKV("📄", "已覆盖文件", String(r.files) + " 个"),
        blkKV("🌐", "部署已切换", r.released ? "是" : "否（保持原版本）"),
        r.note ? blkKV("📝", "更新说明", r.note) : null,
        r.warning ? blkKV("⚠️", "警告", r.warning) : null,
        blkDiv(),
        blkP("新代码已就位，下一次请求即按新版本执行。"),
      ],
    }),
  };
}

/* ============================================================================
 * 五、Web 应用地址解析（绕开 /dev 陷阱）
 * ----------------------------------------------------------------------------
 *  ⚠️ 这是 GAS 里最费时间的一个坑：
 *     ScriptApp.getService().getUrl() 在**编辑器里运行时**返回的是
 *     「测试部署」地址 —— 以 /dev 结尾。
 *     而 /dev 需要 Google 账号登录才能访问，Telegram 的服务器拿不到，
 *     于是 setWebhook 照样返回成功（Telegram 只校验地址能返回 200 的替代行为），
 *     现象就是**机器人绑定成功但完全没反应**，且日志里一句报错都没有。
 *
 *  所以地址按三级顺序取，前一级拿不到才退到下一级：
 *    ① CONFIG.deploy.webappUrl          手工填，最稳，永不出错
 *    ② Apps Script API 的部署列表      挑 versionNumber 最高的 /exec（需要 script.deployments 授权）
 *    ③ ScriptApp.getService().getUrl() 仅在**不是 /dev** 时采信（即被 Web 应用请求触发时）
 *  取到的 /exec 会缓存 6 小时，避免每次巡检都多花一次 UrlFetch。
 * ==========================================================================*/

var WEBAPP_URL_PROP = "mb_webapp_url";
var WEBAPP_URL_MANUAL_PROP = "mb_webapp_url_manual";
var WEBAPP_URL_TTL = 6 * 3600 * 1000;

/**
 * 手工绑定的地址存 Script Properties，**不存 Params.gs**。
 * 理由：/push 会用远端清单覆盖全部代码文件，写在 Params.gs 里的地址
 * 每次热更新都会被冲掉；Script Properties 不在代码里，覆盖不到。
 */
function deployWebappUrlManual() {
  try {
    return String(PropertiesService.getScriptProperties().getProperty(WEBAPP_URL_MANUAL_PROP) || "").trim();
  } catch (e) {
    return "";
  }
}

/**
 * 手工绑定 / 解绑 Web 应用地址。
 * @param {string} url 传空字符串等于解绑
 * @return {{ok:boolean, url:string, error:string}}
 */
function deployWebappUrlSetManual(url) {
  var u = String(url || "").trim();
  if (!u) {
    try {
      PropertiesService.getScriptProperties().deleteProperty(WEBAPP_URL_MANUAL_PROP);
    } catch (e) {}
    return { ok: true, url: "", error: "" };
  }

  var bad = deployWebappUrlValidate(u);
  if (bad) return { ok: false, url: "", error: bad };

  try {
    PropertiesService.getScriptProperties().setProperty(WEBAPP_URL_MANUAL_PROP, u);
  } catch (e) {
    return { ok: false, url: "", error: "写入脚本属性失败：" + String(e) };
  }
  deployWebappUrlForget(); // 顺手清掉自动缓存，避免两套值打架
  return { ok: true, url: u, error: "" };
}

/**
 * 校验一个地址能不能当 Webhook 用。
 * @return {string} 空字符串 = 合法；否则是给人看的错误原因
 */
function deployWebappUrlValidate(url) {
  var u = String(url || "").trim();
  if (!u) return "地址是空的";
  if (deployIsDevUrl(u)) {
    return "/dev 是测试部署地址（需要 Google 登录才能访问），Telegram 用不了，请换成 /exec 结尾的地址";
  }
  if (!/^https:\/\//i.test(u)) return "必须以 https:// 开头";
  if (!deployIsExecUrl(u)) return "地址必须以 /exec 结尾";
  if (u.indexOf("/macros/") === -1 && u.indexOf("script.google.com") === -1) {
    return "看起来不像 Google Apps Script 的 Web 应用地址";
  }
  return "";
}

/** /dev 结尾 = 测试部署地址，Telegram 用不了 */
function deployIsDevUrl(url) {
  return /\/dev\/?(\?|$)/.test(String(url || ""));
}

/** /exec 结尾 = 正式部署地址 */
function deployIsExecUrl(url) {
  return /\/exec\/?(\?|$)/.test(String(url || ""));
}

function deployWebappUrlCache() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(WEBAPP_URL_PROP);
    if (!raw) return null;
    var o = JSON.parse(raw);
    if (!o || !o.url || deployIsDevUrl(o.url)) return null;
    if (Date.now() - Number(o.at || 0) > WEBAPP_URL_TTL) return null;
    return o;
  } catch (e) {
    return null;
  }
}

function deployWebappUrlCacheSet(url) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      WEBAPP_URL_PROP,
      JSON.stringify({ url: url, at: Date.now() })
    );
  } catch (e) {}
}

/** 作废缓存（重新部署、换部署之后调用） */
function deployWebappUrlForget() {
  try {
    PropertiesService.getScriptProperties().deleteProperty(WEBAPP_URL_PROP);
  } catch (e) {}
}

/**
 * 从 Apps Script API 的部署列表里找正式地址。
 * 部署列表里同时有「头部部署」（URL 以 /dev 结尾）和历史版本部署，必须过滤掉前者。
 */
function deployWebappUrlFromApi() {
  var list = deployApiCall("GET", "/deployments", null);
  if (!list.ok) return { ok: false, error: list.error, scopeError: !!list.scopeError };

  var best = null;
  var dev = "";
  var deployments = get(list.json, "deployments", []) || [];

  deployments.forEach(function (d) {
    var ver = Number(get(d, "deploymentConfig.versionNumber", 0)) || 0;
    var eps = d.entryPoints || [];
    eps.forEach(function (ep) {
      var url = String(get(ep, "webApp.url", "") || "");
      if (!url) return;
      if (deployIsDevUrl(url)) {
        if (!dev) dev = url;
        return;
      }
      if (!best || ver >= best.version) {
        best = { url: url, version: ver, deploymentId: String(d.deploymentId || "") };
      }
    });
  });

  if (!best) {
    return {
      ok: false,
      dev: dev,
      error: dev ? "只找到测试部署地址（/dev）" : "部署列表里没有 Web 应用地址",
    };
  }
  return { ok: true, url: best.url, version: best.version, deploymentId: best.deploymentId, dev: dev };
}

/**
 * 解析出可用的 Web 应用正式地址。
 * @return {{ok:boolean, url:string, source:string, dev:string, error:string, scopeError:boolean}}
 *         source: manual | config | cache | api | service
 */
function deployWebappUrlResolve() {
  /* ① 手工绑定（Script Properties）—— 优先级最高，且热更新覆盖不掉 */
  var manual = deployWebappUrlManual();
  if (manual) {
    var badManual = deployWebappUrlValidate(manual);
    if (!badManual) return { ok: true, url: manual, source: "manual", dev: "" };
    // 存的值不合法（比如早期误存了 /dev）：忽略它，继续往下自动解析
  }

  /* ② Params.gs 里写死的兜底 */
  var configured = String(cfg("deploy.webappUrl", "") || "").trim();
  if (configured) {
    if (deployIsDevUrl(configured)) {
      return {
        ok: false,
        url: "",
        source: "config",
        dev: configured,
        error: "CONFIG.deploy.webappUrl 填的是 /dev 测试地址，Telegram 无法访问，请改用 /exec 地址",
      };
    }
    return { ok: true, url: configured, source: "config", dev: "" };
  }

  /* ③ 缓存 */
  var cached = deployWebappUrlCache();
  if (cached) return { ok: true, url: cached.url, source: "cache", dev: "" };

  /* ④ 部署列表（需要 script.deployments 授权） */
  var viaApi = deployWebappUrlFromApi();
  if (viaApi.ok) {
    deployWebappUrlCacheSet(viaApi.url);
    return { ok: true, url: viaApi.url, source: "api", dev: viaApi.dev || "", scopeError: false };
  }

  /* ⑤ 运行时自报 —— 编辑器里跑通常是 /dev，必须挡掉 */
  var service = "";
  try {
    service = String(ScriptApp.getService().getUrl() || "");
  } catch (e) {}
  if (service && !deployIsDevUrl(service)) {
    deployWebappUrlCacheSet(service);
    return { ok: true, url: service, source: "service", dev: "" };
  }

  return {
    ok: false,
    url: "",
    source: "none",
    dev: service || viaApi.dev || "",
    scopeError: !!viaApi.scopeError,
    error: viaApi.error || "无法取到 Web 应用地址",
  };
}

/** 给指令用的诊断卡片内容 */
function deployWebappDiag() {
  var r = deployWebappUrlResolve();
  var wh = tgGetWebhookInfo();
  var bound = String(get(wh, "url", "") || "");
  return {
    resolved: r,
    bound: bound,
    boundIsDev: deployIsDevUrl(bound),
    mismatch: !!(r.ok && bound && bound !== r.url),
  };
}

/* ============================================================================
 * 部署可达性探测 —— 「机器人完全没反应」的头号原因
 * ==========================================================================*/

/**
 * 真的去敲一下这个 Web 应用地址，看 Telegram 能不能拿到 200。
 *
 * 为什么要专门探：
 *   GAS 部署的「谁可以访问」如果不是「任何人」，匿名请求会被 Google
 *   **302 重定向到登录页**。而 Telegram 期待的是 200，于是它判定投递失败，
 *   getWebhookInfo 里只留一句：
 *       Wrong response from the webhook: 302 Found
 *   同时所有消息堆在 pending_update_count 里 —— 机器人表现为「完全没反应」，
 *   但代码、Token、地址全都没问题，纯粹是部署权限配错。
 *
 * 这个坑极其常见（新版 GAS 建部署时默认只对自己可见），所以值得自动化检查。
 *
 * @param {string} url /exec 地址
 * @return {{ok:boolean, code:number, verdict:string, fix:string}}
 */
function deployProbeExec(url) {
  if (!url) return { ok: false, code: 0, verdict: "没有可探测的地址", fix: "先运行 setupWebhook() 绑定地址" };
  try {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      // payload 用 {"update_id":-1}：handleUpdate 会因「没有 message 字段」立刻 return，
      // 不发消息、不写表，纯探测、零副作用。
      payload: JSON.stringify({ update_id: -1 }),
      followRedirects: false, // 关键：不能跟随重定向，否则永远看不到那个 302
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();

    if (code === 200) {
      return {
        ok: true,
        code: code,
        verdict: "Telegram 可以正常访问（匿名 POST 拿到 200）",
        fix: "",
      };
    }
    if (code === 302 || code === 301) {
      return {
        ok: false,
        code: code,
        verdict: "匿名 POST 被 302 重定向 —— Telegram 也一样进不来，这就是没反应的原因",
        fix:
          "「谁可以访问 = 任何人」你已经设对了，问题出在<b>执行身份</b>：\n" +
          "  ① 打开 script.google.com → 本项目 → 部署 → 管理部署\n" +
          "  ② 点部署右侧 ✏️ 编辑\n" +
          "  ③ <b>执行身份</b> 改成 <b>以我（部署者）的身份</b>\n" +
          "     （现在是「以访问者的身份」—— 匿名请求没有身份可用，\n" +
          "       GAS 只能 302 到一个中间跳转，于是 Telegram 报 302 Found）\n" +
          "  ④ 「谁可以访问」保持 <b>任何人</b>，不要改回去\n" +
          "  ⑤ 保存即可，<b>不需要重新部署版本</b>，权限立刻生效",
      };
    }
    if (code === 401 || code === 403) {
      return {
        ok: false,
        code: code,
        verdict: "权限不足（" + code + "）",
        fix: "把部署的「谁可以访问」改成「任何人」，并确认执行身份是「以我的身份」",
      };
    }
    if (code === 404) {
      return {
        ok: false,
        code: code,
        verdict: "地址不存在（404）—— 多半是部署被删了或版本被换掉",
        fix: "运行 setupWebhook() 重新绑定当前部署地址",
      };
    }
    return {
      ok: false,
      code: code,
      verdict: "返回了非预期状态码 " + code,
      fix: "到 GAS「执行记录」看这次请求的日志",
    };
  } catch (e) {
    return {
      ok: false,
      code: 0,
      verdict: "探测请求本身失败：" + (e && e.message ? e.message : String(e)),
      fix: "确认脚本有 script.external_request 权限（重新运行一次 setupWebhook() 即可触发授权）",
    };
  }
}

/** diagnose() / /health 用的探测结果（含绑定的地址） */
function deployProbeDiag() {
  var wh = tgGetWebhookInfo();
  var bound = String(get(wh, "url", "") || "");
  var probe = deployProbeExec(bound);
  return {
    bound: bound,
    probe: probe,
    pending: get(wh, "pending_update_count", 0) || 0,
    lastError: get(wh, "last_error_message", "") || "",
    lastErrorDate: get(wh, "last_error_date", 0) || 0,
  };
}
