var token = "<BOT_TOKEN>";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "https://script.google.com/macros/s/<ID>/exec";

function getMe() {
  var url = telegramUrl + "/getMe";
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function deletWebhook() {
  var url = telegramUrl + "/setWebhook";
  var response = UrlFetchApp.fetch(url);
}

function doGet(e) {
  return HtmlService.createHtmlOutput("Webhook is working.");
}

// Send message
function sendMessage(chat_id, text) {
  var data = {
    method: "post",
    payload: {
      method: "sendMessage",
      chat_id: String(chat_id),
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}

// Delete message
function deleteMessage(chat_id, message_id) {
  var data = {
    method: "post",
    payload: {
      method: "deleteMessage",
      chat_id: String(chat_id),
      message_id: parseInt(message_id, 10),
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}

// Edit message
function editMessage(chat_id, message_id, text) {
  var data = {
    method: "post",
    payload: {
      method: "editMessageText",
      chat_id: String(chat_id),
      message_id: parseInt(message_id, 10),
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}

// Send message and keyboard
function sendMessageKeyboard(chat_id, text, keyboard) {
  var data = {
    method: "post",
    payload: {
      method: "sendMessage",
      chat_id: String(chat_id),
      text: text,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboard),
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}

// Hide keyboard
function hideKeyBoard(chat_id, message_id) {
  var data = {
    method: "post",
    payload: {
      method: "editMessageReplyMarkup",
      chat_id: String(chat_id),
      message_id: parseInt(message_id, 10),
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}

// Replace keyboard
function replaceKeyBoard(chat_id, message_id, keyboard) {
  var data = {
    method: "post",
    payload: {
      method: "editMessageReplyMarkup",
      chat_id: String(chat_id),
      message_id: parseInt(message_id, 10),
      reply_markup: JSON.stringify(keyboard),
    },
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/", data);
}
