/**
 * 回声机器人，将接收者信息进行原样返回
 *  * 部署完后替换下面链接botID及部署后的webURL
 * https://api.telegram.org/bot你的botID/setWebhook?url=你的google webURL
 *
 * 浏览器打开链接，返回下方内容皆为成功
 * {"ok":true,"result":true,"description":"Webhook is set"}
 * {"ok":true,"result":true,"description":"Webhook is already set"}
 * 返回google表格即可看到新内容存储
 *
 * 返回下面内容则botID失效，通过BotFather重新获取
 * {"ok":false,"error_code":401,"description":"Unauthorized"}
 */
function doPost(e) {
  var estringa = JSON.parse(e.postData.contents);
  var payload = start(estringa);
  var data = {
    method: "post",
    payload: payload,
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot你的BotID/", data);
}
function start(estringa) {
  var id = estringa.message.from.id.toString();
  var payload;

  if (estringa.message.text) {
    payload = {
      method: "sendMessage",
      chat_id: id,
      text: estringa.message.text,
    };
  } else if (estringa.message.sticker) {
    payload = {
      method: "sendSticker",
      chat_id: id,
      sticker: estringa.message.sticker.file_id,
    };
  } else if (estringa.message.photo) {
    array = estringa.message.photo;
    text = array[1];
    payload = {
      method: "sendPhoto",
      chat_id: id,
      photo: text.file_id,
    };
  } else {
    // 如果傳送的照片檔案太小（10幾KB），就不會有回聲效果
    payload = {
      method: "sendMessage",
      chat_id: id,
      text: "回声失败，请更换内容重试",
    };
  }
  return payload;
}
