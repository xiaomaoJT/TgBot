function doPost(e) {
  var contents = JSON.parse(e.postData.contents);

  if (contents.callback_query) {
    var message_id = contents.callback_query.message.message_id;
    var data = contents.callback_query.data;
    var multiData = data.split(" ");
    var chat_id = contents.callback_query.from.id;

    if (data == "Back") {
      replaceKeyBoard(chat_id, message_id, KEYBOARD_COMPANIES);
    } else if (data == "Cancel") {
      deleteMessage(chat_id, message_id);
      sendMessageKeyboard(chat_id, "Choose the action:", KEYBOARD_COMPANIES);
    } else if (data == "Common") {
      replaceKeyBoard(chat_id, message_id, KEYBOARD_COMMON);
    } else if (multiData[1] && multiData[0] == "Common") {
      deleteMessage(chat_id, message_id);
      sendMessageKeyboard(
        chat_id,
        "<b>Expense: " +
          multiData[0] +
          " -> " +
          multiData[1] +
          ".</b> Input the value:",
        KEYBOARD_INPUT
      );
    }
  } else if (contents.message) {
    var chat_id = contents.message.from.id;
    var text = contents.message.text;

    if (text == "/start") {
      deleteMessage(chat_id, contents.message.message_id);
      sendMessageKeyboard(chat_id, "Choose the action:", KEYBOARD_COMPANIES);
    } else if (!isNaN(parseFloat(text)) && isFinite(text)) {
      for (var i = 0; i < logins.length; i++) {
        if (chat_id == logins[i]) {
          sBot.getRange("C" + (i + 2)).setValue(text);
          replaceKeyBoard(chat_id, sBot.getRange("D" + (i + 2)).getValue());
        }
      }
    }
  }
}
