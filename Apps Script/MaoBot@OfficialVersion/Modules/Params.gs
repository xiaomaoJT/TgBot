/**
 * 参数类
 * 
 * 需手动补全的参数 EXECID 、 BOTID 、KingId 、botIdAlone
 * 
 * 用于预定义XiaoMaoBot所需参数
 */

/**
 * ·⚠️必填
 * ·⚠️必填
 * ·⚠️必填
 * +++++++++ 预定义参数·请补充对应内容 +++++++++
 */

// Google EXEC ID - 谷歌表格ID
var EXECID = "";
// Telegram BOT ID key - tg机器人Token
var BOTID = "";

// Google EXEC ID - 谷歌表格 - 数据存储工作表名
var EXECNAME = "db_telegram";
// Google EXEC ID - 谷歌表格 - 关键字回复工作表名
var KEYPARAMS = "key_params";
// Google EXEC ID - 谷歌表格 - 权限表工作表名
var AUTHORITYMANAGEMENT = "authority_management";
// Google EXEC ID - 谷歌表格 - 敏感词库工作表名
var SENSITIVEWORDS = "sensitive_words"


/**
 * ·建议补全
 * ·建议补全
 * ·建议补全
 * +++++++++ 自定义参数·请按需修改参数·引号内留空此功能失效 +++++++++
 * +++++++++ 为保证完整体验或奇怪的BUG，建议补全KingId/botIdAlone +++++++++
 */

// 用于推送主人消息 取主人tg id - 私人消息主动功能必须填写此项
var KingId = "";
//取 bot id 用于识别引用消息
var botIdAlone = "";

// 1 全部类型 | 2 群聊 + 私聊类型 | 3 私聊类型 | 4 群聊类型 | 5 关闭
var KingType = 1;
// 1 推送详情（原图片、视频、音频、贴纸等）| 0 仅推送基础消息
var KingInfo = 1;
// 权限释放 - 用于开放操作权限给管理员 | 不释放为false
var PermissionRelease = true;
// 缓存过期时间（秒）- 180分钟
var cacheExpirationInSeconds = 180 * 60;
// 是否强制缓存刷新 -- 启用后将无视缓存实时获取数据
var cacheExpirationStatus = true;

/**
 * +++++++++ 系统默认通用参数·无需改动 +++++++++
 */

// 管理员ID列表
var PermissionReleaseList = [];
// 用于过滤需要排除捕捉的群组信息
var forGotList = [];
// 用于判断消息类型 - inlinekey board回调 or 主动消息
// 1 callback | 2 new member | 3 left member
var MESSAGETYPE = 0;
// 用于承接返回数据
var dealMessage = {};
//关键字及回复列表
var autoReply = [];
// 自动回复关键字判断
var returnHtmlReply = {
  htmlReply: "",
  htmlReply2: null,
  state: false,
  dfa: {},
};
//关键字排除
var outsideWord = ["微信公众号『小帽集团』", "资源仓库", "@Xiao_MaoMao_bot"];
// api key
var commandWord = [
  { api: "/tq", apiId: 0 },
  { api: "/suo", apiId: 1 },
  { api: "/music", apiId: 2 },
  { api: "/phone", apiId: 3 },
  { api: "/tg", apiId: 4 },
  { api: "/djt", apiId: 5 },
  { api: "/video", apiId: 6 },
  { api: "/yy", apiId: 7 },
  { api: "/hi", apiId: 8 },
  { api: "/chat", apiId: 9 },
  { api: "/myid", apiId: 10 },
  { api: "/start", apiId: 11 },
  { api: "/help", apiId: 11 },
  { api: "/lan", apiId: 12 },
  { api: "/sao", apiId: 13 },
  { api: "/reply", apiId: 14 },
  { api: "/ban", apiId: 15 },
  { api: "/unban", apiId: 16 },
  { api: "/restrict", apiId: 17 },
  { api: "/hot", apiId: 18 },
  { api: "/db", apiId: 19 },
  { api: "/xz", apiId: 20 },
  { api: "/hl", apiId: 21 },
  { api: "/banword", apiId: 22 },
  { api: "/sensitiveword", apiId: 23 },
  { api: "/releaseid", apiId: 24 },
];

// 通用类键盘 --------------------------------
// 定义底部自定义键盘
var followKeyboard = [
  [{ text: "懒人配置" }, { text: "免费节点" }, { text: "订阅转换" }],
  [{ text: "图文教程" }, { text: "脚本合集" }, { text: "广告拦截" }],
  [{ text: "接口查询" }, { text: "资源仓库" }, { text: "电报解禁" }],
];
// 定义在线内联键盘
var followMessageKeyboard = [
  [
    { text: "QX仓库", url: "https://github.com/xiaomaoJT/QxScript" },
    { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
  ],
  [
    { text: "✚ 频道", url: "https://t.me/xiaomaoJT" },
    { text: "✚ 群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
    { text: "✚ 脚本", url: "https://t.me/XiaoMaoScript" },
  ],
  [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
];
// 定义底部键盘
var keyboardParams = {
  keyboard: followKeyboard,
  resize_keyboard: true, //自动调整比例
  one_time_keyboard: true, // 是否一次性
  is_persistent: true, // 是否一直存在
  selective: true, // 是否对特定用户展示
};
// 定义在线回复消息键盘选项
var keyboardFollowParams = {
  inline_keyboard: followMessageKeyboard,
};

// 特别类
var resourceWarehouseKeyboardFollowParams = {
  inline_keyboard: [
    [
      { text: "QX仓库", url: "https://github.com/xiaomaoJT/QxScript" },
      { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
    ],
    [
      { text: "Surge仓库", url: "https://github.com/xiaomaoJT/Surge" },
      { text: "Loon仓库", url: "https://github.com/xiaomaoJT/Loon" },
      { text: "Stash仓库", url: "https://github.com/xiaomaoJT/stash" },
      { text: "Clash仓库", url: "https://github.com/xiaomaoJT/clash" },
    ],
    [
      { text: "✚ 频道", url: "https://t.me/xiaomaoJT" },
      { text: "✚ 群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
      { text: "✚ 脚本", url: "https://t.me/XiaoMaoScript" },
    ],
    [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
  ],
};

// 群管类参数 --------------------------------
let followMessageManageKeyboard = [
  [
    { text: "✚ 频道", url: "https://t.me/xiaomaoJT" },
    { text: "✚ 群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
    { text: "✚ 脚本", url: "https://t.me/XiaoMaoScript" },
  ],
  [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
];

let keyboardFollowManageParams = {
  inline_keyboard: followMessageManageKeyboard,
};
