/**
 * author ： @XiaoMao
 * Google App Script
 * 用于执行tg机器人自动回复等功能
 *
 */

// Google EXEC ID - 谷歌表格ID
var EXECID = "";
// Google EXEC ID - 谷歌表格 工作表名
var EXECNAME = "";
// Telegram BOT ID - tg机器人Token
var BOTID = "";
// 用于判断消息类型 - inlinekey board回调 or 主动消息
var MESSAGETYPE = 0;

/**
 * 用于接收用户传来的讯息JSON
 * @param {*} e
 */
function doPost(e) {
  let userMessage = JSON.parse(e.postData.contents);
  if (JSON.parse(e.postData.contents).callback_query) {
    MESSAGETYPE = 1;
    userMessage = JSON.parse(e.postData.contents).callback_query;
  }
  let payload = processData(userMessage);
  let data = {
    method: "post",
    payload: payload,
  };
  //   Google 请求域建立连接
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
}

/**
 * 用于处理用户信息并进行回复
 * @param {*} userMessage
 * @returns
 */
function processData(userMessage) {
  // 定义返回参数
  let payload;
  // 定义底部自定义键盘
  let followKeyboard = [
    [{ text: "小帽集团" }, { text: "Mao`s Bot" }],
    [{ text: "beta1.0 @Xiao_MaoMao_bot" }],
  ];
  // 定义在线内联键盘
  let followMessageKeyboard = [
    [
      { text: "QX仓库", url: "https://github.com/xiaomaoJT/QX_Script" },
      { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
    ],
    [
      { text: "XiaoMao频道", url: "https://t.me/xiaomaoJT" },
      { text: "XiaoMao群聊", url: "https://t.me/+hSuMjrQppKE5MWU9" },
    ],
    [{ text: "微信公众号：小帽集团", callback_data: "WXGROUP" }],
  ];

  // 定义底部键盘
  let keyboardParams = {
    keyboard: followKeyboard,
    resize_keyboard: true,
    one_time_keyboard: true,
    selective: false,
  };

  // 定义在线回复消息键盘选项
  let keyboardFollowParams = {
    inline_keyboard: followMessageKeyboard,
  };

  //判断消息类型 - 文本消息
  // 暂时只识别文本类消息
  if (userMessage.message) {
    // 判断消息类型 - 进行私聊或群聊回复
    let messageUserID =
      userMessage.message.chat.type == "private"
        ? userMessage.message.from.id.toString()
        : userMessage.message.chat.id.toString();
    let messageReplyID = userMessage.message.message_id.toString();

    let HTML_REPLY = "<b>来自XiaoMaoBot的消息：</b>" + userMessage.message.text;

    let payloadPostData = {
      method: "sendMessage",
      chat_id: messageUserID,
      text: HTML_REPLY,
      reply_to_message_id: messageReplyID,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardParams),
    };

    if (
      userMessage.message.text == "小帽集团" ||
      userMessage.message.text.indexOf("Mao") != -1
    ) {
      payloadPostData.reply_markup = JSON.stringify(keyboardFollowParams);
    }

    payload = payloadPostData;
    setStorage(userMessage, "POSTDATA");
  }

  //判断消息类型 - 消息跟踪键盘 callback返回
  if (MESSAGETYPE) {
    let callbackChatID = userMessage.message.chat.id.toFixed();
    let payloadCallback;

    if (userMessage.data == "WXGROUP") {
      payloadCallback = {
        method: "sendMessage",
        chat_id: callbackChatID,
        text:
          "微信公众号：" +
          "<a href='https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzI3MjE3NTc4OA==#wechat_redirect'>小帽集团</a>",
        parse_mode: "HTML",
        reply_markup: JSON.stringify(keyboardFollowParams),
      };
    }
    payload = payloadCallback;
    setStorage(userMessage, "CALLBACK");
  }

  return payload;
}

/**
 * 将讯息进行Google表格内存储
 * @param {*} MESSAGE
 */
function setStorage(MESSAGE, TYPE) {
  let time = getNowDate();
  let userID = MESSAGE.message.from.id.toString();
  let userName = MESSAGE.message.chat.username;
  let userAllName =
    MESSAGE.message.chat.first_name + MESSAGE.message.chat.last_name;
  let messageType = TYPE == 'POSTDATA' ? "POSTDATA" : "CALLBACK";
  let messageContent = MESSAGE.message.text;

  let spreadSheet = SpreadsheetApp.openById(EXECID);
  let Sheet = spreadSheet.getSheetByName(EXECNAME);
  let lastSheetRow = spreadSheet.getLastRow();

  Sheet.getRange(lastSheetRow + 1, 1).setValue(time);
  Sheet.getRange(lastSheetRow + 1, 2).setValue(userID);
  Sheet.getRange(lastSheetRow + 1, 3).setValue(userName);
  Sheet.getRange(lastSheetRow + 1, 4).setValue(userAllName);
  Sheet.getRange(lastSheetRow + 1, 5).setValue(messageType);
  Sheet.getRange(lastSheetRow + 1, 6).setValue(messageContent);
  Sheet.getRange(lastSheetRow + 1, 7).setValue(MESSAGE);
}

/**
 * 格式化日期对象
 * @returns
 */
function getNowDate() {
  let date = new Date();
  let sign2 = ":";
  let year = date.getFullYear(); // 年
  let month = date.getMonth() + 1; // 月
  let day = date.getDate(); // 日
  let hour = date.getHours(); // 时
  let minutes = date.getMinutes(); // 分
  let seconds = date.getSeconds(); //秒
  let weekArr = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  let week = weekArr[date.getDay()];
  // 给一位数的数据前面加 “0”
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (day >= 0 && day <= 9) {
    day = "0" + day;
  }
  if (hour >= 0 && hour <= 9) {
    hour = "0" + hour;
  }
  if (minutes >= 0 && minutes <= 9) {
    minutes = "0" + minutes;
  }
  if (seconds >= 0 && seconds <= 9) {
    seconds = "0" + seconds;
  }
  return (
    year +
    "-" +
    month +
    "-" +
    day +
    " " +
    hour +
    sign2 +
    minutes +
    sign2 +
    seconds +
    "(" +
    week +
    ")"
  );
}
