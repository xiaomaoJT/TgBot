/**
 * author ： @XiaoMao
 * # 小版本更新请查看更新日志 ｜ 或加入xiaomao组织⬇️
 * # 微信公众号 【小帽集团】
 * # XiaoMao · Tg频道频道：https://t.me/xiaomaoJT
 *
 * V1.11 - 正式版
 *
 * 核心函数
 * 无需改动
 *
 * Google App Script
 * 用于执行tg机器人功能
 * 功能描述：❶ 超级群管功能❷ 广告词/敏感词过滤、自动删除/警告❸ 多样化接口查询、XiaoMao数据加工❹ 自定义聊天窗快捷键盘/消息跟随按钮❺ 关键字消息/私聊消息 自动回复❻ 私聊消息/群组消息 捕捉及消息私人推送❼ 私聊消息/群组消息 自动存储
 *
 * 功能细则：入群检测、退群检测、入群欢迎、退群欢送、超级群管功能、用户封禁、用户解封、用户禁言、广告词敏感词拦截及自动删除、chatGPT查询、消息私人推送、BOT消息主动回复、自动接口查询及数据加工、自定义键盘、私聊及自动回复、关键字自动回复、消息存储等功能
 *
 * 源码开发不易，使用引用请注明出处！
 * 源码开发不易，使用引用请注明出处！
 * 源码开发不易，使用引用请注明出处！
 */

/**
 * 用于接收用户传来的讯息JSON
 * @param {*} e
 */
const doPost = async (e) => {
  // ！！！！！仅用于数据结构展示，此段代码无效！！！！！
  if (e == undefined) {
    let testParams = {
      postData: {
        contents: `{"update_id":11111111,"message":{"message_id":2,"from":{"id":${parseInt(
          KingId
        )},"is_bot":false,"first_name":"","username":"","language_code":"zh-hans"},"chat":{"id":${parseInt(
          KingId
        )},"first_name":"","username":"","type":"private"},"date":1722500047,"text":"图文教程"}}`,
      },
    };
    console.log(
      "e参数示例：",
      testParams,
      "该示例仅用于数据结构展示，请勿用于生产！！！"
    );
    console.error(
      "⚠️⚠️⚠️若正式环境执行出现此内容，则证明数据尚未接入成功，请核对教程第四步，https://api.telegram.org/bot『你的tg机器人Token』/setWebhook?url=『你的web应用网址』，注意删除多余空格！！"
    );
    console.log(
      "【无法通过GAS直接执行问题】机器人通过检测到TG消息方才会响应，直接运行将使得入口函数doPost缺失关键参数而导致失败，若需直接执行，请于本地补全参数e，可作于调试运行。参数e的获取建议于部署完成后，通过私人推送服务获取原始数据。"
    );
    // 仅用于测试，将下方 return 注释，即可点击运行查看机器人响应效果
    // 需提前私聊个人机器人
    return;
    e = testParams;
  }
  // ！！！！！仅用于数据结构展示，此段代码无效！！！！！

  // 获取响应数据 必传
  let userMessage = JSON.parse(e.postData.contents);

  // 频道消息
  if (userMessage?.channel_post) {
    setStorage(userMessage, "CHANNELPOST");
    return;
  }

  // 判断消息类型
  if (userMessage.hasOwnProperty("callback_query")) {
    MESSAGETYPE = 1;
    userMessage = JSON.parse(e.postData.contents).callback_query;
  }
  if (userMessage.message.hasOwnProperty("left_chat_participant")) {
    MESSAGETYPE = 3;
  }
  if (userMessage.message.hasOwnProperty("new_chat_participant")) {
    MESSAGETYPE = 2;
  }

  getCacheAuthorityList();

  //计算返回式
  let messageUserID =
    userMessage.message.chat.type == "private"
      ? userMessage.message.from.id.toString()
      : userMessage.message.chat.id.toString();

  MESSAGETYPE == 0 && userMessage.message.hasOwnProperty("text")
    ? (dealMessage = processReplyWord(
        userMessage.message.text,
        messageUserID,
        userMessage.message
      ))
    : "";

  //回调响应逻辑
  let payload = processData(userMessage);
  let data = null;
  let payloadStatus = payload instanceof Array;
  if (payloadStatus) {
    data = [];
    payload.length
      ? payload.map((e) => {
          return data.push({
            method: "post",
            payload: e,
          });
        })
      : "";
  } else {
    data = {
      method: "post",
      payload: payload,
    };
  }

  // 分析文字消息是否包含关键字 未包含将不做匹配
  let htmlReplyState = true;
  if (MESSAGETYPE == 0 && userMessage.message) {
    // 判断消息类型 - 进行私聊或群聊回复
    htmlReplyState = dealMessage.state;
  }
  //   Google 请求域建立连接
  // 判断消息，仅对私聊和@消息以及关键字进行回复
  if (
    (userMessage.message.reply_to_message &&
      userMessage.message.reply_to_message.from.id == botIdAlone) ||
    htmlReplyState ||
    userMessage.message.chat.type == "private" ||
    (userMessage.message.hasOwnProperty("entities") &&
      userMessage.message.entities[0].type == "mention" &&
      htmlReplyState) ||
    (userMessage.message.hasOwnProperty("entities") &&
      userMessage.message.entities[0].type == "bold")
  ) {
    if (payloadStatus) {
      if (data.length) {
        let list = getApiBackList(data);
        try {
          if (list.length && list[0][2] == "supergroup") {
            createDelayedTriggerWithParams(list);
          }
        } catch (error) {}
      }
    } else {
      linkBot(data);
      setStorage(data, "MESSAGEBACK");
    }
  }
};

/**
 * 普通账号上限20个
 * 删除指定触发器 index true
 * 删除多余触发器 false num
 */
const deleteClockTriggers = (index = 0,status = true,num = 0) => {
  // 获取所有时间类型触发器
  let allTriggers = ScriptApp.getProjectTriggers().filter(
    (t) => t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
  );
  if(allTriggers.length && allTriggers.length > index){
    if(status){
      ScriptApp.deleteTrigger(allTriggers[index])
    }else{
      for (let i = 0; i < num; i++) {
        ScriptApp.deleteTrigger(allTriggers[i])
      }
    }
  }
};

/**
 * 普通账号上限20个
 * 查询触发器数量 - 大于19个立即循环执行消息删除函数
 * @returns 
 */
const getClockTriggersNum = () => {
  // 获取所有时间类型触发器
  let allTriggers = ScriptApp.getProjectTriggers().filter(
    (t) => t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
  );
  if(allTriggers.length >= 19){
    let surplusIndex = allTriggers.length - 19
    cyclicDeleteTrigger(surplusIndex)
  }
  return allTriggers.length;
};

/**
 * 循环执行多余触发器
 * @param num 
 */
const cyclicDeleteTrigger = (num) => {
  for (let index = 0; index < num; index++) {
    executeAfterDelay()
  }
}

/**
 * 创建消息删除触发器
 * @param params botapi返回数据列表
 */
const createDelayedTriggerWithParams = (params) => {
  let list = {};
  const scriptProperties = PropertiesService.getScriptProperties();
  let paramsList = scriptProperties.getProperty("triggerParams");
  if (paramsList) {
    list = JSON.parse(paramsList);
    let objKeyLength = Object.keys(list);
    if (objKeyLength.length) {
      let keyName = Object.keys(list).sort((a, b) => {
        return a - b;
      })[objKeyLength.length - 1];
      list[parseInt(keyName) + 1] = params;
    } else {
      list = { 0: params };
    }
  } else {
    list = { 0: params };
  }
  scriptProperties.setProperty("triggerParams", JSON.stringify(list));
  try {
    let surplusParamsIndex = Object.keys(list).length - getClockTriggersNum()
    if(surplusParamsIndex > 1){
      cyclicDeleteTrigger(surplusParamsIndex - 1)
    }else{
      deleteClockTriggers(0,false,(surplusParamsIndex * -1) + 1)
    }
    const now = new Date();
    const delayTime = new Date(now.getTime() + 30 * 1000);
    // 创建触发器
    ScriptApp.newTrigger("executeAfterDelay")
      .timeBased()
      .at(delayTime)
      .create();
  } catch (e) {}
};

/**
 * 消息触发器
 * @returns
 */
function executeAfterDelay() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const paramsString = scriptProperties.getProperty("triggerParams");
  if (paramsString) {
    const params = JSON.parse(paramsString);
    let list = [];
    let objKeyLength = Object.keys(params);
    if (objKeyLength.length) {
      let keyName = Object.keys(params).sort((a, b) => {
        return a - b;
      })[0];
      list = params[keyName];
      try {
        list.map((listItem) => {
          if (listItem[2] == "supergroup") {
            deleteMessageApi(listItem[0], listItem[1]);
          }
        });
        delete params[keyName];
        deleteClockTriggers()
        scriptProperties.setProperty("triggerParams", JSON.stringify(params));
      } catch (e) {}
    } else {
      return;
    }
  } else {
    return;
  }
}

/**
 * 用于处理用户信息并进行回复
 * @param {*} userMessage
 * @returns
 */
const processData = (userMessage) => {
  // 定义返回参数
  let payload;

  // 判断消息类型 - 进行私聊或群聊回复
  let messageUserID =
    userMessage.message.chat.type == "private"
      ? userMessage.message.from.id.toString()
      : userMessage.message.chat.id.toString();
  let messageReplyID = userMessage.message.message_id.toString();
  let messageNoType = userMessage.message.hasOwnProperty("text")
    ? userMessage.message.text
    : userMessage.message.hasOwnProperty("sticker")
    ? "[表情消息]"
    : userMessage.message.hasOwnProperty("photo")
    ? "[图片消息]"
    : userMessage.message.hasOwnProperty("video")
    ? "[视频消息]"
    : userMessage.message.hasOwnProperty("document")
    ? "[文件消息]"
    : userMessage.message.hasOwnProperty("voice")
    ? "[音频消息]"
    : "[消息]";
  //默认回复
  let payloadPostData = {
    method: "sendMessage",
    chat_id: messageUserID,
    text:
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      "<b>呜呜呜，此类型 " +
      messageNoType +
      " 暂无法处理，XiaoMaoBot正在逐步升级中！可加入XiaoMao群聊咨询解决。</b>",
    reply_to_message_id: messageReplyID,
    parse_mode: "HTML",
    reply_markup: JSON.stringify(keyboardFollowParams),
    disable_web_page_preview: true,
  };

  // 获取图片fileID
  if (
    userMessage.message.hasOwnProperty("photo") &&
    userMessage.message.hasOwnProperty("caption") &&
    userMessage.message.caption == "#photoid"
  ) {
    let photoList = userMessage.message.photo;
    if (photoList.length) {
      let photoText =
        "<b>🕹 来自XiaoMaoBot的消息：</b>" +
        "\n" +
        "\n" +
        `识别到图片存储指令，图片文件ID是\n\n<code>${
          photoList[photoList.length - 1].file_id
        }</code>`;

      payloadPostData.text =
        photoText +
        `\n\n图片文件ID可用于填充关键字表[key_params]内[GraphicMessage]类型回复`;
    }
  }
  // 获取视频fileID
  if (
    userMessage.message.hasOwnProperty("video") &&
    userMessage.message.hasOwnProperty("caption") &&
    userMessage.message.caption == "#videoid"
  ) {
    let videoObj = userMessage.message.video;
    let videoText =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      `识别到视频存储指令，视频文件ID是\n\n<code>${videoObj.file_id}</code>`;

    payloadPostData.text =
      videoText +
      `\n\n视频文件ID可用于填充关键字表[key_params]内[VideoMessage]类型回复`;
  }

  //判断消息类型 - 消息跟踪键盘 callback返回
  if (MESSAGETYPE == 1) {
    let callbackChatID = userMessage.message.chat.id.toFixed();
    let payloadCallback;

    if (userMessage.data == "WXGROUP") {
      linkBot({
        method: "post",
        payload: {
          method: "sendPhoto",
          chat_id: callbackChatID,
          photo:
            "https://mmbiz.qpic.cn/mmbiz_jpg/RzNtrrcUJxlEcDQkiasYkNhwN60JMqGhZyvzM6ZUIODsvAXaaohmySWuPfFic2FK7Q8SRdUvIHAgbzp0yBLagGqg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1",
        },
      });

      let callbackText =
        "<b>🕹 来自XiaoMaoBot的消息：</b>" +
        "\n" +
        "\n" +
        "<b>✅微信公众号『小帽集团』，欢迎您的关注！记得点赞收藏哟～</b>" +
        "\n" +
        "\n" +
        "XiaoMao推文集：" +
        "<a href='http://mp.weixin.qq.com/mp/homepage?__biz=MzI3MjE3NTc4OA==&hid=1&sn=69f77280608382e9ab1e6afac8c2a881&scene=18#wechat_redirect'><b>点击查看 👈</b></a>";

      payloadCallback = {
        method: "sendMessage",
        chat_id: callbackChatID,
        text: callbackText,
        parse_mode: "HTML",
        reply_markup: JSON.stringify(keyboardFollowParams),
      };
    }
    payload = payloadCallback;
    setStorage(userMessage, "CALLBACK");
    return payload;
  }

  if (MESSAGETYPE == 2 || MESSAGETYPE == 3) {
    let newMemberChatId = userMessage.message.chat.id.toString();
    let memberList = "「未知」";

    try {
      if (MESSAGETYPE == 2) {
        memberList = "";
        userMessage.message["new_chat_members"].forEach((name, index) => {
          memberList =
            memberList +
            (name.first_name || "") +
            (name.last_name || "") +
            (index < userMessage.message["new_chat_members"].length - 1
              ? " 、 "
              : " ");
        });
      } else {
        memberList =
          (userMessage.message["left_chat_member"].first_name || "") +
          (userMessage.message["left_chat_member"].last_name || "");
      }
    } catch (e) {}

    let welcomeMessage =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      "<b>👏👏👏 热烈欢迎小伙伴 </b> " +
      memberList +
      "<b> 的到来，入群不能水经验，但可以求罩！</b>";

    let leftMessage =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      "<b>😩😩😩 幺儿啊 </b> " +
      memberList +
      "<b> 这么好玩的群都退了，你能上哪去？</b>";

    let newMemberPayload = {
      method: "sendMessage",
      chat_id: newMemberChatId,
      text: MESSAGETYPE == 2 ? welcomeMessage : leftMessage,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardFollowParams),
      disable_web_page_preview: true,
    };
    payload = newMemberPayload;

    return payload;
  }

  //判断消息类型 - 文本消息
  // 暂时只识别文本类消息
  try {
    if (userMessage.message && userMessage.message.hasOwnProperty("text")) {
      if (dealMessage.htmlReply) {
        let HTML_REPLY =
          dealMessage.htmlReply == "getTgId"
            ? "<b>🕹 来自XiaoMaoBot的消息：</b>" +
              "\n" +
              "\n" +
              "你的Tg_Chat_ID ： " +
              "<b>" +
              userMessage.message.from.id.toString() +
              "</b>"
            : dealMessage.htmlReply;

        let dealMessageParseMode = dealMessage.hasOwnProperty("parseMode")
          ? dealMessage.parseMode
          : "HTML";
        if (dealMessage.htmlReply2 == null) {
          if (dealMessageParseMode == "GraphicMessage") {
            payloadPostData = {
              method: "sendMediaGroup",
              chat_id: messageUserID,
              media: HTML_REPLY.replace(
                "<b>🕹 来自XiaoMaoBot的消息：</b>\n\n",
                ""
              ),
            };
          } else {
            payloadPostData = {
              method: "sendMessage",
              chat_id: messageUserID,
              text:
                dealMessageParseMode !== "HTML"
                  ? HTML_REPLY.replace(/<\/?[^>]+(>|$)/g, "*")
                  : HTML_REPLY,
              reply_to_message_id: messageReplyID,
              parse_mode: dealMessageParseMode,
              reply_markup: JSON.stringify(keyboardParams),
              disable_web_page_preview: true,
            };
          }
        } else {
          payloadPostData = [
            {
              method: "sendMessage",
              chat_id: messageUserID,
              text:
                dealMessageParseMode !== "HTML"
                  ? HTML_REPLY.replace(/<\/?[^>]+(>|$)/g, "*")
                  : HTML_REPLY,
              reply_to_message_id: messageReplyID,
              parse_mode: dealMessageParseMode,
              reply_markup: JSON.stringify(keyboardParams),
              disable_web_page_preview: true,
            },
          ];
          dealMessage.htmlReply2.length
            ? dealMessage.htmlReply2.map((e) => {
                return payloadPostData.push({
                  method: "sendMessage",
                  chat_id: messageUserID,
                  text:
                    dealMessageParseMode !== "HTML"
                      ? e.replace(/<\/?[^>]+(>|$)/g, "*")
                      : e,
                  reply_to_message_id: messageReplyID,
                  parse_mode: dealMessageParseMode,
                  reply_markup: JSON.stringify(keyboardParams),
                  disable_web_page_preview: true,
                });
              })
            : "";
        }
      } else {
        payloadPostData = {
          method: "deleteMessage",
          chat_id: userMessage.message.chat.id.toString(),
          message_id: userMessage.message.message_id.toString(),
        };
        let htmlReply =
          "<b>🕹 来自XiaoMaoBot的消息：</b>" +
          "\n" +
          "\n" +
          "<b>拦截到</b> " +
          " " +
          (userMessage.message.from.first_name || "") +
          (userMessage.message.from.last_name || "") +
          "<b> 消息中含</b>" +
          dealMessage.dfa.wordLength +
          "处<b> 敏感词，XiaoMao已自动删除消息，请文明聊天喔！</b>";
        let payload = {
          method: "sendMessage",
          chat_id: messageUserID,
          text: htmlReply,
          reply_to_message_id: messageReplyID,
          parse_mode: "HTML",
          reply_markup: JSON.stringify(keyboardParams),
          disable_web_page_preview: true,
        };

        linkBot({
          method: "post",
          payload: payload,
        });

        //强杀广告 - 直接ban
        let banKeyWords =
          sensitiveEncodeList
            .slice(0, banKeyLastIndex)
            .map((word) =>
              Utilities.newBlob(Utilities.base64Decode(word)).getDataAsString()
            ) || [];
        function judgeBanStatus(banStauts = false) {
          for (i in banKeyWords) {
            if (userMessage.message.text.includes(banKeyWords[i])) {
              banStauts = true;
              break;
            }
          }
          return banStauts;
        }

        if (judgeBanStatus()) {
          let banPostData = {
            method: "banChatMember",
            chat_id: userMessage.message.chat.id.toString(),
            user_id: userMessage.message.from.id.toString(),
            until_date: getUnixTime("").toString(),
          };
          try {
            linkBot({
              method: "post",
              payload: banPostData,
            });

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: userMessage.message.chat.id.toString(),
              text:
                "<b>🚨XiaoMao绝杀通知</b>" +
                "\n" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>" +
                userMessage.message.from.id.toString() +
                " 触发终极禁忌‼️ ，已被永久封禁，领盒饭吧狗子🐶～" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              reply_markup: JSON.stringify(keyboardParams),
              disable_web_page_preview: true,
            };
            linkBot({
              method: "post",
              payload: payloadPostData2,
            });
          } catch (e) {}
        }
      }

      if (
        userMessage.message.text == "资源仓库" ||
        userMessage.message.text.indexOf("Mao") != -1
      ) {
        payloadPostData.reply_markup = JSON.stringify(
          resourceWarehouseKeyboardFollowParams
        );
      }

      if (userMessage.message.text == "微信公众号『小帽集团』") {
        payloadPostData.reply_markup = JSON.stringify(keyboardParams);
      }
    }
  } catch (error) {
    if (userMessage.message.chat.type == "private") {
      linkBot({
        method: "post",
        payload: payloadPostData,
      });
    }
  }

  payload = payloadPostData;
  setStorage(userMessage, "POSTDATA");

  pushDataToKing(userMessage);
  return payload;
};

/**
 * 用于处理用户关键字自动回复
 * keyword值唯一不可重复，用于匹配用户关键字是否包含，并触发自动回复
 * @param key 用户消息关键字
 */
const processReplyWord = (key, useId, userJson) => {
  getCacheData();
  //未匹配的关键字回复
  let htmlReply =
    "<b>🕹 来自XiaoMaoBot的消息：</b>" +
    "\n" +
    "\n" +
    "<b>呜呜呜，关键字</b> " +
    key.replace("@Xiao_MaoMao_bot", "") +
    "<b> 匹配失败，XiaoMao已采集，正在抓紧学习！</b>";
  if (outsideWord.findIndex((i) => key == i) != -1) {
    htmlReply =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      "<b>✅微信公众号『小帽集团』，欢迎您的关注！记得点赞收藏哟～</b>" +
      "\n" +
      "\n" +
      "XiaoMao推文集：" +
      "<a href='http://mp.weixin.qq.com/mp/homepage?__biz=MzI3MjE3NTc4OA==&hid=1&sn=69f77280608382e9ab1e6afac8c2a881&scene=18#wechat_redirect'><b>点击查看 👈</b></a>";
    returnHtmlReply.state = true;
  } else {
    let dfa = checkSensitiveDFA(key);
    if (dfa.wordLength > 0) {
      returnHtmlReply.dfa = dfa;
      returnHtmlReply.htmlReply = null;
      returnHtmlReply.state = true;
      return returnHtmlReply;
    }
    if (isApi(commandWord, key).status) {
      switch (isApi(commandWord, key).id) {
        case 0:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getWeatherApi(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 1:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getLinkShort(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 2:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" + "\n" + "\n" + getMusic();
          returnHtmlReply.state = true;
          break;
        case 3:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getPhoneWhere(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 4:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getTianGou(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 5:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getDuJiTang(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 6:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getVideo(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;

          break;
        case 7:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" + "\n" + "\n" + getYiYan();
          returnHtmlReply.state = true;
          break;
        case 8:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getHelloBot(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 9:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getChatBot(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 10:
          htmlReply = "getTgId";
          returnHtmlReply.state = true;
          break;
        case 11:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            "Hello,我是 XiaoMao机器人,很高兴认识您！我能较出色的完成以下功能：" +
            "\n" +
            "\n" +
            "❶ 超级群管功能（/manage）" +
            "\n" +
            "❷ 广告词/敏感词过滤、自动删除/警告" +
            "\n" +
            "❸ 多样化接口查询、XiaoMao数据加工" +
            "\n" +
            "❹ 自定义聊天窗快捷键盘/消息跟随按钮" +
            "\n" +
            "❺ 关键字消息/私聊消息 自动回复" +
            "\n" +
            "❻ 私聊消息/群组消息 捕捉及消息私人推送" +
            "\n" +
            "❼ 私聊消息/群组消息 自动存储" +
            "\n" +
            "\n" +
            "<b>🉑️通过底部按钮 【 资源仓库 】 加入XiaoMao组织喔～</b>" +
            "\n" +
            "\n" +
            "<a href='https://github.com/xiaomaoJT/TgBot'>🏖 本机器人完全开源，可点击查看我的源码仓库获取免费搭建教程喔！</a>";
          returnHtmlReply.state = true;
          break;
        case 12:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getLanLink(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 13:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getSao(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 14:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getReply(userJson);
          returnHtmlReply.state = true;
          break;
        case 15:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getBanUser(userJson);
          returnHtmlReply.state = true;
          break;
        case 16:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getUnBanUser(userJson);
          returnHtmlReply.state = true;
          break;
        case 17:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getRestrictUser(userJson);
          returnHtmlReply.state = true;
          break;
        case 18:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getHotList(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 19:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getDouBan(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 20:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getHoroscopeList(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 21:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "\n" +
            getChatterboxUser(useId, userJson);
          returnHtmlReply.state = true;
          break;
        default:
          returnHtmlReply.state = false;
          break;
      }
    } else {
      //关键字匹配 若匹配失败自动进入hello机器人
      try {
        autoReply.forEach((item) => {
          item.keyword.forEach((element) => {
            if (key.indexOf(element) != -1) {
              htmlReply =
                "<b>🕹 来自XiaoMaoBot的消息：</b>" +
                "\n" +
                "\n" +
                item.replyWord;

              item.hasOwnProperty("replyWordMore") && item.replyWordMore.length
                ? (returnHtmlReply.htmlReply2 = item.replyWordMore)
                : (returnHtmlReply.htmlReply2 = null);
              returnHtmlReply.state = true;
              returnHtmlReply.parseMode = item.hasOwnProperty("parseMode")
                ? item.parseMode
                : "HTML";
              throw new Error("匹配成功");
            }
          });
        });
        if (
          userJson &&
          userJson.reply_to_message &&
          userJson.reply_to_message.from.id == botIdAlone
        ) {
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" + "\n" + "\n" + getHelloBot(key);
          returnHtmlReply.state = true;
        }
      } catch (e) {}
    }
  }

  returnHtmlReply.htmlReply = htmlReply;

  return returnHtmlReply;
};

/**
 * 用于捕捉机器人信息
 * @param key 用户消息
 * 当KingId未填写时，私人推送将不执行
 */
const pushDataToKing = (key) => {
  if (
    KingType == 2 &&
    KingId != "" &&
    (key.message.chat.type == "private" ||
      userMessage.message.chat.type == "supergroup")
  ) {
  } else if (
    KingType == 3 &&
    KingId != "" &&
    key.message.chat.type == "private"
  ) {
  } else if (
    KingType == 4 &&
    KingId != "" &&
    key.message.chat.type == "supergroup"
  ) {
  } else if (KingType == 1 && KingId != "") {
  } else {
    return;
  }

  if (
    KingId == key.message.from.id.toString() &&
    key.message.chat.type == "private"
  ) {
    return;
  }

  if (forGotList.indexOf(key.message.chat.id.toString()) != -1) {
    return;
  }
  let userMessage = key;
  let MessageUrl =
    userMessage.message.chat.type == "private"
      ? null
      : "https://t.me/" +
        userMessage.message.chat.username +
        "/" +
        userMessage.message.message_id;
  let MessageUseUrl = "https://t.me/" + userMessage.message.from.username;
  let messageInfoType = userMessage.message.hasOwnProperty("text")
    ? "[文本消息] " + userMessage.message.text
    : userMessage.message.hasOwnProperty("sticker")
    ? "[表情消息]"
    : userMessage.message.hasOwnProperty("photo")
    ? "[图片消息]"
    : userMessage.message.hasOwnProperty("video")
    ? "[视频消息]"
    : userMessage.message.hasOwnProperty("document")
    ? "[文件消息]"
    : userMessage.message.hasOwnProperty("voice")
    ? "[音频消息]"
    : "[未知消息类型]";
  //用于捕捉机器人信息
  let messageToKing =
    "<b>🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄</b>" +
    "\n" +
    "\n" +
    "<b>XiaoMaoBot捕捉到用户讯息</b>" +
    "\n" +
    "\n" +
    "<b>📝 简要内容：</b>" +
    messageInfoType.replace(/\n/g, " ").substring(0, 100) +
    (messageInfoType.length > 100 ? "..." : "") +
    "\n" +
    "<b>🎎 原始用户：</b>" +
    "<a href='" +
    MessageUseUrl +
    "'>" +
    (userMessage.message.from.first_name != undefined
      ? userMessage.message.from.first_name
      : "") +
    (userMessage.message.from.last_name != undefined
      ? userMessage.message.from.last_name
      : "") +
    "</a>" +
    "\n" +
    "<b>🏖 来源位置：</b>" +
    (userMessage.message.chat.type == "private"
      ? "来自 " + "[私聊]"
      : userMessage.message.chat.hasOwnProperty("username")
      ? "<a href='" +
        MessageUrl +
        "'>" +
        "来自" +
        (userMessage.message.chat.type == "supergroup"
          ? "[群聊] " + userMessage.message.chat.title
          : "[未知]") +
        "</a>"
      : "来自" +
        (userMessage.message.chat.type == "supergroup"
          ? "[私人群聊] " + userMessage.message.chat.title
          : "[未知]")) +
    "\n" +
    "<b>🛎 发送时间：</b>" +
    getNowDate() +
    "\n" +
    "<b>📰 原始数据：</b>" +
    "\n" +
    JSON.stringify(userMessage) +
    "\n" +
    "\n" +
    "<b>🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀</b>";

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

  linkBot(dataKing);

  if (KingInfo) {
    let dataKingInfo = {
      method: "post",
      payload: {
        method: "",
        chat_id: KingId,
      },
    };
    userMessage.message.hasOwnProperty("caption")
      ? (dataKingInfo.payload.caption = userMessage.message.caption)
      : "";
    if (messageInfoType == "[表情消息]") {
      dataKingInfo.payload.method = "sendSticker";
      dataKingInfo.payload.sticker = userMessage.message.sticker.file_id;
    } else if (messageInfoType == "[图片消息]") {
      dataKingInfo.payload.method = "sendPhoto";
      dataKingInfo.payload.photo = userMessage.message.photo[0].file_id;
    } else if (messageInfoType == "[视频消息]") {
      dataKingInfo.payload.method = "sendVideo";
      dataKingInfo.payload.video = userMessage.message.video.file_id;
    } else if (messageInfoType == "[文件消息]") {
      dataKingInfo.payload.method = "sendDocument";
      dataKingInfo.payload.document = userMessage.message.document.file_id;
    } else if (messageInfoType == "[音频消息]") {
      dataKingInfo.payload.method = "sendVoice";
      dataKingInfo.payload.voice = userMessage.message.voice.file_id;
    } else {
      return;
    }

    linkBot(dataKingInfo);
  }
};
