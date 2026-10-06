/**
 * ============================================================================
 *  MaoBot · ProVersion
 *  AI.gs — 大模型能力层
 * ----------------------------------------------------------------------------
 *  本模块解决三件事：
 *
 *   ① 多模型接入 —— 把「免费大模型」做成一张声明式注册表（AI_PROVIDERS）。
 *      填了哪家的密钥，哪家就自动生效；一行都不用改代码。
 *      目前收录 12 家：Gemini / Groq / Cerebras / Mistral / OpenRouter /
 *      GitHub Models / Together / SambaNova / HuggingFace / Cloudflare /
 *      自定义 OpenAI 兼容端点 / Pollinations。
 *
 *   ② 故障转移 —— 主模型限流、超时、报错时，按顺序自动切到「你配置过的」
 *      下一个模型，用户无感知。⚠️ 只用你自己填了密钥的服务，
 *      不会把内容静默发给第三方。
 *
 *   ③ 工作类任务 —— 不只是聊天。摘要、答疑、写代码、润色、看图、群聊总结、
 *      待办提取，共用同一套调用链与配额保护。
 *
 *  ── 分工说明 ──────────────────────────────────────────────────────────────
 *    Api.gs  = 「怎么调某一家」（各家 HTTP 协议的细节）
 *    AI.gs   = 「用哪一家、怎么容错、拿它干什么活」（调度与业务）
 * ============================================================================
 */

/* ============================================================================
 * 一、模型注册表
 * ============================================================================
 *  加一家新模型 = 在数组里加一条记录，不需要改任何其它代码。
 *
 *  字段说明：
 *    id            唯一标识（写进 CONFIG.ai.provider 就是用这个）
 *    title         显示名
 *    free          免费额度说明（展示在 /models）
 *    doc           申请密钥的地址
 *    keys          需要哪些配置项；空数组 = 免密钥
 *    models        默认型号；lite 用于轻量任务
 *    vision        是否支持图片理解
 *    dailyLimit    本地每日上限（防烧额度，可在 CONFIG.ai.limits 里覆盖）
 *    endpoint      OpenAI 兼容端点（没有 agent 的走默认 adapter）
 *    adapter       调用适配器名：gemini | openai | pollinations
 *    note          备注 / 已知限制
 *
 *  ⚠️ 各家免费额度与端点可能随时调整。若某家失效，
 *     把该条的 enabled 改成 false 即可，不影响其它模型。
 * ==========================================================================*/

var AI_PROVIDERS = [
  {
    id: "gemini",
    title: "Google Gemini",
    free: "1,500 次/天 · 支持看图",
    doc: "https://aistudio.google.com/apikey",
    keys: ["ai.geminiKey"],
    adapter: "gemini",
    models: { default: "gemini-3-flash", lite: "gemini-3.1-flash-lite" },
    vision: true,
    dailyLimit: 1200,
    note: "首选。免费额度最大，唯一支持图片理解的免费源。",
  },
  {
    id: "groq",
    title: "Groq",
    free: "免费额度 · 推理极快",
    doc: "https://console.groq.com/keys",
    keys: ["ai.groqKey"],
    adapter: "openai",
    endpoint: "https://api.groq.com/openai/v1",
    models: { default: "llama-3.3-70b-versatile", lite: "llama-3.1-8b-instant" },
    vision: false,
    dailyLimit: 1000,
    note: "速度是最大优势，适合做故障转移的第二顺位。",
  },
  {
    id: "cerebras",
    title: "Cerebras",
    free: "免费额度 · 速度最快",
    doc: "https://cloud.cerebras.ai",
    keys: ["ai.cerebrasKey"],
    adapter: "openai",
    endpoint: "https://api.cerebras.ai/v1",
    models: { default: "llama-3.3-70b", lite: "llama3.1-8b" },
    vision: false,
    dailyLimit: 1000,
    note: "",
  },
  {
    id: "mistral",
    title: "Mistral",
    free: "免费额度",
    doc: "https://console.mistral.ai/api-keys",
    keys: ["ai.mistralKey"],
    adapter: "openai",
    endpoint: "https://api.mistral.ai/v1",
    models: { default: "mistral-large-latest", lite: "mistral-small-latest" },
    vision: false,
    dailyLimit: 500,
    note: "",
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    free: "有 :free 系列模型",
    doc: "https://openrouter.ai/keys",
    keys: ["ai.openrouterKey"],
    adapter: "openai",
    endpoint: "https://openrouter.ai/api/v1",
    models: { default: "deepseek/deepseek-chat-v3.1:free", lite: "meta-llama/llama-3.3-70b-instruct:free" },
    vision: false,
    dailyLimit: 50,
    note: "免费模型限流较严，只适合做兜底。",
  },
  {
    id: "github",
    title: "GitHub Models",
    free: "免费（用 GitHub Token）",
    doc: "https://github.com/settings/tokens",
    keys: ["ai.githubToken"],
    adapter: "openai",
    endpoint: "https://models.github.ai/inference",
    models: { default: "openai/gpt-4o-mini", lite: "openai/gpt-4o-mini" },
    vision: false,
    dailyLimit: 150,
    note: "有 GitHub 账号即可，额度按等级分配。",
  },
  {
    id: "together",
    title: "Together AI",
    free: "部分模型免费",
    doc: "https://api.together.xyz/settings/api-keys",
    keys: ["ai.togetherKey"],
    adapter: "openai",
    endpoint: "https://api.together.xyz/v1",
    models: { default: "meta-llama/Llama-3.3-70B-Instruct-Turbo", lite: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
    vision: false,
    dailyLimit: 100,
    note: "",
  },
  {
    id: "sambanova",
    title: "SambaNova",
    free: "免费额度",
    doc: "https://cloud.sambanova.ai/apis",
    keys: ["ai.sambanovaKey"],
    adapter: "openai",
    endpoint: "https://api.sambanova.ai/v1",
    models: { default: "Meta-Llama-3.3-70B-Instruct", lite: "Meta-Llama-3.1-8B-Instruct" },
    vision: false,
    dailyLimit: 100,
    note: "",
  },
  {
    id: "huggingface",
    title: "Hugging Face",
    free: "推理 API 免费额度",
    doc: "https://huggingface.co/settings/tokens",
    keys: ["ai.hfToken"],
    adapter: "openai",
    endpoint: "https://router.huggingface.co/v1",
    models: { default: "meta-llama/Llama-3.3-70B-Instruct", lite: "meta-llama/Llama-3.2-3B-Instruct" },
    vision: false,
    dailyLimit: 100,
    note: "余额用尽后需充值。",
  },
  {
    id: "cloudflare",
    title: "Cloudflare Workers AI",
    free: "免费神经元额度",
    doc: "https://dash.cloudflare.com/profile/api-tokens",
    keys: ["ai.cloudflareAccountId", "ai.cloudflareToken"],
    adapter: "cloudflare",
    models: { default: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", lite: "@cf/meta/llama-3.1-8b-instruct" },
    vision: false,
    dailyLimit: 200,
    note: "端点里要拼账号 ID，已由适配器自动处理。",
  },
  {
    id: "custom",
    title: "自定义兼容端点",
    free: "取决于你自己的服务",
    doc: "",
    keys: ["ai.customBaseUrl", "ai.customKey"],
    adapter: "openai",
    endpoint: "", // 由 customBaseUrl 提供
    models: { default: "", lite: "" }, // 由 customModel 提供
    vision: false,
    dailyLimit: 1000,
    note: "DeepSeek / 智谱 / 通义 / 本地 Ollama 都走这条。",
  },
  {
    id: "pollinations",
    title: "Pollinations",
    free: "免密钥 · 质量最弱",
    doc: "https://pollinations.ai",
    keys: [],
    adapter: "pollinations",
    models: { default: "openai", lite: "openai" },
    vision: false,
    dailyLimit: 200,
    note: "唯一不需要任何配置的兜底源，质量与稳定性都最弱。",
  },
];

/** 按 id 取一条注册表记录 */
function aiProvider(id) {
  var key = String(id || "").toLowerCase();
  for (var i = 0; i < AI_PROVIDERS.length; i++) {
    if (AI_PROVIDERS[i].id === key) return AI_PROVIDERS[i];
  }
  return null;
}

function aiProviderTitle(id) {
  var p = aiProvider(id);
  return p ? p.title : String(id || "-");
}

/** 这条记录所需的密钥是否都填好了（keys 为空 = 免密钥，永远就绪） */
function aiProviderReady(p) {
  if (!p) return false;
  if (!p.keys || !p.keys.length) return true;
  for (var i = 0; i < p.keys.length; i++) {
    if (!cfg(p.keys[i], "")) return false;
  }
  return true;
}

/** 取该模型实际要用的型号名 */
function aiModelOf(p) {
  var override = cfg("ai.modelOverride", {}) || {};
  if (override[p.id]) return override[p.id];
  if (p.id === "custom") return cfg("ai.customModel", "") || "gpt-4o-mini";
  return get(p, "models.default", "");
}

/** 取该模型的实际端点（custom 走用户填的 baseUrl） */
function aiEndpointOf(p) {
  if (p.id === "custom") return String(cfg("ai.customBaseUrl", "")).replace(/\/+$/, "");
  if (p.id === "cloudflare") {
    return (
      "https://api.cloudflare.com/client/v4/accounts/" +
      encodeURIComponent(String(cfg("ai.cloudflareAccountId", ""))) +
      "/ai/v1"
    );
  }
  return p.endpoint || "";
}

/** 取该模型的实际密钥 */
function aiKeyOf(p) {
  if (!p.keys || !p.keys.length) return "";
  if (p.id === "custom") return cfg("ai.customKey", "");
  if (p.id === "cloudflare") return cfg("ai.cloudflareToken", "");
  var last = p.keys[p.keys.length - 1];
  // githubToken / hfToken 等命名不规则，直接按 keyPath 取名
  var map = {
    "ai.geminiKey": "ai.geminiKey",
    "ai.groqKey": "ai.groqKey",
    "ai.cerebrasKey": "ai.cerebrasKey",
    "ai.mistralKey": "ai.mistralKey",
    "ai.openrouterKey": "ai.openrouterKey",
    "ai.githubToken": "ai.githubToken",
    "ai.togetherKey": "ai.togetherKey",
    "ai.sambanovaKey": "ai.sambanovaKey",
    "ai.hfToken": "ai.hfToken",
  };
  return cfg(map[last] || last, "");
}

/* ============================================================================
 * 二、故障转移链
 * ==========================================================================*/

/**
 * 组装本次调用要依次尝试的模型链。
 *
 * 规则：
 *   1. CONFIG.ai.provider 指定的主模型排第一（若未配置密钥则跳过）；
 *   2. 其后按注册表顺序，把所有「已配置密钥」的模型作为备选；
 *   3. 免密钥的 pollinations 只有在 allowKeylessFallback = true 时才纳入。
 *
 * ⚠️ 隐私设计：默认不会回落到你没配密钥的第三方服务。
 */
function aiProviderChain(preferId) {
  var out = [];
  var seen = {};

  function push(p) {
    if (!p || seen[p.id]) return;
    seen[p.id] = true;
    out.push(p);
  }

  // 指定优先的模型（worker 任务可单独指定）
  if (preferId) {
    var pp = aiProvider(preferId);
    if (pp && aiProviderReady(pp)) push(pp);
  }

  var primary = aiProvider(cfg("ai.provider", "gemini"));
  if (primary && aiProviderReady(primary)) push(primary);

  var allowKeyless = !!cfg("ai.allowKeylessFallback", false);

  AI_PROVIDERS.forEach(function (p) {
    if (p.enabled === false) return;
    var keyless = !p.keys || !p.keys.length;
    if (keyless && !allowKeyless) return;
    if (!aiProviderReady(p)) return;
    push(p);
  });

  if (!cfg("ai.failover", true)) return out.slice(0, 1);
  return out;
}

/** 当前可用模型链的状态（供 /models 与 /health 使用） */
function aiChainStatus() {
  var chain = aiProviderChain(cfg("ai.taskProvider", "") || "");
  if (chain.length) {
    return {
      ok: true,
      provider: chain[0].id,
      reason: "",
      chain: chain.map(function (p) {
        return p.id;
      }),
    };
  }
  return {
    ok: false,
    provider: "",
    reason: "没有可用的模型：请在 Params.gs 的 CONFIG.ai 里至少填一个密钥（推荐 geminiKey）",
    chain: [],
  };
}

/* ============================================================================
 * 三、配额保护（按模型分别计数）
 * ==========================================================================*/

var AI_QUOTA_PROP = "mb_ai_quota";

/** 读当日用量 { d: 日期, by: { 模型id: 次数 } } */
function aiQuotaState() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(AI_QUOTA_PROP);
    var o = raw ? JSON.parse(raw) : null;
    if (o && o.d === todayStr() && o.by) return o;
  } catch (e) {}
  return { d: todayStr(), by: {} };
}

function aiQuotaLimit(pid) {
  var over = cfg("ai.limits", {}) || {};
  if (over[pid]) return Number(over[pid]);
  var p = aiProvider(pid);
  return Number(get(p, "dailyLimit", 200));
}

function aiQuotaUsed(pid) {
  var by = aiQuotaState().by || {};
  return Number(by[pid] || 0);
}

function aiQuotaLeft(pid) {
  return Math.max(0, aiQuotaLimit(pid) - aiQuotaUsed(pid));
}

function aiQuotaUse(pid) {
  var st = aiQuotaState();
  st.by = st.by || {};
  st.by[pid] = Number(st.by[pid] || 0) + 1;
  st.d = todayStr();
  try {
    PropertiesService.getScriptProperties().setProperty(AI_QUOTA_PROP, JSON.stringify(st));
  } catch (e) {}
  return st.by[pid];
}

/** 全局剩余额度（所有已配置模型加起来，用于页脚展示） */
function aiQuotaLeftTotal() {
  var chain = aiProviderChain();
  var sum = 0;
  chain.forEach(function (p) {
    sum += aiQuotaLeft(p.id);
  });
  return sum;
}

function aiQuotaReset() {
  try {
    PropertiesService.getScriptProperties().setProperty(
      AI_QUOTA_PROP,
      JSON.stringify({ d: todayStr(), by: {} })
    );
  } catch (e) {}
}

/* ============================================================================
 * 四、多轮对话记忆
 * ==========================================================================*/

function aiHistKey(ctx) {
  return "mb_aih_" + String(ctx.chatId) + "_" + String(ctx.userId);
}

function aiHistGet(ctx) {
  if (!ctx) return [];
  if (Number(cfg("ai.historyTurns", 6)) <= 0) return [];
  try {
    var raw = CacheService.getScriptCache().get(aiHistKey(ctx));
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function aiHistPush(ctx, role, text) {
  if (!ctx) return;
  var turns = Number(cfg("ai.historyTurns", 6));
  if (turns <= 0) return;
  var arr = aiHistGet(ctx);
  arr.push({ role: role, text: clip(String(text || ""), 1500) });
  while (arr.length > turns * 2) arr.shift();
  try {
    // CacheService 单键上限 6 小时，够一轮上下文用
    CacheService.getScriptCache().put(aiHistKey(ctx), JSON.stringify(arr), 21600);
  } catch (e) {}
}

function aiHistClear(ctx) {
  if (!ctx) return;
  try {
    CacheService.getScriptCache().remove(aiHistKey(ctx));
  } catch (e) {}
}

/* ============================================================================
 * 五、统一调用入口（含故障转移）
 * ==========================================================================*/

/**
 * 把统一格式的消息数组翻译成各家协议并发出去。
 *
 * 统一格式（内部约定）：
 *   messages = [
 *     { role: "system",    text: "..." },
 *     { role: "user",      text: "..." },
 *     { role: "assistant", text: "..." },
 *     { role: "user",      text: "...", image: { mime: "image/jpeg", data: "<base64>" } }
 *   ]
 *
 * @param {Array} messages
 * @param {object} [opts] { system, prefer, maxTokens, temperature, needVision }
 * @return {{ok:boolean, text:string, provider:string, error:string}}
 */
function aiComplete(messages, opts) {
  var opt = opts || {};
  var chain = aiProviderChain(opt.prefer);
  if (!chain.length) {
    return {
      ok: false,
      provider: "",
      error:
        "还没有配置任何大模型。请在 Params.gs 的 CONFIG.ai 里至少填一个密钥 —— " +
        "推荐 geminiKey（aistudio.google.com 免费申请，1500 次/天）。",
    };
  }

  var system = opt.system !== undefined ? opt.system : cfg("ai.system", "");
  var errors = [];

  for (var i = 0; i < chain.length; i++) {
    var p = chain[i];

    // 需要视觉能力时跳过不支持看图的模型
    if (opt.needVision && !p.vision) {
      errors.push(p.title + "：不支持图片理解");
      continue;
    }
    // 本地配额保护
    if (aiQuotaLeft(p.id) <= 0) {
      errors.push(p.title + "：已达本地每日上限 " + aiQuotaLimit(p.id) + " 次");
      continue;
    }

    var r;
    try {
      if (p.adapter === "gemini") {
        r = aiCallGeminiProvider(p, messages, system, opt);
      } else if (p.adapter === "pollinations") {
        r = aiCallPollinationsProvider(p, messages, system);
      } else {
        r = aiCallOpenAICompat(p, messages, system, opt);
      }
    } catch (e) {
      logError("ai:" + p.id, e);
      r = { ok: false, error: String(e && e.message ? e.message : e) };
    }

    aiQuotaUse(p.id);

    if (r.ok && r.text) {
      if (i > 0) {
        logInfo("ai", "主模型不可用，已切换到 " + p.id);
      }
      return { ok: true, text: r.text, provider: p.id, error: "", switched: i > 0 };
    }
    errors.push(p.title + "：" + clip(r.error || "无响应", 90));
  }

  return { ok: false, provider: "", error: errors.join("\n") };
}

/* ---- 5.1 各适配器 -------------------------------------------------------- */

/** Gemini：systemInstruction + contents，支持 inline_data 传图 */
function aiCallGeminiProvider(p, messages, system, opt) {
  var contents = [];
  messages.forEach(function (m) {
    if (m.role === "system") return; // 单独走 systemInstruction
    var parts = [];
    if (m.image && m.image.data) {
      parts.push({ inline_data: { mime_type: m.image.mime || "image/jpeg", data: m.image.data } });
    }
    if (m.text) parts.push({ text: String(m.text) });
    if (!parts.length) return;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: parts });
  });

  var body = {
    contents: contents,
    generationConfig: {
      temperature: opt.temperature === undefined ? 0.7 : opt.temperature,
      maxOutputTokens: opt.maxTokens || 2048,
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  var model = aiModelOf(p);
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  var r = httpPostJsonEx(url, body, { headers: { "x-goog-api-key": aiKeyOf(p) } });

  if (r.code === 0) return { ok: false, error: "网络不可达（检查代理）" };

  var apiErr = get(r.json, "error.message", null);
  if (apiErr) {
    if (r.code === 429) return { ok: false, error: "限流（429）" };
    if (r.code === 400 && String(apiErr).indexOf("API key") !== -1) {
      return { ok: false, error: "密钥无效" };
    }
    return { ok: false, error: String(apiErr) };
  }

  var out = get(r.json, "candidates.0.content.parts.0.text", null);
  if (!out) {
    var fr = get(r.json, "candidates.0.finishReason", "");
    if (fr === "SAFETY" || fr === "PROHIBITED_CONTENT") {
      return { ok: false, error: "内容被安全策略拦截" };
    }
    if (fr === "MAX_TOKENS") return { ok: false, error: "输出超长被截断" };
    return { ok: false, error: "未返回内容（finishReason: " + (fr || "未知") + "）" };
  }
  return { ok: true, text: String(out).trim() };
}

/** OpenAI 兼容：chat/completions（覆盖 Groq / Cerebras / Mistral / OpenRouter 等） */
function aiCallOpenAICompat(p, messages, system, opt) {
  var msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  messages.forEach(function (m) {
    if (m.role === "system") return;

    // 有图 → 走多模态 content 数组（仅部分厂商支持，失败会被故障转移兜住）
    if (m.image && m.image.data) {
      var parts = [];
      if (m.text) parts.push({ type: "text", text: String(m.text) });
      parts.push({
        type: "image_url",
        image_url: { url: "data:" + (m.image.mime || "image/jpeg") + ";base64," + m.image.data },
      });
      msgs.push({ role: "user", content: parts });
      return;
    }

    msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text || "") });
  });

  var body = {
    model: aiModelOf(p),
    messages: msgs,
    temperature: opt.temperature === undefined ? 0.7 : opt.temperature,
    max_tokens: opt.maxTokens || 2048,
  };

  var endpoint = aiEndpointOf(p);
  if (!endpoint) return { ok: false, error: "未配置端点地址" };

  var headers = { Authorization: "Bearer " + aiKeyOf(p) };
  if (p.id === "openrouter") {
    // OpenRouter 建议带上来源标识
    headers["HTTP-Referer"] = "https://github.com/xiaomaoJT/TgBot";
    headers["X-Title"] = BRAND.name || "MaoBot";
  }

  var r = httpPostJsonEx(endpoint + "/chat/completions", body, { headers: headers });

  if (r.code === 0) return { ok: false, error: "网络不可达（检查代理）" };

  var apiErr = get(r.json, "error.message", null) || get(r.json, "errors.0.message", null);
  if (apiErr) {
    if (r.code === 429) return { ok: false, error: "限流（429）" };
    if (r.code === 401 || r.code === 403) return { ok: false, error: "密钥无效或无权限" };
    return { ok: false, error: String(apiErr) };
  }

  var out = get(r.json, "choices.0.message.content", null);
  // 某些模型把推理过程放在 reasoning_content，正文为空时兜底取它
  if (!out) out = get(r.json, "choices.0.message.reasoning_content", null);
  if (!out) return { ok: false, error: "未返回内容" };
  return { ok: true, text: String(out).trim() };
}

/** Pollinations：免密钥兜底，只支持纯文本 */
function aiCallPollinationsProvider(p, messages, system) {
  var userText = "";
  for (var i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].text) {
      userText = messages[i].text;
      break;
    }
  }
  if (!userText) return { ok: false, error: "无提问内容" };

  var url =
    "https://text.pollinations.ai/" +
    encodeURIComponent(userText) +
    (system ? "?system=" + encodeURIComponent(system) : "");
  var out = httpText(url);
  if (!out) return { ok: false, error: "接口无响应" };
  return { ok: true, text: String(out).trim() };
}

/* ============================================================================
 * 六、面向业务的便捷封装
 * ==========================================================================*/

/**
 * 单轮文本生成（最常用的入口）。
 * @return {{ok:boolean, text:string, provider:string, error:string}}
 */
function aiAsk(prompt, opts) {
  var opt = opts || {};
  var messages = [];
  if (opt.history && opt.history.length) {
    opt.history.forEach(function (h) {
      messages.push({ role: h.role === "model" ? "assistant" : "user", text: h.text });
    });
  }
  messages.push({ role: "user", text: String(prompt || "") });
  return aiComplete(messages, opt);
}

/**
 * 带 ctx 的对话（自动带上多轮记忆与流式反馈）。
 * 是 /ai 指令与"回复机器人继续聊"场景的统一入口。
 */
function apiAIText(prompt, ctx) {
  var st = aiChainStatus();
  if (!st.ok) {
    return { ok: false, reason: "noconfig", text: st.reason };
  }

  var history = aiHistGet(ctx);
  var r = aiAsk(prompt, { history: history });

  if (!r.ok) return { ok: false, reason: "error", text: r.error, provider: r.provider };

  var text = clip(String(r.text).trim(), cfg("ai.maxChars", 3500));
  aiHistPush(ctx, "user", prompt);
  aiHistPush(ctx, "model", text);
  return { ok: true, text: text, provider: r.provider };
}

/* ============================================================================
 * 七、内容提取（摘要 / 答疑 / 群聊总结的取材）
 * ==========================================================================*/

/** 从被回复的消息里取出可读文本 */
function aiTextFromMessage(msg) {
  if (!msg) return "";
  var t = msg.text || msg.caption || "";
  if (t) return String(t);
  var c = detectContent(msg);
  return c && c.label ? "（对方发来一条" + c.label + "，没有文字内容）" : "";
}

/**
 * 抓取网页并转成纯文本。
 * 只做最朴素的标签剥离 —— 目的只是给模型一段可读材料，
 * 不需要完整的 HTML 解析器。
 */
function aiPageToText(url) {
  var u = safeUrl(url);
  if (!u) return "";
  var html = httpText(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MaoBot/2.0)" } });
  if (!html) return "";
  return plain(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(p|div|br|li|h[1-6]|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

/**
 * 从「指令参数 / 被回复的消息 / 参数里的链接」三处取材。
 * @return {{text:string, source:string, kind:string}}
 */
function aiExtractTarget(ctx, args) {
  var arg = String(args || "").trim();

  // 1) 参数本身是个链接 → 抓网页
  var m = arg.match(/https?:\/\/\S+/);
  if (m) {
    var page = aiPageToText(m[0]);
    if (page) return { text: page, source: "网页 " + clip(m[0], 40), kind: "url" };
  }

  // 2) 参数有内容 → 直接用
  if (arg) return { text: arg, source: "参数", kind: "text" };

  // 3) 回复了一条消息 → 取它的内容
  if (ctx && ctx.reply) {
    var t = aiTextFromMessage(ctx.reply);
    if (t) return { text: t, source: "被回复的消息", kind: "reply" };
  }

  return { text: "", source: "", kind: "none" };
}

/** 从本群最近 N 条消息里拼一段可供总结的文本 */
function aiRecentChatText(chatId, limit) {
  var max = Math.min(Number(limit || cfg("ai.digestMessages", 100)) || 100, 400);
  var data = readSheet(SHEET.storage);
  var lines = [];

  for (var i = data.length - 1; i >= 3 && lines.length < max; i--) {
    var row = data[i];
    if (!row || !row[0]) continue;
    if (String(row[6]) !== String(chatId)) continue;
    var who = String(row[3] || row[2] || "某人");
    var content = String(row[5] || row[4] || "").replace(/\s+/g, " ").trim();
    if (!content) continue;
    lines.push(who + "：" + clip(content, 200));
  }

  lines.reverse();
  return {
    count: lines.length,
    text: lines.join("\n"),
  };
}

/**
 * 把 Telegram 上的一张图片转成 Gemini 能吃的 base64。
 * ⚠️ Telegram 单文件下载上限 20MB，超了会失败，这里做大小保护。
 */
function aiImagePartFromMessage(msg) {
  var c = detectContent(msg || {});
  if (!c || !c.fileId) return null;
  var url = tgFileUrl(c.fileId);
  if (!url) return null;
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var blob = res.getBlob();
    var bytes = blob.getBytes();
    if (bytes.length > 12 * 1024 * 1024) return null; // 太大，模型侧也会拒
    return {
      mime: blob.getContentType() || "image/jpeg",
      data: Utilities.base64Encode(bytes),
    };
  } catch (e) {
    logError("ai:image", e);
    return null;
  }
}

/* ============================================================================
 * 八、指令实现
 * ==========================================================================*/

/** 统一的「AI 未配置」引导卡片 */
function aiNotConfiguredCard() {
  return uiFail("AI 尚未配置", [
    "还没有可用的模型。任选一家免费服务，把密钥填进 <code>Params.gs</code> 即可：",
    "",
    uiSection("推荐：Google Gemini", THEME.info),
    uiItem("打开 " + uiMono("aistudio.google.com/apikey") + "（Google 账号登录）"),
    uiItem("点 " + uiMono("Create API Key") + "，无需信用卡"),
    uiItem("填到 " + uiMono("CONFIG.ai.geminiKey")),
    "",
    uiItem("还想更快？再顺手配一个 " + uiMono("groqKey") + " 作为备用，会自动故障转移"),
    "",
    "<i>完整可选清单发送 /models 查看。</i>",
  ]);
}

/** 统一的失败卡片（把各模型的报错摊开，方便定位） */
function aiFailCard(title, error) {
  return uiFail(title, [
    "<i>所有可用模型都调用失败了：</i>",
    "",
    ...String(error || "")
      .split("\n")
      .filter(Boolean)
      .map(function (l) {
        return uiItem(esc(l));
      }),
    "",
    "<i>排查建议：确认密钥有效、额度未耗尽；若本机网络需要代理，请确认 GAS 侧可访问。</i>",
  ]);
}

/** 流式反馈：调用前先亮个"思考中"草稿，避免用户对着空白干等 */
function aiThinkingDraft(ctx, label) {
  if (!ctx || !cfg("ai.stream", true)) return;
  tgSendDraft(ctx, tgNewDraftId(), THEME.loading + " " + (label || "正在思考…"));
}

/* ---- 8.1 /ai 多轮对话 ---------------------------------------------------- */

function apiAI(prompt, ctx) {
  var q = String(prompt || "").trim();

  if (q === "clear" || q === "reset" || q === "重置" || q === "清空") {
    aiHistClear(ctx);
    return uiOK("上下文已清空", ["之前的对话记录已从记忆中移除。"]);
  }

  if (!q) {
    return uiUsage("/ai", "/ai <问题>", [
      "/ai 用一句话解释量子纠缠",
      "/ai 帮我写一个校验手机号的正则",
      "/ai clear（清空上下文）",
    ]);
  }

  var st = aiChainStatus();
  if (!st.ok) return aiNotConfiguredCard();

  aiThinkingDraft(ctx, "正在思考…");

  var r = withTyping(ctx, "typing", function () {
    return apiAIText(q, ctx);
  });

  if (!r.ok) {
    if (r.reason === "noconfig") return aiNotConfiguredCard();
    return aiFailCard("AI 回复失败", r.text);
  }

  var turns = Number(cfg("ai.historyTurns", 6));
  var chain = aiChainStatus().chain || [];
  return {
    rich: richCard({
      icon: "🤖",
      title: "AI 回复",
      subtitle: clip(q, 46),
      blocks: [blkQuote(r.text)],
      footer:
        aiProviderName(r.provider) +
        (chain.length > 1 ? "（共 " + chain.length + " 个备用）" : "") +
        " · 今日剩余 " +
        aiQuotaLeft(r.provider) +
        " 次" +
        (turns > 0 ? " · 记忆 " + turns + " 轮" : ""),
    }),
  };
}

/* ---- 8.2 /sum 智能摘要 --------------------------------------------------- */

function cmdAISummary(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var t = aiExtractTarget(ctx, args);
  if (!t.text) {
    return uiUsage("/sum", "/sum [内容或链接]（留空则总结你回复的那条消息）", [
      "回复一条长消息后发送 /sum",
      "/sum https://example.com/article",
      "/sum 这里粘贴一段长文",
    ]);
  }

  var material = clip(t.text, cfg("ai.maxInputChars", 12000));
  aiThinkingDraft(ctx, "正在阅读并总结…");

  var r = aiAsk(
    "请对下面的内容做结构化摘要。要求：\n" +
      "1. 先用一句话概括核心结论；\n" +
      "2. 再列 3-6 条要点，每条不超过 40 字；\n" +
      "3. 如果有明确的数据、时间、结论，务必保留；\n" +
      "4. 不要复述原文，不要客套话。\n\n" +
      "内容如下：\n---\n" +
      material,
    { system: "你是一个专业的内容摘要助手，输出简洁的中文要点。", maxTokens: 1200 }
  );

  if (!r.ok) return aiFailCard("摘要失败", r.error);

  return {
    rich: richCard({
      icon: "📝",
      title: "内容摘要",
      subtitle: "来源：" + t.source + " · " + material.length + " 字",
      blocks: [blkP(r.text)],
      footer: aiProviderName(r.provider) + " · 今日剩余 " + aiQuotaLeft(r.provider) + " 次",
    }),
  };
}

/* ---- 8.3 /ask 针对某条消息提问 ------------------------------------------- */

function cmdAIAsk(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var q = String(args || "").trim();
  if (!q) {
    return uiUsage("/ask", "/ask <问题>（先回复要提问的那条消息）", [
      "回复一份文档后：/ask 里面的违约责任是怎么约定的",
      "回复一段代码后：/ask 这段有什么性能问题",
    ]);
  }

  var t = aiExtractTarget(ctx, "");
  if (!t.text) {
    return uiWarn("没有可提问的材料", [
      "请先 **回复** 一条包含内容的消息，再发送 " + uiCmd("/ask 你的问题"),
      "",
      "<i>也可以在问题里直接带链接，机器人会先抓取网页内容。</i>",
    ]);
  }

  var q2 = aiExtractTarget(ctx, q);
  var context = q2.kind === "url" ? q2.text : t.text;

  var material = clip(context, cfg("ai.maxInputChars", 12000));
  aiThinkingDraft(ctx, "正在阅读材料…");

  var r = aiAsk(
    "以下材料供你参考作答。\n" +
      "规则：只依据材料回答；材料里没有的信息，明确说\"材料中未提及\"；不要编造。\n\n" +
      "=== 材料开始 ===\n" +
      material +
      "\n=== 材料结束 ===\n\n" +
      "问题：" +
      q,
    { system: "你是一个严谨的文档问答助手，绝不编造材料以外的内容。", maxTokens: 1500 }
  );

  if (!r.ok) return aiFailCard("回答失败", r.error);

  return {
    rich: richCard({
      icon: "🔎",
      title: "基于材料的回答",
      subtitle: "提问：" + clip(q, 40),
      blocks: [blkP(r.text)],
      footer: "材料来源：" + t.source + " · " + aiProviderName(r.provider),
    }),
  };
}

/* ---- 8.4 /code 写代码 / 解释 / 排错 -------------------------------------- */

function cmdAICode(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var t = aiExtractTarget(ctx, args);
  if (!t.text) {
    return uiUsage("/code", "/code <需求>（回复报错信息可直接排查）", [
      "/code Python 用 pandas 读 CSV 并画柱状图",
      "回复一段报错日志后 /code 帮我定位原因",
    ]);
  }

  aiThinkingDraft(ctx, "正在写代码…");

  var r = aiAsk(
    "请完成下面的编程请求。输出要求：\n" +
      "1. 先给出一句思路说明；\n" +
      "2. 再给出完整可运行的代码，用 Markdown 代码块包裹并标注语言；\n" +
      "3. 关键行加中文注释；\n" +
      "4. 如果是排查报错，请指出根因和修复方式。\n\n" +
      "请求：\n" +
      clip(t.text, cfg("ai.maxInputChars", 12000)),
    { system: "你是一位资深工程师，输出可直接复制使用的代码。", maxTokens: 2500 }
  );

  if (!r.ok) return aiFailCard("代码生成失败", r.error);

  return {
    rich: richCard({
      icon: "💻",
      title: "代码助手",
      subtitle: clip(t.text, 46),
      blocks: [blkP(r.text)],
      footer: aiProviderName(r.provider) + " · 今日剩余 " + aiQuotaLeft(r.provider) + " 次",
    }),
  };
}

/* ---- 8.5 /polish 润色改写 ------------------------------------------------ */

var AI_POLISH_STYLES = {
  正式: "改写成正式、书面化的表达，适合对领导或客户发送",
  口语: "改写成轻松自然的口语表达，像朋友聊天",
  简洁: "在保留全部关键信息的前提下尽量精简，越短越好",
  专业: "改写成专业、严谨、有条理的表达，适合工作文档",
  英文: "翻译成地道自然的英文",
  邮件: "改写成结构清晰的商务邮件，包含称呼、正文、结尾",
};

function cmdAIPolish(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var raw = String(args || "").trim();
  if (!raw) {
    return uiUsage(
      "/polish",
      "/polish [风格] <文本>　风格：" + Object.keys(AI_POLISH_STYLES).join(" / "),
      ["/polish 正式 这个方案我觉得不太行", "/polish 邮件 会议改到明天下午三点"]
    );
  }

  // 解析风格前缀
  var style = "";
  var text = raw;
  var keys = Object.keys(AI_POLISH_STYLES);
  for (var i = 0; i < keys.length; i++) {
    if (raw.indexOf(keys[i]) === 0) {
      style = keys[i];
      text = raw.slice(keys[i].length).trim();
      break;
    }
  }
  if (!text) {
    // 用户只给了风格、正文在回复的消息里
    var t0 = aiExtractTarget(ctx, "");
    text = t0.text;
  }
  if (!text) return uiUsage("/polish", "/polish [风格] <文本>", ["/polish 正式 这个方案我觉得不太行"]);

  var instruction = style
    ? AI_POLISH_STYLES[style]
    : "在保持原意的前提下让表达更通顺、更有条理";

  aiThinkingDraft(ctx, "正在润色…");

  var r = aiAsk(
    "请按要求改写下面这段话。\n" +
      "要求：" + instruction + "。\n" +
      "只输出改写后的文本，不要解释，不要加引号，不要用\"改写后：\"这类前缀。\n\n" +
      "原文：\n" +
      clip(text, cfg("ai.maxInputChars", 12000)),
    { system: "你是一位专业的中文文字编辑。", temperature: 0.6, maxTokens: 1500 }
  );

  if (!r.ok) return aiFailCard("润色失败", r.error);

  return {
    rich: richCard({
      icon: "✍️",
      title: "润色结果" + (style ? "（" + style + "）" : ""),
      blocks: [blkQuote(r.text), blkDiv(), blkP([inT("原文："), inT(clip(text, 120))])],
      footer: aiProviderName(r.provider),
    }),
  };
}

/* ---- 8.6 /see 看图 ------------------------------------------------------- */

function cmdAISee(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var target = ctx.reply || ctx.message;
  var img = aiImagePartFromMessage(target);
  if (!img) {
    return uiWarn("没有读到图片", [
      "请 **回复** 一张图片再发送 " + uiCmd("/see"),
      "",
      uiItem("支持：图片、截图、带文字的照片（可提取文字）"),
      uiItem("单张图片不要超过 10MB"),
      "",
      "<i>看图需要支持视觉的模型，目前免费源里只有 Gemini 支持 —— " +
        "请确认 " + uiMono("CONFIG.ai.geminiKey") + " 已配置。</i>",
    ]);
  }

  var ask = String(args || "").trim();
  var prompt = ask
    ? "请根据这张图片回答：" + ask
    : "请描述这张图片：先说明整体内容，再提取图中所有可见文字（原样输出，保留排版），最后补充值得注意的细节。";

  aiThinkingDraft(ctx, "正在看图…");

  var r = aiComplete(
    [{ role: "user", text: prompt, image: img }],
    {
      system: "你是一个图像理解与 OCR 助手，输出准确、克制，看不到的内容不要猜测。",
      needVision: true,
      prefer: cfg("ai.taskProvider", "") || "gemini",
      maxTokens: 1800,
    }
  );

  if (!r.ok) return aiFailCard("图片理解失败", r.error);

  return {
    rich: richCard({
      icon: "👁",
      title: ask ? "图片问答" : "图片解读",
      subtitle: clip(ask || "描述画面并提取文字", 46),
      blocks: [blkP(r.text)],
      footer: aiProviderName(r.provider),
    }),
  };
}

/* ---- 8.7 /digest 群聊总结 ------------------------------------------------ */

function cmdAIDigest(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();
  if (!ctx.isGroup) return uiWarn("群聊总结仅在群聊中可用");

  var n = parseInt(String(args || "").trim(), 10);
  if (isNaN(n) || n <= 0) n = Number(cfg("ai.digestMessages", 100));

  var got = withTyping(ctx, "typing", function () {
    return aiRecentChatText(ctx.chatId, n);
  });

  if (got.count < 5) {
    return uiWarn("可总结的消息太少", [
      uiKV("抓取到", got.count + " 条", "💬"),
      "",
      "<i>机器人只统计它上线之后收到的消息。想让总结更完整，就把机器人拉进群当管理员。</i>",
    ]);
  }

  aiThinkingDraft(ctx, "正在总结群聊…");

  var r = aiAsk(
    "下面是群聊记录，请总结。输出格式：\n" +
      "1. 一句话说明这段时间大家在聊什么；\n" +
      "2. 列出 3-6 个主要话题（每个附一句结论）；\n" +
      "3. 如果有需要跟进的事项或待办，单独列出来；\n" +
      "4. 不要复述闲聊，不要点名批评任何人。\n\n" +
      "=== 群聊记录 ===\n" +
      clip(got.text, cfg("ai.maxInputChars", 12000)),
    { system: "你是一个高效的会议纪要助手，擅长从杂乱聊天里提炼要点。", maxTokens: 1500 }
  );

  if (!r.ok) return aiFailCard("群聊总结失败", r.error);

  return {
    rich: richCard({
      icon: "📋",
      title: "群聊速览",
      subtitle: (ctx.chatTitle || "") + " · 最近 " + got.count + " 条",
      blocks: [blkP(r.text)],
      footer: aiProviderName(r.provider),
    }),
  };
}

/* ---- 8.8 /todo 待办提取 -------------------------------------------------- */

function cmdAITodo(ctx, args) {
  if (!aiChainStatus().ok) return aiNotConfiguredCard();

  var t = aiExtractTarget(ctx, args);
  if (!t.text) {
    return uiUsage("/todo", "/todo（回复消息）或 /todo <文本>", [
      "回复一段聊天记录或会议内容后发送 /todo",
      "/todo 明天把方案发给王总，周五前完成测试",
    ]);
  }

  aiThinkingDraft(ctx, "正在提取待办…");

  var r = aiAsk(
    "请从下面的内容里提取待办事项。要求：\n" +
      "1. 每条一行，格式：待办内容 ｜ 负责人（如有）｜ 截止时间（如有）\n" +
      "2. 没有明确负责人或时间的就写「未指定」；\n" +
      "3. 只提取真正需要行动的事项，不要脑补；\n" +
      "4. 如果一条待办都没有，直接回答「未发现明确的待办事项」。\n\n" +
      "内容：\n" +
      clip(t.text, cfg("ai.maxInputChars", 12000)),
    { system: "你是一个严谨的任务提取助手。", temperature: 0.3, maxTokens: 1200 }
  );

  if (!r.ok) return aiFailCard("待办提取失败", r.error);

  return {
    rich: richCard({
      icon: "✅",
      title: "待办清单",
      subtitle: "来源：" + t.source,
      blocks: [blkP(r.text)],
      footer: aiProviderName(r.provider),
    }),
  };
}

/* ---- 8.9 /models 模型清单与额度 ----------------------------------------- */

function cmdAIModels(ctx) {
  var active = aiChainStatus();
  var chain = active.chain || [];
  var rows = [];

  AI_PROVIDERS.forEach(function (p) {
    var keyless = !p.keys || !p.keys.length; // 免密钥源（pollinations）
    var ready = aiProviderReady(p);
    var inChain = chain.indexOf(p.id) !== -1;
    var used = aiQuotaUsed(p.id);
    var limit = aiQuotaLimit(p.id);

    var status;
    if (keyless) status = inChain ? "兜底可用" : "未启用";
    else if (!ready) status = "未配置";
    else if (used >= limit) status = "额度用尽";
    else status = inChain ? "可用" : "备用";

    // 🟢 表示"现在真会用它"，而不是"理论上配好了"
    rows.push([
      (inChain ? "🟢 " : "⚪️ ") + p.title,
      aiModelOf(p) || "-",
      inChain ? used + "/" + limit : "-",
      status,
    ]);
  });

  var body = [
    blkP(
      active.ok
        ? [
            inT("当前主模型："),
            inB(aiProviderTitle(active.provider)),
            inT("，共 " + chain.length + " 个模型在故障转移链上。"),
          ]
        : "⚠️ 当前没有任何可用模型，请在 Params.gs 里填写密钥。"
    ),
    blkTable(["模型", "当前型号", "今日用量", "状态"], rows, ["l", "l", "r", "l"]),
  ];

  if (active.ok) {
    body.push(blkDiv());
    body.push(
      blkP([
        inT("转移顺序："),
        inT(
          chain
            .map(function (id, i) {
              return i + 1 + ". " + aiProviderTitle(id);
            })
            .join("　→　")
        ),
      ])
    );
  }

  var pending = AI_PROVIDERS.filter(function (p) {
    return !aiProviderReady(p) && p.keys && p.keys.length && p.doc;
  });
  if (pending.length) {
    body.push(blkDiv());
    body.push(
      blkUL(
        pending.slice(0, 6).map(function (p) {
          return [inT(p.title + "　"), inA("申请密钥", p.doc)];
        })
      )
    );
  }

  return {
    rich: richCard({
      icon: "🧠",
      title: "大模型能力概览",
      subtitle: "填了密钥的模型会自动进入故障转移链",
      blocks: body,
      footer: "今日剩余总调用额度 " + aiQuotaLeftTotal() + " 次",
    }),
  };
}
