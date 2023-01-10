/**
 * author ： @XiaoMao
 * # 小版本更新请查看更新日志 ｜ 或加入xiaomao组织⬇️
 * # 微信公众号 【小帽集团】
 * # XiaoMao · Tg频道频道：https://t.me/xiaomaoJT
 * Google App Script
 * 用于执行tg机器人自动回复等功能
 *
 * 源码开发不易，使用引用请注明出处！
 */

// Google EXEC ID - 谷歌表格ID
var EXECID = "";
// Google EXEC ID - 谷歌表格 工作表名
var EXECNAME = "";
// Telegram BOT ID - tg机器人Token
var BOTID = "";
// 用于判断消息类型 - inlinekey board回调 or 主动消息
// 1 callback
// 2 new member
// 3 left member
var MESSAGETYPE = 0;
//接入时间戳
var responseTime = "";

/**
 * 用于接收用户传来的讯息JSON
 * @param {*} e
 */
function doPost(e) {
  let userMessage = JSON.parse(e.postData.contents);
  responseTime = new Date().getTime();
  if (userMessage.callback_query) {
    MESSAGETYPE = 1;
    userMessage = JSON.parse(e.postData.contents).callback_query;
  }
  if (userMessage.message.left_chat_participant) {
    MESSAGETYPE = 3;
  }
  if (userMessage.message.new_chat_participant) {
    MESSAGETYPE = 2;
  }
  let payload = processData(userMessage);
  let data = {
    method: "post",
    payload: payload,
  };

  // 分析文字消息是否包含关键字 未包含将不做匹配
  let htmlReplyState = true;
  if (MESSAGETYPE == 0 && userMessage.message) {
    // 判断消息类型 - 进行私聊或群聊回复
    let messageUserID =
      userMessage.message.chat.type == "private"
        ? userMessage.message.from.id.toString()
        : userMessage.message.chat.id.toString();
    htmlReplyState = processReplyWord(
      userMessage.message.text,
      messageUserID
    ).state;
  }
  //   Google 请求域建立连接
  // 判断消息，仅对私聊和@消息以及关键字进行回复
  if (
    htmlReplyState ||
    userMessage.message.chat.type == "private" ||
    (userMessage.message.entities[0].type == "mention" && htmlReplyState) ||
    userMessage.message.entities[0].type == "bold"
  ) {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
    setStorage(data, "MESSAGEBACK");
  }
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
    [{ text: "懒人配置" }, { text: "免费节点" }, { text: "QX去广告" }],
    [{ text: "接口查询" }, { text: "订阅转换" }, { text: "TG解限制" }],
    [{ text: "QX图文教程" }, { text: "微信公众号『小帽集团』" }],
  ];
  // 定义在线内联键盘
  let followMessageKeyboard = [
    [
      { text: "QX仓库", url: "https://github.com/xiaomaoJT/QxScript" },
      { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
    ],
    [
      { text: "XiaoMao频道", url: "https://t.me/xiaomaoJT" },
      { text: "XiaoMao群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
    ],
    [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
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

  //判断消息类型 - 消息跟踪键盘 callback返回
  if (MESSAGETYPE == 1) {
    let callbackChatID = userMessage.message.chat.id.toFixed();
    let payloadCallback;

    if (userMessage.data == "WXGROUP") {
      let dataPhoto = {
        method: "post",
        payload: {
          method: "sendPhoto",
          chat_id: callbackChatID,
          photo:
            "https://mmbiz.qpic.cn/mmbiz_jpg/RzNtrrcUJxlEcDQkiasYkNhwN60JMqGhZyvzM6ZUIODsvAXaaohmySWuPfFic2FK7Q8SRdUvIHAgbzp0yBLagGqg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1",
        },
      };
      //   Google 请求域建立连接
      UrlFetchApp.fetch(
        "https://api.telegram.org/bot" + BOTID + "/",
        dataPhoto
      );

      let callbackText =
        "<b>🕹 来自XiaoMaoBot的消息：</b>" +
        "\n" +
        "🪬 本次响应延迟：" +
        getRelayTime(responseTime) +
        "\n" +
        "\n" +
        "微信公众号『小帽集团』,欢迎您的关注！记得点赞收藏哟～" +
        "\n" +
        "\n" +
        "推文集：" +
        "<a href='http://mp.weixin.qq.com/mp/homepage?__biz=MzI3MjE3NTc4OA==&hid=1&sn=69f77280608382e9ab1e6afac8c2a881&scene=18#wechat_redirect'><b>点击查看 👈</b></a>";

      payloadCallback = {
        method: "sendMessage",
        chat_id: callbackChatID,
        text: callbackText,
        parse_mode: "HTML",
        // reply_markup: JSON.stringify(keyboardFollowParams),
      };
    }
    payload = payloadCallback;
    setStorage(userMessage, "CALLBACK");
    return payload;
  }

  if (MESSAGETYPE == 2 || MESSAGETYPE == 3) {
    let newMemberChatId = userMessage.message.chat.id.toString();
    let memberList = "";

    if (MESSAGETYPE == 2) {
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

    let welcomeMessage =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟：" +
      getRelayTime(responseTime) +
      "\n" +
      "\n" +
      "<b>👏👏👏 热烈欢迎小伙伴 </b> " +
      memberList +
      "<b> 的到来，入群不能水经验，但可以求罩！</b>";

    let leftMessage =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟：" +
      getRelayTime(responseTime) +
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
  if (userMessage.message) {
    // 判断消息类型 - 进行私聊或群聊回复
    let messageUserID =
      userMessage.message.chat.type == "private"
        ? userMessage.message.from.id.toString()
        : userMessage.message.chat.id.toString();
    let messageReplyID = userMessage.message.message_id.toString();

    // let HTML_REPLY = "<b>🕹 来自XiaoMaoBot的消息：</b>" + userMessage.message.text;
    let payloadPostData = {};
    if (processReplyWord(userMessage.message.text, messageUserID).htmlReply) {
      let HTML_REPLY = processReplyWord(
        userMessage.message.text,
        messageUserID
      ).htmlReply;

      payloadPostData = {
        method: "sendMessage",
        chat_id: messageUserID,
        text: HTML_REPLY,
        reply_to_message_id: messageReplyID,
        parse_mode: "HTML",
        reply_markup: JSON.stringify(keyboardParams),
        disable_web_page_preview: true,
      };
    } else {
      payloadPostData = {
        method: "deleteMessage",
        chat_id: userMessage.message.chat.id.toString(),
        message_id: userMessage.message.message_id.toString(),
      };
      let htmlReply =
        "<b>🕹 来自XiaoMaoBot的消息：</b>" +
        "\n" +
        "🪬 本次响应延迟：" +
        getRelayTime(responseTime) +
        "\n" +
        "\n" +
        "<b>拦截到</b> " +
        " @" +
        userMessage.message.from.username +
        " 消息中含" +
        processReplyWord(userMessage.message.text, messageUserID).dfa
          .wordLength +
        "<b>处敏感词，XiaoMao已自动删除消息，请文明聊天喔！</b>";
      let payload = {
        method: "sendMessage",
        chat_id: messageUserID,
        text: htmlReply,
        reply_to_message_id: messageReplyID,
        parse_mode: "HTML",
        reply_markup: JSON.stringify(keyboardParams),
        disable_web_page_preview: true,
      };

      let data = {
        method: "post",
        payload: payload,
      };
      UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
    }

    if (
      userMessage.message.text == "微信公众号『小帽集团』" ||
      userMessage.message.text.indexOf("Mao") != -1
    ) {
      payloadPostData.reply_markup = JSON.stringify(keyboardFollowParams);
    }

    payload = payloadPostData;
    setStorage(userMessage, "POSTDATA");
  }

  return payload;
}

/**
 * 用于处理用户关键字自动回复
 * keyword值唯一不可重复，用于匹配用户关键字是否包含，并触发自动回复
 * @param key 用户消息关键字
 */
function processReplyWord(key, chatId) {
  //关键字及回复列表
  let autoReply = [
    {
      keyword: ["懒人", "懒人规则", "懒人配置"],
      replyWord:
        "<b>iPhone/iPad设备 - 懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/general/QX_XiaoMao.conf'>1⃣️ XiaoMao懒人规则通用版·XiaoMao推荐</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/custom/QX_XiaoMao.conf'>2⃣️ XiaoMao懒人规则自定义版</a>" +
        "\n" +
        "\n" +
        "<b>Mac M芯片设备 - 懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/macOS/QX_XiaoMao.conf'>1⃣️ XiaoMao懒人规则Mac版</a>" +
        "\n" +
        "\n" +
        "<a href='https://github.com/xiaomaoJT/QxScript'>💊 xiaomao懒人规则使用教程</a>",
    },
    {
      keyword: ["订阅", "节点", "网易云", "免费节点"],
      replyWord:
        "永久节点订阅已内置于XiaoMao懒人规则" +
        "<b>[server_remote]</b>" +
        "标签中" +
        "\n" +
        "\n" +
        "回复" +
        "<b> 懒人规则 </b>" +
        "以获取节点配置" +
        "\n" +
        "回复" +
        "<b> 订阅转换 </b>" +
        "以获取转换地址" +
        "\n" +
        "\n" +
        "<a href='https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-Forever'>💊 XiaoMao-Forever 长按复制订阅地址</a>",
    },
    {
      keyword: ["订阅转换", "转换"],
      replyWord:
        "1⃣️ <a href='https://t.me/QuanXNews/110'>Quantumult X资源解析器</a>" +
        "\n" +
        "2⃣️ <a href='https://t.me/cool_scripts/200'>Sub-Store本地订阅</a>" +
        "\n" +
        "3⃣️ 在线订阅转换：" +
        "\n" +
        "<a href='https://dove.589669.xyz/web'>Clash | Quantumult X | Surge 转换</a>" +
        "\n" +
        "<a href='https://sub.pet'>Subscription 转换</a>" +
        "\n" +
        "\n" +
        "<b>在线订阅转换皆有可能存在泄漏风险，建议在线转换使用机场自带的订阅转换</b>",
    },
    {
      keyword: ["去广告", "QX去广告"],
      replyWord:
        "💊 <b>去广告模块</b>" +
        "\n" +
        "\n" +
        "1⃣️ <a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/filter/AdAway.list'>分流及规则修正</a>" +
        "\n" +
        "\n" +
        "2⃣️ <a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/rewrite/script/QX_XiaoMao_rw3.conf'>重写拒绝</a>" +
        "\n" +
        "\n" +
        "<b>去广告模块日更补充，可能存在误杀，请反馈修正！</b>",
    },
    {
      keyword: ["教程", "QX图文教程"],
      replyWord:
        "💊  <b>QX图文教程</b>" +
        "\n" +
        "\n" +
        "<a href='https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=MzI3MjE3NTc4OA==&scene=1&album_id=2740008142629273602&count=3#wechat_redirect'>QX图文教程 - 从入门到进阶</a>" +
        "\n" +
        "\n" +
        "<b>欢迎点赞评论，感谢支持！</b>",
    },
    {
      keyword: ["响应延迟", "延迟","/delay"],
      replyWord:
        "💊 <b>响应延迟说明</b>" +
        "\n" +
        "\n" +
        "XiaoMaoBot响应延迟主要取决于三个方面，1⃣️ 算法匹配效率 2⃣️ GAS网络延迟 3⃣️ 接口请求延迟，GAS及接口皆来源于公共服务器，高峰期可能出现较高延迟状态。",
    },
    {
      keyword: ["在吗", "在嘛", "管理", "群主"],
      replyWord:
        "💊  <b>咨询相关问题，请在群聊中直接提问或@管理，私信不回复喔～</b>" +
        "\n" +
        "\n" +
        "<a href='https://t.me/hSuMjrQppKE5MWU9'>XiaoMao群聊 点击加入</a>" +
        "\n",
    },
    {
      keyword: ["TG解限制", "汉化", "群组限制"],
      replyWord:
        "<b>💊  <a href='https://mp.weixin.qq.com/s/YzYsF9QyHZVJK9P7bsrURQ'>外区Apple ID免费注册教程</a></b>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/5'>解除 +86 私聊限制教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/6'>Telegram设置中文教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/15'>Telegram解除敏感群组限制教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/147'>Telegram屏蔽私聊广告教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/171'>Telegram多彩主题</a>" +
        "\n" +
        "💊  <a href='https://t.me/translation_zhcncc/92439'>更多Telegram教程</a>",
    },
    {
      keyword: ["接口查询"],
      replyWord:
        "1⃣️ 天气状况查询" +
        "\n" +
        "☁️ 示例：/tq 广州 " +
        "\n" +
        "\n" +
        "2⃣️ 短链网址生成" +
        "\n" +
        "💻 示例：/suo https://www.baidu.com " +
        "\n" +
        "\n" +
        "3⃣️ 随机音乐推送" +
        "\n" +
        "🎵 示例：/music " +
        "\n" +
        "\n" +
        "4⃣️ 手机号码查询" +
        "\n" +
        "📱 示例：/phone 18888888888 " +
        "\n" +
        "\n" +
        "5⃣️ 舔狗日记生成" +
        "\n" +
        "❤️ 示例：/tg " +
        "\n" +
        "\n" +
        "6⃣️ 毒鸡汤查询" +
        "\n" +
        "🐔 示例：/djt " +
        "\n" +
        "\n" +
        "7⃣️ 随机小姐姐视频查询" +
        "\n" +
        "👩 示例：/video " +
        "\n" +
        "\n" +
        "8⃣️ 每日一言查询" +
        "\n" +
        "📖 示例：/yy " +
        "\n" +
        "\n" +
        "9⃣️ 智慧聊天机器" +
        "\n" +
        "🤖️ 示例：/hi 小帽 " +
        "\n" +
        "\n" +
        "<b>接口数据来源于网络，可能存在查询拥挤情况，可稍后再试～</b>",
    },
  ];
  //未匹配的关键字回复
  let htmlReply =
    "<b>🕹 来自XiaoMaoBot的消息：</b>" +
    "\n" +
    "🪬 本次响应延迟：" +
    getRelayTime(responseTime) +
    "\n" +
    "\n" +
    "<b>呜呜呜，关键字</b> " +
    key +
    "<b> 匹配失败，XiaoMao已采集，正在抓紧学习！</b>";

  // 自动回复关键字判断
  let returnHtmlReply = {
    htmlReply: "",
    state: false,
    dfa: {},
  };
  //关键字排除
  let outsideWord = ["微信公众号『小帽集团』", "@Xiao_MaoMao_bot"];
  // api key
  let commandWord = [
    { api: "/tq", apiId: 0 },
    { api: "/suo", apiId: 1 },
    { api: "/music", apiId: 2 },
    { api: "/phone", apiId: 3 },
    { api: "/tg", apiId: 4 },
    { api: "/djt", apiId: 5 },
    { api: "/video", apiId: 6 },
    { api: "/yy", apiId: 7 },
    { api: "/hi", apiId: 8 },
    { api: "/start", apiId: 10 },
  ];

  if (outsideWord.indexOf(key) != -1) {
    htmlReply =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟：" +
      getRelayTime(responseTime) +
      "\n" +
      "\n" +
      "微信公众号『小帽集团』,欢迎您的关注！记得点赞收藏哟～" +
      "\n" +
      "\n" +
      "推文集：" +
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
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getWeatherApi(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 1:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getLinkShort(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 2:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getMusic();
          returnHtmlReply.state = true;
          break;
        case 3:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getPhoneWhere(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 4:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getTianGou(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 5:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getDuJiTang(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 6:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getVideo(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;

          break;
        case 7:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getYiYan();
          returnHtmlReply.state = true;
          break;
        case 8:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getHelloBot(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 10:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            "Hello,我是 XiaoMao机器人,很高兴认识您！";
          returnHtmlReply.state = true;
          break;
      }
    } else {
      autoReply.forEach((item) => {
        item.keyword.forEach((element) => {
          if (key.indexOf(element) != -1) {
            htmlReply =
              "<b>🕹 来自XiaoMaoBot的消息：</b>" +
              "\n" +
              "🪬 本次响应延迟：" +
              getRelayTime(responseTime) +
              "\n" +
              "\n" +
              item.replyWord;
            returnHtmlReply.state = true;
            return;
          }
        });
      });
    }
  }

  returnHtmlReply.htmlReply = htmlReply;

  return returnHtmlReply;
}

/**
 * 响应延迟计算
 */
function getRelayTime(responseTime) {
  let time = new Date().getTime() - responseTime;
  if (time > 1000) {
    time = (time / 1000).toFixed(2);
    return time + "s";
  }

  return time + "ms";
}

/**
 *
 * 敏感词过滤算法
 * 因gas性能有限，暂只收录122条常用敏感词
 */
function checkSensitiveDFA(content) {
  // 敏感词库
  // 内容已作加密处理base64
  let sensitiveEncodeList = [
    "5pON5aWz",
    "5pON5aW5",
    "5pON5LuW",
    "5Yqg5b6u",
    "5YqgVg==",
    "5Yqgdg==",
    "5Lq65YW9",
    "5Lmx5Lym",
    "5Lmz5rKf",
    "5YW95Lqk",
    "5Y2W5q+U",
    "5Y2W6YC8",
    "5Y+X5a2V",
    "5bCE57K+",
    "5aW45rer",
    "5aaI6YC8",
    "5aaT5aWz",
    "5aiH5ZaY",
    "5amK5a2Q",
    "5aqa5aaZ",
    "5byA6Iue",
    "5oCn5Lqk",
    "5oCn5aW0",
    "5oCn5qyy",
    "5oCn54ix",
    "5oCn6JmQ5b6F",
    "5oOF6Imy",
    "5aupYg==",
    "5aupQg==",
    "5rer5Lmx",
    "5rer5aaH",
    "6I2h5aaH",
    "6IKb5Lqk",
    "57K+5ray",
    "54OC5q+U",
    "54OC6YC8",
    "6IKJ5qOS",
    "6IKJ57yd",
    "6IKP",
    "5aSn6bih5be0",
    "5aSn6Zue5be0",
    "57qm54Ku",
    "5pON5q+U",
    "5pON6YC8",
    "6Zi06IyO",
    "6Zi06JKC",
    "6Zi06YGT",
    "5Lic5Lqs54Ot",
    "5p2x5Lqs54ax",
    "5q+b5rO95Lic",
    "55aG542o",
    "5Lmg6L+R5bmz",
    "6YKT5bCP5bmz",
    "5rGf5rO95rCR",
    "6IOh6ZSm5rab",
    "5Lmg6L+b5bmz",
    "5b2t5Li95aqb",
    "6YSn5bCP5bmz",
    "5YWa5ZCO6JCO",
    "5aSp5a6J6Zeo5bGg5p2A",
    "6KKr5Lit5YWx",
    "5YWx54uX",
    "5Lic5YyX54us56uL",
    "5YWx5Lqn5YWa",
    "5YWa5Lit5aSu",
    "6JeP54us",
    "5Lmx5aW4",
    "5Lmx5Lym57G7",
    "5Lmx5Lym5bCP",
    "5LqC5YCr",
    "5o+S5bGB5bGB",
    "5aeQ5YyF5aSc",
    "6bih5be0",
    "5YW86IGM5LiK6Zeo",
    "6aqa5aaH",
    "6aqa56m0",
    "6K+x5aW4",
    "5o2i5aa7",
    "5rex5ZaJ",
    "5ZC56JCn",
    "6L2u5aW4",
    "5bCP56m0",
    "6bKN6bG8",
    "5aSr5aa75Lqk5o2i",
    "6Zmw5ZSH",
    "6Zmw6YGT",
    "5ZCD57K+",
    "5ZCe57K+",
    "5YaF5bCE",
    "54ix5ray",
    "5rC15Y67",
    "5rC15Y676L2m5LuR5bel5Yqb",
    "5rOVKuWKnw==",
    "5rOVbHVu5Yqf",
    "5pON5LuW",
    "5pON5L2g",
    "5pON5L2g5aaI",
    "5pON6JuL",
    "5pel5L2g5aaI",
    "5pel5q275L2g",
    "5Y675L2g5aaI55qE",
    "5YK76YC8",
    "6Im5",
    "6I2J5rOl6ams",
    "5L2g5aaI55qE",
    "5bmy5L2g5aiY",
    "5oiR5pON5L2g",
    "6Z2g5L2g5aaI",
    "5p2C56eN",
    "5pel6LWa",
    "5Yqe6K+B",
    "5b2p56Wo",
    "5YKs55yg5rC0",
    "5YKs5oOF57KJ",
    "5YKs5oOF6I2v",
    "5YKs5oOF6Jel",
    "5Y+R56Wo5Ye6",
    "5Y+R56Wo5Luj",
    "5Y+R56Wo6ZSA",
    "55m856Wo",
    "6L+35aW46I2v",
    "6L+35oOF5rC0",
    "6L+35oOF6I2v",
    "6L+36Jel",
    "5Luj5Yqe",
  ];

  // 特殊符号过滤逻辑
  let ignoreChars =
    " \t\r\n~!@#$%^&*()_+-=【】、{}|;':\"，。、《》？αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛㈠㈡㈢㈣㈤㈥㈦㈧㈨㈩①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇≈≡≠＝≤≥＜＞≮≯∷±＋－×÷／∫∮∝∞∧∨∑∏∪∩∈∵∴⊥∥∠⌒⊙≌∽√§№☆★○●◎◇◆□℃‰€■△▲※→←↑↓〓¤°＃＆＠＼︿＿￣―♂♀┌┍┎┐┑┒┓─┄┈├┝┞┟┠┡┢┣│┆┊┬┭┮┯┰┱┲┳┼┽┾┿╀╁╂╃└┕┖┗┘┙┚┛━┅┉┤┥┦┧┨┩┪┫┃┇┋┴┵┶┷┸┹┺┻╋╊╉╈╇╆╅╄";
  let ignoreObj = {};
  for (let i = 0, j = ignoreChars.length; i < j; i++) {
    ignoreObj[ignoreChars.charCodeAt(i)] = true;
  }

  //有限机构建方法
  function buildMap(wordList) {
    const result = {};
    for (let i = 0, len = wordList.length; i < len; ++i) {
      let map = result;
      const word = wordList[i];
      for (let j = 0; j < word.length; ++j) {
        const ch = word.charAt(j).toLowerCase();
        if (map[ch]) {
          map = map[ch];
          if (map.empty) {
            break;
          }
        } else {
          if (map.empty) {
            delete map.empty;
          }
          map[ch] = {
            empty: true,
          };
          map = map[ch];
        }
      }
    }
    return result;
  }

  //获取敏感词并解密
  function getSensitiveWords() {
    // GAS 解密方法
    let words =
      sensitiveEncodeList.map((word) =>
        Utilities.newBlob(Utilities.base64Decode(word)).getDataAsString()
      ) || [];

    return words;
  }

  const sensitiveWords = getSensitiveWords() || [];
  let map = buildMap(sensitiveWords) || {};

  //检测机制
  function check(content) {
    const result = [];
    let stack = [];
    let point = map;
    for (let i = 0, len = content.length; i < len; ++i) {
      const code = content.charCodeAt(i); //转Unicode
      if (ignoreObj[code]) {
        continue;
      }
      const ch = content.charAt(i);
      const item = point[ch.toLowerCase()]; //转小写
      if (!item) {
        i = i - stack.length;
        stack = [];
        point = map;
      } else if (item.empty) {
        stack.push(ch);
        result.push(stack.join(""));
        stack = [];
        point = map;
      } else {
        stack.push(ch);
        point = item;
      }
    }
    return result;
  }

  let sensitiveCheckWords = {
    words: [],
    wordLength: 0,
  };
  sensitiveCheckWords.words = check(content);
  sensitiveCheckWords.wordLength = sensitiveCheckWords.words.length;

  return sensitiveCheckWords;
}

/**
 * 用于截取api关键字后查询内容
 * @param key
 * @param keyApi
 * @returns
 */
function getString(key, keyApi) {
  const apiString = key.split(keyApi)[1] || "";
  return apiString.replace(/\s*/g, "");
}
/**
 * 用于api接口参数识别
 * @param commandList
 * @param key
 * @returns
 */
function isApi(commandList, key) {
  let isApiStatus = {
    status: false,
    id: null,
    api: "",
  };
  commandList.forEach((command) => {
    if (key.indexOf(command.api) != -1) {
      isApiStatus.status = true;
      isApiStatus.id = command.apiId;
      isApiStatus.api = command.api;
    }
  });
  return isApiStatus;
}

/**
 * 聊天api✅
 * @param word
 * @returns
 */
function getHelloBot(word) {
  let responseHelloBot = null;
  let returnText = "";

  try {
    responseHelloBot = UrlFetchApp.fetch(
      "http://api.qingyunke.com/api.php?key=free&appid=0&msg=" + word
    );
    let jsonData = JSON.parse(responseHelloBot.getContentText());
    returnText =
      "<b>以下数据来自菲菲，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      jsonData.content;
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }
  return returnText;
}

/**
 * 视频查询
 * @param video
 * @returns
 */
function getVideo() {
  let responseVideo = null;
  let returnText = "";

  // http://tucdn.wpon.cn/api-girl/index.php?wpon=302
  try {
    // responseVideo = UrlFetchApp.fetch(
    //   "https://v.api.aa1.cn/api/api-dy-girl/index.php?aa1=json"
    // );
    // let jsonData = JSON.parse(responseVideo.getContentText());
    let url =
      "http://tucdn.wpon.cn/api-girl/index.php?wpon=" +
      parseInt(Math.random() * 99999);
    returnText =
      "<b>以下数据来自wpon，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "<a href='" +
      url +
      "'>点击播放</a>" +
      "\n";
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 毒鸡汤查询
 * @param music
 * @returns
 */
function getDuJiTang() {
  let responseDuJiTang = null;
  let returnText = "";

  try {
    responseDuJiTang = UrlFetchApp.fetch("http://api.lkblog.net/ws/api.php");
    let jsonData = JSON.parse(responseDuJiTang.getContentText());
    returnText =
      "<b>以下数据来自LK，由XiaoMao加工：</b>" + "\n" + "\n" + jsonData.data;
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 舔狗日记生成 ✅
 * @param id
 * @returns
 */
function getTianGou() {
  let responseTianGou = null;
  let returnText = "";

  try {
    responseTianGou = UrlFetchApp.fetch(
      "https://api.ixiaowai.cn/tgrj/index.php"
    );
    returnText =
      "<b>以下数据来自小歪，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseTianGou.getContentText();
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}

/**
 * 查询手机号码归属地✅
 * @param phone
 * @returns
 */
function getPhoneWhere(phone) {
  let responsePhone = null;
  let returnText = "";

  if (phone == "") {
    returnText = "查询的手机号为空，请在关键字后面加上手机号码再试～";
    return returnText;
  }

  try {
    responsePhone = UrlFetchApp.fetch(
      "https://www.mxnzp.com/api/mobile_location/aim_mobile?mobile=" +
        phone +
        "&app_id=rgihdrm0kslojqvm&app_secret=WnhrK251TWlUUThqaVFWbG5OeGQwdz09"
    );

    let jsonData = JSON.parse(responsePhone.getContentText());

    returnText =
      "<b>以下数据来自Roll，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "手机号码：" +
      jsonData.data.mobile +
      "\n" +
      "归属地：" +
      jsonData.data.province +
      "\n" +
      "运营商：" +
      jsonData.data.carrier;
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 一言查询 ✅
 * @returns
 */
function getYiYan() {
  let responseYiYan = null;
  let returnText = "";

  try {
    responseYiYan = UrlFetchApp.fetch("https://api.ixiaowai.cn/api/ylapi.php");
    returnText =
      "<b>以下数据来自小歪，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseYiYan.getContentText();
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 随机歌曲 ✅
 * @param text
 * @returns
 */
function getMusic() {
  let responseMusic = null;
  let returnText = "";

  try {
    responseMusic = UrlFetchApp.fetch(
      "https://anime-music.jijidown.com/api/v2/music"
    );
    let jsonData = JSON.parse(responseMusic.getContentText());
    returnText =
      "<b>以下数据来自Anime，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "歌名：" +
      jsonData.res.anime_info.title +
      "\n" +
      "\n" +
      "歌手：" +
      jsonData.res.author +
      "\n" +
      "\n" +
      "简介：" +
      jsonData.res.anime_info.desc +
      "\n" +
      "\n" +
      "<a href='" +
      jsonData.res.play_url +
      "'>点击播放</a>" +
      "\n";
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 短网址生成✅
 * @param link
 * @returns
 */
function getLinkShort(link) {
  let responseLinkShort = null;
  let returnText = "";

  try {
    let data = {
      url: link,
      token: "18a709553844b10c078c91bde2ec624f",
      mark: "来自pc网页",
      env_code: "self",
    };
    let option = {
      method: "post",
      payload: JSON.stringify(data),
    };
    responseLinkShort = UrlFetchApp.fetch(
      "http://s.nfangbian.com/shortlink/create",
      option
    );
    if (JSON.parse(responseLinkShort.getContentText()).code == 0) {
      returnText =
        "<b>以下数据来自短链，由XiaoMao加工：</b>" +
        "\n" +
        "\n" +
        "<b>生成的短链接:</b>" +
        JSON.parse(responseLinkShort.getContentText()).data.short_url;
    } else {
      returnText =
        "<b>" + JSON.parse(responseLinkShort.getContentText()).msg + "</b>";
    }
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}
/**
 * 天气api查询✅
 * @param location
 * @returns
 */
function getWeatherApi(location) {
  let responseWeather = null;
  let returnText = "";

  try {
    responseWeather = UrlFetchApp.fetch(
      "https://query.asilu.com/weather/baidu/?city=" + location
    );
    let jsonData = JSON.parse(responseWeather.getContentText());
    if (jsonData.weather.length) {
      returnText =
        "<b>以下数据来自爱思路，由XiaoMao加工：" +
        jsonData.city +
        "天气（数据更新时间:" +
        jsonData.date +
        jsonData.update_time +
        "）</b>" +
        "\n";

      jsonData.weather.forEach((el) => {
        returnText =
          returnText +
          "\n" +
          "\n" +
          el.date +
          "\n" +
          "☁️天气状况：" +
          el.weather +
          "\n" +
          "☁️温度：" +
          el.temp +
          "\n" +
          "☁️风向：" +
          el.wind;
      });
    } else {
      returnText = "<b>Oh! 出错了！</b>";
    }
  } catch (e) {
    returnText =
      "你的指令已成功发送，但由于运营商网络管制，本次通信被异常中止。";
  }

  return returnText;
}

/**
 * 将讯息进行Google表格内存储
 * @param {*} MESSAGE
 */
function setStorage(MESSAGE, TYPE) {
  let time = getNowDate();
  let userID,
    userName,
    userAllName,
    messageSource,
    messageSourceID,
    messageType,
    messageContent = "";
  if (TYPE != "MESSAGEBACK") {
    userID = MESSAGE.message.from.id.toString();

    userName =
      MESSAGE.message.from.username != undefined
        ? "@" + MESSAGE.message.from.username
        : "🈚️用户名";

    userAllName =
      (MESSAGE.message.from.first_name != undefined
        ? MESSAGE.message.from.first_name
        : "") +
      (MESSAGE.message.from.last_name != undefined
        ? MESSAGE.message.from.last_name
        : "");

    if (userAllName == "") {
      userAllName = "该用户未设置昵称";
    }
    messageContent = MESSAGE.message.text;

    messageSource =
      (MESSAGE.message.chat.type == "supergroup"
        ? MESSAGE.message.chat.title
        : "") +
      "(" +
      (MESSAGE.message.chat.type == "supergroup"
        ? "群聊消息"
        : MESSAGE.message.chat.type == "private"
        ? "私聊消息"
        : "未知渠道") +
      ")";

    messageSourceID = MESSAGE.message.chat.id.toString();
  }

  messageType =
    TYPE == "POSTDATA"
      ? "主动发起"
      : TYPE == "CALLBACK"
      ? "键盘回调"
      : "--自动回复";

  let spreadSheet = SpreadsheetApp.openById(EXECID);
  let Sheet = spreadSheet.getSheetByName(EXECNAME);
  let lastSheetRow = spreadSheet.getLastRow();

  //发起时间
  Sheet.getRange(lastSheetRow + 1, 1).setValue(time);
  //用户ID
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 2).setValue(userID)
    : "";
  //用户名称
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 3).setValue(userName)
    : "";
  // 用户昵称
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 4).setValue(userAllName)
    : "";
  // 消息类型
  Sheet.getRange(lastSheetRow + 1, 5).setValue(messageType);
  // 消息来源
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 6).setValue(messageSource)
    : "";
  // 消息来源ID
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 7).setValue(messageSourceID)
    : "";
  // 消息内容
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 8).setValue(messageContent)
    : "";
  // 消息JSON
  Sheet.getRange(lastSheetRow + 1, 9).setValue(JSON.stringify(MESSAGE));
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
