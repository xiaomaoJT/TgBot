/**
 * 群管类
 *
 * 无需改动
 */

/**
 * 解除封禁用户
 * @param userJson
 * @returns
 */
const getUnBanUser = (userJson) => {
  try {
    let resultAdministrators = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" +
        BOTID +
        "/" +
        "getChatAdministrators?chat_id="+PermissionGroupId
    );
    let userAdministrators = JSON.parse(
      resultAdministrators.getContentText()
    ).result.map((el) => el.user.id);
    PermissionReleaseList = PermissionReleaseList.concat(userAdministrators);
  } catch (error) {}
  if (PermissionReleaseList.indexOf(userJson.from.id.toString()) == -1) {
    returnText =
      "Bot用户封禁功能仅开放于Bot管理者，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else if (PermissionRelease && userJson.chat.type == "supergroup") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText = "操作失败！未找到指定用户，请引用对方消息再进行操作。";
      return returnText;
    }
    let payloadPostData = {
      method: "unbanChatMember",
      only_if_banned: true,
      chat_id: userJson.reply_to_message.chat.id.toString(),
      user_id: userJson.reply_to_message.from.id.toString(),
    };
    try {
      linkBot({
        method: "post",
        payload: payloadPostData,
      });
    } catch (e) {}

    let payloadPostData2 = {
      method: "sendMessage",
      chat_id: userJson.reply_to_message.chat.id.toString(),
      text:
        "<b>📣来自XiaoMaoBot管理员的操作提醒</b>" +
        "\n" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n" +
        "\n" +
        "<b>" +
        payloadPostData.user_id +
        "您已被XiaoMao管理员解除封禁，注意不要再次违规哟，" +
        "<a href='https://t.me/hSuMjrQppKE5MWU9'> XiaoMao群聊 点击加入 </a>" +
        "</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n",
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardFollowManageParams),
      disable_web_page_preview: true,
    };
    linkBot({
      method: "post",
      payload: payloadPostData2,
    });

    return "操作成功！";
  } else if (userJson.chat.type == "private") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户封禁功能需要开启私人消息推送服务，请于 <a href='https://github.com/xiaomaoJT/TgBot'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
      return returnText;
    } else {
      if (
        userJson.reply_to_message.from.username != "Xiao_MaoMao_bot" &&
        userJson.reply_to_message.from.is_bot != true &&
        userJson.chat.type == "private"
      ) {
        returnText = "Bot用户封禁功能仅限于回复Bot端私聊消息喔！";
        return returnText;
      } else {
        try {
          let payloadPostData = {
            method: "unbanChatMember",
            only_if_banned: true,
            chat_id: "",
            user_id: "",
          };
          if (userJson.reply_to_message.text.indexOf("来自[群聊]")) {
            let textReply = userJson.reply_to_message.text;
            let sub_1 = textReply.indexOf("chat");
            let sub_Text = textReply.substring(sub_1 + 6, sub_1 + 30);
            let sub_2 = sub_Text.indexOf(":");
            let sub_3 = sub_Text.indexOf(",");
            let sub2_Text = sub_Text.substring(sub_2 + 1, sub_3);

            let sub_user_1 = textReply.indexOf('"id"');
            let sub_user_Text = textReply.substring(
              sub_user_1 + 4,
              sub_user_1 + 30
            );
            let sub_user_2 = sub_user_Text.indexOf(":");
            let sub_user_3 = sub_user_Text.indexOf(",");
            let sub2_user_Text = sub_user_Text.substring(
              sub_user_2 + 1,
              sub_user_3
            );
            payloadPostData.user_id = sub2_user_Text.toString();
            payloadPostData.chat_id = sub2_Text.toString();

            try {
              linkBot({
                method: "post",
                payload: payloadPostData,
              });
            } catch (e) {}

            let sub__1 = textReply.indexOf("chat");
            let sub__Text = textReply.substring(sub__1 + 6, sub__1 + 30);
            let sub__2 = sub__Text.indexOf(":");
            let sub__3 = sub__Text.indexOf(",");
            let sub2__Text = sub__Text.substring(sub__2 + 1, sub__3);

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: sub2__Text.toString(),
              text:
                "<b>📣来自XiaoMaoBot管理员的操作提醒</b>" +
                "\n" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>" +
                payloadPostData.user_id +
                "您已被XiaoMao管理员解除封禁，注意不要再次违规哟，" +
                "<a href='https://t.me/hSuMjrQppKE5MWU9'> XiaoMao群聊 点击加入 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              reply_markup: JSON.stringify(keyboardFollowManageParams),
              disable_web_page_preview: true,
            };
            linkBot({
              method: "post",
              payload: payloadPostData2,
            });
          } else {
            returnText = "出错了，封禁功能仅限来自群聊类型消息喔！";
            return returnText;
          }

          return "<b>✅ 用户 " + payloadPostData.user_id + "已解除封禁</b>";
        } catch (e) {
          returnText =
            "出错了，请将以下错误码反馈给" +
            "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
            "或" +
            "<a href='https://t.me/hSuMjrQppKE5MWU9'>XiaoMao群聊管理员</a>" +
            "\n\n" +
            e;
          return returnText;
        }
      }
    }
  }
};

/**
 * 删除信息 - 不建议主动调用，建议使用deleteMessageApi
 * @param params
 * @param type 1主动删除 2调用删除 3删除回复
 */
const deleteUserMessage = (params, type = 1) => {
  let payloadDeletePostData = {
    method: "deleteMessage",
    chat_id: "",
    message_id: "",
  };
  if (type == 1) {
    // 删除信息
    let userJsonText = params.reply_to_message.text;
    let startIndex = userJsonText.indexOf('message_id":');
    let endIndex = userJsonText.indexOf(',"from');
    let message_id = userJsonText.substring(startIndex + 12, endIndex);
    let firstIndex = userJsonText.indexOf('chat":{"id":');
    let lastIndex = userJsonText.indexOf(',"title');
    let chat_id = userJsonText.substring(firstIndex + 12, lastIndex);
    payloadDeletePostData.chat_id = chat_id;
    payloadDeletePostData.message_id = message_id;
  } else if (type == 3) {
    payloadDeletePostData.chat_id = params.reply_to_message.chat.id.toString();
    payloadDeletePostData.message_id = params.message_id.toString();
  } else {
    payloadDeletePostData.chat_id = params.reply_to_message.chat.id.toString();
    payloadDeletePostData.message_id =
      params.reply_to_message.message_id.toString();
  }

  try {
    linkBot({
      method: "post",
      payload: payloadDeletePostData,
    });
  } catch (e) {}
};

/**
 * api 自动删除消息
 * @param key1 chat_id
 * @param key2 message_id
 */
const deleteMessageApi = (key1, key2) => {
  let payloadDeletePostData = {
    method: "deleteMessage",
    chat_id: key1,
    message_id: key2,
  };
  try {
    linkBot({
      method: "post",
      payload: payloadDeletePostData,
    });
  } catch (e) {}
};

/**
 * 封禁用户
 * @param userJson
 * @returns
 */
const getBanUser = (userJson) => {
  let timeFrame = userJson.text.replace("/ban", "") || "";
  try {
    let resultAdministrators = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" +
        BOTID +
        "/" +
        "getChatAdministrators?chat_id="+PermissionGroupId
    );
    let userAdministrators = JSON.parse(
      resultAdministrators.getContentText()
    ).result.map((el) => el.user.id);
    PermissionReleaseList = PermissionReleaseList.concat(userAdministrators);
  } catch (error) {}
  if (PermissionReleaseList.indexOf(userJson.from.id.toString()) == -1) {
    returnText =
      "Bot用户封禁功能仅开放于Bot管理者，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else if (PermissionRelease && userJson.chat.type == "supergroup") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText = "操作失败！未找到指定用户，请引用对方消息再进行操作。";
      return returnText;
    }
    let payloadPostData = {
      method: "banChatMember",
      chat_id: userJson.reply_to_message.chat.id.toString(),
      user_id: userJson.reply_to_message.from.id.toString(),
      until_date: getUnixTime(timeFrame).toString(),
    };

    try {
      linkBot({
        method: "post",
        payload: payloadPostData,
      });
    } catch (e) {}

    let payloadPostData2 = {
      method: "sendMessage",
      chat_id: userJson.reply_to_message.chat.id.toString(),
      text:
        "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n" +
        "\n" +
        "<b>" +
        payloadPostData.user_id +
        " 因存在违规行为，您已被管理员封禁（封禁时长：" +
        (timeFrame ? timeFrame : "永久") +
        "），申诉请私聊" +
        "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
        "</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n",
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardFollowManageParams),
      disable_web_page_preview: true,
    };
    linkBot({
      method: "post",
      payload: payloadPostData2,
    });
    deleteUserMessage(userJson, 2);

    return "操作成功！";
  } else if (userJson.chat.type == "private") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户封禁功能需要开启私人消息推送服务，请于 <a href='https://github.com/xiaomaoJT/TgBot'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
      return returnText;
    } else {
      if (
        userJson.reply_to_message.from.username != "Xiao_MaoMao_bot" &&
        userJson.reply_to_message.from.is_bot != true &&
        userJson.chat.type == "private"
      ) {
        returnText = "Bot用户封禁功能仅限于回复Bot端私聊消息喔！";
        return returnText;
      } else {
        try {
          let payloadPostData = {
            method: "banChatMember",
            chat_id: "",
            user_id: "",
            until_date: getUnixTime(timeFrame).toString(),
          };
          if (userJson.reply_to_message.text.indexOf("来自[群聊]")) {
            let textReply = userJson.reply_to_message.text;
            let sub_1 = textReply.indexOf("chat");
            let sub_Text = textReply.substring(sub_1 + 6, sub_1 + 30);
            let sub_2 = sub_Text.indexOf(":");
            let sub_3 = sub_Text.indexOf(",");
            let sub2_Text = sub_Text.substring(sub_2 + 1, sub_3);

            let sub_user_1 = textReply.indexOf('"id"');
            let sub_user_Text = textReply.substring(
              sub_user_1 + 4,
              sub_user_1 + 30
            );
            let sub_user_2 = sub_user_Text.indexOf(":");
            let sub_user_3 = sub_user_Text.indexOf(",");
            let sub2_user_Text = sub_user_Text.substring(
              sub_user_2 + 1,
              sub_user_3
            );
            payloadPostData.user_id = sub2_user_Text.toString();
            payloadPostData.chat_id = sub2_Text.toString();

            try {
              linkBot({
                method: "post",
                payload: payloadPostData,
              });
            } catch (e) {}

            let sub__1 = textReply.indexOf("chat");
            let sub__Text = textReply.substring(sub__1 + 6, sub__1 + 30);
            let sub__2 = sub__Text.indexOf(":");
            let sub__3 = sub__Text.indexOf(",");
            let sub2__Text = sub__Text.substring(sub__2 + 1, sub__3);

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: sub2__Text.toString(),
              text:
                "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>" +
                payloadPostData.user_id +
                " 因存在违规行为，您已被管理员封禁（封禁时长：" +
                (timeFrame ? timeFrame : "永久") +
                "），申诉请私聊" +
                "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              reply_markup: JSON.stringify(keyboardFollowManageParams),
              disable_web_page_preview: true,
            };
            linkBot({
              method: "post",
              payload: payloadPostData2,
            });

            deleteUserMessage(userJson);
          } else {
            returnText = "出错了，用户封禁功能仅支持来自群聊类型消息喔！";
            return returnText;
          }
          return "<b>✅ 用户 " + payloadPostData.user_id + "已被封禁</b>";
        } catch (e) {
          returnText =
            "出错了，请将以下错误码反馈给" +
            "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
            "或" +
            "<a href='https://t.me/hSuMjrQppKE5MWU9'>XiaoMao群聊管理员</a>" +
            "\n\n" +
            e;
          return returnText;
        }
      }
    }
  }
};

/**
 * 限制用户权限
 * @param userJson
 * @returns
 */
const getRestrictUser = (userJson) => {
  let permission = {
    can_send_messages: false,
    can_send_audios: false,
    can_send_documents: false,
    can_send_photos: false,
    can_send_videos: false,
    can_send_video_notes: false,
    can_send_voice_notes: false,
    can_send_polls: false,
    can_send_other_messages: false,
    can_add_web_page_previews: false,
    can_change_info: false,
    can_invite_users: false,
    can_pin_messages: false,
    can_manage_topics: false,
  };
  let timeFrame = userJson.text.replace("/restrict", "") || "";
  try {
    let resultAdministrators = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" +
        BOTID +
        "/" +
        "getChatAdministrators?chat_id="+PermissionGroupId
    );
    let userAdministrators = JSON.parse(
      resultAdministrators.getContentText()
    ).result.map((el) => el.user.id);
    PermissionReleaseList = PermissionReleaseList.concat(userAdministrators);
  } catch (error) {}
  if (PermissionReleaseList.indexOf(userJson.from.id.toString()) == -1) {
    returnText =
      "Bot用户限制功能仅开放于Bot管理者，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else if (PermissionRelease && userJson.chat.type == "supergroup") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText = "操作失败！未找到指定用户，请引用对方消息再进行操作。";
      return returnText;
    }
    let payloadPostData = {
      method: "restrictChatMember",
      chat_id: userJson.reply_to_message.chat.id.toString(),
      user_id: userJson.reply_to_message.from.id.toString(),
      until_date: getUnixTime(timeFrame).toString(),
      permissions: JSON.stringify(permission),
    };
    try {
      linkBot({
        method: "post",
        payload: payloadPostData,
      });
    } catch (e) {}

    let payloadPostData2 = {
      method: "sendMessage",
      chat_id: userJson.reply_to_message.chat.id.toString(),
      text:
        "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n" +
        "\n" +
        "<b>" +
        payloadPostData.user_id +
        " 因存在违规行为，您已被管理员限制聊天（限制时长：" +
        (timeFrame ? timeFrame : "永久") +
        "），申诉请私聊" +
        "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
        "</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n",
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardFollowManageParams),
      disable_web_page_preview: true,
    };
    linkBot({
      method: "post",
      payload: payloadPostData2,
    });
    deleteUserMessage(userJson, 2);

    return "操作成功！";
  } else if (userJson.chat.type == "private") {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户限制功能需要开启私人消息推送服务，请于 <a href='https://github.com/xiaomaoJT/TgBot'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
      return returnText;
    } else {
      if (
        userJson.reply_to_message.from.username != "Xiao_MaoMao_bot" &&
        userJson.reply_to_message.from.is_bot != true &&
        userJson.chat.type == "private"
      ) {
        returnText = "Bot用户限制功能仅限于回复Bot端私聊消息喔！";
        return returnText;
      } else {
        try {
          let payloadPostData = {
            method: "restrictChatMember",
            chat_id: "",
            user_id: "",
            until_date: getUnixTime(timeFrame).toString(),
            permissions: JSON.stringify(permission),
          };
          if (userJson.reply_to_message.text.indexOf("来自[群聊]")) {
            let textReply = userJson.reply_to_message.text;
            let sub_1 = textReply.indexOf("chat");
            let sub_Text = textReply.substring(sub_1 + 6, sub_1 + 30);
            let sub_2 = sub_Text.indexOf(":");
            let sub_3 = sub_Text.indexOf(",");
            let sub2_Text = sub_Text.substring(sub_2 + 1, sub_3);

            let sub_user_1 = textReply.indexOf('"id"');
            let sub_user_Text = textReply.substring(
              sub_user_1 + 4,
              sub_user_1 + 30
            );
            let sub_user_2 = sub_user_Text.indexOf(":");
            let sub_user_3 = sub_user_Text.indexOf(",");
            let sub2_user_Text = sub_user_Text.substring(
              sub_user_2 + 1,
              sub_user_3
            );
            payloadPostData.user_id = sub2_user_Text.toString();
            payloadPostData.chat_id = sub2_Text.toString();

            try {
              linkBot({
                method: "post",
                payload: payloadPostData,
              });
            } catch (e) {}

            let sub__1 = textReply.indexOf("chat");
            let sub__Text = textReply.substring(sub__1 + 6, sub__1 + 30);
            let sub__2 = sub__Text.indexOf(":");
            let sub__3 = sub__Text.indexOf(",");
            let sub2__Text = sub__Text.substring(sub__2 + 1, sub__3);

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: sub2__Text.toString(),
              text:
                "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>" +
                payloadPostData.user_id +
                " 因存在违规行为，您已被管理员限制聊天（限制时长：" +
                (timeFrame ? timeFrame : "永久") +
                "），申诉请私聊" +
                "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              reply_markup: JSON.stringify(keyboardFollowManageParams),
              disable_web_page_preview: true,
            };
            linkBot({
              method: "post",
              payload: payloadPostData2,
            });
            deleteUserMessage(userJson);
          } else {
            returnText = "出错了，用户限制功能仅支持来自群聊类型消息喔！";
            return returnText;
          }
          return "<b>✅ 用户 " + payloadPostData.user_id + "已被限制</b>";
        } catch (e) {
          returnText =
            "出错了，请将以下错误码反馈给" +
            "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
            "或" +
            "<a href='https://t.me/hSuMjrQppKE5MWU9'>XiaoMao群聊管理员</a>" +
            "\n\n" +
            e;
          return returnText;
        }
      }
    }
  }
};

/**
 * 用于主人对私聊信息进行bot角色回复
 * @param userJson
 * @returns
 */
const getReply = (userJson) => {
  let followMessageKeyboard = [
    [
      { text: "✚ 频道", url: "https://t.me/xiaomaoJT" },
      { text: "✚ 群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
      { text: "✚ 脚本", url: "https://t.me/XiaoMaoScript" },
    ],
    [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
  ];
  let keyboardFollowParams = {
    inline_keyboard: followMessageKeyboard,
  };
  let returnText = userJson.text.replace("/reply", "") || "";
  if (
    userJson.hasOwnProperty("chat") &&
    userJson.from.id.toString() != KingId
  ) {
    returnText =
      "Bot消息私聊功能仅开放于Bot主人，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot消息私聊功能需要开启私人消息推送服务，请于 <a href='https://github.com/xiaomaoJT/TgBot'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
      return returnText;
    } else {
      if (
        userJson.reply_to_message.from.username != "Xiao_MaoMao_bot" &&
        userJson.reply_to_message.from.is_bot != true &&
        userJson.chat.type == "private"
      ) {
        returnText = "Bot消息私聊功能仅限于回复Bot端私聊消息喔！";
        return returnText;
      } else {
        try {
          let payloadPostData = {
            method: "sendMessage",
            chat_id: userJson.from.id.toString(),
            text:
              "<b>📣来自XiaoMaoBot管理员的主动回复</b>" +
              "\n" +
              "\n" +
              "<b>===========================</b>" +
              "\n" +
              "\n" +
              "<b>" +
              returnText +
              "</b>" +
              "\n" +
              "\n" +
              "<b>===========================</b>" +
              "\n",
            parse_mode: "HTML",
            reply_markup: JSON.stringify(keyboardFollowParams),
            disable_web_page_preview: true,
          };
          if (userJson.reply_to_message.text.indexOf("来自[群聊]")) {
            let textReply = userJson.reply_to_message.text;
            let sub1 = textReply.indexOf("message_id");
            let subText = textReply.substring(sub1, sub1 + 30);
            let sub2 = subText.indexOf(":");
            let sub3 = subText.indexOf(",");
            let sub2Text = subText.substring(sub2 + 1, sub3);

            let sub_1 = textReply.indexOf("chat");
            let sub_Text = textReply.substring(sub_1 + 6, sub_1 + 30);
            let sub_2 = sub_Text.indexOf(":");
            let sub_3 = sub_Text.indexOf(",");
            let sub2_Text = sub_Text.substring(sub_2 + 1, sub_3);
            payloadPostData.chat_id = sub2_Text.toString();
            payloadPostData.reply_to_message_id = sub2Text.toString();
          }

          linkBot({
            method: "post",
            payload: payloadPostData,
          });

          return "<b>✅ 私聊信息已发送成功</b>";
        } catch (e) {
          returnText =
            "出错了，消息发送失败！当前版本仅可用于回复文字消息，请注意检查回复内容及引用消息出处！" +
            "请将以下错误码反馈给" +
            "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
            "或" +
            "<a href='https://t.me/hSuMjrQppKE5MWU9'>XiaoMao群聊管理员</a>" +
            "\n\n" +
            e;
          return returnText;
        }
      }
    }
  }
};
