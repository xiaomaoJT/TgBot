// 用于测试api接口
// 此代码仅用于测试

// 机器人id
var BOTID = "";
// tg chatid
var KingId = "";

function getBotTest(word) {
  let responseHelloBot = null;
  let returnText = "";

  try {
    responseHelloBot = UrlFetchApp.fetch("url");
    let jsonData = JSON.parse(responseHelloBot.getContentText());
    returnText = "<b>以下数据由XiaoMao加工：</b>" + "\n" + "\n" + "";
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }
  return returnText;
}

console.log(getBotTest("xxx"));

let payload = {
  method: "sendMessage",
  chat_id: KingId,
  text: getBotTest("xxx"),
  parse_mode: "HTML",
  disable_web_page_preview: true,
};

console.log(payload);

let data = {
  method: "post",
  payload: payload,
};
UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
