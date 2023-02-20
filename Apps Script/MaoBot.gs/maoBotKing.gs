var BOTID = "";
var KingId = "";
/**
 * 用于捕捉机器人信息
 * @param key 用户消息
 */
function pushDataToKing(key) {
  let userMessage = key;
  //用于捕捉机器人信息
  let messageToKing =
    "<b>🧩 XiaoMaoBot捕捉到用户消息</b>" +
    "\n" +
    "\n" +
    "<b>📝 信息内容：</b>" +
    userMessage.message.text +
    "\n" +
    "\n" +
    "<b>🎎 信息发送人：</b>" +
    (userMessage.message.from.first_name != undefined
      ? userMessage.message.from.first_name
      : "") +
    (userMessage.message.from.last_name != undefined
      ? userMessage.message.from.last_name
      : "") +
    "\n" +
    "\n" +
    "<b>🛎 消息发送时间：</b>" +
    getNowDate() +
    "\n" +
    "\n" +
    "<b>📰 消息原始Json：</b>" +
    "\n" +
    JSON.stringify(userMessage);
  let dataKing = {
    method: "post",
    payload: {},
  };
  dataKing.payload = {
    method: "sendMessage",
    chat_id: KingId,
    text: messageToKing,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", dataKing);
}

function getNowDate() {
  let date = new Date();
  let sign2 = ":";
  let year = date.getFullYear(); // 年
  let month = date.getMonth() + 1; // 月
  let day = date.getDate(); // 日
  let hour = date.getHours(); // 时
  let minutes = date.getMinutes(); // 分
  let seconds = date.getSeconds(); //秒
  let weekArr = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
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
    "/" +
    month +
    "/" +
    day +
    " " +
    hour +
    sign2 +
    minutes +
    sign2 +
    seconds
  );
}
