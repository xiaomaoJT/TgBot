/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  Api.gs — 第三方能力层
 * ----------------------------------------------------------------------------
 *  ⚠️ 原版失效情况说明（这是本次改造的重点之一）：
 *
 *    接口                              原用途      现状
 *    ─────────────────────────────────────────────────────────────────────
 *    v1.apigpt.cn                      ChatGPT     服务已长期停止响应
 *    api.vvhan.com/api/hotlist/*       热榜        已下线并要求密钥
 *    api.vvhan.com/api/horoscope       星座        已下线并要求密钥
 *    api.vvhan.com/api/douban          豆瓣        已下线并要求密钥
 *    api.vvhan.com/api/text/sexy       骚话        已下线
 *    apis.jxcxin.cn/api/lanzou         蓝奏解析    服务不稳定，时常 5xx
 *    anime-music.jijidown.com          随机音乐    服务已停止
 *    tucdn.wpon.cn/api-girl            随机视频    内容不合规，已移除
 *    query.asilu.com/weather           天气        仍可用，保留为备源
 *    api.btstu.cn/yan                  毒鸡汤      仍可用
 *
 *  改造策略：不再"一个功能绑死一个域名"，而是每个能力配 **多源故障转移**。
 *  任何一源挂掉自动切下一源，全部挂掉则返回友好提示而不是让机器人哑掉。
 *  你随时可以在 API_SOURCES 里加自己的源，无需改业务代码。
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 零、HTTP 辅助
 * --------------------------------------------------------------------------*/

/** GET 文本（带超时与静默失败） */
function httpText(url, opts) {
  var o = opts || {};
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      // ⭐ timeoutSeconds 官方默认 360s（= 整个脚本上限）。一个外部接口挂掉
      //    就能把 doPost 拖到 Telegram 判超时重推，必须显式压到 8 秒。
      timeoutSeconds: cfg("http.timeoutSeconds", 8),
      validateHttpsCertificates: cfg("http.strictTls", false),
      headers: o.headers || { "User-Agent": "Mozilla/5.0 (compatible; MaoBot/2.0)" },
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) return res.getContentText();
    return null;
  } catch (e) {
    return null;
  }
}

/** GET JSON 并解析 */
function httpJson(url, opts) {
  var t = httpText(url, opts);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}

/** POST JSON */
function httpPostJson(url, body, opts) {
  var o = opts || {};
  try {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body || {}),
      muteHttpExceptions: true,
      followRedirects: true,
      timeoutSeconds: cfg("http.timeoutSeconds", 8),
      validateHttpsCertificates: cfg("http.strictTls", false),
      headers: o.headers || {},
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) {
      try {
        return JSON.parse(res.getContentText());
      } catch (e) {
        return null;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 通用请求（完整版）：method / headers / payload 全部可指定，
 * 返回 HTTP 状态码与响应原文。
 * Apps Script API 的 GET / PUT 需要带 Authorization 头，
 * 只做 POST 的 httpPostJsonEx 覆盖不到，所以单独抽这一层。
 * @return {{ok:boolean, code:number, json:object|null, text:string}}
 */
function httpCallEx(url, opts) {
  var o = opts || {};
  try {
    var params = {
      method: o.method || "get",
      muteHttpExceptions: true,
      followRedirects: true,
      // AI 推理慢，调用方可通过 opts.timeoutSeconds 覆盖（默认仍是 8s 的快超时）
      timeoutSeconds:
        o.timeoutSeconds !== undefined ? o.timeoutSeconds : cfg("http.timeoutSeconds", 8),
      validateHttpsCertificates: cfg("http.strictTls", false),
      headers: o.headers || {},
    };
    if (o.contentType) params.contentType = o.contentType;
    if (o.payload !== undefined && o.payload !== null) params.payload = o.payload;

    var res = UrlFetchApp.fetch(url, params);
    var code = res.getResponseCode();
    var text = res.getContentText() || "";
    var json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return { ok: code >= 200 && code < 300, code: code, json: json, text: text };
  } catch (e) {
    return { ok: false, code: 0, json: null, text: String(e) };
  }
}

/**
 * POST JSON（完整版）：不吞掉错误，把 HTTP 状态码与响应原文一并返回。
 * AI 这类接口需要区分"密钥错 / 配额超 / 被安全策略拦截"，
 * 只返回 null 会让用户永远看到"服务不可用"这种无用提示。
 * @return {{ok:boolean, code:number, json:object|null, text:string}}
 */
function httpPostJsonEx(url, body, opts) {
  var o = opts || {};
  return httpCallEx(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body || {}),
    headers: o.headers || {},
    timeoutSeconds: o.timeoutSeconds,
  });
}

/** 清理第三方返回文本里的 HTML 残留（它们常常夹带 <br>、<a>） */
function plain(text) {
  if (!text) return "";
  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 统一的失败文案 */
function apiFail(what) {
  return uiFail(what + "失败", [
    "<i>所有数据源当前均不可用，可能是网络波动或接口临时维护。</i>",
    "<i>请稍后重试。</i>",
  ]);
}

/* ----------------------------------------------------------------------------
 * 一、天气（wttr.in 主源 + 爱思路备源，均无需密钥）
 * --------------------------------------------------------------------------*/

function apiWeather(location) {
  if (!location) return uiUsage("/weather", "/weather <城市>", ["/weather 北京", "/weather Tokyo"]);

  var city = String(location).trim();

  // ---- 源 1：wttr.in ----
  var j = httpJson("https://wttr.in/" + encodeURIComponent(city) + "?format=j1&lang=zh");
  if (j && j.current_condition && j.current_condition.length) {
    var cur = j.current_condition[0];
    var area = get(j, "nearest_area.0.areaName.0.value", city);
    var body = [
      uiKV("实况", (get(cur, "weatherDesc.0.value", "-")), "🌤"),
      uiKV("温度", cur.temp_C + "°C（体感 " + cur.FeelsLikeC + "°C）", "🌡"),
      uiKV("湿度", cur.humidity + "%", "💧"),
      uiKV("风速", cur.windspeedKmph + " km/h " + (cur.winddir16Point || ""), "🍃"),
      uiKV("能见度", (cur.visibility || "-") + " km", "👁"),
      "",
      uiSection("未来三天", "📅"),
    ];
    (j.weather || []).slice(0, 3).forEach(function (d) {
      var desc = get(d, "hourly.4.weatherDesc.0.value", get(d, "hourly.0.weatherDesc.0.value", "-"));
      body.push(
        uiItem(
          esc(d.date) +
            "  " +
            esc(desc) +
            "  <code>" +
            esc(d.mintempC + "~" + d.maxtempC + "°C") +
            "</code>"
        )
      );
    });
    return uiCard({
      icon: "🌦",
      title: area + " 天气",
      subtitle: cur.observation_time ? "观测时间 " + cur.observation_time : "",
      body: body,
      footer: uiSource("wttr.in"),
    });
  }

  // ---- 源 2：爱思路（原版接口，保留作备源）----
  var a = httpJson(
    "https://query.asilu.com/weather/baidu/?city=" + encodeURIComponent(city) + "&t=" + Date.now()
  );
  if (a && a.weather && a.weather.length) {
    var body2 = [];
    a.weather.forEach(function (el) {
      body2.push(
        uiItem(
          esc(el.date) +
            "｜" +
            esc(el.weather) +
            "｜" +
            esc(el.temp) +
            "｜" +
            esc(el.wind)
        )
      );
    });
    return uiCard({
      icon: "🌦",
      title: (a.city || city) + " 天气",
      subtitle: a.date ? "数据时间 " + a.date + (a.update_time || "") : "",
      body: body2,
      footer: uiSource("爱思路"),
    });
  }

  return apiFail("天气查询");
}

/* ----------------------------------------------------------------------------
 * 二、一言 / 情话 / 毒鸡汤
 * --------------------------------------------------------------------------*/

function apiHitokoto() {
  var j = httpJson("https://v1.hitokoto.cn/?encode=json&charset=utf-8");
  if (j && j.hitokoto) {
    var from = j.from || "佚名";
    if (j.from_who) from = j.from_who + "《" + from + "》";
    return uiCard({
      icon: "📝",
      title: "一言",
      body: [uiQuote(j.hitokoto), uiItem("<i>" + esc(from) + "</i>")],
      footer: uiSource("hitokoto.cn"),
    });
  }
  return apiFail("一言获取");
}

function apiQinghua() {
  var j = httpJson("https://api.uomg.com/api/rand.qinghua?format=json");
  if (j && (j.code === 1 || j.code === "1") && j.content) {
    return uiCard({
      icon: "💗",
      title: "土味情话",
      body: [uiQuote(plain(j.content))],
      footer: uiSource("uomg.com"),
    });
  }
  // 备源：一言
  return apiHitokoto();
}

function apiDujitang() {
  var t = httpText("https://api.btstu.cn/yan/api.php?charset=utf-8&encode=text&t=" + Date.now());
  if (t && t.length > 2) {
    return uiCard({
      icon: "🍵",
      title: "毒鸡汤",
      body: [uiQuote(plain(t))],
      footer: uiSource("btstu.cn"),
    });
  }
  return apiFail("毒鸡汤获取");
}

/* ----------------------------------------------------------------------------
 * 三、热榜（imsyy 主源 + 60s 备源 + vvhan 末位兜底）
 *
 * ⭐ 2026-11-06 实测：imsyy / vvhan 在当前网络下 TLS 握手直接失败（已下线或需密钥），
 *    而 60s 开源项目（https://github.com/vikiboss/60s）的 /v2/<平台> 正常返回
 *    { code:200, data:[{title, hot_value, link}] }。故把它提为第二数据源。
 *    发 /apicheck 可在 GAS 服务器侧复测三者的真实可用性。
 * --------------------------------------------------------------------------*/

var HOT_PLATFORMS = {
  weibo: { name: "微博热搜", imsyy: "weibo", s60: "weibo", vvhan: "wbHot" },
  zhihu: { name: "知乎热榜", imsyy: "zhihu", s60: "zhihu", vvhan: "zhihuHot" },
  baidu: { name: "百度热搜", imsyy: "baidu", s60: "baidu", vvhan: "baiduRD" },
  bilibili: { name: "B站热门", imsyy: "bilibili", s60: "bili", vvhan: "bili" },
  douyin: { name: "抖音热点", imsyy: "douyin", s60: "douyin", vvhan: "douyinHot" },
  toutiao: { name: "头条热榜", imsyy: "toutiao", s60: "toutiao", vvhan: "" },
  ithub: { name: "IT之家", imsyy: "ithome", vvhan: "itInfo" },
  sspai: { name: "少数派", imsyy: "sspai", vvhan: "ssPai" },
  juejin: { name: "掘金", imsyy: "juejin", vvhan: "" },
  csdn: { name: "CSDN", imsyy: "csdn", vvhan: "" },
  github: { name: "GitHub Trending", imsyy: "github", vvhan: "" },
  hupu: { name: "虎扑步行街", imsyy: "hupu", vvhan: "huPu" },
  tieba: { name: "贴吧热议", imsyy: "tieba", vvhan: "baiduRY" },
  "36kr": { name: "36氪", imsyy: "36kr", vvhan: "36Ke" },
  hackernews: { name: "Hacker News", imsyy: "hackernews", vvhan: "" },
  netease: { name: "网易新闻", imsyy: "netease-news", vvhan: "" },
  qq: { name: "腾讯新闻", imsyy: "qq-news", vvhan: "" },
  thepaper: { name: "澎湃新闻", imsyy: "thepaper", vvhan: "" },
};

function apiHot(platform, page) {
  var key = String(platform || "").trim().toLowerCase();
  if (!key) {
    return uiCard({
      status: "warn",
      title: "热榜查询",
      body: [
        uiKV("用法", "/hot <平台>"),
        "",
        uiSection("可用平台", THEME.info),
        uiCode(
          Object.keys(HOT_PLATFORMS)
            .map(function (k) {
              return k.padEnd(12, " ") + HOT_PLATFORMS[k].name;
            })
            .join("\n"),
          "text"
        ),
      ],
    });
  }
  if (!HOT_PLATFORMS[key]) {
    return uiFail("未知平台", [
      "没有 <code>" + esc(key) + "</code> 这个热榜。",
      "",
      "可用平台：" + uiMono(Object.keys(HOT_PLATFORMS).join(" / ")),
    ]);
  }

  var meta = HOT_PLATFORMS[key];
  var items = [];

  // ---- 源 1：imsyy 热榜聚合 ----
  if (meta.imsyy) {
    var j = httpJson("https://api-hot.imsyy.top/" + meta.imsyy + "?cache=true");
    if (j && Array.isArray(j.data) && j.data.length) {
      items = j.data.map(function (el) {
        var hot = el.hot ? " <code>" + esc(clip(String(el.hot), 12)) + "</code>" : "";
        return aLink(el.url || el.mobileUrl || "", clip(el.title || "", 60)) + hot;
      });
      var pg = paginate(items, page, 10);
      return {
        text: uiCard({
          icon: "🔥",
          title: meta.name,
          subtitle:
            "共 " + pg.total + " 条 · 第 " + (pg.page + 1) + "/" + pg.totalPages + " 页",
          body: pg.slice.map(function (t, i) {
            return uiItem(t, pg.page * 10 + i + 1);
          }),
          footer: uiSource("imsyy 热榜聚合"),
        }),
        markup: kb([
          pagerRow(["hot", key], pg.page, pg.totalPages),
          [btn("🔄 刷新", ["hot", key, "p", pg.page])],
        ]),
      };
    }
  }

  // ---- 源 2：60s 开源热榜 API（2026-11-06 实测可用）----
  if (meta.s60) {
    var s = httpJson("https://60s.viki.moe/v2/" + meta.s60);
    if (s && (s.code === 200 || s.code === "200") && Array.isArray(s.data) && s.data.length) {
      items = s.data.map(function (el) {
        var hot = el.hot_value
          ? " <code>" + esc(clip(String(el.hot_value), 12)) + "</code>"
          : "";
        var title = clip(String(el.title || ""), 60);
        return (el.link ? aLink(el.link, title) : esc(title)) + hot;
      });
      var pgS = paginate(items, page, 10);
      return {
        text: uiCard({
          icon: "🔥",
          title: meta.name,
          subtitle: "共 " + pgS.total + " 条 · 第 " + (pgS.page + 1) + "/" + pgS.totalPages + " 页",
          body: pgS.slice.map(function (t, i) {
            return uiItem(t, pgS.page * 10 + i + 1);
          }),
          footer: uiSource("60s 开源热榜 API"),
        }),
        markup: kb([
          pagerRow(["hot", key], pgS.page, pgS.totalPages),
          [btn("🔄 刷新", ["hot", key, "p", pgS.page])],
        ]),
      };
    }
  }

  // ---- 源 3：vvhan（历史上已下线并要求密钥，仅作末位兜底）----
  if (meta.vvhan) {
    var v = httpJson("https://api.vvhan.com/api/hotlist/" + meta.vvhan);
    if (v && v.success && Array.isArray(v.data) && v.data.length) {
      items = v.data.map(function (el) {
        var hot = el.hot ? " <code>" + esc(clip(String(el.hot), 12)) + "</code>" : "";
        return aLink(el.mobilUrl || el.url || "", clip(el.title || "", 60)) + hot;
      });
      var pg2 = paginate(items, page, 10);
      return {
        text: uiCard({
          icon: "🔥",
          title: meta.name,
          subtitle: "共 " + pg2.total + " 条 · 第 " + (pg2.page + 1) + "/" + pg2.totalPages + " 页",
          body: pg2.slice.map(function (t, i) {
            return uiItem(t, pg2.page * 10 + i + 1);
          }),
          footer: uiSource("vvhan"),
        }),
        markup: kb([pagerRow(["hot", key], pg2.page, pg2.totalPages)]),
      };
    }
  }

  return { text: apiFail(meta.name + " 获取"), markup: undefined };
}

/* ----------------------------------------------------------------------------
 * 四、短链（is.gd 主源 + v.gd 备源，均免密钥）
 * --------------------------------------------------------------------------*/

function apiShort(url) {
  if (!/^https?:\/\//i.test(String(url || ""))) {
    return uiUsage("/short", "/short <完整链接>", ["/short https://github.com"]);
  }
  var encoded = encodeURIComponent(url);

  var r1 = httpText("https://is.gd/create.php?format=simple&url=" + encoded);
  if (r1 && /^https?:\/\//.test(r1.trim())) {
    return uiCard({
      status: "ok",
      title: "短链生成成功",
      body: [uiKV("原始", clip(url, 60)), "", uiKV("短链", r1.trim(), "🔗")],
      footer: uiSource("is.gd"),
    });
  }

  var r2 = httpText("https://v.gd/create.php?format=simple&url=" + encoded);
  if (r2 && /^https?:\/\//.test(r2.trim())) {
    return uiCard({
      status: "ok",
      title: "短链生成成功",
      body: [uiKV("原始", clip(url, 60)), "", uiKV("短链", r2.trim(), "🔗")],
      footer: uiSource("v.gd"),
    });
  }

  return apiFail("短链生成");
}

/* ----------------------------------------------------------------------------
 * 五、IP 查询（ip-api.com，免密钥）
 * --------------------------------------------------------------------------*/

function apiIP(ip) {
  var target = String(ip || "").trim();
  var url = "http://ip-api.com/json/" + (target ? encodeURIComponent(target) : "") + "?lang=zh-CN";

  var j = httpJson(url);
  if (j && j.status === "success") {
    return uiCard({
      icon: "🌐",
      title: "IP 归属查询",
      subtitle: j.query,
      body: [
        uiKV("国家 / 地区", (j.country || "-") + " " + (j.countryCode || ""), "🏳"),
        uiKV("省份 / 城市", (j.regionName || "-") + " " + (j.city || ""), "📍"),
        uiKV("运营商", j.isp || "-", "📡"),
        uiKV("所属机构", j.org || "-", "🏢"),
        uiKV("AS 号", j.as || "-", "🔢"),
        uiKV("时区", j.timezone || "-", "🕐"),
        uiKV("经纬度", (j.lat || "-") + ", " + (j.lon || "-"), "🧭"),
      ],
      footer: uiSource("ip-api.com"),
    });
  }
  if (j && j.status === "fail") {
    return uiFail("IP 查询失败", [esc(j.message || "无效的 IP 地址")]);
  }
  return apiFail("IP 查询");
}

/* ----------------------------------------------------------------------------
 * 六、翻译（Google 官方 LanguageApp 主源 + MyMemory 备源）
 * ----------------------------------------------------------------------------
 *  ⭐ 升级说明：
 *    原来只有 MyMemory 一个公共接口，它限流严、长句质量差、偶尔返回
 *    "MYMEMORY WARNING" 字符串。而 GAS 自带 `LanguageApp` 服务 ——
 *    消费级账号免费 5,000 次/天，质量与稳定性都更好，且不占用 UrlFetch 配额。
 *    这是一次几乎零成本的升级：官方服务优先，其余情况才回落到 MyMemory。
 * --------------------------------------------------------------------------*/

function apiTranslate(text) {
  if (!text) return uiUsage("/tr", "/tr <文本>", ["/tr hello world", "/tr 你好世界"]);
  var q = String(text).trim();
  var hasCN = /[\u4e00-\u9fa5]/.test(q);
  var target = hasCN ? "en" : "zh-CN";
  var dir = hasCN ? "中文 → 英文" : "英文 → 中文";

  // ---- 源 1：Google 官方（免费 5000 次/天，最稳）----
  // LanguageApp 单次有长度上限，超长会抛异常，这里保守截断
  try {
    var g = LanguageApp.translate(clip(q, 2000), "", target);
    if (g && String(g).trim() && String(g).trim() !== q) {
      return uiCard({
        icon: "🌍",
        title: "翻译结果",
        subtitle: dir,
        body: [uiQuote(plain(g)), "", uiKV("原文", clip(q, 80))],
        footer: uiSource("Google 翻译"),
      });
    }
  } catch (e) {
    logError("translate:LanguageApp", e);
  }

  // ---- 源 2：MyMemory ----
  var pair = hasCN ? "zh-CN|en" : "en|zh-CN";
  var j = httpJson(
    "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(q) +
      "&langpair=" +
      encodeURIComponent(pair)
  );
  var out = get(j, "responseData.translatedText", "");
  if (out && out.indexOf("MYMEMORY WARNING") === -1) {
    return uiCard({
      icon: "🌍",
      title: "翻译结果",
      subtitle: dir,
      body: [uiQuote(plain(out)), "", uiKV("原文", clip(q, 80))],
      footer: uiSource("MyMemory"),
    });
  }
  return apiFail("翻译");
}

/* ----------------------------------------------------------------------------
 * 七、二维码 / 随机图片（直链型能力，交给 sendPhoto）
 * --------------------------------------------------------------------------*/

function qrUrl(data) {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=" +
    encodeURIComponent(data)
  );
}

function randomImageUrl(seed) {
  var s = seed ? String(seed) : String(Date.now());
  return "https://picsum.photos/seed/" + encodeURIComponent(s) + "/1024/640";
}

/* ----------------------------------------------------------------------------
 * 八、AI 能力层 —— 已拆分到独立模块 `AI.gs`
 * ----------------------------------------------------------------------------
 *  分工：
 *    Api.gs  = 「怎么调某一家」（各家 HTTP 协议细节）
 *    AI.gs   = 「用哪一家、怎么容错、拿它干什么活」（模型注册表 / 故障转移 /
 *              配额保护 / 多轮记忆 / 摘要 · 答疑 · 代码 · 润色 · 看图 · 群聊总结）
 *
 *  ⭐ 现在收录 12 家免费大模型，填了密钥就自动生效，发 /models 可查看。
 *     业务入口是 AI.gs 里的 apiAIText / aiAsk / aiComplete / apiAI。
 * --------------------------------------------------------------------------*/


/* ----------------------------------------------------------------------------
 * 九、纯本地能力（零外部依赖，永不失效）
 * --------------------------------------------------------------------------*/

function apiDice() {
  var n = randInt(1, 6);
  var faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return uiCard({
    icon: "🎲",
    title: "掷骰子",
    body: ["<b>点数：" + n + "</b>  " + faces[n - 1]],
  });
}

function apiCoin() {
  var head = Math.random() < 0.5;
  return uiCard({
    icon: "🪙",
    title: "抛硬币",
    body: ["<b>" + (head ? "正面 🪙" : "反面 ⚪") + "</b>"],
  });
}

function apiRoll(params) {
  var p = String(params || "").trim();
  var m = p.match(/^(\d+)-(\d+)$/);
  var min = 1;
  var max = 100;
  if (m) {
    min = parseInt(m[1], 10);
    max = parseInt(m[2], 10);
    if (min > max) {
      var t = min;
      min = max;
      max = t;
    }
  }
  var n = randInt(min, max);
  return uiCard({
    icon: "🎯",
    title: "随机数",
    subtitle: min + " ~ " + max,
    body: ["<b>结果：" + n + "</b>"],
  });
}

/** 每日一签：一言 + 本地确定性运势（同一天同一人结果稳定，更真实） */
function apiFortune(ctx) {
  var seed = String(ctx.userId) + todayStr();
  var h = hashSeed(seed);
  var colors = ["赤红 🔴", "橙黄 🟠", "明黄 🟡", "青绿 🟢", "天蓝 🔵", "靛紫 🟣", "素白 ⚪", "墨黑 ⚫"];
  var actions = ["宜早睡", "宜读书", "宜运动", "宜复盘", "宜社交", "宜断舍离", "宜专注", "宜休息"];
  var avoid = ["忌熬夜", "忌拖延", "忌冲动消费", "忌多线并行", "忌情绪化决策"];

  var j = httpJson("https://v1.hitokoto.cn/?encode=json&charset=utf-8");
  var quote = j && j.hitokoto ? j.hitokoto : "今日无签，随缘即可。";

  return uiCard({
    icon: "🔮",
    title: "今日一签",
    subtitle: todayStr() + " · " + (ctx.userName || ""),
    body: [
      uiQuote(quote),
      "",
      uiKV("综合运势", stars((h % 5) + 1), "🍀"),
      uiKV("幸运数字", String((h % 99) + 1), "🔢"),
      uiKV("幸运颜色", pickOne(colors), "🎨"),
      uiKV("今日宜", pickOne(actions), "✅"),
      uiKV("今日忌", pickOne(avoid), "❌"),
    ],
    footer: "签文由本地算法生成，仅供娱乐",
  });
}

/** 时间戳 / 日期互转 */
function apiTimestamp(input) {
  var s = String(input || "").trim();
  if (!s) {
    return uiCard({
      icon: "🕐",
      title: "当前时间",
      body: [
        uiKV("时间", nowStr(), "🕐"),
        uiKV("Unix 秒", String(unixNow()), "🔢"),
        uiKV("Unix 毫秒", String(Date.now()), "🔢"),
        uiKV("时区", cfg("timezone", "Asia/Shanghai"), "🌏"),
      ],
    });
  }

  // 纯数字 → 时间
  if (/^\d{9,13}$/.test(s)) {
    var ms = s.length === 13 ? parseInt(s, 10) : parseInt(s, 10) * 1000;
    var d = new Date(ms);
    if (isNaN(d.getTime())) return uiFail("时间戳无效", [uiMono(s)]);
    return uiCard({
      icon: "🕐",
      title: "时间戳解析",
      subtitle: s,
      body: [
        uiKV("本地时间", formatDate(d, "yyyy/MM/dd HH:mm:ss"), "🕐"),
        uiKV("ISO 8601", d.toISOString(), "📄"),
        uiKV("距今", humanDuration(Math.abs(Date.now() - ms) / 1000) + (ms > Date.now() ? "后" : "前"), "⏱"),
      ],
    });
  }

  // 日期字符串 → 时间戳
  var d2 = new Date(s.replace(/\//g, "-"));
  if (!isNaN(d2.getTime())) {
    return uiCard({
      icon: "🕐",
      title: "日期转时间戳",
      subtitle: s,
      body: [
        uiKV("Unix 秒", String(Math.floor(d2.getTime() / 1000)), "🔢"),
        uiKV("Unix 毫秒", String(d2.getTime()), "🔢"),
      ],
    });
  }

  return uiUsage("/t", "/t [时间戳|日期]", ["/t", "/t 1735689600", "/t 2026-01-01 08:00:00"]);
}

/** 手机号：离线号段识别运营商（原版依赖的第三方归属地接口需自备密钥，这里降级但不失效） */
function apiPhone(phone) {
  var p = String(phone || "").replace(/[^\d]/g, "");
  if (!/^1\d{10}$/.test(p)) {
    return uiUsage("/phone", "/phone <11位手机号>", ["/phone 13800138000"]);
  }

  var prefix3 = p.slice(0, 3);
  var prefix4 = p.slice(0, 4);

  /** 3 位号段未命中时，用 4 位前缀兜一次（主要是 17x 虚拟运营商） */
  function carrier() {
    var mvno = {
      "1700": "中国电信 · 虚拟运营商", "1701": "中国电信 · 虚拟运营商",
      "1702": "中国电信 · 虚拟运营商",
      "1703": "中国移动 · 虚拟运营商", "1704": "中国移动 · 虚拟运营商",
      "1705": "中国移动 · 虚拟运营商", "1706": "中国移动 · 虚拟运营商",
      "1707": "中国联通 · 虚拟运营商", "1708": "中国联通 · 虚拟运营商",
      "1709": "中国联通 · 虚拟运营商", "1710": "中国联通 · 虚拟运营商",
      "1711": "中国联通 · 虚拟运营商", "1718": "中国联通 · 虚拟运营商",
      "1719": "中国联通 · 虚拟运营商",
    };
    return mvno[prefix4] || null;
  }

  var map = {
    "134": "中国移动", "135": "中国移动", "136": "中国移动", "137": "中国移动",
    "138": "中国移动", "139": "中国移动", "147": "中国移动", "150": "中国移动",
    "151": "中国移动", "152": "中国移动", "157": "中国移动", "158": "中国移动",
    "159": "中国移动", "172": "中国移动", "178": "中国移动", "182": "中国移动",
    "183": "中国移动", "184": "中国移动", "187": "中国移动", "188": "中国移动",
    "195": "中国移动", "197": "中国移动", "198": "中国移动",
    "130": "中国联通", "131": "中国联通", "132": "中国联通", "145": "中国联通",
    "155": "中国联通", "156": "中国联通", "166": "中国联通", "171": "中国联通",
    "175": "中国联通", "176": "中国联通", "185": "中国联通", "186": "中国联通",
    "196": "中国联通",
    "133": "中国电信", "149": "中国电信", "153": "中国电信", "173": "中国电信",
    "177": "中国电信", "180": "中国电信", "181": "中国电信", "189": "中国电信",
    "190": "中国电信", "191": "中国电信", "193": "中国电信", "199": "中国电信",
    "192": "中国广电", "162": "中国联通", "165": "中国移动", "167": "中国联通",
  };
  var c = map[prefix3] || carrier() || "未知运营商（新号段）";

  return uiCard({
    icon: "📱",
    title: "手机号识别",
    body: [
      uiKV("号码", p.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2"), "📱"),
      uiKV("号段", prefix4 + "x", "🔢"),
      uiKV("运营商", c, "📡"),
      "",
      "<i>归属地精确到市需要付费接口，本项目未内置（原版使用的免费接口已失效且需自备密钥）。</i>",
    ],
  });
}

/* ============================================================================
 * 十、2026-11 新增能力（对照 Bot API 10.3 / 2026-08-24）
 *
 *  设计原则：
 *    · 优先用 Telegram 原生能力（动画、投票、话题、礼物），不依赖第三方小站；
 *    · 第三方接口一律走故障转移，挂了要有明确降级而不是「服务不可用」；
 *    · 娱乐类尽量零外部依赖，永不失效；
 *    · 新增的 /apicheck 把「接口到底还能不能用」变成一条指令的事。
 * ==========================================================================*/

/* ---- 10.1 原生动画骰子（sendDice）-------------------------------------- */

var NATIVE_DICE_EMOJI = {
  dice: { emoji: "🎲", max: 6, label: "掷骰子" },
  darts: { emoji: "🎯", max: 6, label: "掷飞镖" },
  bowl: { emoji: "🎳", max: 6, label: "保龄球" },
  basket: { emoji: "🏀", max: 5, label: "投篮" },
  goal: { emoji: "⚽", max: 5, label: "点球" },
  slot: { emoji: "🎰", max: 64, label: "老虎机" },
};

/**
 * Telegram 原生动画骰子：结果由 Telegram 服务端生成、带动画、无法伪造，
 * 比原来的本地纯文本「点数：4」有意思得多。不可用时自动降级为文字。
 */
function apiNativeDice(ctx, kind) {
  var meta = NATIVE_DICE_EMOJI[String(kind || "dice")] || NATIVE_DICE_EMOJI.dice;
  var payload = { chat_id: ctx.chatId, emoji: meta.emoji };
  if (ctx.threadId) payload.message_thread_id = ctx.threadId;

  var sent = tg("sendDice", payload, { silent: true });
  if (sent) return null; // 已由 Telegram 自己发出，deliverResult 收到 null 不再补发

  var n = randInt(1, meta.max);
  return uiCard({
    icon: meta.emoji,
    title: L(meta.label + "（本地模拟）", meta.label),
    body: ["<b>点数：" + n + "</b>", "", "<i>原生动画不可用，已降级为文字结果。</i>"],
  });
}

/* ---- 10.2 纯本地娱乐（零外部依赖）-------------------------------------- */

/* ⚠️ 存 [中,英] 原文对，不要在这里直接调 L()：
 *    顶层 var 在文件加载时求值，那时 __CUR_LANG__ 恒为中文，英文模式会失效。 */
var EIGHT_BALL_ANSWERS = [
  ["毫无疑问，去做吧。", "Yes, definitely."],
  ["时机正好，别犹豫。", "The timing is right — go for it."],
  ["大概率可行，但先想清楚退路。", "Likely, but plan your exit first."],
  ["迹象不错。", "Signs point to yes."],
  ["现在别问，先去睡一觉。", "Ask again after some sleep."],
  ["信息还不够，再查查。", "Not enough information yet."],
  ["换个思路会更好。", "Try a different angle."],
  ["别抱太大期望。", "Don't count on it."],
  ["风险偏高，建议缓一缓。", "Too risky — wait."],
  ["我的答案是不。", "My answer is no."],
];

/** 答案之书：同一个问题同一天答案稳定，避免反复刷指令刷出想要的答案 */
function apiEightBall(args) {
  var q = String(args || "").trim();
  if (!q) {
    return uiUsage("/8ball", "/8ball <你犹豫的问题>", ["/8ball 今天适合重构吗"]);
  }
  var h = Math.abs(hashSeed(q + todayStr()));
  var pair = EIGHT_BALL_ANSWERS[h % EIGHT_BALL_ANSWERS.length];
  var answer = L(pair[0], pair[1]);
  return uiCard({
    icon: "🎱",
    title: L("答案之书", "Magic 8-Ball"),
    subtitle: clip(esc(q), 42),
    body: [uiQuote(answer), "", "<i>" + L("同一个问题当天答案固定，仅供娱乐。", "Same question, same answer for the day. Just for fun.") + "</i>"],
    footer: L("纯本地生成，不发送任何内容到外部", "Generated locally, nothing is sent anywhere"),
  });
}

/** 选择困难症救星 */
function apiChoose(args) {
  var parts = String(args || "")
    .split(/[|｜,，、\s]+/)
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
  if (parts.length < 2) {
    return uiUsage("/choose", "/choose <选项A> <选项B> [更多…]", ["/choose 火锅 烧烤 日料"]);
  }
  if (parts.length > 20) parts = parts.slice(0, 20);
  var picked = pickOne(parts);
  return uiCard({
    icon: "🤔",
    title: L("帮你选好了", "Let me decide"),
    subtitle: L("共 " + parts.length + " 个选项", parts.length + " choices"),
    body: ["<b>👉 " + esc(picked) + "</b>", "", uiKV(L("候选", "Options"), esc(parts.join(" / ")))],
    footer: L("别纠结了，就它吧", "Stop overthinking. Go."),
  });
}

/* ---- 10.3 编码小工具（零外部依赖）-------------------------------------- */

var MORSE_TABLE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
};

function textToMorse(text) {
  return String(text || "")
    .toUpperCase()
    .split("")
    .map(function (ch) {
      if (ch === " ") return "/";
      return MORSE_TABLE[ch] || "";
    })
    .filter(Boolean)
    .join(" ");
}

function apiEncode(args) {
  var s = String(args || "").trim();
  var m = s.match(/^(b64e|b64d|url|unurl|morse|rev)\s+([\s\S]+)$/i);
  if (!m) {
    return uiUsage(
      "/encode",
      "/encode <b64e|b64d|url|unurl|morse|rev> <文本>",
      ["/encode b64e 你好", "/encode morse SOS", "/encode url a b&c"]
    );
  }
  var op = m[1].toLowerCase();
  var v = m[2];
  var out = "";
  try {
    if (op === "b64e") {
      out = Utilities.base64Encode(Utilities.newBlob(v).getBytes());
    } else if (op === "b64d") {
      out = Utilities.newBlob(Utilities.base64Decode(v)).getDataAsString();
    } else if (op === "url") {
      out = encodeURIComponent(v);
    } else if (op === "unurl") {
      out = decodeURIComponent(v);
    } else if (op === "morse") {
      out = textToMorse(v) || L("（没有可转换的字符，仅支持 A-Z / 0-9）", "(only A-Z / 0-9 supported)");
    } else {
      out = v.split("").reverse().join("");
    }
  } catch (e) {
    return uiFail(L("转换失败", "Conversion failed"), [esc(String(e.message || e))]);
  }
  return uiCard({
    icon: "🔡",
    title: L("编码 / 转换", "Encode / Decode"),
    subtitle: uiMono(op),
    body: [uiCode(clip(out, 1200), "text")],
    footer: L("纯本地计算，不上传任何内容", "Computed locally, uploaded to nowhere"),
  });
}

/* ---- 10.4 原生投票（sendPoll，Bot API 10.0 起支持 members_only）--------- */

function apiPoll(ctx, args) {
  var raw = String(args || "").trim();
  if (!raw) {
    return uiUsage(
      "/poll",
      "/poll <问题> | <选项A> | <选项B> [| 更多] [--public] [--quiz 正确项序号] [--members]",
      ["/poll 今晚吃什么 | 火锅 | 烧烤 | 日料", "/poll 1+1=? | 2 | 3 --quiz 1"]
    );
  }
  var isQuiz = /--quiz/i.test(raw);
  var membersOnly = /--members/i.test(raw);
  var anonymous = !/--public/i.test(raw);
  var qm = raw.match(/--quiz\s+(\d+)/i);
  var correct = qm ? Number(qm[1]) - 1 : -1;

  var body = raw.replace(/--[a-z]+\s*\d*/gi, "").trim();
  var parts = body.split(/\s*[|｜]\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
  if (parts.length < 3) {
    return uiWarn(L("至少需要一个问题和两个选项", "Need a question and at least two options"), [
      L("示例：/poll 今晚吃什么 | 火锅 | 烧烤", "e.g. /poll Dinner? | Pizza | Sushi"),
    ]);
  }

  var p = {
    chat_id: ctx.chatId,
    question: clip(parts[0], 300),
    options: parts.slice(1, 11).map(function (x) { return clip(x, 100); }),
    is_anonymous: anonymous,
    type: isQuiz ? "quiz" : "regular",
  };
  if (isQuiz && correct >= 0 && correct < p.options.length) p.correct_option_id = correct;
  if (membersOnly) p.members_only = true; // Bot API 10.0+
  if (ctx.threadId) p.message_thread_id = ctx.threadId;

  var r = tg("sendPoll", p, { silent: true });
  if (r) return null;
  return uiFail(L("投票发送失败", "Failed to send poll"), [
    L("请确认机器人在群里、且有发送投票的权限。", "Make sure the bot is in the chat and allowed to send polls."),
  ]);
}

/* ---- 10.5 论坛话题管理（Bot API 6.3+）---------------------------------- */

function apiTopic(ctx, args) {
  if (!ctx.isGroup) return uiWarn(L("该指令仅在群聊中可用", "Group only"));
  var s = String(args || "").trim();
  var m = s.match(/^(new|create|close|reopen|del|delete)\s*([\s\S]*)$/i);
  if (!m) {
    return uiUsage(
      "/topic",
      "/topic new <话题名> ｜ /topic close|reopen|del [话题ID]",
      ["/topic new 资源分享", "/topic close 128"]
    );
  }
  var op = m[1].toLowerCase();
  var rest = String(m[2] || "").trim();
  var chatId = ctx.chatId;

  if (op === "new" || op === "create") {
    if (!rest) return uiUsage("/topic", "/topic new <话题名>", ["/topic new 资源分享"]);
    var created = tg("createForumTopic", { chat_id: chatId, name: clip(rest, 128) }, { silent: true });
    if (!created) return uiFail(L("话题创建失败", "Failed to create topic"), [
      L("请确认：① 是超级群且开启了「话题」；② 机器人是管理员且有管理话题权限。",
        "Need a forum-enabled supergroup and an admin bot with topic rights."),
    ]);
    return uiCard({
      icon: "🗂",
      title: L("话题已创建", "Topic created"),
      body: [uiKV(L("名称", "Name"), esc(rest)), uiKV(L("话题 ID", "Thread ID"), String(created.message_thread_id))],
    });
  }

  var tid = Number((rest.match(/\d+/) || [])[0] || ctx.threadId || 0);
  if (!tid) {
    return uiUsage("/topic", "/topic close|reopen|del <话题ID>（或直接在话题里发指令）", ["/topic close 128"]);
  }
  var method = op === "close" ? "closeForumTopic" : op === "reopen" ? "reopenForumTopic" : "deleteForumTopic";
  var ok = tg(method, { chat_id: chatId, message_thread_id: tid }, { silent: true });
  if (!ok) {
    return uiFail(L("操作失败", "Operation failed"), [
      L("话题可能不存在，或机器人缺少「管理话题」权限。", "Topic not found, or bot lacks topic management rights."),
    ]);
  }
  var labels = { close: L("已关闭", "Closed"), reopen: L("已重新开启", "Reopened"), del: L("已删除", "Deleted"), delete: L("已删除", "Deleted") };
  return uiCard({
    icon: "🗂",
    title: L("话题操作完成", "Topic updated"),
    body: [uiKV(L("话题 ID", "Thread ID"), String(tid)), uiKV(L("状态", "Status"), labels[op] || L("完成", "Done"))],
  });
}

/* ---- 10.6 Telegram 礼物清单（getAvailableGifts，只读、不产生费用）-------- */

function apiGifts() {
  var r = tg("getAvailableGifts", {}, { silent: true });
  var gifts = r && r.gifts ? r.gifts : [];
  if (!gifts.length) {
    return uiWarn(L("暂时没有可赠送的礼物", "No gifts available right now"), [
      L("该接口需要 Bot API 8.0+，且礼物会随活动上下架。", "Requires Bot API 8.0+; gifts rotate with campaigns."),
    ]);
  }
  return uiCard({
    icon: "🎁",
    title: L("当前可用的 Telegram 礼物", "Available Telegram Gifts"),
    subtitle: L("共 " + gifts.length + " 款 · 仅展示，不产生任何费用", gifts.length + " items · read-only"),
    body: gifts.slice(0, 12).map(function (g) {
      return uiItem(
        uiMono(clip(String(g.id || "?"), 28)) +
          " · ⭐" + esc(String(g.star_count == null ? "?" : g.star_count))
      );
    }),
    footer: L("发送礼物需消耗 Telegram Stars，本指令只做查询", "Sending gifts costs Stars; this only lists them"),
  });
}

/* ---- 10.7 外部接口体检（/apicheck，仅 Bot 主人）------------------------- */

var API_PROBES = [
  { name: "天气 · wttr.in", url: "https://wttr.in/Beijing?format=j1", needle: "current_condition" },
  { name: "天气备 · 爱思路", url: "https://query.asilu.com/weather/baidu/?city=beijing", needle: "" },
  { name: "一言 · hitokoto", url: "https://v1.hitokoto.cn/?encode=json", needle: "hitokoto" },
  { name: "情话 · uomg", url: "https://api.uomg.com/api/rand.qinghua?format=json", needle: "" },
  { name: "毒鸡汤 · btstu", url: "https://api.btstu.cn/yan/api.php?charset=utf-8&encode=text", needle: "" },
  { name: "热榜主 · imsyy", url: "https://api-hot.imsyy.top/weibo", needle: "" },
  { name: "热榜备 · 60s", url: "https://60s.viki.moe/v2/weibo", needle: "code" },
  { name: "热榜末 · vvhan", url: "https://api.vvhan.com/api/hotlist/wbHot", needle: "" },
  { name: "短链 · is.gd", url: "https://is.gd/create.php?format=simple&url=https%3A%2F%2Fexample.com", needle: "" },
  { name: "短链备 · v.gd", url: "https://v.gd/create.php?format=simple&url=https%3A%2F%2Fexample.com", needle: "" },
  { name: "IP · ip-api", url: "http://ip-api.com/json/8.8.8.8?lang=zh-CN", needle: "status" },
  { name: "翻译 · MyMemory", url: "https://api.mymemory.translated.net/get?q=hi&langpair=en%7Czh", needle: "responseData" },
  { name: "二维码 · qrserver", url: "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=t", needle: "" },
  { name: "随机图 · picsum", url: "https://picsum.photos/seed/t/100/60", needle: "" },
];

/** 并发探测全部外部端点（GAS fetchAll 一次发出，避免 14 次串行把 webhook 拖死） */
function apiProbe() {
  var timeout = cfg("apicheck.timeoutSeconds", 6);
  var reqs = API_PROBES.map(function (p) {
    return {
      url: p.url,
      muteHttpExceptions: true,
      followRedirects: true,
      timeoutSeconds: timeout,
      validateHttpsCertificates: cfg("http.strictTls", false),
    };
  });

  var t0 = Date.now();
  var responses = null;
  try {
    if (typeof UrlFetchApp.fetchAll === "function") responses = UrlFetchApp.fetchAll(reqs);
  } catch (e) {
    responses = null;
  }
  // 老环境 / 本地 mock 没有 fetchAll 时顺序降级
  if (!responses) {
    responses = reqs.map(function (r) {
      return httpCallEx(r.url, r);
    });
    return API_PROBES.map(function (p, i) {
      var x = responses[i] || {};
      var ok = !!x.ok && (!p.needle || String(x.text || "").indexOf(p.needle) !== -1);
      return { name: p.name, ok: ok, code: x.code || 0, ms: Date.now() - t0 };
    });
  }

  var total = Date.now() - t0;
  return API_PROBES.map(function (p, i) {
    var code = 0;
    var text = "";
    try {
      code = responses[i].getResponseCode();
      text = responses[i].getContentText() || "";
    } catch (e) {
      code = 0;
    }
    var ok = code >= 200 && code < 400 && (!p.needle || text.indexOf(p.needle) !== -1);
    return { name: p.name, ok: ok, code: code, ms: total };
  });
}

/** /apicheck —— 在 GAS 服务器侧实测「接口到底还能不能用」 */
function apiCheck() {
  var rows = apiProbe();
  var good = rows.filter(function (r) { return r.ok; }).length;

  var me = null;
  try { me = tgGetMe(); } catch (e) {}
  var caps = [
    L("富消息", "Rich") + " " + (tgCapOk("rich") ? "✅" : "⛔"),
    L("草稿", "Draft") + " " + (tgCapOk("draft") ? "✅" : "⛔"),
    L("临时消息", "Ephemeral") + " " + (tgCapOk("ephemeral") ? "✅" : "⛔"),
  ].join(" · ");

  var body = [
    uiSection(L("外部接口", "External endpoints"), "🌐"),
    "",
  ].concat(rows.map(function (r) {
    return uiItem(
      (r.ok ? "✅ " : "❌ ") + esc(r.name) +
        "  <code>" + (r.code || "—") + "</code>" +
        (r.ok ? "" : "  <i>" + L("不可达", "unreachable") + "</i>")
    );
  }));
  body.push("");
  body.push(uiSection(L("Bot API 能力", "Bot API capabilities"), "🤖"));
  body.push(uiKV(L("机器人", "Bot"), me ? "@" + String(me.username || me.first_name || "") : L("不可达", "unreachable")));
  body.push(uiKV(L("基准版本", "Baseline"), "10.3 (2026-08-24)"));
  body.push(uiKV(L("能力探测", "Probed"), caps));
  body.push(uiKV(L("Webhook 校验", "Webhook guard"), cfg("security.webhookSecret", true) ? L("已开启", "on") : L("已关闭", "off")));

  return uiCard({
    status: good === rows.length ? "ok" : "warn",
    icon: "🩺",
    title: L("接口体检报告", "API Health Check"),
    subtitle: L("可用 " + good + " / " + rows.length + " · 耗时约 " + (rows[0] ? rows[0].ms : 0) + " ms",
      good + "/" + rows.length + " reachable · " + (rows[0] ? rows[0].ms : 0) + " ms"),
    body: body,
    footer: L("结果来自 GAS 服务器网络，与本地网络可能不同；失效项会自动走故障转移。",
      "Probed from GAS servers; results may differ from your local network."),
  });
}
