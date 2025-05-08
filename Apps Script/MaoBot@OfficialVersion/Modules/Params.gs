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

// 群ID - 暂只支持单个群管理
var PermissionGroupId = "";
// 管理员ID列表
var PermissionReleaseList = [];
// 用于过滤需要排除捕捉的群组信息
var forGotList = [];
// 用于判断消息类型 - inlinekey board回调 or 主动消息
// 1 callback | 2 new member | 3 left member
var MESSAGETYPE = 0;
// 用于承接返回数据
var dealMessage = {};
// 强ban关键字截止位
var banKeyLastIndex = 21;
// 敏感词库 -- 内容已作加密处理base64
var sensitiveEncodeList = [
  "5Luj5byA5Lya5ZGY",
  "5Luj5Yi3",
  "576k5Y+R6L2v5Lu2",
  "5bm/5ZGK5Luj5Y+R",
  "55yL5oiR566A5LuL",
  "5ouN6L2m6L6G6L+d5YGc",
  "5ouN54Wn54mH5pel5YWl",
  "54K55Ye75a+55o6l",
  "5oOz5YGa55qE5p2l",
  "5LiA5pel5YWr5L2w",
  "5oub5Lq65aSE55CG5pWw5o2u",
  "5pel5YWl6L+H5LiH",
  "6Z2g6LCx6aG555uu",
  "5aSE55CG5aSn6YeP5pWw5o2u",
  "6ZW/5pyf5oub5Lq6",
  "6aKE5LuY",
  "6ZyA6KaB5bel5L2c",
  "5pW055CG5pWw5o2u",
  "5aSE55CG6LWE5paZ",
  "5oOz5YGa55qE6IGU57O7",
  "5pyJ5rKh5pyJ5Lq65bmy5rS7",
  "5Yuk5b+r55qE5p2l",
  "5qOL54mM",
  "5b2p56Wo",
  "55yf5Lq6",
  "5pON5aWz",
  "5pON5aW5",
  "5pON5LuW",
  "5Yqg5b6u",
  "5YqgVg==",
  "5Yqgdg==",
  "5Lq65YW9",
  "5Lmx5Lym",
  "5Lmz5rKf",
  "5YW95Lqk",
  "5Y2W5q+U",
  "5Y2W6YC8",
  "5Y+X5a2V",
  "5bCE57K+",
  "5aW45rer",
  "5aaI6YC8",
  "5aaT5aWz",
  "5aiH5ZaY",
  "5amK5a2Q",
  "5aqa5aaZ",
  "5byA6Iue",
  "5oCn5Lqk",
  "5oCn5aW0",
  "5oCn5qyy",
  "5oCn54ix",
  "5oCn6JmQ5b6F",
  "5oOF6Imy",
  "5aupYg==",
  "5aupQg==",
  "5rer5Lmx",
  "5rer5aaH",
  "6I2h5aaH",
  "6IKb5Lqk",
  "57K+5ray",
  "54OC5q+U",
  "54OC6YC8",
  "6IKJ5qOS",
  "6IKJ57yd",
  "6IKP",
  "5aSn6bih5be0",
  "5aSn6Zue5be0",
  "57qm54Ku",
  "5pON5q+U",
  "5pON6YC8",
  "6Zi06IyO",
  "6Zi06JKC",
  "6Zi06YGT",
  "5Lic5Lqs54Ot",
  "5p2x5Lqs54ax",
  "5q+b5rO95Lic",
  "55aG542o",
  "5Lmg6L+R5bmz",
  "6YKT5bCP5bmz",
  "5rGf5rO95rCR",
  "6IOh6ZSm5rab",
  "5Lmg6L+b5bmz",
  "5b2t5Li95aqb",
  "6YSn5bCP5bmz",
  "5YWa5ZCO6JCO",
  "5aSp5a6J6Zeo5bGg5p2A",
  "6KKr5Lit5YWx",
  "5YWx54uX",
  "5Lic5YyX54us56uL",
  "5YWx5Lqn5YWa",
  "5YWa5Lit5aSu",
  "6JeP54us",
  "5Lmx5aW4",
  "5Lmx5Lym57G7",
  "5Lmx5Lym5bCP",
  "5LqC5YCr",
  "5o+S5bGB5bGB",
  "5aeQ5YyF5aSc",
  "6bih5be0",
  "5YW86IGM5LiK6Zeo",
  "6aqa5aaH",
  "6aqa56m0",
  "6K+x5aW4",
  "5o2i5aa7",
  "5rex5ZaJ",
  "5ZC56JCn",
  "6L2u5aW4",
  "5bCP56m0",
  "6bKN6bG8",
  "5aSr5aa75Lqk5o2i",
  "6Zmw5ZSH",
  "6Zmw6YGT",
  "5ZCD57K+",
  "5ZCe57K+",
  "5YaF5bCE",
  "54ix5ray",
  "5rC15Y67",
  "5rC15Y676L2m5LuR5bel5Yqb",
  "5rOVKuWKnw==",
  "5rOVbHVu5Yqf",
  "5pON5LuW",
  "5pON5L2g",
  "5pON5L2g5aaI",
  "5pON6JuL",
  "5pel5L2g5aaI",
  "5pel5q275L2g",
  "5Y675L2g5aaI55qE",
  "5YK76YC8",
  "6Im5",
  "6I2J5rOl6ams",
  "5L2g5aaI55qE",
  "5bmy5L2g5aiY",
  "5oiR5pON5L2g",
  "6Z2g5L2g5aaI",
  "5p2C56eN",
  "5pel6LWa",
  "5Yqe6K+B",
  "5b2p56Wo",
  "5YKs55yg5rC0",
  "5YKs5oOF57KJ",
  "5YKs5oOF6I2v",
  "5YKs5oOF6Jel",
  "5Y+R56Wo5Ye6",
  "5Y+R56Wo5Luj",
  "5Y+R56Wo6ZSA",
  "55m856Wo",
  "6L+35aW46I2v",
  "6L+35oOF5rC0",
  "6L+35oOF6I2v",
  "6L+36Jel",
  "5Luj5Yqe",
];
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
