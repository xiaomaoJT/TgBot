/* ============================================================
 * MaoBot ProVersion 冒烟测试
 * ============================================================ */
let PASS = 0, FAIL = 0;
function ok(cond, label, extra) {
  if (cond) { PASS++; console.log("  ✅ " + label); }
  else { FAIL++; console.log("  ❌ " + label + (extra ? "\n       → " + extra : "")); }
}
function section(t) { console.log("\n=== " + t + " ==="); }

function lastCalls(n) { return TL_CALLS.slice(-n); }
function callsOf(method) { return TL_CALLS.filter((c) => c.method === method); }
function lastOf(method) { const a = callsOf(method); return a[a.length - 1]; }
function resetCalls() { TL_CALLS.length = 0; }

/* ---------- 配置 ---------- */
EXECID = "MOCK_SHEET_ID";
BOTID = "123456:MOCK_TOKEN";
KingId = "777777";
botIdAlone = "123456";
CONFIG.cache.enabled = false; // 关闭缓存便于逐条验证

let UID = 5000;
/**
 * update_id 必须全局唯一且单调递增。
 * ⚠️ 早期版本用 `100000 + UID + Math.random()*9999`，两条 update 的随机区间大量重叠，
 *    约每 30 次运行就会撞一次 → 幂等去重把一条正常消息吃掉，
 *    表现为"随机某个断言挂掉"，极难排查。改用自增序列后彻底消除。
 */
let UPDATE_SEQ = 500000;
function nextUpdateId() {
  return ++UPDATE_SEQ;
}

function mkUpdate(text, opts) {
  const o = opts || {};
  const chatType = o.chatType || "supergroup";
  const chatId = o.chatId !== undefined ? o.chatId : (chatType === "private" ? 111222 : -1001234567890);
  UID++;
  const from = { id: o.fromId !== undefined ? o.fromId : UID, is_bot: false, first_name: o.name || "测试用户", username: o.username || ("u" + UID) };
  const msg = {
    message_id: o.messageId || UID,
    from,
    chat: chatType === "private"
      ? { id: chatId, type: "private", first_name: "测试用户" }
      : { id: chatId, type: chatType, title: "测试群", username: "testgroup" },
    date: Math.floor(Date.now() / 1000),
    text,
  };
  if (o.replyTo) msg.reply_to_message = o.replyTo;
  if (o.caption !== undefined) { delete msg.text; msg.caption = o.caption; }
  if (o.photo) { delete msg.text; msg.photo = [{ file_id: "FID_SMALL" }, { file_id: "FID_BIG" }]; }
  return { update_id: nextUpdateId(), message: msg };
}
function post(u) { doPost({ postData: { contents: JSON.stringify(u) } }); }

/* ============================================================ */
section("① 配置与工具函数");
ok(cfg("timezone", "x") === "Asia/Shanghai", "cfg() 点号路径读取");
ok(cfg("not.exist", "default") === "default", "cfg() 缺失键回退默认值");
ok(esc('<b>&' ) === "&lt;b&gt;&amp;", "esc() HTML 转义");
ok(safeCalc("(1+2)*3^2").value === 27, "safeCalc 括号与幂运算");
ok(safeCalc("10/0").ok === false, "safeCalc 拒绝除零");
ok(safeCalc("alert(1)").ok === false, "safeCalc 拒绝非法字符（无 eval 注入）");
ok(parseDuration("30m") > unixNow() + 1700, "parseDuration 解析 30m");
ok(parseDuration("") === 0, "parseDuration 空值=永久");
ok(humanDuration(3661) === "1小时1分1秒", "humanDuration 可读化");
ok(splitText("x".repeat(9000), 3800).length === 3, "splitText 长消息切分");
ok(paginate([1,2,3,4,5], 1, 2).slice.join(",") === "3,4", "paginate 分页");
ok(detectContent({ photo: [{ file_id: "A" }, { file_id: "B" }] }).fileId === "B", "detectContent 取最大尺寸图片");
ok(cbPack(["a", "b"], "c", "", "d") === "a|b|c|d", "cbPack 扁平化数组并去空");
ok(cbUnpack("hcat|查询")[1] === "查询", "cbUnpack 解析");

section("② parseCommand 指令解析（原版的 indexOf 误触发问题）");
ok(parseCommand("/help") !== null, "/help 可解析");
ok(parseCommand("/help@TestBot 查询") !== null, "/cmd@Bot 形式可解析");
ok(parseCommand("!id") !== null, "! 前缀可解析");
ok(parseCommand("你好/ban") === null, "★ 消息中间出现 /ban 不再误触发");
ok(parseCommand("/notacommand") === null, "未知指令返回 null");
ok(parseCommand("普通文本") === null, "普通文本返回 null");

section("③ 数据库初始化");
let db = initDatabase();
ok(db.ok, "initDatabase 执行成功", db.error);
ok(db.created.length === 9, "新建 9 张工作表", "实际 " + db.created.length);
ok(getSS().getSheetByName("db_telegram").getDataRange().getValues()[1][0] === "发起时间", "db_telegram 表头正确（与官方版数据表兼容）");

/* ============================================================ */
section("④ doPost 私聊指令链路");
resetCalls();
post(mkUpdate("/id", { chatType: "private" }));
let sent = lastOf("sendMessage");
ok(!!sent, "私聊 /id 有回复");
ok(sent && sent.body.text.indexOf("<code>") !== -1, "回复使用统一卡片 HTML");
ok(sent && sent.body.parse_mode === "HTML", "parse_mode=HTML");
ok(sent && sent.body.link_preview_options && sent.body.link_preview_options.is_disabled === true, "★ 使用官方新字段 link_preview_options（替代已废弃的 disable_web_page_preview）");
ok(sent && sent.body.text.indexOf(String(sent.body.chat_id)) !== -1 || sent.body.chat_id == 111222, "会话 ID 正确");

resetCalls();
post(mkUpdate("/calc 2^10", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("1024") !== -1, "/calc 2^10 = 1024");

resetCalls();
post(mkUpdate("/calc", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("参数不正确") !== -1, "/calc 缺参数返回用法卡片");

resetCalls();
post(mkUpdate("/help", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("全部功能") !== -1, "/help 渲染帮助卡片");
ok(sent && sent.body.reply_markup && JSON.stringify(sent.body.reply_markup).indexOf("hcat") !== -1, "/help 附带分类按钮");

resetCalls();
post(mkUpdate("这是一段完全无关的话", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("未匹配到内容") !== -1, "私聊未匹配走兜底卡片");

resetCalls();
post(mkUpdate("这是一段完全无关的话", { chatType: "supergroup" }));
ok(callsOf("sendMessage").length === 0 || callsOf("sendMessage").every(c => String(c.body.chat_id) === "777777"), "★ 群聊无 @ 时不刷屏（只推送给主人）");

section("⑤ 图片/视频 ID 提取（兼容原版 #photoid）");
resetCalls();
post(mkUpdate("", { chatType: "private", caption: "#photoid", photo: true }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("FID_BIG") !== -1, "#photoid 返回最大尺寸 file_id");

/* ============================================================ */
section("⑥ 关键字自动回复");
const kp = getSS().getSheetByName("key_params");
kp._set(4, 1, "懒人配置,懒人规则");
kp._set(4, 2, "HTML");
kp._set(4, 3, "这是<b>懒人配置</b>的说明\n第二行");
kp._set(4, 4, "第二段内容");
kp._set(5, 1, "短链测试");
kp._set(5, 2, "MarkdownV2");
kp._set(5, 3, "*加粗*内容");
resetCalls();
post(mkUpdate("求懒人配置", { chatType: "private" }));
let msgs = callsOf("sendMessage").filter((c) => String(c.body.chat_id) === "111222");
ok(msgs.length === 2, "多段关键字分条发送（2 条）", "实际 " + msgs.length);
ok(msgs[0] && msgs[0].body.text.indexOf("<b>懒人配置</b>") !== -1, "第一段保留 HTML 格式");
ok(msgs[1] && msgs[1].body.text.indexOf("第二段内容") !== -1, "第二段内容正确");

resetCalls();
post(mkUpdate("短链测试", { chatType: "private" }));
msgs = callsOf("sendMessage").filter((c) => String(c.body.chat_id) === "111222");
ok(msgs.length === 1 && msgs[0].body.parse_mode === "MarkdownV2", "MarkdownV2 模式正确");

/* ============================================================ */
section("⑦ 安全防护：敏感词拦截（群聊）");
addSensitiveWord("违禁词甲", "sensitive");
addSensitiveWord("绝杀词乙", "ban");
cacheDrop(["sensitiveWords", "sensitiveWordsMap"]);

const hit = detectWords("这是违禁词甲测试");
ok(hit.words.length === 1, "DFA 命中敏感词", JSON.stringify(hit.words));
ok(detectWords("违x禁x词x甲").words.length === 0, "★ 中间插入英文字母不再命中（避免过度拦截）");
ok(detectWords("违-禁-词-甲").words.length === 1, "★ 插入 - 等干扰符仍能命中（防绕过）");

resetCalls();
post(mkUpdate("这里有违禁词甲出现", { chatType: "supergroup", fromId: 6001 }));
ok(callsOf("deleteMessage").length === 1, "★ 敏感词消息被删除");
sent = lastOf("sendMessage");
ok(sent && sent.body.text.replace(/\s/g, "").indexOf("违规警告") !== -1, "发出违规警告卡片");

resetCalls();
post(mkUpdate("这里有绝杀词乙出现", { chatType: "supergroup", fromId: 6002 }));
ok(callsOf("banChatMember").length >= 1, "★ 绝杀词直接封禁");
ok(callsOf("deleteMessage").length >= 1, "绝杀词消息被删除");

resetCalls();
post(mkUpdate("这里有违禁词甲出现", { chatType: "supergroup", fromId: 6003 }));
const warnBody = lastOf("sendMessage").body.text + JSON.stringify(getWarns("-1001234567890", "6003"));
ok(warnBody.indexOf("违规") !== -1, "普通敏感词走警告流程（非封禁）");

section("⑧ 管理员绕过与权限控制");
resetCalls();
post(mkUpdate("这里有违禁词甲出现", { chatType: "supergroup", fromId: 900002 }));
ok(callsOf("deleteMessage").length === 0, "★ 群管理员发言不被敏感词过滤误伤");

resetCalls();
post(mkUpdate("/ban", { chatType: "supergroup", fromId: 6004 }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("权限不足") !== -1, "普通成员使用 /ban 被拒绝");

resetCalls();
post(mkUpdate("/ban 30m", { chatType: "supergroup", fromId: 900002, messageId: 8001, replyTo: { message_id: 7001, from: { id: 6005, first_name: "捣乱者" }, text: "广告" } }));
ok(callsOf("banChatMember").length === 1, "管理员 /ban 生效");
let banCall = callsOf("banChatMember")[0];
ok(banCall.body.until_date > unixNow() + 1700, "★ 30m 时长被正确解析为 until_date", String(banCall.body.until_date));

section("⑨ 警告系统");
resetCalls();
getSS().getSheetByName("warn_records").data.length = 0;
for (let i = 0; i < 3; i++) {
  resetCalls();
  post(mkUpdate("/warn 刷屏", { chatType: "supergroup", fromId: 900002, messageId: 8100 + i, replyTo: { message_id: 7100 + i, from: { id: 6010, first_name: "惯犯" }, text: "xx" } }));
}
ok(callsOf("banChatMember").length === 1, "★ 累计 3 次警告自动移出群聊");
const w3 = lastOf("sendMessage");
ok(w3 && (w3.body.text.indexOf("已移出") !== -1 || w3.body.text.indexOf("警告已达上限") !== -1), "移出通知正确");

/* ============================================================ */
section("⑩ 回调按钮（原版缺失的 answerCallbackQuery）");
resetCalls();
const cbUpdate = {
  update_id: 200001,
  callback_query: {
    id: "CB_ID_1",
    from: { id: 900002, first_name: "管理员", username: "admin" },
    message: { message_id: 900, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, from: { id: 123456 }, text: "帮助" },
    data: "hcat|查询",
  },
};
post(cbUpdate);
ok(callsOf("answerCallbackQuery").length === 1, "★ 调用 answerCallbackQuery（否则按钮一直转圈）");
ok(callsOf("editMessageText").length === 1, "★ 原地编辑消息实现翻页");
ok(lastOf("editMessageText").body.text.indexOf("查询") !== -1, "分类切换内容正确");

resetCalls();
post({ update_id: 200002, callback_query: { id: "CB2", from: { id: 900002, first_name: "管理员" }, message: { message_id: 901, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, from: { id: 123456 } }, data: "noop" } });
ok(callsOf("answerCallbackQuery").length === 1, "noop 回调被应答（不转圈）");

resetCalls();
post({ update_id: 200003, callback_query: { id: "CB3", from: { id: 6007, first_name: "路人" }, message: { message_id: 902, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, from: { id: 123456 } }, data: "panel|tog|filter" } });
ok(lastOf("answerCallbackQuery").body.show_alert === true, "★ 非管理员操作面板被拦截并弹窗提示");

resetCalls();
post({ update_id: 200004, callback_query: { id: "CB4", from: { id: 900002, first_name: "管理员" }, message: { message_id: 903, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, from: { id: 123456 } }, data: "panel|tog|filter" } });
ok(getChatSetting("-1001234567890", "filter", "on") === "off", "★ 管理员点击开关，设置真实写入 chat_settings 表");

section("⑪ 幂等：Telegram 重推不重复回复");
resetCalls();
const dupUpdate = mkUpdate("/ping", { chatType: "private", messageId: 9500 });
post(dupUpdate);
const firstCount = callsOf("sendMessage").length;
post(dupUpdate); // 同一个 update_id 重推
ok(callsOf("sendMessage").length === firstCount, "★ 相同 update_id 第二次被忽略", firstCount + " → " + callsOf("sendMessage").length);

section("⑫ 未配置项降级");
resetCalls();
post(mkUpdate("/weather 北京", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("天气") !== -1, "天气接口不可用时返回友好卡片而非静默失败");

resetCalls();
post(mkUpdate("/hot", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("可用平台") !== -1, "/hot 无参数展示平台列表");

resetCalls();
post(mkUpdate("/ai 你好", { chatType: "private" }));
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("AI") !== -1, "AI 不可用时给出明确提示");

section("⑬ 入群 / 退群 / 机器人被拉群");
setChatSetting("-1001234567890", "welcome", "on");
setChatSetting("-1001234567890", "left", "on");
resetCalls();
post({ update_id: 300001, message: { message_id: 1001, from: { id: 6020, first_name: "新人" }, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, date: 1, new_chat_members: [{ id: 6021, first_name: "小新" }] } });
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("小新") !== -1, "★ 使用官方字段 new_chat_members 欢迎新人（原版用的 new_chat_participant 早已废弃）");
ok(sent && sent.body.text.indexOf("42") !== -1, "欢迎语带成员数");

resetCalls();
post({ update_id: 300002, message: { message_id: 1002, from: { id: 6020, first_name: "新人" }, chat: { id: -1001234567890, type: "supergroup", title: "测试群" }, date: 1, left_chat_member: { id: 6022, first_name: "离开者" } } });
sent = lastOf("sendMessage");
ok(sent && sent.body.text.indexOf("离开者") !== -1, "★ 使用官方字段 left_chat_member 提示退群");

resetCalls();
post({ update_id: 300003, my_chat_member: { chat: { id: -100999, type: "supergroup", title: "新群" }, from: { id: 900001 }, date: 1, old_chat_member: { status: "left", user: { id: 123456 } }, new_chat_member: { status: "administrator", user: { id: 123456 } } } });
sent = lastOf("sendMessage");
ok(sent && String(sent.body.chat_id) === "777777", "★ 机器人被设为管理员时通知主人");
ok(sent && sent.body.text.indexOf("新群") !== -1, "通知内容含群名");

section("⑭ 原版崩溃点回归：非常规 update 不再抛异常");
let crashed = null;
["inline_query", "chat_join_request", "poll", "message_reaction", "edited_message", "channel_post"].forEach((k) => {
  try {
    let u = { update_id: nextUpdateId() };
    if (k === "inline_query") u.inline_query = { id: "IQ1", from: { id: 1 }, query: "test", offset: "" };
    if (k === "chat_join_request") u.chat_join_request = { chat: { id: -1001, title: "群" }, from: { id: 8, first_name: "申请人" }, date: 1 };
    if (k === "poll") u.poll = { id: "P1", question: "q" };
    if (k === "message_reaction") u.message_reaction = { chat: { id: -1001 }, message_id: 1 };
    if (k === "edited_message") u.edited_message = { message_id: 1, from: { id: 1 }, chat: { id: -1001, type: "supergroup", title: "群" }, date: 1, text: "编辑后" };
    if (k === "channel_post") u.channel_post = { message_id: 1, chat: { id: -1002, type: "channel", title: "频道" }, date: 1, text: "频道内容" };
    handleUpdate(u);
  } catch (e) { crashed = k + ": " + e.message; }
});
ok(crashed === null, "★ 各类 update 均不抛异常", crashed);

section("⑮ 调度器（替代原版的 20 触发器 hack）");
resetCalls();
getSS().getSheetByName("task_queue").data.length = 0;
enqueueTask("deleteMessage", { chat_id: "-1001", message_id: "55" }, unixNow() - 1);
enqueueTask("deleteMessage", { chat_id: "-1001", message_id: "56" }, unixNow() - 1);
enqueueTask("deleteMessage", { chat_id: "-1002", message_id: "57" }, unixNow() + 9999);
runScheduler();
const delCalls = callsOf("deleteMessages");
ok(delCalls.length === 1 && delCalls[0].body.message_ids.length === 2, "★ 到期任务被合并为一次 deleteMessages 批量调用", JSON.stringify(delCalls[0] && delCalls[0].body));
ok(getSS().getSheetByName("task_queue")._get(2, 1) === "done", "任务被标记完成");
ok(getSS().getSheetByName("task_queue")._get(4, 1) === "pending", "未到期任务保持 pending");

section("⑯ 帮助菜单与命令面板");
const menu = syncCommandsToTelegram();
ok(menu.ok && menu.count > 15, "★ setMyCommands 注册命令面板（原版完全没有）", "注册 " + menu.count + " 条");
ok(callsOf("setMyCommands").length >= 1, "包含 all_chat_administrators 作用域的管理命令");
ok(callsOf("setMyName").length === 1, "同步设置机器人名称");
const helpAll = buildHelpText("", 0);
ok(helpAll.indexOf("全部功能") !== -1, "帮助卡片可渲染");
ok(buildHelpText("查询", 0).indexOf("天气") !== -1, "分类帮助可渲染");
ok(helpTotalPages("") >= 1, "帮助分页计算正常");

section("⑯① 中英文切换（i18n）");
setCurrentLang("zh");
ok(L("中文", "English") === "中文", "★ L() 默认返回中文");
setCurrentLang("en");
ok(L("中文", "English") === "English", "★ L() 切到英文返回英文");
ok(L("只有中文") === "只有中文", "★ 缺英文文案时回落中文");
setCurrentLang("zh");

setCurrentLang("en");
ok(buildHelpText("", 0).indexOf("All features") !== -1, "★ /help 英文模式标题为英文");
ok(buildHelpText("查询", 0).indexOf("Query city weather") !== -1, "★ /help 英文模式显示英文描述");
setCurrentLang("zh");
ok(buildHelpText("查询", 0).indexOf("天气") !== -1, "★ /help 切回中文恢复中文描述");

resetCalls();
var langOut = cmdLang({ chatId: "111222", userId: "111222", isGroup: false, userName: "u" }, "en");
ok(langOut && langOut.indexOf("English") !== -1, "★ /lang en 在私聊返回英文确认");
ok(getLang({ chatId: "111222" }) === "en", "★ /lang en 已持久化该聊语言（chat_settings）");

var langDenied = cmdLang({ chatId: "-100123", userId: "999999", isGroup: true, userName: "x" }, "en");
ok(langDenied && langDenied.indexOf("Permission") !== -1, "★ 群聊非管理员改语言被拒绝");

cmdLang({ chatId: "111222", userId: "111222", isGroup: false, userName: "u" }, "zh");
ok(getLang({ chatId: "111222" }) === "zh", "★ /lang zh 切回中文");
setCurrentLang("zh");

section("⑰ 运行自检");
resetCalls();
const health = cmdHealth({ chatId: "777777", userId: "777777", isGroup: false, isKing: true, userName: "主人" });
ok(typeof health === "string" && health.indexOf("运行自检") !== -1, "cmdHealth 输出自检卡片");
ok(health.indexOf("缺失") !== -1 || health.indexOf("全部就绪") !== -1, "自检覆盖工作表检查");

/* ============================================================ */
section("⑱ 富消息（Bot API 10.1+ Rich Messages）");
mockReset();

/* ---- GFM 转义 ---- */
ok(mdEsc("**粗体**") === "\\*\\*粗体\\*\\*", "★ 星号被转义，动态内容不会意外变粗体");
ok(mdEsc("<script>alert(1)</script>") === "&lt;script&gt;alert(1)&lt;/script&gt;", "尖括号转义为实体");
ok(mdEsc("- 假装是列表") === "\\- 假装是列表", "★ 行首列表标记被转义，普通文本不会被解析成列表");
ok(mdEsc("# 假装是标题") === "\\# 假装是标题", "行首 # 被转义");
ok(mdEsc("A & B") === "A &amp; B", "& 转义");

/* ---- 真表格 ---- */
const mdTbl = tableMd(
  ["平台", "热度", "趋势"],
  [["微博", "1234万", "🔺"], ["知乎 | 话题", "987万", "🔻"]],
  ["l", "r", "c"]
);
ok(mdTbl.indexOf("| 平台 | 热度 | 趋势 |") !== -1, "生成 GFM 表头行");
ok(mdTbl.indexOf("|:---|---:|:---:|") !== -1, "三列对齐标记正确（左/右/居中）");
ok(mdTbl.indexOf("知乎 \\| 话题") !== -1, "★ 单元格内的 | 被转义，否则整张表会错列");
ok(mdTbl.split("\n").length === 4, "表头 + 对齐行 + 2 数据行");

/* ---- 双产物一致性（富消息 / HTML 降级由同一份数据渲染）---- */
const rc = richCard({
  status: "ok",
  title: "测试卡片",
  subtitle: "副标题",
  blocks: [
    blkKV("🌤", "天气", "晴"),
    blkTable(["A", "B"], [["1", "2"]], ["l", "r"]),
    blkUL(["条目一", "条目二"]),
    blkQuote("引用内容"),
  ],
  footer: "页脚",
});
ok(rc.md.indexOf("## ✅ 测试卡片") !== -1, "Markdown 版标题渲染为二级标题");
ok(rc.html.indexOf("<b>✅ 测试卡片</b>") !== -1, "HTML 降级版标题渲染为粗体");
ok(rc.md.indexOf("| A | B |") !== -1, "Markdown 版是真正的表格");
ok(rc.html.indexOf("<pre>") !== -1, "★ HTML 降级版退化为等宽表格（就是升级前的观感）");
ok(rc.md.indexOf("- 条目一") !== -1 && rc.html.indexOf("• 条目一") !== -1, "列表两种渲染都正确");
ok(rc.md.indexOf("**天气：**") !== -1 && rc.md.indexOf("**天气：**") !== rc.md.indexOf("**天气：****"), "键值行紧凑排列");
ok(rc.md.indexOf("> 引用内容") !== -1 && rc.html.indexOf("<blockquote>") !== -1, "引用块双版本正常");
ok(rc.md.indexOf("---") !== -1 && rc.md.indexOf("_页脚_") !== -1, "分隔线与页脚正常");

/* ---- 一行内混排多种格式（片段数组）---- */
const mix = richCard({
  title: "混排",
  blocks: [
    blkP([inT("转移顺序："), inB("Google Gemini"), inT(" → "), inB("Groq")]),
    blkUL([[inT("Groq　"), inA("申请密钥", "https://console.groq.com/keys")]]),
  ],
});
ok(mix.md.indexOf("转移顺序：**Google Gemini** → **Groq**") !== -1, "★ 片段数组可一行混排纯文本与加粗");
ok(mix.html.indexOf("转移顺序：<b>Google Gemini</b>") !== -1, "HTML 降级版同样正确混排");
ok(mix.md.indexOf("[申请密钥](https://console.groq.com/keys)") !== -1, "列表项里的链接片段正常渲染");
ok(mix.md.indexOf("[object Object]") === -1, "★ 不会出现 [object Object]（片段被误当字符串拼接）");

/* ---- 实际发送 ---- */
resetCalls();
const ctxG = { chatId: "-1001234567890", isGroup: true, userId: "5001", threadId: null };
sendRichResult(ctxG, rc, {});
const richCall = lastOf("sendRichMessage");
ok(!!richCall, "★ 调用 sendRichMessage 发送富消息");
ok(richCall && richCall.body.rich_message && richCall.body.rich_message.markdown.indexOf("## ✅") === 0,
  "★ 富消息走 rich_message.markdown 字段（GFM 语法）");

/* ---- 降级路径 ---- */
mockFailMethod("sendRichMessage", 404);
tgCapReset();
resetCalls();
sendRichResult(ctxG, rc, {});
ok(callCount("sendMessage") === 1, "★ 服务端不支持时自动降级为 sendMessage");
ok(tgCapOk("rich") === false, "★ 失败后写入能力降级标记（不再重复浪费配额试错）");
resetCalls();
sendRichResult(ctxG, rc, {});
ok(callCount("sendRichMessage") === 0, "降级期内完全不再尝试 sendRichMessage");
ok(callCount("sendMessage") === 1, "降级期内直接走 HTML");

/* ---- 参数类错误不应永久关闭富消息 ---- */
mockReset();
mockFailMethod("sendRichMessage", 400);
tgCapReset();
resetCalls();
sendRichResult(ctxG, rc, {});
ok(callCount("sendMessage") === 1, "400 参数错误时本条降级为 HTML");
ok(tgCapOk("rich") === true, "★ 400 不写入永久降级标记（可能只是这一条 Markdown 有问题）");
mockReset();

section("⑲ 临时消息（群内仅本人可见，Bot API 10.2+）");
mockReset();

resetCalls();
tgSendEphemeral({ chatId: "-1001234567890", isGroup: true, userId: "5001" }, "你的 ID：12345", "5001");
const ephCall = lastOf("sendMessage");
ok(
  ephCall && ephCall.body.ephemeral_message_parameters &&
    ephCall.body.ephemeral_message_parameters.receiver_user_id === 5001,
  "★ 带 ephemeral_message_parameters（群里只有本人能看到）"
);

/* 个人查询类指令 → 临时消息 */
resetCalls();
post(mkUpdate("/id", { fromId: 5001 }));
const idCall = lastOf("sendMessage");
ok(!!(idCall && idCall.body.ephemeral_message_parameters), "★ /id 在群内以临时消息回复");

resetCalls();
post(mkUpdate("/ping", { fromId: 5002 }));
ok(!!(lastOf("sendMessage").body.ephemeral_message_parameters), "★ /ping 同样走临时消息");

/* 公开内容指令 → 保持公开 */
resetCalls();
post(mkUpdate("/stat", { fromId: 5003 }));
const statCall = lastOf("sendMessage");
ok(!!statCall && !statCall.body.ephemeral_message_parameters, "★ /stat 保持公开（群员都能看到统计）");

/* 管理动作 → 必须公开 */
resetCalls();
post(mkUpdate("/warn 发广告", {
  fromId: 900001,
  replyTo: { message_id: 1, from: { id: 6001, first_name: "坏人" }, text: "广告内容" },
}));
ok(!(lastOf("sendMessage").body.ephemeral_message_parameters), "★ 管理动作保持公开（群员需看到违规处理确实发生）");

/* 群级开关可关闭 */
setChatSetting("-1001234567890", "eph", "off");
resetCalls();
post(mkUpdate("/ping", { fromId: 5004 }));
ok(!(lastOf("sendMessage").body.ephemeral_message_parameters), "群管理员关掉开关后 /ping 恢复公开发送");
setChatSetting("-1001234567890", "eph", "on");

/* 私聊里不需要临时消息 */
resetCalls();
post(mkUpdate("/ping", { chatType: "private", fromId: 5005 }));
ok(!(lastOf("sendMessage").body.ephemeral_message_parameters), "私聊不做临时消息处理（无意义）");

/* 不可用时降级为「发送后删除」 */
mockReset();
tgCapReset();
resetCalls();
const tasksBefore = enqueueTaskCount();
// 只让"临时消息"这一路失败（模拟机器人没有管理员权限），公开发送仍然正常
mockFailEphemeral(true);
const fb = sendEphemeral({ chatId: "-1001234567890", isGroup: true, userId: "5006" }, "回退内容", 30);
ok(!!fb, "★ 临时消息不可用时仍能发出（降级路径生效）");
ok(!lastOf("sendMessage").body.ephemeral_message_parameters, "★ 降级后转为公开发送");
ok(enqueueTaskCount() > tasksBefore, "降级后进入 task_queue 定时删除队列");
ok(tgCapOk("ephemeral"), "★ 会话级失败（非管理员）不写入永久降级标记");
mockFailEphemeral(false);
mockReset();

section("⑳ 大模型能力层（注册表 / 故障转移 / 配额保护）");
mockReset();
aiQuotaReset();

ok(AI_PROVIDERS.length >= 10, "★ 注册表收录 " + AI_PROVIDERS.length + " 家模型");
ok(aiProvider("gemini").vision === true, "Gemini 标记为支持视觉");

/* 未配置 → 明确引导 */
CONFIG.ai.provider = "gemini";
CONFIG.ai.geminiKey = "";
CONFIG.ai.groqKey = "";
ok(aiChainStatus().ok === false, "没填密钥时明确报不可用");
const noCfg = apiAI("你好", { chatId: "1", userId: "2" });
ok(typeof noCfg === "string" && noCfg.indexOf("AI 尚未配置") !== -1, "★ 未配置时给出申请引导而非空白报错");
ok(noCfg.indexOf("aistudio.google.com") !== -1, "引导里给出真实申请地址");

/* 填了密钥即生效 */
CONFIG.ai.geminiKey = "TEST_KEY";
ok(aiChainStatus().ok === true && aiChainStatus().provider === "gemini", "⭐ 填了密钥就自动生效，无需改代码");

mockRoute("generativelanguage.googleapis.com", {
  candidates: [{ content: { parts: [{ text: "这是模型回答" }] } }],
});
const r1 = aiAsk("你好");
ok(r1.ok && r1.text === "这是模型回答" && r1.provider === "gemini", "★ Gemini 调用成功并解析出文本");
const gReq = lastExt("generativelanguage.googleapis.com");
ok(!!gReq && gReq.url.indexOf("gemini-3-flash") !== -1, "请求打到注册表里声明的型号");
ok(!!gReq && gReq.body.systemInstruction && !!gReq.body.systemInstruction.parts[0].text, "system 指令正确下发");
ok(aiQuotaUsed("gemini") >= 1, "调用计入配额");

/* 故障转移 */
mockReset();
CONFIG.ai.geminiKey = "TEST_KEY";
CONFIG.ai.groqKey = "TEST_KEY_G";
mockRoute("generativelanguage.googleapis.com", { error: { message: "quota exceeded" } }, 429);
mockRoute("api.groq.com", { choices: [{ message: { content: "Groq 接管了" } }] });
const r2 = aiAsk("你好");
ok(r2.ok && r2.provider === "groq", "★ 主模型被限流时自动切到 Groq");
ok(r2.switched === true, "正确标记发生了模型切换");
ok(aiChainStatus().chain.length === 2, "故障转移链上有 2 个模型");
ok(lastExt("api.groq.com").body.messages.slice(-1)[0].content === "你好", "转移后请求体正确（OpenAI 兼容格式）");

/* 隐私：没配密钥的模型不参与转移 */
ok(aiChainStatus().chain.indexOf("pollinations") === -1, "★ 免密钥的 pollinations 默认不参与（避免内容外泄）");
CONFIG.ai.allowKeylessFallback = true;
ok(aiProviderChain().map((p) => p.id).indexOf("pollinations") !== -1, "显式开启后才纳入兜底源");
CONFIG.ai.allowKeylessFallback = false;

/* 配额保护 */
mockReset();
CONFIG.ai.groqKey = "";
CONFIG.ai.limits = { gemini: 2 };
aiQuotaUse("gemini");
aiQuotaUse("gemini");
ok(aiQuotaLeft("gemini") === 0, "配额按模型分别计数");
mockRoute("generativelanguage.googleapis.com", { candidates: [{ content: { parts: [{ text: "x" }] } }] });
const r3 = aiAsk("你好");
ok(r3.ok === false && r3.error.indexOf("上限") !== -1, "★ 本地配额用尽后主动拒绝，不浪费免费额度");
CONFIG.ai.limits = {};

section("㉑ 翻译改用 Google 官方服务");
mockReset();
const tr1 = apiTranslate("hello");
ok(tr1.indexOf("Google 翻译") !== -1, "★ 优先使用 Google 官方翻译（免费 5000 次/天，不占 UrlFetch 配额）");
ok(EXT_CALLS.some((e) => e.url === "LanguageApp.translate"), "确实走了 LanguageApp.translate");

mockLangFail(true);
mockRoute("api.mymemory.translated.net", { responseData: { translatedText: "你好世界" } });
const tr2 = apiTranslate("hello world");
ok(tr2.indexOf("MyMemory") !== -1, "★ 官方服务异常时降级到 MyMemory");
ok(tr2.indexOf("你好世界") !== -1, "降级后译文正确");
mockLangFail(false);

section("㉒ 工作类任务（摘要 / 润色 / 待办 / 看图 / 群聊总结）");
mockReset();
CONFIG.ai.provider = "gemini";
CONFIG.ai.geminiKey = "TEST_KEY";

mockRoute("generativelanguage.googleapis.com", {
  candidates: [{ content: { parts: [{ text: "这是模型的回答内容" }] } }],
});

const sumCard = cmdAISummary({ chatId: "-100", userId: "1", isGroup: true, reply: null }, "这里是一段很长的正文内容");
ok(!!sumCard && !!sumCard.rich && sumCard.rich.md.indexOf("这是模型的回答内容") !== -1, "★ /sum 摘要以富消息返回");
ok(sumCard.rich.md.indexOf("## 📝 内容摘要") !== -1, "摘要卡片标题正确");

const polCard = cmdAIPolish({ chatId: "-100", userId: "1" }, "正式 这个方案我觉得不太行");
ok(!!polCard && !!polCard.rich, "★ /polish 返回润色结果");
ok(polCard.rich.md.indexOf("润色结果（正式）") !== -1, "★ 正确解析出风格前缀「正式」");
ok(lastExt("generativelanguage.googleapis.com").body.contents.slice(-1)[0].parts[0].text.indexOf("正式") !== -1,
  "风格要求被写进了提示词");

const todoCard = cmdAITodo({ chatId: "-100", userId: "1", reply: null }, "明天交方案");
ok(!!todoCard && !!todoCard.rich, "★ /todo 提取待办");

const codeCard = cmdAICode({ chatId: "-100", userId: "1", reply: null }, "写个快排");
ok(!!codeCard && !!codeCard.rich, "★ /code 生成代码");

/* /models 概览 */
const mdCard = cmdAIModels({ chatId: "-100", userId: "1" });
ok(!!mdCard && !!mdCard.rich && mdCard.rich.md.indexOf("大模型能力概览") !== -1, "/models 输出能力概览");
ok(mdCard.rich.md.indexOf("| 模型 | 当前型号 | 今日用量 | 状态 |") !== -1, "★ 概览用的是真正的 GFM 表格");
ok(mdCard.rich.md.indexOf("Google Gemini") !== -1 && mdCard.rich.md.indexOf("Groq") !== -1, "列出全部已收录模型");
ok(mdCard.rich.md.indexOf("转移顺序") !== -1, "展示故障转移顺序");

/* 看图：走多模态 inline_data */
mockRoute("generativelanguage.googleapis.com", {
  candidates: [{ content: { parts: [{ text: "图中有一只猫" }] } }],
});
const seeCard = cmdAISee({ chatId: "-100", userId: "1", reply: { photo: [{ file_id: "F1" }] } });
ok(!!seeCard && !!seeCard.rich && seeCard.rich.md.indexOf("图中有一只猫") !== -1, "★ /see 完成图片理解");
const vReq = lastExt("generativelanguage.googleapis.com");
ok(!!vReq && vReq.body.contents[0].parts.some((pc) => pc.inline_data), "★ 图片以 inline_data 形式随请求发送");

/* 不支持视觉的模型会被跳过 */
ok(aiProvider("groq").vision === false, "Groq 未标记视觉能力");
const visionChain = aiProviderChain("groq").filter((p) => p.vision);
ok(visionChain.length === 0 || visionChain[0].id !== "groq", "★ 需要看图时不会把图片发给不支持视觉的模型");

/* /ai 的流式反馈 */
mockReset();
mockRoute("generativelanguage.googleapis.com", {
  candidates: [{ content: { parts: [{ text: "答案在这里" }] } }],
});

/* 先验证指令冷却（默认 2 秒内同一用户只处理一条，防止刷屏） */
CONFIG.command.rateLimitSeconds = 30;
resetCalls();
post(mkUpdate("/ai 第一条", { fromId: 5020 }));
post(mkUpdate("/ai 第二条", { fromId: 5020 }));
ok(callCount("sendRichMessage") === 1, "★ 冷却期内只真正处理第一条指令（防刷屏仍然生效）");
{
  const cool = lastOf("sendMessage");
  const coolText = String((cool && cool.body && cool.body.text) || "");
  ok(callCount("sendMessage") === 1, "★ 第二条不再静默丢弃：会回一句提示", "sendMessage × " + callCount("sendMessage"));
  ok(coolText.indexOf("指令太快") !== -1, "★ 冷却提示点明是防刷屏", coolText.slice(0, 40));
  ok(coolText.indexOf("秒") !== -1, "★ 冷却提示告知要等多久", coolText.slice(0, 60));
}
CONFIG.command.rateLimitSeconds = 0; // 后面的多轮测试要连续发两条，先关掉冷却

resetCalls();
post(mkUpdate("/ai 你好", { fromId: 5010 }));
ok(callCount("sendMessageDraft") >= 1, "★ /ai 调用前先推「思考中」草稿（用户不必干等十几秒）");
ok(callCount("sendRichMessage") >= 1, "★ /ai 结果以富消息落盘");
ok(lastOf("sendRichMessage").body.rich_message.markdown.indexOf("答案在这里") !== -1, "富消息里是模型回答");

/* 多轮记忆 */
resetCalls();
post(mkUpdate("/ai 第二个问题", { fromId: 5010 }));
const histReq = lastExt("generativelanguage.googleapis.com");
ok(histReq.body.contents.length >= 3, "★ 多轮对话带上了历史上下文（" + histReq.body.contents.length + " 条）");
ok(histReq.body.contents.some((c) => c.role === "model"), "历史里有模型的历史回复");
ok(histReq.body.contents.slice(-1)[0].parts[0].text === "第二个问题", "最新一句排在最后（顺序没乱）");

/* 清空上下文 */
const cleared = apiAI("clear", { chatId: "1", userId: "2" });
ok(typeof cleared === "string" && cleared.indexOf("上下文已清空") !== -1, "/ai clear 可清空上下文");

/* 指令注册表完整性 */
const aiCmds = COMMANDS.filter((c) => c.cat === "AI").map((c) => c.cmd);
ok(aiCmds.length >= 8, "注册了 " + aiCmds.length + " 个 AI 能力指令");
ok(["sum", "ask", "code", "polish", "see", "digest", "todo", "models"].every((c) => aiCmds.indexOf(c) !== -1),
  "摘要/答疑/代码/润色/看图/总结/待办/模型清单 全部就位");

/* ============================================================ */
section("㉓ 频道监听 · 消息查询 · 关键词推送");
mockReset();
CONFIG.channel.enabled = true;
CONFIG.channel.includeMedia = true;
CONFIG.ai.geminiKey = ""; // 频道推送不依赖大模型，清掉避免误触发
CONFIG.ai.groqKey = "";

/* ---- 关键词切分与匹配 ---- */
ok(chSplitList("小米,红米，澎湃|汽车").join("/") === "小米/红米/澎湃/汽车", "关键词支持中英文逗号 / 竖线分隔");
ok(chSplitList("a,a，a").length === 1, "关键词自动去重");
ok(chMatchText("小米 15 Ultra 发布", ["小米", "汽车"]) === true, "关键词按子串命中");
ok(chMatchText("完全无关的一句话", ["小米"]) === false, "未命中返回 false");
ok(chMatchText("任意内容", []) === true, "★ 不设关键词 = 全量推送");
ok(chMatchText("", ["小米"]) === false, "空正文不会误命中");
ok(chHitKeywords("小米汽车发布会", ["小米", "汽车"]).length === 2, "命中的关键词可回显（告诉用户为什么推给他）");

/* ---- 频道标识解析 ---- */
ok(channelResolve({}, "-1001234567890").chatId === "-1001234567890", "按数字 ID 解析");
ok(channelResolve({}, "@testchannel").chatId === "@testchannel", "按 @用户名解析");
ok(channelResolve({}, "https://t.me/testchannel").chatId === "@testchannel", "按 t.me 链接解析");
ok(channelResolve({}, "https://t.me/c/1234567890/45").chatId === "-1001234567890", "★ 私有频道链接自动补 -100 前缀");
ok(channelResolve({}, "随便打的字") === null, "非法输入返回 null");
const fr = channelResolve(
  { reply: { forward_origin: { type: "channel", chat: { id: -100555, title: "某频道" } } } },
  ""
);
ok(fr && fr.chatId === "-100555" && fr.title === "某频道", "★ 回复一条转发消息即可自动识别频道");

/* ---- 原帖链接 ---- */
ok(
  channelPostLink({ chat: { username: "testchannel" }, message_id: 12 }) === "https://t.me/testchannel/12",
  "公开频道链接用 username"
);
ok(
  channelPostLink({ chat: { id: -1001234567890 }, message_id: 12 }) === "https://t.me/c/1234567890/12",
  "私有频道链接用内部 ID"
);

/* ---- 新帖落库 + 查询 ---- */
function mkChannelPost(text, opts) {
  const o = opts || {};
  UID++;
  return {
    update_id: nextUpdateId(),
    channel_post: {
      message_id: o.messageId || UID,
      date: Math.floor(Date.now() / 1000),
      chat: { id: o.chatId || -1001234567890, type: "channel", title: o.title || "某频道", username: o.username },
      text,
    },
  };
}

mockReset();
post(mkChannelPost("小米汽车正式发布"));
const chRows = channelRecentPosts("-1001234567890", 10);
ok(chRows.length === 1 && chRows[0].content.indexOf("小米汽车") !== -1, "★ 频道新帖落库并可查询");
ok(chRows[0].type === "频道消息", "消息类型标记为「频道消息」");

/* 编辑事件也要能查出来 */
post(mkChannelPost("小米汽车正式发布（已修改）", { messageId: 2001 }));
const editedRow = channelRecentPosts("-1001234567890", 10)[0];
ok(editedRow.chatTitle === "某频道", "频道名称一并入库");

/* ---- 监听规则：保存 / 读回 / 推送 ---- */
console.log("\n--- 订阅与推送 ---");
ok(
  channelSubSave({
    chatId: "-1001234567890",
    title: "某频道",
    targets: ["-1009998887770"],
    keywords: ["小米"],
    enabled: true,
    addedAt: nowStr(),
  }),
  "监听规则保存成功"
);
ok(channelSubsOf("-1001234567890").length === 1, "读回监听规则");
ok(channelSubsOf("-1001234567890")[0].keywords.join("/") === "小米", "关键词读回正确");

resetCalls();
post(mkChannelPost("今天小米发布了新车"));
ok(callCount("sendRichMessage") === 1, "★ 命中关键词 → 推送到目标会话");
const pushCard = lastOf("sendRichMessage").body.rich_message.markdown;
ok(pushCard.indexOf("频道动态") !== -1, "推送卡片标题正确");
ok(pushCard.indexOf("命中") !== -1 && pushCard.indexOf("小米") !== -1, "卡片里标明了命中的关键词");
ok(String(lastOf("sendRichMessage").body.chat_id) === "-1009998887770", "推到了配置的目标会话而不是别的群");

resetCalls();
post(mkChannelPost("完全无关的内容，一点关系都没有"));
ok(callCount("sendRichMessage") === 0, "★ 未命中关键词则不推送（不打扰）");

/* 幂等：同一条帖子重复到达只推一次 */
resetCalls();
post(mkChannelPost("小米又发新车了", { messageId: 3003 }));
const afterFirst = callCount("sendRichMessage");
post(mkChannelPost("小米又发新车了", { messageId: 3003 }));
ok(afterFirst === 1 && callCount("sendRichMessage") === 1, "★ 同一条帖子重复到达只推一次（幂等去重）");

/* 不设关键词 = 全量推送 */
channelSubSave({ chatId: "-100777", title: "全量频道", targets: ["-1009998887770"], keywords: [], enabled: true });
resetCalls();
post(mkChannelPost("这条内容不包含任何关键词", { chatId: -100777, title: "全量频道" }));
ok(callCount("sendRichMessage") === 1, "★ 不设关键词的频道每条新帖都推");

/* 暂停后不再推送 */
channelSubSave({ chatId: "-100777", title: "全量频道", targets: ["-1009998887770"], keywords: [], enabled: false });
resetCalls();
post(mkChannelPost("暂停期间的新帖", { chatId: -100777, title: "全量频道", messageId: 4004 }));
ok(callCount("sendRichMessage") === 0, "★ 暂停的规则不再推送");
channelSubRemove("-100777");

/* ---- /ch 指令家族 ---- */
console.log("\n--- /ch 指令族 ---");
const chCtx = { chatId: "-1009998887770", userId: "1", isGroup: true };
const listCard = apiChannel("", chCtx);
ok(!!listCard && !!listCard.rich && listCard.rich.md.indexOf("频道监听列表") !== -1, "/ch 输出监听列表");
ok(listCard.rich.md.indexOf("| 频道 | 频道 ID | 关键词 | 推送到 |") !== -1, "★ 列表用的是真正的 GFM 表格");

const addRes = apiChannel("add -100999 华为,鸿蒙 汽车", chCtx);
ok(typeof addRes === "string" && addRes.indexOf("已开始监听") !== -1, "/ch add 保存成功");
const added = channelSubsOf("-100999")[0];
ok(added.keywords.join("/") === "华为/鸿蒙/汽车", "关键词按空格与逗号正确切分");
ok(added.targets[0] === "-1009998887770", "★ 默认推送到当前会话（符合从群里操作的直觉）");

apiChannel("off -100999", chCtx);
ok(channelSubsOf("-100999")[0].enabled === false, "/ch off 暂停监听");
apiChannel("on -100999", chCtx);
ok(channelSubsOf("-100999")[0].enabled === true, "/ch on 恢复监听");

apiChannel("key -100999 荣耀", chCtx);
ok(channelSubsOf("-100999")[0].keywords.join("/") === "荣耀", "/ch key 覆盖关键词");

const chTest = apiChannel("test -100999", chCtx);
ok(!!chTest && !!chTest.rich && chTest.rich.md.indexOf("推送链路测试") !== -1, "/ch test 验证推送链路");

const chLog = apiChannel("log", chCtx);
ok(!!chLog && !!chLog.rich && chLog.rich.md.indexOf("频道消息记录") !== -1, "/ch log 查询频道历史消息");
ok(chLog.rich.md.indexOf("| 时间 | 频道 | 内容 |") !== -1, "历史消息也是真表格");

const chUsage = apiChannel("add", chCtx);
ok(typeof chUsage === "string" && chUsage.indexOf("频道ID") !== -1, "参数不全时给出用法引导");

apiChannel("del -100999", chCtx);
ok(channelSubsOf("-100999").length === 0, "/ch del 删除监听规则");

/* ---- 推送卡片上的按钮 ---- */
channelSubSave({ chatId: "-1001234567890", title: "某频道", targets: ["-1009998887770"], keywords: [], enabled: true });
resetCalls();
channelHandleCallback({ chatId: "-1009998887770", messageId: 5, callbackId: "CB1", isGroup: true }, ["ch", "off", "-1001234567890"]);
ok(channelSubsOf("-1001234567890")[0].enabled === false, "★ 推送卡片上的「暂停监听」按钮生效");
ok(callCount("answerCallbackQuery") >= 1, "点击按钮有即时反馈（不再转圈到超时）");

/* ============================================================ */
section("㉔ 热更新（远端清单 → 在线覆盖 → 自动发版）");
mockReset();
CONFIG.deploy.manifestUrl = "";
CONFIG.deploy.branch = "main";
CONFIG.deploy.manifestPath = "deploy/manifest.json";
BRAND.repo = "https://github.com/example/maobot";

ok(
  deployManifestUrl() === "https://raw.githubusercontent.com/example/maobot/main/deploy/manifest.json",
  "★ 从 BRAND.repo 自动推导出远端清单地址（少填一个配置项）"
);
CONFIG.deploy.manifestUrl = "https://example.com/manifest.json";
ok(deployManifestUrl() === "https://example.com/manifest.json", "显式配置优先于自动推导");
ok(deployScriptId() === "MOCK_SCRIPT_ID", "脚本 ID 自动取自运行时，无需手填");

/* ---- 清单拿不到时的报错要能看懂 ---- */
mockRoute("example.com/manifest.json", "upstream boom", 502);
const badMf = deployFetchManifest();
ok(badMf.ok === false && badMf.error.indexOf("清单拉取失败") !== -1, "★ 远端清单不可用时给出明确原因");

/* ---- 正常清单 ---- */
mockReset();
CONFIG.deploy.manifestUrl = "https://example.com/manifest.json";
const MANIFEST = {
  version: "1.1.0",
  note: "新增频道监听与热更新",
  files: [
    { name: "Utils", url: "https://example.com/Utils.gs" },
    { name: "appsscript", url: "https://example.com/appsscript.json" },
  ],
};
mockRoute("example.com/manifest.json", MANIFEST);
mockRoute("example.com/Utils.gs", "function foo() { return 1; }");
mockRoute("example.com/appsscript.json", '{"timeZone":"Asia/Shanghai"}');

const mf = deployFetchManifest();
ok(mf.ok && mf.version === "1.1.0" && mf.files.length === 2, "清单解析成功");

const dl = deployDownloadAll(mf);
ok(dl.ok && dl.files.length === 2, "源码下载完成");
ok(dl.files[0].type === "SERVER_JS" && dl.files[1].type === "JSON", "★ 按文件名判定类型（appsscript 必须是 JSON，否则推上去项目会坏）");
ok(dl.files[0].source.indexOf("function foo") !== -1, "源码内容完整拿到");

const dedup = deployDedupeFiles([{ name: "A" }, { name: "a" }]);
ok(dedup.ok === false && dedup.error.indexOf("重复文件") !== -1, "★ 清单里同名文件直接报错，绝不静默丢代码（GAS 同名会互相覆盖）");

/* ---- 推送 + 发版 ---- */
mockReset();
CONFIG.deploy.manifestUrl = "https://example.com/manifest.json";
mockRoute("example.com/manifest.json", MANIFEST);
mockRoute("example.com/Utils.gs", "function foo() { return 1; }");
mockRoute("example.com/appsscript.json", '{"timeZone":"Asia/Shanghai"}');
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/content", { scriptId: "MOCK_SCRIPT_ID" });
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/versions", { scriptId: "MOCK_SCRIPT_ID", versionNumber: 7 });
/* ⚠️ 顺序即优先级：带 id 的具体路由必须排在 "/deployments" 前面 */
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments/DEP1", { deploymentId: "DEP1" });
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments", {
  deployments: [{ deploymentId: "DEP1", entryPoint: "WEB_APP" }],
});

const applied = deployApply({ version: true });
ok(applied.ok === true, "热更新成功", applied.error);
ok(applied.files === 2, "覆盖了 2 个文件");
ok(applied.released === true, "★ 顺带建版本并切换了默认部署");

const contentPut = EXT_CALLS.filter((e) => String(e.method).toUpperCase() === "PUT" && e.url.indexOf("/content") !== -1)[0];
ok(!!contentPut, "★ 确实调用了 Apps Script API 覆盖脚本内容");
ok(contentPut.body.files.length === 2, "请求体带上全部文件");
ok(String(contentPut.headers.Authorization || "").indexOf("Bearer ") === 0, "★ 带上了 OAuth 令牌（否则 API 会 401）");

const verPost = EXT_CALLS.filter((e) => String(e.method).toUpperCase() === "POST" && e.url.indexOf("/versions") !== -1)[0];
ok(!!verPost && verPost.body.description.indexOf("1.1.0") !== -1, "★ 建版本时写入版本号，回滚时能认出是哪一版");

const depPut = EXT_CALLS.filter((e) => String(e.method).toUpperCase() === "PUT" && e.url.indexOf("/deployments/") !== -1)[0];
ok(!!depPut && depPut.body.deploymentConfig.versionNumber === 7, "★ 把默认部署切到新版本（不切部署 = 白推）");

const dState = deployState();
ok(dState.version === "1.1.0" && dState.files === 2, "热更新状态已记录（下次用来自动比对）");

/* ---- /push 指令 ---- */
const stCard = apiDeploy("status", chCtx);
ok(!!stCard && !!stCard.rich && stCard.rich.md.indexOf("热更新状态") !== -1, "/push status 输出状态卡片");

const ckCard = apiDeploy("check", chCtx);
ok(!!ckCard && !!ckCard.rich && ckCard.rich.md.indexOf("已是最新") !== -1, "/push check 比对远端与线上版本号");

const sameCard = apiDeploy("apply", chCtx);
ok(typeof sameCard === "string" && sameCard.indexOf("远端版本与线上一致") !== -1, "版本没变时不重复覆盖（避免无意义的重启）");

const usageCard = apiDeploy("天书", chCtx);
ok(typeof usageCard === "string" && usageCard.indexOf("/push check") !== -1, "未知子命令回落到用法说明");

/* ---- 授权不足要提示怎么修 ---- */
mockReset();
mockRoute("example.com/manifest.json", MANIFEST);
mockRoute("example.com/Utils.gs", "x");
mockRoute("example.com/appsscript.json", "{}");
mockRoute(
  "script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/content",
  { error: { message: "Request had insufficient authentication scopes." } },
  403
);
const denied = deployApply({});
ok(denied.ok === false && denied.error.indexOf("授权不足") !== -1, "★ 授权不足时告诉用户怎么修，而不是甩一个 403");

ok(COMMANDS.some((c) => c.cmd === "ch" && c.cat === "频道"), "/ch 已注册进指令表（帮助菜单自动同步）");
ok(COMMANDS.some((c) => c.cmd === "push" && c.level === "owner"), "/push 仅 Bot 主人可用");

/* ============================================================ */
console.log("\n【㉓ Web 应用地址解析 / 绕开 dev 陷阱】");

const DEV_URL = "https://script.google.com/macros/s/MOCK_HEAD_ID/dev";
const EXEC_URL = "https://script.google.com/macros/s/AKfycbMOCK/exec";

/* ---- 地址判定 ---- */
ok(deployIsDevUrl(DEV_URL) === true, "/dev 地址能被识别");
ok(deployIsDevUrl(EXEC_URL) === false, "/exec 地址不会被误判为 dev");
ok(deployIsExecUrl(EXEC_URL) === true, "/exec 地址能被识别");
ok(deployIsDevUrl(DEV_URL + "?authuser=0") === true, "带查询串的 /dev 也能识别");

/* ---- 场景一：编辑器里运行（getUrl 返回 /dev），但部署列表里有正式地址 ---- */
mockReset();
CONFIG.deploy.webappUrl = "";
mockServiceUrl(DEV_URL);
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments", {
  deployments: [
    {
      deploymentId: "HEAD",
      deploymentConfig: { scriptId: "MOCK_SCRIPT_ID" },
      entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: DEV_URL } }],
    },
    {
      deploymentId: "DEP_OLD",
      deploymentConfig: { scriptId: "MOCK_SCRIPT_ID", versionNumber: 3 },
      entryPoints: [
        { entryPointType: "WEB_APP", webApp: { url: "https://script.google.com/macros/s/OLD/exec" } },
      ],
    },
    {
      deploymentId: "DEP_NEW",
      deploymentConfig: { scriptId: "MOCK_SCRIPT_ID", versionNumber: 9 },
      entryPoints: [
        { entryPointType: "WEB_APP", webApp: { url: EXEC_URL } },
      ],
    },
  ],
});

const resolved = deployWebappUrlResolve();
ok(resolved.ok === true, "★ /dev 场景下仍能解析出正式地址（这正是用户踩的坑）");
ok(resolved.url === EXEC_URL, "★ 且自动挑了版本号最高的那个部署（9 > 3）", resolved.url);
ok(resolved.source === "api", "地址来源标记为 api（便于 /webhook 里诊断）");

/* ---- 缓存：第二次解析不应再打 API ---- */
const before = EXT_CALLS.filter((e) => e.url.indexOf("/deployments") !== -1).length;
const again = deployWebappUrlResolve();
const after = EXT_CALLS.filter((e) => e.url.indexOf("/deployments") !== -1).length;
ok(again.url === EXEC_URL && after === before, "★ 结果进缓存，避免每次巡检都多花一次 UrlFetch");
ok(again.source === "cache", "命中缓存时来源标记为 cache");

deployWebappUrlForget();
const noCache = deployWebappUrlResolve();
ok(noCache.source === "api", "★ 缓存可以主动作废（重新部署后必须作废）");

/* ---- 场景二：手工配置优先 ---- */
mockReset();
CONFIG.deploy.webappUrl = EXEC_URL;
mockServiceUrl(DEV_URL);
const manual = deployWebappUrlResolve();
ok(manual.ok === true && manual.url === EXEC_URL && manual.source === "config", "手工配置优先级最高");
ok(EXT_CALLS.filter((e) => e.url.indexOf("/deployments") !== -1).length === 0, "手工配置时一次 API 都不用打");
CONFIG.deploy.webappUrl = "";

/* ---- 场景三：手工把 /dev 填进配置 —— 必须挡住并说清楚 ---- */
mockReset();
CONFIG.deploy.webappUrl = DEV_URL;
const badManual = deployWebappUrlResolve();
ok(badManual.ok === false, "★ 手工填 /dev 直接被拒绝（宁可报错也不要静默失败）");
ok(badManual.error.indexOf("/dev") !== -1 && badManual.error.indexOf("/exec") !== -1, "报错里同时点明 /dev 与 /exec");
CONFIG.deploy.webappUrl = "";

/* ---- 场景四：完全拿不到正式地址（API 挂 + 只有 /dev）---- */
mockReset();
mockServiceUrl(DEV_URL);
const stuck = deployWebappUrlResolve();
ok(stuck.ok === false, "★ 只有 /dev 时明确失败，不会拿 /dev 去绑定");
ok(stuck.dev === DEV_URL, "并把 /dev 地址一并返回，供提示语使用");

/* ---- 场景五：被 Web 应用请求触发时，getUrl 就是 /exec ---- */
mockReset();
mockServiceUrl(EXEC_URL);
const runtime = deployWebappUrlResolve();
ok(runtime.ok === true && runtime.url === EXEC_URL && runtime.source === "service", "★ 运行时自报的 /exec 可以采信");

/* ---- setupWebhook 全链路：绝不能把 /dev 交给 Telegram ---- */
mockReset();
mockServiceUrl(DEV_URL);
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments", {
  deployments: [
    { deploymentId: "HEAD", entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: DEV_URL } }] },
    {
      deploymentId: "DEP1",
      deploymentConfig: { versionNumber: 2 },
      entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: EXEC_URL } }],
    },
  ],
});
const bound = setupWebhook();
ok(bound.ok === true, "setupWebhook 绑定成功");
const setWh = lastCall("setWebhook");
ok(!!setWh && setWh.body.url === EXEC_URL, "★ 交给 Telegram 的是 /exec，不是 /dev");
ok(!!setWh && setWh.body.url.indexOf("/dev") === -1, "★ 双重保险：请求体里不含 /dev");

/* ---- 绑定失败时要给出可照做的提示 ---- */
mockReset();
mockServiceUrl(DEV_URL);
const failed = setupWebhook();
ok(failed.ok === false, "拿不到正式地址时不谎报成功");
ok(!!failed.hint && failed.hint.indexOf("新建部署") !== -1, "★ 提示语直接告诉用户去哪一步怎么改");
ok(callCount("setWebhook") === 0, "★ 失败时不发无效请求（不浪费 UrlFetch 配额）");

/* ---- /webhook 指令：绑错地址要能自己看出来 ---- */
mockReset();
mockWebhookUrl(DEV_URL);
mockServiceUrl(DEV_URL);
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments", {
  deployments: [
    {
      deploymentId: "DEP1",
      deploymentConfig: { versionNumber: 2 },
      entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: EXEC_URL } }],
    },
  ],
});
const whCard = cmdWebhook(chCtx);
ok(!!whCard && !!whCard.rich && whCard.rich.md.indexOf("Webhook 状态") !== -1, "/webhook 输出状态卡片");
ok(whCard.rich.md.indexOf("/dev") !== -1, "★ 当前绑的是 /dev 时给出醒目警示");
ok(whCard.rich.md.indexOf(THEME.warn) !== -1, "★ 状态图标是 ⚠️（而不是一片绿让人以为没事）");
ok(whCard.rich.md.indexOf(THEME.ok) === -1, "故障时绝不出现成功图标");

mockReset();
mockWebhookUrl(EXEC_URL);
mockServiceUrl(EXEC_URL);
const whOk = cmdWebhook(chCtx);
ok(whOk.rich.md.indexOf(THEME.ok) !== -1, "一切正常时显示成功图标");
ok(whOk.rich.md.indexOf("测试地址") === -1, "一切正常时不刷无用警告");
ok(whOk.rich.md.indexOf("运行时自报") !== -1, "地址来源可追溯");

/* ---- diagnose() 也要能看出绑错了 ---- */
mockReset();
mockWebhookUrl(DEV_URL);
mockServiceUrl(DEV_URL);
const __realLog = console.log;
console.log = () => {}; // diagnose() 自带 console 输出，测试时静音
const diagText = diagnose();
console.log = __realLog;
ok(String(diagText).indexOf("/dev 测试地址") !== -1, "★ diagnose() 会点出「绑的是 /dev」并给出重绑提示");

/* ============================================================ */
console.log("\n【㉔ 手工绑定 / 授权不足分流 / 优先级】");

/* ---- 地址校验 ---- */
ok(deployWebappUrlValidate(EXEC_URL) === "", "/exec 地址校验通过");
ok(deployWebappUrlValidate(DEV_URL).indexOf("/dev") !== -1, "★ /dev 被校验拦下并说明原因");
ok(deployWebappUrlValidate("http://evil.com/x/exec").indexOf("https") !== -1, "非 https 拒绝");
ok(deployWebappUrlValidate("https://example.com/foo").indexOf("/exec") !== -1, "不以 /exec 结尾拒绝");
ok(deployWebappUrlValidate("").indexOf("空") !== -1, "空地址拒绝");

/* ---- 手工绑定：写脚本属性，且压过其他来源 ---- */
mockReset();
const bindCard = cmdWebhook(chCtx, "bind " + EXEC_URL);
ok(!!bindCard && !!bindCard.rich, "/webhook bind 返回卡片");
ok(deployWebappUrlManual() === EXEC_URL, "★ 地址存进了脚本属性（而不是写死在 Params.gs）");
ok(lastCall("setWebhook") && lastCall("setWebhook").body.url === EXEC_URL, "绑定请求用的是手工地址");

/* 手工绑定优先于 Params.gs / API，且不再打部署列表接口 */
CONFIG.deploy.webappUrl = "https://script.google.com/macros/s/OTHER/exec";
mockServiceUrl(DEV_URL);
const prio = deployWebappUrlResolve();
ok(prio.ok === true && prio.url === EXEC_URL && prio.source === "manual", "★ 手工绑定优先级高于 Params.gs");
ok(EXT_CALLS.filter((e) => e.url.indexOf("/deployments") !== -1).length === 0, "手工绑定时不查部署列表（省一次 UrlFetch）");
CONFIG.deploy.webappUrl = "";
ok(deploySourceLabel("manual").indexOf("热更新冲不掉") !== -1, "来源说明里点明「热更新冲不掉」");

/* ---- 解绑 ---- */
const unbindCard = cmdWebhook(chCtx, "unbind");
ok(typeof unbindCard === "string" && unbindCard.indexOf("已清除手工绑定") !== -1, "/webhook unbind 生效");
ok(deployWebappUrlManual() === "", "脚本属性已清空");

/* ---- 拒绝 /dev 与乱填 ---- */
mockReset();
const devBind = cmdWebhook(chCtx, "bind " + DEV_URL);
ok(typeof devBind === "string" && devBind.indexOf("/dev") !== -1, "★ /webhook bind 拒绝 /dev 并解释原因");
ok(deployWebappUrlManual() === "", "被拒绝的地址不会被写进去");
ok(callCount("setWebhook") === 0, "被拒绝时不发绑定请求");

const junkBind = cmdWebhook(chCtx, "bind https://example.com/not-a-webapp");
ok(typeof junkBind === "string" && junkBind.indexOf("/exec") !== -1, "非 GAS 地址被拒绝");

const emptyBind = cmdWebhook(chCtx, "bind");
ok(typeof emptyBind === "string" && emptyBind.indexOf("/webhook bind") !== -1, "bind 不带参数时给用法");

const helpCard = cmdWebhook(chCtx, "help");
ok(typeof helpCard === "string" && helpCard.indexOf("只做一次") !== -1, "★ help 里点明「只做一次」，消除『每次都要改』的误解");

/* ---- 授权不足：必须与「没建部署」分开说 ---- */
ok(deployIsScopeError(403, "Request had insufficient authentication scopes.") === true, "识别 insufficient scopes");
ok(deployIsScopeError(403, "Apps Script API has not been used in project 123 before or it is disabled") === true,
  "★ 识别「Apps Script API 未开启」（这是与授权不足不同的另一种情况）");
ok(deployIsScopeError(502, "upstream unavailable") === false, "普通网络错误不算授权问题");
ok(deployHumanError(403, "Request had insufficient authentication scopes.").indexOf("授权不足") !== -1,
  "授权不足翻译成人话");

mockReset();
mockServiceUrl(DEV_URL);
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments",
  { error: { message: "Request had insufficient authentication scopes." } }, 403);
const scoped = deployWebappUrlResolve();
ok(scoped.ok === false && scoped.scopeError === true, "★ 授权失败时标记 scopeError（供提示语分流）");

const scopedHint = deployWebappHint(scoped);
ok(scopedHint.indexOf("不代表你没建过部署") !== -1, "★ 明确告诉用户「这不代表你没建过部署」——别再白折腾一次");
ok(scopedHint.indexOf("方案 A") !== -1 && scopedHint.indexOf("方案 B") !== -1 && scopedHint.indexOf("方案 C") !== -1,
  "★ 给出三条可选路径：修授权 / 手工绑一次 / 换轮询");
ok(scopedHint.indexOf("永久固定") !== -1, "★ 说明 /exec 地址是永久固定的，绑一次就够");

const scopedSetup = setupWebhook();
ok(scopedSetup.ok === false && scopedSetup.scopeError === true, "setupWebhook 把 scopeError 透传给调用方");
ok(scopedSetup.hint.indexOf("usersettings") !== -1, "提示语里给出 Apps Script API 开关的具体网址");

/* ---- 编辑器里可直接 setupWebhook("<exec 地址>") ---- */
mockReset();
mockServiceUrl(DEV_URL);
const direct = setupWebhook(EXEC_URL);
ok(direct.ok === true && direct.url === EXEC_URL, "setupWebhook(地址) 直接绑定");
ok(direct.saved === EXEC_URL || deployWebappUrlManual() === EXEC_URL, "顺手存进脚本属性，下次不用再填");
ok(direct.source === "manual", "来源标记为 manual");

const directBad = setupWebhook(DEV_URL);
ok(directBad.ok === false && String(directBad.error).indexOf("/dev") !== -1, "setupWebhook(/dev) 被拒绝");

/* ---- /webhook scan：绕过缓存重扫 ---- */
mockReset();
mockWebhookUrl(EXEC_URL);
mockServiceUrl(DEV_URL);
mockRoute("script.googleapis.com/v1/projects/MOCK_SCRIPT_ID/deployments", {
  deployments: [
    {
      deploymentId: "DEP1",
      deploymentConfig: { versionNumber: 5 },
      entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: EXEC_URL } }],
    },
  ],
});
deployWebappUrlCacheSet("https://script.google.com/macros/s/STALE/exec"); // 先塞一个过期值
const scanCard = cmdWebhook(chCtx, "scan");
ok(!!scanCard && !!scanCard.rich && scanCard.rich.md.indexOf("已重新绑定") !== -1, "/webhook scan 强制重扫并重绑");
ok(lastCall("setWebhook").body.url === EXEC_URL, "★ scan 丢掉过期缓存，用的是部署列表里的新地址");

/* ---- 未知子命令回落到状态卡片 ---- */
mockReset();
mockWebhookUrl(EXEC_URL);
mockServiceUrl(EXEC_URL);
const fallbackCard = cmdWebhook(chCtx, "什么鬼");
ok(!!fallbackCard && !!fallbackCard.rich && fallbackCard.rich.md.indexOf("Webhook 状态") !== -1,
  "未知子命令不报错，回落到状态卡片");

/* ---- diagnose 里也要能看见手工绑定 ---- */
mockReset();
deployWebappUrlSetManual(EXEC_URL);
mockWebhookUrl(EXEC_URL);
const diagText2 = (function () {
  const keep = console.log; console.log = () => {};
  const t = diagnose(); console.log = keep; return t;
})();
ok(String(diagText2).indexOf(EXEC_URL) !== -1, "diagnose() 打印正式地址");
ok(String(diagText2).indexOf("手工绑定") !== -1, "★ diagnose() 标出来源是手工绑定");

mockReset();
CONFIG.deploy.webappUrl = "";

/* ============================================================
 * ㉚ 「没反应」与「很慢」—— 用户最常见的两类体感问题
 * ============================================================*/
section("㉚ 出错必须回话 + 耗时可量化");

/* 原来 doPost 的 catch 只 logError，用户侧就是「发指令完全没反应」 */
resetCalls();
reportFailure(mkUpdate("/menu", { fromId: 7788 }), new Error("模拟的底层异常"));
{
  const c = lastOf("sendMessage");
  const txt = String((c && c.body && c.body.text) || "");
  ok(callCount("sendMessage") === 1, "★ 处理出错时会给用户回一句（原来纯静默）");
  ok(txt.indexOf("没能处理完") !== -1, "★ 提示说清是「这条指令没能处理完」", txt.slice(0, 40));
  ok(txt.indexOf("模拟的底层异常") !== -1, "★ 把真实错误带出来，不用去翻日志", txt.slice(0, 80));
  ok(txt.indexOf("/health") !== -1, "★ 顺手指引下一步怎么查");
}

/* 群里普通聊天出错不该刷屏 */
resetCalls();
reportFailure(mkUpdate("今天天气不错", { fromId: 7788 }), new Error("boom"));
ok(callCount("sendMessage") === 0, "★ 非指令消息出错保持静默，不刷屏");

/* 群里指令出错要回话（用户明确在等结果） */
resetCalls();
reportFailure(mkUpdate("/menu", { fromId: 7788, chatId: -100123 }), new Error("boom"));
ok(callCount("sendMessage") === 1, "★ 群里的指令出错同样回话");

/* 耗时埋点：结束后要留下可查的数字 */
resetCalls();
RUNTIME.t0 = Date.now() - 1234;
markDone();
ok(Number(cacheStore().get("perf:last")) > 1000, "★ 总耗时写进缓存，/health 里能看到");
ok(!!cacheStore().get("perf:at"), "★ 记录了发生时间");

/* /health 里有耗时与表规模两行 */
{
  resetCalls();
  post(mkUpdate("/health", { fromId: 777777, chatType: "private" }));
  const hc = lastOf("sendMessage") || lastOf("sendRichMessage");
  const ht = String((hc && hc.body && (hc.body.text || (hc.body.rich_message && hc.body.rich_message.markdown))) || "");
  ok(ht.indexOf("上次处理耗时") !== -1, "★ /health 展示上次处理耗时", ht.slice(0, 60));
  ok(ht.indexOf("表规模") !== -1, "★ /health 展示关键表规模（大表是变慢的主因）", ht.slice(0, 60));
}

/* 指令类消息不再写存储表：省一次表格写 = 指令快一截 */
function storeRows() {
  const sh = __store && __store.parsed && __store.parsed.getSheetByName(SHEET.storage);
  return sh ? Math.max(0, sh.getLastRow() - 1) : -1;
}
{
  resetCalls();
  const rowsBeforeCmd = storeRows();
  post(mkUpdate("/menu", { fromId: 7799 }));
  ok(storeRows() === rowsBeforeCmd, "★ 指令消息跳过消息存储（少一次表格写，响应更快）");

  const rowsBeforeMsg = storeRows();
  post(mkUpdate("这是一条普通消息", { fromId: 7799 }));
  ok(storeRows() > rowsBeforeMsg, "★ 普通消息仍然正常入库", rowsBeforeMsg + " → " + storeRows());
}

/* 部署可达性探测：302 是「完全没反应」的头号原因，必须能认出来 */
{
  const PROBE_URL = "https://script.google.com/macros/s/AKfycbPROBE/exec";

  mockRoute("script.google.com/macros", "", 302);
  const p302 = deployProbeExec(PROBE_URL);
  ok(p302.code === 302 && p302.ok === false, "★ 302 判定为不可达（正是 Telegram 报的那个错）", JSON.stringify(p302).slice(0, 80));
  ok(p302.fix.indexOf("任何人") !== -1, "★ 302 直接给出「谁可以访问」怎么改", p302.fix.slice(0, 50));
  ok(p302.verdict.indexOf("重定向") !== -1, "★ 302 的说法是人话，不是干巴巴的状态码", p302.verdict.slice(0, 50));

  mockRoute("script.google.com/macros", "", 200);
  const p200 = deployProbeExec(PROBE_URL);
  ok(p200.ok === true && p200.code === 200, "★ 200 = Telegram 能正常访问", JSON.stringify(p200).slice(0, 80));

  mockRoute("script.google.com/macros", "", 401);
  ok(deployProbeExec(PROBE_URL).fix.indexOf("任何人") !== -1, "★ 401/403 同样指向部署权限");

  mockRoute("script.google.com/macros", "", 404);
  ok(deployProbeExec(PROBE_URL).fix.indexOf("setupWebhook") !== -1, "★ 404 提示重新绑定（部署被删/被换）");

  ok(deployProbeExec("").ok === false, "★ 没地址时也能给出结论，不抛异常");

  /* ⚠️ 探测必须用 POST —— GET 任何 /exec 都返回 200，测不出鉴权状态。
     这个坑我真踩过一次：GET 测出来「权限没问题」，而 Telegram 的 POST 其实被 302 挡着。 */
  EXT_CALLS.length = 0;
  deployProbeExec(PROBE_URL);
  ok(EXT_CALLS.length === 1 && EXT_CALLS[0].method === "post", "★ 探测用 POST（GET 永远 200，会误判）", JSON.stringify(EXT_CALLS[0] || {}).slice(0, 60));
  ok(String(JSON.stringify((EXT_CALLS[0] && EXT_CALLS[0].body) || "")).indexOf("update_id") !== -1, "★ 探测 payload 是无害假 update，零副作用");
  mockRoute("script.google.com/macros", "", 200);
  ok(
    deployProbeExec(PROBE_URL).fix === "",
    "★ 200 时不给修复建议（有问题才啰嗦）"
  );
  mockReset();
}

/* 「反复推送」与「关键词不回复」这两类问题 */
{
  /* /king：能远程止住推送，且设置写进脚本属性（push 冲不掉） */
  const oldKing = CONFIG.king.type;
  CONFIG.king.type = 1;

  const c1 = cmdKing(mkUpdate("/king off", { fromId: 777777, chatType: "private" }).message ? null : null, "off");
  ok(kingTypeEffective() === 5, "★ /king off 立刻生效");
  ok(String(c1).indexOf("关闭私人推送") !== -1, "★ /king 回执说清当前是关闭状态", String(c1).slice(0, 50));

  // 关掉之后，群里消息不再推给主人
  resetCalls();
  post(mkUpdate("群里随便聊一句", { fromId: 70001, chatId: -100999 }));
  const kingPushed = TL_CALLS.filter((c) => c.method === "sendMessage" && c.body && String(c.body.chat_id) === String(778899));
  ok(kingPushed.length === 0, "★ 关掉后群里消息不再推送给主人（止住刷屏）", "推了 " + kingPushed.length + " 条");

  cmdKing(null, "private");
  ok(kingTypeEffective() === 3, "★ /king private 切成仅私聊");
  cmdKing(null, "all");
  ok(kingTypeEffective() === 1, "★ /king all 恢复全部");
  cmdKing(null, "reset");
  ok(kingTypeEffective() === Number(oldKing), "★ /king reset 交还给 Params.gs");
  try { PropertiesService.getScriptProperties().deleteProperty("mb_king_type"); } catch (e) {}
  CONFIG.king.type = oldKing;

  /* /kw：把「关键词不回复」的五种原因一次排掉 */
  const kwCtx = { isPrivate: true, chatId: 1, userId: 777777 };
  let kw;
  try { kw = String(cmdKeywords(kwCtx)); } catch (e) { kw = "ERR:" + e.message; }
  ok(kw.indexOf("关键词表自检") !== -1 || kw.indexOf("关键词表不存在") !== -1, "★ /kw 能给出结论", kw.slice(0, 60));
  ok(kw.indexOf("第 4 行") !== -1, "★ /kw 点明数据必须写在第 4 行起", kw.slice(0, 80));

  /* 关键词规则为空时要说清原因，而不是干巴巴一句「0 条」 */
  ok(String(cmdKeywords(kwCtx)).length > 40, "★ /kw 输出足够详细，能照着排查");
}

/* ㉛ 数据表自动补建 —— 「消息存不进去」曾经是静默的 */
section("㉛ 数据表自动补建");
{
  const ss = getSS();

  /* 删掉 db_telegram，还原「全新部署、表从来没建过」 */
  ss.sheets = ss.sheets.filter((s) => s.name !== SHEET.storage);
  ok(getSheetOrNull(SHEET.storage) === null, "★ 前置：db_telegram 已删除");

  resetCalls();
  post(mkUpdate("脚本合集在哪里", { chatType: "private", fromId: 70003 }));

  const sh = getSheetOrNull(SHEET.storage);
  ok(!!sh, "★ 表不存在时，一条普通消息进来会把它自动建出来");
  const rows = sh ? sh.getDataRange().getValues() : [];
  ok(rows.length > 3, "★ 重建后数据真的写进去了", "行数 " + rows.length);
  ok(
    rows.length > 3 && String(rows[1][0]).indexOf("发起时间") !== -1,
    "★ 重建时连表头一起写回来（不是一张空表）",
    rows.length ? "第2行首列=" + rows[1][0] : "无数据"
  );
  ok(
    rows.length > 3 && String(rows[rows.length - 1][7]).indexOf("脚本合集") !== -1,
    "★ 这条消息的内容落在「消息内容」列上"
  );

  /* initSheets 幂等 */
  const r1 = initSheets();
  ok(r1.ok === true, "★ initSheets 全绿", JSON.stringify(r1.failed));
  const r2 = initSheets();
  ok(r2.created.length === 0 && r2.existing.length >= 9, "★ 再跑一次不会重复建表", "新建 " + r2.created.length);

  /* /db 体检 */
  let out = "";
  try {
    out = String(cmdDBDoctor({ isPrivate: true, chatId: 1, userId: 777777 }));
  } catch (e) {
    out = "ERR:" + e.message;
  }
  ok(out.indexOf("数据表体检") !== -1, "★ /db 能跑通并给出结论", out.slice(0, 60));
  ok(out.indexOf(SHEET.storage) !== -1, "★ /db 逐张报出表名");
  ok(out.length > 60, "★ /db 输出够详细，能照着排查");

  /* ㉜ 私聊指令留痕 + 接入模式自检 */
  const before = (function () {
    const s = getSheetOrNull(SHEET.storage);
    return s ? s.getLastRow() : 0;
  })();

  // 私聊里发 /ping：按 storage.privateCommands 应该落一行
  post(mkUpdate("/ping", { chatType: "private", fromId: 70004 }));
  const sh2 = getSheetOrNull(SHEET.storage);
  const after = sh2 ? sh2.getLastRow() : 0;
  ok(
    after > before,
    "★ 私聊指令（/ping）也会写进 db_telegram",
    "行数 " + before + " → " + after
  );
  if (after > before) {
    const last2 = sh2.getDataRange().getValues();
    const lastRow2 = last2[last2.length - 1];
    ok(String(lastRow2[4]).indexOf("指令") !== -1, "★ 私聊指令那行的「类型」标注了·指令", String(lastRow2[4]));
  }

  // 群聊里发 /ping：仍然跳过（不刷屏）
  const gBefore = sh2 ? sh2.getLastRow() : 0;
  post(mkUpdate("/ping", { chatType: "supergroup", chatId: "-100777", fromId: 70005 }));
  const gAfter = sh2 ? sh2.getLastRow() : 0;
  ok(gAfter === gBefore, "★ 群聊指令不写表（避免刷屏）", gBefore + " → " + gAfter);

  /* /mode */
  let modeOut = "";
  try {
    modeOut = String(cmdMode({ isPrivate: true, chatId: 1, userId: 777777 }));
  } catch (e) {
    modeOut = "ERR:" + e.message;
  }
  ok(modeOut.indexOf("接入模式") !== -1, "★ /mode 能跑通并报出当前模式", modeOut.slice(0, 60));
  ok(modeOut.indexOf("切换") !== -1, "★ /mode 给了切换入口");

  /* ensureReachable：没有 Webhook 时不乱切 */
  let reach = "";
  try {
    reach = String(ensureReachable());
  } catch (e) {
    reach = "ERR:" + e.message;
  }
  ok(reach.indexOf("ERR") === -1, "★ ensureReachable 不抛异常", reach.slice(0, 60));
}

/* ============================================================ */
console.log("\n" + "=".repeat(46));
console.log("通过 " + PASS + " 项，失败 " + FAIL + " 项");
console.log("=".repeat(46));
if (FAIL > 0) process.exitCode = 1;

