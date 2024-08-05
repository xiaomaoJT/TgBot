function doGet(e) {
  return HtmlService.createHtmlOutput(
    "Hello World!! No, this link should be hidden!!!"
  );

  //  return HtmlService.createHtmlOutputFromFile('Index');
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);

  body.message.chat.id = body.message.chat.id + "";

  var payload = preparePayload(body);
  var data = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch(
    "https://api.telegram.org/bot682267360:AAHmjSil8oylavD2pENLLpcMU1svaD7mVeA/",
    data
  );
}

function getName(user) {
  var name = user.first_name;
  if (user.last_name) {
    name += " " + user.last_name;
  }

  return name;
}

function escapeMarkDown(toEscapeMsg) {
  var escapedMsg = toEscapeMsg
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");
  return escapedMsg;
}

function getMentionName(user) {
  var username = user.username;
  var mentionName = "";

  var name = getName(user);
  if (!name) {
    name = "神秘人";
  }

  // if (!username) {
  mentionName = getMarkDownUserUrl(escapeMarkDown(name), user.id);
  // } else {
  //   mentionName = "[" + escapeMarkDown(name) + "](@" + escapeMarkDown(username) + ")";
  // }

  return mentionName;
}

function getMarkDownUserUrl(userName, userId) {
  return "[" + userName + "](tg://user?id=" + userId + ")";
}

function preparePayload(body) {
  var payload;

  if (body.message.new_chat_member) {
    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: "你好， 欢迎加入本群",
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

    payload.text =
      "你好!" + getMentionName(body.message.new_chat_member) + ", 欢迎加入本群";
    return payload;
  }

  if (body.message.left_chat_member) {
    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: "你好， 欢迎加入本群",
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

    payload.text =
      getMentionName(body.message.left_chat_member) + "君, 一路走好！";
    return payload;
  }

  if (body.message.pinned_message) {
    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: "你好， 欢迎加入本群",
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };
    var whoPinned = getName(body.message.from);
    var whoOwned = getName(body.message.pinned_message.from);

    payload.text =
      whoPinned +
      "置顶了消息:\n\n" +
      body.message.pinned_message.text +
      "\n\n" +
      "本BOT代表" +
      whoOwned +
      "感谢您";
    return payload;
  }

  body.message.text = body.message.text.toLowerCase();
  body.message.text = body.message.text.replace(/@temptestbot2/g, "");

  var paras = body.message.text.trim().split(" ");
  // remove empty strings
  paras = paras.filter(function (para) {
    if (para) {
      return true;
    }
  });

  if (body.message.text) {
    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: "你好， 欢迎使用本机器人， 本机器人现在只认识颜色。",
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

    if (body.message.text.indexOf("/help") === 0) {
      payload.text = "你好， 欢迎使用本机器人， 本机器人现在只认识颜色。";
      return payload;
    }

    if (body.message.text.indexOf("/colors") === 0) {
      payload.text = "红\n黄\n蓝";
      return payload;
    }

    if (body.message.text.indexOf("/list") === 0) {
      if (paras[1]) {
        switch (paras[1].toLowerCase()) {
          case "people":
            if (paras[2]) {
              if ("JS神技能".toLowerCase().indexOf(paras[2]) >= 0) {
                payload.text =
                  "JS神技能 - https://www.youtube.com/channel/UC6tPP3jOTKgjqfDgqMsaG4g";
              }
              if ("悟空的日常".toLowerCase().indexOf(paras[2]) >= 0) {
                payload.text =
                  "悟空的日常 - https://www.youtube.com/channel/UCii04BCvYIdQvshrdNDAcww";
              }
              if ("YuFeng Deng".toLowerCase().indexOf(paras[2]) >= 0) {
                payload.text =
                  "YuFeng Deng - https://www.youtube.com/channel/UCG6xoef2xU86hnrCsS5m5Cw";
              }
            } else {
              payload.text = "JS神技能\n" + "悟空的日常\n" + "YuFeng Deng\n";
              return payload;
            }
            break;
          default:
            payload.text = "红\n黄\n蓝";
            break;
        }

        return payload;
      } else {
        payload.text =
          "*JS神技能*\n" +
          "[悟空的日常](https://www.youtube.com/channel/UCii04BCvYIdQvshrdNDAcww)\n" +
          "[*YuFeng Deng*](https://www.youtube.com/channel/UCG6xoef2xU86hnrCsS5m5Cw)\n" +
          "_YuFeng Deng_\n" +
          "`01|" +
          "UCii04BCvYIdQvshrdNDAcww" +
          " | `\n" +
          "`02|" +
          "UCG6xoef2xU86hnrCsS5m5Cw" +
          " | `\n" +
          "```javascript\n" +
          "payload = {\n" +
          '    "method": "sendMessage",\n' +
          '    "chat_id": body.message.chat.id,\n' +
          '    "text": body.message.text,\n' +
          "}" +
          "```";

        var inlineKeyboardMarkup = {};
        inlineKeyboardMarkup.inline_keyboard = [];
        var keyboardRow = [];
        var keyboardButton1 = {
          text: "按钮1",
          url: "https://www.google.com",
        };

        var keyboardButton2 = {
          text: "按钮2",
          url: "https://www.google.com",
        };

        var keyboardRow2 = [];
        var keyboardButton3 = {
          text: "按钮3",
          url: "https://www.google.com",
        };

        var keyboardButton4 = {
          text: "按钮4",
          url: "https://www.google.com",
        };

        keyboardRow.push(keyboardButton1);
        keyboardRow.push(keyboardButton2);

        keyboardRow2.push(keyboardButton3);
        keyboardRow2.push(keyboardButton4);
        inlineKeyboardMarkup.inline_keyboard.push(keyboardRow);
        inlineKeyboardMarkup.inline_keyboard.push(keyboardRow2);
        payload.reply_markup = inlineKeyboardMarkup;

        return payload;
      }
    }

    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: body.message.text,
    };
  } else if (body.message.sticker) {
    payload = {
      method: "sendSticker",
      chat_id: body.message.chat.id,
      sticker: body.message.sticker.file_id,
    };
  } else if (body.message.photo) {
    array = body.message.photo;
    text = array[1];
    payload = {
      method: "sendPhoto",
      chat_id: body.message.chat.id,
      photo: text.file_id,
    };
  } else {
    payload = {
      method: "sendMessage",
      chat_id: body.message.chat.id,
      text: "Try other stuff",
    };
  }
  return payload;
}
