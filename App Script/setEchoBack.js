/**
 * 回声机器人，将接收者信息进行原样返回
 */
function doPost(e) {
  var estringa = JSON.parse(e.postData.contents);
  var payload = start(estringa);
  var data = {
    method: "post",
    payload: payload,
  };
  UrlFetchApp.fetch(
    "https://api.telegram.org/bot你的BotID/",
    data
  );
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
