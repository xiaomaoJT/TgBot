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
      validateHttpsCertificates: false,
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
      validateHttpsCertificates: false,
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
      validateHttpsCertificates: false,
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
 * 三、热榜（imsyy 主源 + vvhan 备源）
 * --------------------------------------------------------------------------*/

var HOT_PLATFORMS = {
  weibo: { name: "微博热搜", imsyy: "weibo", vvhan: "wbHot" },
  zhihu: { name: "知乎热榜", imsyy: "zhihu", vvhan: "zhihuHot" },
  baidu: { name: "百度热搜", imsyy: "baidu", vvhan: "baiduRD" },
  bilibili: { name: "B站热门", imsyy: "bilibili", vvhan: "bili" },
  douyin: { name: "抖音热点", imsyy: "douyin", vvhan: "douyinHot" },
  toutiao: { name: "头条热榜", imsyy: "toutiao", vvhan: "" },
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

  // ---- 源 2：vvhan（可能需密钥，作为容错）----
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
  var prefix4 = parseInt(p.slice(0, 4), 10);

  function carrier() {
    // 号段归属会随时间调整，这里用"区间判定 + 常见前缀兜底"
    if (/^17[0-9]$|^14[0-9]$|^16[0-9]$/.test(prefix3.slice(0, 2) + "0")) return null;
    return null;
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
  var c = map[prefix3] || carrier() || "未知运营商";

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
