/**
 * author ： @XiaoMao
 * # 小版本更新请查看更新日志 ｜ 或加入xiaomao组织⬇️
 * # 微信公众号 【小帽集团】
 * # XiaoMao · Tg频道频道：https://t.me/xiaomaoJT
 *
 * @4.5-504
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

// ------------------------- 预定义参数·请补充对应内容·必填 -----------------
// Google EXEC ID - 谷歌表格ID
var EXECID = "";
// Google EXEC ID - 谷歌表格 工作表名
var EXECNAME = "";
// Telegram BOT ID key - tg机器人Token
var BOTID = "";

// ------------------------- 自定义参数·请按需修改参数·引号内留空此功能失效 -----------------
// 用于推送主人消息 取主人tg id - 私人消息主动功能必须填写此项
var KingId = "";
// 1 全部类型
// 2 群聊 + 私聊类型
// 3 私聊类型
// 4 群聊类型
// 5 关闭
var KingType = 1;
// 1 推送详情（原图片、视频、音频、贴纸等）
// 0 仅推送基础消息
var KingInfo = 1;
//取 bot id 用于识别引用消息
var botIdAlone = "";
// 用于过滤需要排除捕捉的群组信息
// 请填入群组id,多个用,间隔 如 ['22222','11111]
var forGotList = [];

// ------------------------- 默认通用参数·无需改动 -----------------
// 用于判断消息类型 - inlinekey board回调 or 主动消息
// 1 callback
// 2 new member
// 3 left member
var MESSAGETYPE = 0;
//接入时间戳
var responseTime = "";
// 用于承接返回数据
var dealMessage = {};


// ------------------------- 核心调用函数 -----------------


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
  let data = {
    method: "post",
    payload: payload,
  };

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
    [{ text: "懒人配置" }, { text: "免费节点" }, { text: "订阅转换" }],
    [{ text: "图文教程" }, { text: "脚本合集" }, { text: "广告拦截" }],
    [
      { text: "接口查询" },
      { text: "资源仓库" },
      { text: "电报解禁" },
    ],
  ];
  // 定义在线内联键盘
  let followMessageKeyboard = [
    [
      { text: "QX仓库", url: "https://github.com/xiaomaoJT/QxScript" },
      { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
      { text: "Clash仓库", url: "https://github.com/xiaomaoJT/clash" },
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
      "🪬 本次响应延迟(/delay)：" +
      getRelayTime(responseTime) +
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
        "🪬 本次响应延迟(/delay)：" +
        getRelayTime(responseTime) +
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
      "🪬 本次响应延迟(/delay)：" +
      getRelayTime(responseTime) +
      "\n" +
      "\n" +
      "<b>👏👏👏 热烈欢迎小伙伴 </b> " +
      memberList +
      "<b> 的到来，入群不能水经验，但可以求罩！</b>";

    let leftMessage =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟(/delay)：" +
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
  try {
    if (userMessage.message && userMessage.message.hasOwnProperty("text")) {
      if (dealMessage.htmlReply) {
        let HTML_REPLY =
          dealMessage.htmlReply == "getTgId"
            ? "<b>🕹 来自XiaoMaoBot的消息：</b>" +
              "\n" +
              "🪬 本次响应延迟(/delay)：" +
              getRelayTime(responseTime) +
              "\n" +
              "\n" +
              "你的Tg_Chat_ID ： " +
              "<b>" +
              userMessage.message.from.id.toString() +
              "</b>"
            : dealMessage.htmlReply;

        payloadPostData = {
          method: "sendMessage",
          chat_id: messageUserID,
          text: HTML_REPLY,
          reply_to_message_id: messageReplyID,
          parse_mode: "HTML",
          // reply_markup: JSON.stringify(keyboardParams),
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
          "🪬 本次响应延迟(/delay)：" +
          getRelayTime(responseTime) +
          "\n" +
          "\n" +
          "<b>拦截到</b> " +
          " @" +
          userMessage.message.from.username +
          " 消息中含" +
          dealMessage.dfa.wordLength +
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
        userMessage.message.text == "微信公众号『小帽集团』" ||userMessage.message.text == "资源仓库" ||
        userMessage.message.text.indexOf("Mao") != -1
      ) {
        payloadPostData.reply_markup = JSON.stringify(keyboardFollowParams);
      }
    }
  } catch (error) {
    if (userMessage.message.chat.type == "private") {
      let data = {
        method: "post",
        payload: payloadPostData,
      };
      UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
    }
  }

  payload = payloadPostData;
  setStorage(userMessage, "POSTDATA");

  pushDataToKing(userMessage);
  return payload;
}

/**
 * 用于处理用户关键字自动回复
 * keyword值唯一不可重复，用于匹配用户关键字是否包含，并触发自动回复
 * @param key 用户消息关键字
 */
function processReplyWord(key, useId, userJson) {
  //关键字及回复列表
  let autoReply = [
    {
      keyword: ["懒人规则", "懒人配置"],
      replyWord:
        "<b>iPhone/iPad设备 - XiaoMao懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/general/QX_XiaoMao_CN.conf'>1⃣️ 通用版本·中文版·XiaoMao推荐</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/custom/QX_XiaoMao_CN.conf'>2⃣️ 自定义版·中文版</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/general/QX_XiaoMao.conf'>3⃣️ 通用版本·英文版</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/iOS/custom/QX_XiaoMao.conf'>4⃣️ 自定义版·英文版</a>" +
        "\n" +
        "\n" +
        "<b>Mac M芯片设备 - XiaoMao懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/macOS/QX_XiaoMao_CN.conf'>1⃣️ Mac版·中文版</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/lazy/macOS/QX_XiaoMao.conf'>2⃣️ Mac版·英文版</a>" +
        "\n" +
        "\n" +
        "<b>Clash版本（Win/Mac/Android） - XiaoMao懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/clash/main/yaml/Clash_XiaoMao.yaml'>1⃣️ Clash·科学版</a>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/clash/main/yaml/Clash_Cdn_XiaoMao.yaml'>2⃣️ Clash·国内版</a>" +
        "\n" +
        "<a href='https://static-mp-4c1955c1-4e3f-4ed7-9f2b-ea2165e28195.next.bspapp.com/xiaomao-clash/index.html#/'>3⃣️ Clash配置在线生成·XiaoMao推荐</a>" +
        "\n" +
        "\n" +
        "<b>Stash版本 - XiaoMao懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/stash/main/config/XiaoMao_Stash.yaml'>1⃣️ Stash·测试版</a>" +
        "\n" +
        "\n" +
        "<b>Surge版本 - XiaoMao懒人规则</b>" +
        "\n" +
        "<a href='https://raw.githubusercontent.com/xiaomaoJT/Surge/main/config/XiaoMao_Surge.conf'>1⃣️ Surge·Mac版</a>" +
        "\n" +
        "\n" +
        "<b><a href='https://t.me/xiaomaoJT/219'>🎏 更多XiaoMao资源汇总</a></b>" +
        "\n" +
        "\n" +
        "<a href='https://github.com/xiaomaoJT/QxScript'>💊 xiaomao懒人规则适用人群及使用教程，更多教程点击菜单 图文教程</a>",
    },
    {
      keyword: ["网易云", "免费节点"],
      replyWord:
        "永久节点订阅及网易云节点已内置于XiaoMao懒人规则中" +
        "\n" +
        "\n" +
        "点击菜单" +
        "<b> 懒人配置 </b>" +
        "以获取各版本懒人规则" +
        "\n" +
        "点击菜单" +
        "<b> 订阅转换 </b>" +
        "以获取转换地址" +
        "\n" +
        "\n" +
        "<b>【机场节点】</b>" +
        "\n" +
        "<a href='https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-Forever'><b>1⃣️ XiaoMao-Forever</b></a>" +
        "\n" +
        "<a href='https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-FE-Clash'><b>2⃣️ XiaoMao-Forever-Clash</b></a>" +
        "\n" +
        "<a href='https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-FE-Surge'><b>3⃣️ XiaoMao-Forever-Surge</b></a>" +
        "\n" +
        "\n" +
        "<b>【网易云节点】</b>" +
        "\n" +
        "<a href='https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-NM'><b>1⃣️ XiaoMao-NM</b></a>" +
        "\n" +
        "\n" +
        "<a href='https://t.me/xiaomaoJT/77'>🎸 网易云音乐解锁教程</a>" +
        "\n" +
        "\n" +
        "<b>订阅地址可适用于QX及Shadowrocket，转换无法使用，Clash及Stash请使用Clash专版；公开订阅采集于网络，受多方影响速度勉强。</b>",
    },
    {
      keyword: ["订阅转换", "转换"],
      replyWord:
        "1⃣️ <a href='https://t.me/QuanXNews/110'>Quantumult X资源解析器 ✅推荐</a>" +
        "\n" +
        "\n" +
        "2⃣️ <a href='https://t.me/cool_scripts/200'>Sub-Store本地订阅 ✅多订阅推荐</a>" +
        "\n" +
        "\n" +
        "3⃣️ 在线订阅转换：" +
        "\n" +
        "<a href='https://dove.589669.xyz/web'>① Clash | Quantumult X | Surge 转换</a>" +
        "\n" +
        "<a href='https://sub.pet'>② Subscription 转换</a>" +
        "\n" +
        "<a href='https://nexconvert.com'>③ 奶昔 转换</a>" +
        "\n" +
        "<a href='https://sub.xeton.dev'>④ 菜市场 转换</a>" +
        "\n" +
        "\n" +
        "<b>在线订阅转换皆有可能存在泄漏风险，建议在线转换使用机场自带的订阅转换，对SubStore本地转换不熟悉？点击菜单 图文教程</b>",
    },
    {
      keyword: ["广告拦截"],
      replyWord:
        "💊 <a href='https://t.me/xiaomaoJT/314'><b>XiaoMao去广告模块介绍</b></a>" +
        "\n" +
        "\n" +
        "🌈 <a href='https://t.me/xiaomaoJT/540'><b>XiaoMao去广告图文视频教程</b></a>" +
        "\n" +
        "\n" +
        "1⃣️ <a href='https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%0A%20%20%20%20%22filter_remote%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%22https%3A%2F%2Fraw.githubusercontent.com%2FxiaomaoJT%2FQxScript%2Fmain%2Ffilter%2FShuntCorrection.list%2C%20tag%3D%E8%A7%84%E5%88%99%E4%BF%AE%E6%AD%A3%2C%20update-interval%3D172800%2C%20opt-parser%3Dfalse%2C%20%20enabled%3Dtrue%22%0A%20%20%20%20%5D%0A%7D'>分流修正(一键导入/更新)</a>" +
        "\n" +
        "\n" +
        "2⃣️ <a href='https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%0A%20%20%20%20%22filter_remote%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%22https%3A%2F%2Fraw.githubusercontent.com%2FxiaomaoJT%2FQxScript%2Fmain%2Ffilter%2FAdAway.list%2C%20tag%3D%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%C2%B7%E5%BA%94%E7%94%A8%2Cupdate-interval%3D604800%2C%20opt-parser%3Dfalse%2C%20enabled%3Dtrue%22%0A%20%20%20%20%5D%0A%7D'>分流拒绝(一键导入/更新)</a>" +
        "\n" +
        "\n" +
        "3⃣️ <a href='https://quantumult.app/x/open-app/add-resource?remote-resource=%7B%0A%20%20%20%20%22rewrite_remote%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%22https%3A%2F%2Fraw.githubusercontent.com%2FxiaomaoJT%2FQxScript%2Fmain%2Frewrite%2Fscript%2FQX_XiaoMao_rw3.conf%2C%20tag%3D%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%C2%B7%E5%BA%94%E7%94%A8%C2%B7XiaoMao%E9%87%8D%E5%86%993%2C%20update-interval%3D172800%2C%20opt-parser%3Dfalse%2C%20enabled%3Dfalse%22%0A%20%20%20%20%5D%0A%7D'>重写拒绝(一键导入/更新)</a>" +
        "\n" +
        "\n" +
        "4⃣️ <b>Clash去广告，请使用XiaoMaoClash配置网站生成专属懒人配置！点击菜单 图文教程 获取教程8⃣️_Clash篇</b>" +
        "\n" +
        "\n" +
        "5⃣️ <a href='https://t.me/xiaomaoJT/147'>TG去广告</a>" +
        "\n" +
        "\n" +
        "<b>更多小众软件广告拦截，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #广告截杀 </b>" +
        "\n" +
        "<b>去广告模块日更补充，可能存在误杀，请于XiaoMao群聊内反馈修正！</b>",
    },
    {
      keyword: ["图文教程"],
      replyWord:
        "💊  <b>QX & Clash & TgBot 图文教程</b>" +
        "\n" +
        "\n" +
        "🌈 <a href='http://s.nfangbian.com/3wo'><b>XiaoMao推文合集</b></a>" +
        "\n" +
        "\n" +
        "<b>1⃣️ 入门篇</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/3wp'><b>下载、认识QX、上手使用</b></a>" +
        "\n" +
        "\n" +
        "<b>2⃣️ 进阶篇一</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/3wq'><b>配置General、DNS、Policy策略组教程</b></a>" +
        "\n" +
        "\n" +
        "<b>3⃣️ 进阶篇二</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/3wr'><b>配置分流教程</b></a>" +
        "\n" +
        "\n" +
        "<b>4⃣️ 进阶篇三</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/3ws'><b>配置重写教程</b></a>" +
        "\n" +
        "\n" +
        "<b>5⃣️ 番外篇</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/3wt'><b>配置BoxJs、SubStore教程</b></a>" +
        "\n" +
        "\n" +
        "<b>6⃣️ 高阶篇一</b>" +
        "\n" +
        "<a href='https://mp.weixin.qq.com/s/8c-tn6OaSGCVXUo2DIWiww'><b>Task脚本制作教程</b></a>" +
        "\n" +
        "\n" +
        "<b>7⃣️ 高阶篇二</b>" +
        "\n" +
        "<a href='https://mp.weixin.qq.com/s/B_zMFU6vsAeE_IKyLXddtA'><b>广告拦截教程</b></a>" +
        "\n" +
        "\n" +
        "\n" +
        "<b>8⃣️ Clash篇_XMC</b>" +
        "\n" +
        "<a href='http://s.nfangbian.com/2Ru'><b>Clash自定义配置教程 For XiaoMaoClash</b></a>" +
        "\n" +
        "\n" +
        "\n" +
        "<b>9⃣️ Tg机器人篇_TgBot</b>" +
        "\n" +
        "<a href='https://github.com/xiaomaoJT/TgBot/blob/main/COURSE.md'><b>Tg机器人免费搭建教程</b></a>" +
        "\n" +
        "\n" +
        "\n" +
        "<b>🔟 其它教程</b>" +
        "\n" +
        "🥎 <a href='https://github.com/xiaomaoJT/clash'><b>XiaoMao_Clash版本配置教程及软件下载</b></a>" +
        "\n" +
        "🧿 <a href='http://s.nfangbian.com/2P8'><b>QX本地脚本使用教程</b></a>" +
        "\n" +
        "\n" +
        "<b>欢迎点赞评论，感谢支持！</b>",
    },
    {
      keyword: ["脚本合集"],
      replyWord:
        "💊 <b>XiaoMao脚本合集</b>" +
        "\n" +
        "\n" +
        "🧲 <a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/rewrite/boxJS/XiaoMao.json'>XiaoMao_BoxJs辅助订阅</a>" +
        "\n" +
        "❤️‍🔥 <a href='https://raw.githubusercontent.com/xiaomaoJT/QxScript/main/rewrite/boxJS/XiaoMaoAutoTask.json'>XiaoMao_自动任务订阅</a>" +
        "\n" +
        "\n" +
        "<b>XiaoMao脚本合集快速导航</b>" +
        "\n" +
        "<b>【点击/回复】指令获取相关脚本</b>" +
        "\n" +
        "\n" +
        "🚇【会员脚本】 /js_vip" +
        "\n" +
        "🚂【辅助脚本】 /js_ass" +
        "\n" +
        "🚁【自动任务】 /js_auto" +
        "\n" +
        "🚗【快捷指令】 /js_st" +
        "\n" +
        "\n" +
        "<b>带有「BoxJS」标签支持通过XiaoMaoBoxJS自定义配置，对脚本、BoxJS不熟悉？点击菜单 图文教程</b>。" +
        "\n" +
        "更多超级脚本，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #优质脚本 。",
    },
    {
      keyword: ["/js_vip", "会员脚本"],
      replyWord:
        "🚇<b>XiaoMao 【会员脚本】 合集</b>" +
        "\n" +
        "\n" +
        "① <a href='https://t.me/XiaoMaoScript/7'>「彩云天气」</a>" +
        "\n" +
        "② <a href='https://t.me/XiaoMaoScript/8'>「百度网盘」</a>" +
        "\n" +
        "③ <a href='https://t.me/XiaoMaoScript/9'>「黄油相机」</a>" +
        "\n" +
        "④ <a href='https://t.me/XiaoMaoScript/10'>「B612咔叽」</a>" +
        "\n" +
        "⑤ <a href='https://t.me/XiaoMaoScript/11'>「WPS」</a>" +
        "\n" +
        "⑥ <a href='https://t.me/XiaoMaoScript/12'>「扫描全能王」</a>" +
        "\n" +
        "⑦ <a href='https://t.me/XiaoMaoScript/13'>「Xmind」</a>" +
        "\n" +
        "⑧ <a href='https://t.me/XiaoMaoScript/14'>「今日热榜」</a>" +
        "\n" +
        "⑨ <a href='https://t.me/XiaoMaoScript/15'>「阿里云盘」</a>" +
        "\n" +
        "⑩ <a href='https://t.me/XiaoMaoScript/16'>「NYMF」</a>" +
        "\n" +
        "⑪ <a href='https://t.me/XiaoMaoScript/17'>「微博/微博轻享版」</a>" +
        "\n" +
        "⑫ <a href='https://t.me/XiaoMaoScript/18'>「AllMyBatteries」</a>" +
        "\n" +
        "⑬ <a href='https://t.me/XiaoMaoScript/19'>「Picsew专业版」</a>" +
        "\n" +
        "⑭ <a href='https://t.me/XiaoMaoScript/20'>「公考雷达」</a>" +
        "\n" +
        "⑮ <a href='https://t.me/XiaoMaoScript/21'>「堆糖」</a>" +
        "\n" +
        "⑯ <a href='https://t.me/XiaoMaoScript/22'>「MyJumpLab」</a>" +
        "\n" +
        "⑯ <a href='https://t.me/XiaoMaoScript/23'>「Pillow」</a>" +
        "\n" +
        "⑰ <a href='https://t.me/XiaoMaoScript/24'>「问真八字」</a>" +
        "\n" +
        "⑱ <a href='https://t.me/XiaoMaoScript/25'>「解剖大师」</a>" +
        "\n" +
        "⑲ <a href='https://t.me/XiaoMaoScript/26'>「Instapaper」</a>" +
        "\n" +
        "⑳ <a href='https://t.me/XiaoMaoScript/27'>「日杂相机」</a>" +
        "\n" +
        "㉑ <a href='https://t.me/XiaoMaoScript/28'>「谜底时钟」</a>" +
        "\n" +
        "㉒ <a href='https://t.me/XiaoMaoScript/29'>「BHPro」</a>" +
        "\n" +
        "㉓ <a href='https://t.me/XiaoMaoScript/30'>「目标地图」</a>" +
        "\n" +
        "㉔ <a href='https://t.me/XiaoMaoScript/31'>「Agenda」</a>" +
        "\n" +
        "㉕ <a href='https://t.me/XiaoMaoScript/32'>「Fin」</a>" +
        "\n" +
        "㉖ <a href='https://t.me/XiaoMaoScript/33'>「快对」</a>" +
        "\n" +
        "㉗ <a href='https://t.me/XiaoMaoScript/34'>「DailyArt」</a>" +
        "\n" +
        "㉘ <a href='https://t.me/XiaoMaoScript/35'>「Alarmy」</a>" +
        "\n" +
        "㉙ <a href='https://t.me/XiaoMaoScript/36'>「1Blocker」</a>" +
        "\n" +
        "㉚ <a href='https://t.me/XiaoMaoScript/37'>「SleepCycle」</a>" +
        "\n" +
        "㉛ <a href='https://t.me/XiaoMaoScript/38'>「幻休」</a>" +
        "\n" +
        "㉜ <a href='https://t.me/XiaoMaoScript/39'>「小睡眠」</a>" +
        "\n" +
        "\n" +
        "<b>带有「BoxJS」标签支持通过XiaoMaoBoxJS自定义配置，对脚本、BoxJS不熟悉？点击菜单 图文教程</b>。" +
        "\n" +
        "更多超级脚本，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #优质脚本 。",
    },
    {
      keyword: ["/js_ass", "辅助脚本"],
      replyWord:
        "🚂 <b>XiaoMao 【辅助脚本】 合集</b>" +
        "\n" +
        "\n" +
        "① <a href='https://t.me/XiaoMaoScript/40'>「Spotify歌词翻译」</a>" +
        "\n" +
        "② <a href='https://t.me/XiaoMaoScript/41'>「百度贴吧源址捕获」</a>" +
        "\n" +
        "③ <a href='https://t.me/XiaoMaoScript/42'>「酷安源址捕获」</a>" +
        "\n" +
        "④ <a href='https://t.me/xiaomaoJT/16'>「京东比价」</a>" +
        "\n" +
        "⑤ <a href='https://t.me/XiaoMaoScript/7'>「彩云天气Token捕获」</a>" +
        "\n" +
        "⑥ <a href='https://t.me/XiaoMaoScript/43'>「小小签到Token捕获」</a>" +
        "\n" +
        "⑦ <a href='https://t.me/XiaoMaoScript/44'>「言橘资源捕获」</a>" +
        "\n" +
        "\n" +
        "<b>辅助脚本定义为能力提升与净化，对脚本、BoxJS不熟悉？点击菜单 图文教程</b>。" +
        "\n" +
        "更多超级脚本，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #优质脚本 。",
    },
    {
      keyword: ["/js_auto", "自动任务"],
      replyWord:
        "🚁 <b>XiaoMao 【自动任务】 脚本合集</b>" +
        "\n" +
        "\n" +
        "① <a href='https://t.me/XiaoMaoScript/48'>「二次元图片」</a>" +
        "\n" +
        "② <a href='https://t.me/XiaoMaoScript/49'>「每日BING图」</a>" +
        "\n" +
        "③ <a href='https://t.me/XiaoMaoScript/50'>「年度节日」</a>" +
        "\n" +
        "④ <a href='https://t.me/XiaoMaoScript/51'>「采精车」</a>" +
        "\n" +
        "⑤ <a href='https://t.me/XiaoMaoScript/52'>「每日新闻60s·文字版」</a>" +
        "\n" +
        "⑥ <a href='https://t.me/XiaoMaoScript/53'>「每日油价」</a>" +
        "\n" +
        "⑦ <a href='https://t.me/XiaoMaoScript/54'>「实时热榜」</a>" +
        "\n" +
        "⑧ <a href='https://t.me/XiaoMaoScript/55'>「星座运势」</a>" +
        "\n" +
        "⑨ <a href='https://t.me/XiaoMaoScript/56'>「豆瓣电影」</a>" +
        "\n" +
        "⑩ <a href='https://t.me/XiaoMaoScript/57'>「每日新闻60s·图片版」</a>" +
        "\n" +
        "⑪ <a href='https://t.me/XiaoMaoScript/58'>「摸鱼人日历」</a>" +
        "\n" +
        "⑫ <a href='https://t.me/XiaoMaoScript/59'>「职场人日历」</a>" +
        "\n" +
        "⑬ <a href='https://t.me/XiaoMaoScript/60'>「实时线报」</a>" +
        "\n" +
        "⑭ <a href='https://t.me/XiaoMaoScript/61'>「台风监测」</a>" +
        "\n" +
        "⑮ <a href='https://t.me/XiaoMaoScript/43'>「小小签到刷金币」</a>" +
        "\n" +
        "⑯ <a href='https://t.me/XiaoMaoScript/62'>「全国辐射监测」</a>" +
        "\n" +
        "⑰ <a href='https://t.me/XiaoMaoScript/63'>「福彩查询」</a>" +
        "\n" +
        "⑱ <a href='https://t.me/XiaoMaoScript/64'>「体彩查询」</a>" +
        "\n" +
        "⑲ <a href='https://t.me/XiaoMaoScript/65'>「今日金价」</a>" +
        "\n" +
        "\n" +
        "<b>带有「BoxJS」标签支持通过XiaoMaoBoxJS自定义配置，对脚本、BoxJS不熟悉？点击菜单 图文教程</b>。" +
        "\n" +
        "更多超级脚本，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #优质脚本 。",
    },
    {
      keyword: ["/js_st", "快捷指令"],
      replyWord:
        "🚗 <b>XiaoMao 【快捷指令】 合集</b>" +
        "\n" +
        "\n" +
        "① <a href='https://t.me/XiaoMaoScript/66'>「XiaoMao充电助手」</a>" +
        "\n" +
        "② <a href='https://t.me/XiaoMaoScript/43'>「小小签到刷金币」</a>" +
        "\n" +
        "③ <a href='https://t.me/XiaoMaoScript/67'>「举牌小人生成器」</a>" +
        "\n" +
        "④ <a href='https://t.me/XiaoMaoScript/68'>「OCR截图识屏翻译」</a>" +
        "\n" +
        "⑤ <a href='https://t.me/XiaoMaoScript/48'>「二次元图片」</a>" +
        "\n" +
        "⑥ <a href='https://t.me/XiaoMaoScript/54'>「全网热榜」</a>" +
        "\n" +
        "\n" +
        "<b>🧲<a href='http://s.nfangbian.com/3Gz'>【帽教程】快捷指令脚本制作教程</a></b>" +
        "\n" +
        "\n" +
        "更多超级脚本，请见<a href='https://t.me/xiaomaoJT'>XiaoMao频道</a>内话题标签 #优质脚本 。",
    },
    {
      keyword: ["/delay"],
      replyWord:
        "💊 <b>XiaoMao_TgBot响应延迟说明</b>" +
        "\n" +
        "\n" +
        "XiaoMaoBot响应延迟主要取决于四个方面" +
        "\n" +
        "1⃣️ 算法匹配效率" +
        "\n" +
        "2⃣️ GAS网络延迟及网络管制" +
        "\n" +
        "3⃣️ 接口请求延迟" +
        "\n" +
        "4⃣️ 手机外网网速" +
        "\n" +
        "5⃣️ 查询队列" +
        "\n" +
        "GAS及接口皆来源于公共服务器，高峰期可能出现较高延迟状态。",
    },
    {
      keyword: ["/manage", "私有指令", "隐藏指令"],
      replyWord:
        "💊 <b>XiaoMao机器人超级群管功能说明</b>" +
        "\n" +
        "\n" +
        "\n" +
        "<b>🤖XiaoMaoBot超级群管功能：</b>" +
        "\n" +
        "① 群员入群检测/退群欢送" +
        "\n" +
        "② 违规言论/广告词汇自动检测、删除、提醒" +
        "\n" +
        "③ 群员封禁、解封、禁言管理" +
        "\n" +
        "④ 个人ID查询【隐藏指令：/myid 】" +
        "\n" +
        "\n" +
        "\n" +
        "<b>🤖管理员私有指令：</b>" +
        "\n" +
        "⓵ 主动回复" +
        "\n" +
        "【功能描述】通过XiaoMao机器人主动回复 私聊/群聊 消息" +
        "\n" +
        "【私有指令】/reply ⁺ 回复内容" +
        "\n" +
        "\n" +
        "⓶ 群员封禁" +
        "\n" +
        "【功能描述】通过XiaoMao机器人主动封禁违规群员，封禁时长分为三种（1、N分钟：Nm 如30分钟：30m ；2、N天：Nd 如30天：30d ；3、不填：永久封禁）" +
        "\n" +
        "【私有指令】/ban ⁺ 时长" +
        "\n" +
        "\n" +
        "⓷ 群员解封" +
        "\n" +
        "【功能描述】通过XiaoMao机器人主动解除群员封禁" +
        "\n" +
        "【私有指令】/unban" +
        "\n" +
        "\n" +
        "⓸ 群员禁言" +
        "\n" +
        "【功能描述】通过XiaoMao机器人主动禁言违规群员，封禁时长分为三种（1、N分钟：Nm 如30分钟：30m ；2、N天：Nd 如30天：30d ；3、不填：永久封禁）" +
        "\n" +
        "【私有指令】/restrict ⁺ 时长",
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
      keyword: ["电报解禁", "汉化", "中文"],
      replyWord:
        "💊  <a href='https://t.me/xiaomaoJT/15'>Telegram解除敏感群组限制教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/5'>解除 +86 私聊限制教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/147'>Telegram屏蔽私聊广告教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/6'>Telegram设置中文教程</a>" +
        "\n" +
        "💊  <a href='https://t.me/xiaomaoJT/171'>Telegram多彩主题</a>" +
        "\n" +
        "💊  <a href='https://t.me/translation_zhcncc/92439'>更多Telegram教程</a>" +
        "\n" +
        "\n" +
        "<b>💊  <a href='https://mp.weixin.qq.com/s/Ehi23fjFpeUc2DocnQb4hw'>Apple礼品卡购买教程</a></b>" +
        "\n" +
        "<b>💊  <a href='https://mp.weixin.qq.com/s/YzYsF9QyHZVJK9P7bsrURQ'>外区Apple ID免费注册教程</a></b>",
    },
    {
      keyword: ["接口查询"],
      replyWord:
        "🌥 天气状况查询" +
        "\n" +
        "🈯️➡️ /tq⁺地区" +
        "\n" +
        "\n" +
        "🔥 热榜查询" +
        "\n" +
        "🈯️➡️ /hot" +
        "\n" +
        "\n" +
        "🔗 短链网址生成" +
        "\n" +
        "🈯️➡️ /suo⁺https://www.google.com" +
        "\n" +
        "\n" +
        "🥁 随机音乐推送" +
        "\n" +
        "🈯️➡️ /music" +
        "\n" +
        "\n" +
        "☎️ 手机号码查询" +
        "\n" +
        "🈯️➡️ /phone⁺电话号码" +
        "\n" +
        "\n" +
        "🐶 舔狗日记生成" +
        "\n" +
        "🈯️➡️ /tg" +
        "\n" +
        "\n" +
        "🎬 豆瓣电影排行" +
        "\n" +
        "🈯️➡️ /db" +
        "\n" +
        "\n" +
        "🌌 星座运势查询" +
        "\n" +
        "🈯️➡️ /xz" +
        "\n" +
        "\n" +
        "🐔 毒鸡汤查询" +
        "\n" +
        "🈯️➡️ /djt" +
        "\n" +
        "\n" +
        "🧝‍♀️ 随机美女视频" +
        "\n" +
        "🈯️➡️ /video" +
        "\n" +
        "\n" +
        "📖 每日一言查询" +
        "\n" +
        "🈯️➡️ /yy" +
        "\n" +
        "\n" +
        "🤖 智慧聊天机器" +
        "\n" +
        "🈯️➡️ /hi⁺内容" +
        "\n" +
        "\n" +
        "💬 chatGPT查询" +
        "\n" +
        "🈯️➡️ /chat⁺内容" +
        "\n" +
        "\n" +
        "💽 蓝奏云直链解析" +
        "\n" +
        "🈯️➡️ /lan⁺蓝奏云链接&pwd=密码" +
        "\n" +
        "\n" +
        "🚶‍♂️ 微信运动刷步(Zeep Life账号)" +
        "\n" +
        "🈯️➡️ /step⁺账号&password=密码&step=步数" +
        "\n" +
        "\n" +
        "<b>接口数据来源于网络，可能存在查询拥挤情况，可稍后再试～</b>",
    },
  ];
  //未匹配的关键字回复
  let htmlReply =
    "<b>🕹 来自XiaoMaoBot的消息：</b>" +
    "\n" +
    "🪬 本次响应延迟(/delay)：" +
    getRelayTime(responseTime) +
    "\n" +
    "\n" +
    "<b>呜呜呜，关键字</b> " +
    key.replace("@Xiao_MaoMao_bot", "") +
    "<b> 匹配失败，XiaoMao已采集，正在抓紧学习！</b>";

  // 自动回复关键字判断
  let returnHtmlReply = {
    htmlReply: "",
    state: false,
    dfa: {},
  };
  //关键字排除
  let outsideWord = ["微信公众号『小帽集团』", "资源仓库", "@Xiao_MaoMao_bot"];
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
    { api: "/chat", apiId: 9 },
    { api: "/myid", apiId: 10 },
    { api: "/start", apiId: 11 },
    { api: "/help", apiId: 11 },
    { api: "/lan", apiId: 12 },
    { api: "/step", apiId: 13 },
    { api: "/reply", apiId: 14 },
    { api: "/ban", apiId: 15 },
    { api: "/unban", apiId: 16 },
    { api: "/restrict", apiId: 17 },
    { api: "/hot", apiId: 18 },
    { api: "/db", apiId: 19 },
    { api: "/xz", apiId: 20 },
  ];

  if (outsideWord.findIndex((i) => key == i) != -1) {
    htmlReply =
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟(/delay)：" +
      getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getLinkShort(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 2:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getMusic();
          returnHtmlReply.state = true;
          break;
        case 3:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getVideo(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;

          break;
        case 7:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getYiYan();
          returnHtmlReply.state = true;
          break;
        case 8:
          apiReply(useId, userJson);
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getChatBot(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 10:
          // apiReply(useId, userJson);
          htmlReply = "getTgId";
          returnHtmlReply.state = true;
          break;
        case 11:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getMiSport(getString(key, isApi(commandWord, key).api));
          returnHtmlReply.state = true;
          break;
        case 14:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getReply(userJson);
          returnHtmlReply.state = true;
          break;
        case 15:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getBanUser(userJson);
          returnHtmlReply.state = true;
          break;
        case 16:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getUnBanUser(userJson);
          returnHtmlReply.state = true;
          break;
        case 17:
          htmlReply =
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
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
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getHoroscopeList(getString(key, isApi(commandWord, key).api));
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
                "🪬 本次响应延迟(/delay)：" +
                getRelayTime(responseTime) +
                "\n" +
                "\n" +
                item.replyWord;
              returnHtmlReply.state = true;
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
            "<b>🕹 来自XiaoMaoBot的消息：</b>" +
            "\n" +
            "🪬 本次响应延迟(/delay)：" +
            getRelayTime(responseTime) +
            "\n" +
            "\n" +
            getHelloBot(key);
          returnHtmlReply.state = true;
        }
      } catch (e) {}
    }
  }

  returnHtmlReply.htmlReply = htmlReply;

  return returnHtmlReply;
}


/**
 * 解除封禁用户
 * @param userJson
 * @returns
 */
function getUnBanUser(userJson) {
  if (
    userJson.hasOwnProperty("chat") &&
    userJson.chat.id.toString() != KingId
  ) {
    returnText =
      "Bot用户封禁功能仅开放于Bot主人，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户封禁功能需要开启私人消息推送服务，请于 <a href='http://s.nfangbian.com/3mo'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
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

            let data = {
              method: "post",
              payload: payloadPostData,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data
            );

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: payloadPostData.user_id,
              text:
                "<b>📣来自XiaoMaoBot管理员的操作提醒</b>" +
                "\n" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>您已被XiaoMao管理员解除封禁，注意不要再次违规哟，" +
                "<a href='https://t.me/hSuMjrQppKE5MWU9'> XiaoMao群聊 点击加入 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              disable_web_page_preview: true,
            };
            let data2 = {
              method: "post",
              payload: payloadPostData2,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data2
            );
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
}


/**
 * 封禁用户
 * @param userJson
 * @returns
 */
function getBanUser(userJson) {
  let timeFrame = userJson.text.replace("/ban", "") || "";
  if (
    userJson.hasOwnProperty("chat") &&
    userJson.chat.id.toString() != KingId
  ) {
    returnText =
      "Bot用户封禁功能仅开放于Bot主人，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户封禁功能需要开启私人消息推送服务，请于 <a href='http://s.nfangbian.com/3mo'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
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

            let data = {
              method: "post",
              payload: payloadPostData,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data
            );

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: payloadPostData.user_id,
              text:
                "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
                "\n" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>因存在违规行为，您已被管理员封禁（封禁时长：" +
                (timeFrame ? timeFrame : "永久") +
                "），申诉请私聊" +
                "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              disable_web_page_preview: true,
            };
            let data2 = {
              method: "post",
              payload: payloadPostData2,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data2
            );
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
}

/**
 * 限制用户权限
 * @param userJson
 * @returns
 */
function getRestrictUser(userJson) {
  let timeFrame = userJson.text.replace("/restrict", "") || "";
  if (
    userJson.hasOwnProperty("chat") &&
    userJson.chat.id.toString() != KingId
  ) {
    returnText =
      "Bot用户限制功能仅开放于Bot主人，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot用户限制功能需要开启私人消息推送服务，请于 <a href='http://s.nfangbian.com/3mo'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
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

            let data = {
              method: "post",
              payload: payloadPostData,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data
            );

            let payloadPostData2 = {
              method: "sendMessage",
              chat_id: payloadPostData.user_id,
              text:
                "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
                "\n" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n" +
                "\n" +
                "<b>因存在违规行为，您已被管理员限制聊天（限制时长：" +
                (timeFrame ? timeFrame : "永久") +
                "），申诉请私聊" +
                "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
                "</b>" +
                "\n" +
                "\n" +
                "<b>===========================</b>" +
                "\n",
              parse_mode: "HTML",
              disable_web_page_preview: true,
            };
            let data2 = {
              method: "post",
              payload: payloadPostData2,
            };
            UrlFetchApp.fetch(
              "https://api.telegram.org/bot" + BOTID + "/",
              data2
            );
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
}

/**
 * 用于主人对私聊信息进行bot角色回复
 * @param userJson
 * @returns
 */
function getReply(userJson) {
  let followMessageKeyboard = [
    [
      { text: "✚ XiaoMao频道", url: "https://t.me/xiaomaoJT" },
      { text: "✚ XiaoMao群聊", url: "https://t.me/hSuMjrQppKE5MWU9" },
    ],
    [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
  ];
  let keyboardFollowParams = {
    inline_keyboard: followMessageKeyboard,
  };
  let returnText = userJson.text.replace("/reply", "") || "";
  if (
    userJson.hasOwnProperty("chat") &&
    userJson.chat.id.toString() != KingId
  ) {
    returnText =
      "Bot消息私聊功能仅开放于Bot主人，请拉取最新版XiaoMaoBot代码部署后再试吧！";
    return returnText;
  } else {
    if (!userJson.hasOwnProperty("reply_to_message")) {
      returnText =
        "未找到引用消息内容，Bot消息私聊功能需要开启私人消息推送服务，请于 <a href='http://s.nfangbian.com/3mo'><b>XiaoMao_TgBot仓库 👈</b></a> 中查看开启及使用方式。";
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
          let data = {
            method: "post",
            payload: payloadPostData,
          };
          UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);

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
}

/**
 * 用于捕捉机器人信息
 * @param key 用户消息
 * 当KingId未填写时，私人推送将不执行
 */
function pushDataToKing(key) {
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
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", dataKing);

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

    UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + BOTID + "/",
      dataKingInfo
    );
  }
}

// ------------------------- 核心逻辑函数 -----------------

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
    "5qOL54mM",
    "5b2p56Wo",
    "55yf5Lq6",
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
  return apiString.replace(/\s*/g, "").replace('@Xiao_MaoMao_bot',"");
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

// ------------------------- 核心api函数 -----------------
/**
 * 用于接口前的回复
 */
function apiReply(id, useJson) {
  let followMessageKeyboard = [
    [
      { text: "QX仓库", url: "https://github.com/xiaomaoJT/QxScript" },
      { text: "Bot仓库", url: "https://github.com/xiaomaoJT/TgBot" },
      { text: "Clash仓库", url: "https://github.com/xiaomaoJT/clash" },
    ],
    [{ text: "✚ 微信公众号『小帽集团』 ✚", callback_data: "WXGROUP" }],
  ];
  let keyboardFollowParams = {
    inline_keyboard: followMessageKeyboard,
  };
  let payloadPostData = {
    method: "sendMessage",
    chat_id: id,
    text:
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "🪬 本次响应延迟(/delay)：" +
      getRelayTime(responseTime) +
      "\n" +
      "\n" +
      "<b>您的查询指令已成功发送，本次查询过程中将受到运营商网络管制，若200s内无响应则此次通信将被异常终止，请稍后再试～</b>",
    reply_to_message_id: useJson.message_id,
    parse_mode: "HTML",
    reply_markup: JSON.stringify(keyboardFollowParams),
    disable_web_page_preview: true,
  };
  let data = {
    method: "post",
    payload: payloadPostData,
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
}

/**
 * 小米运动刷步 ✅
 * @param step
 * @returns
 */
function getMiSport(step) {
  let responseStep = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseStep = UrlFetchApp.fetch(
      "https://apis.jxcxin.cn/api/mi?user=" +
      step +
      "&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseStep.getContentText());
    returnText =
      "<b>以下数据来自API Store，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "刷步结果：" +
      (jsonData.code != 200
        ? jsonData.msg
        : jsonData.msg +
        "\n" +
        "\n" +
        "刷步账号：" +
        jsonData.user +
        "\n" +
        "当前步数" +
        jsonData.step) +
      "\n";
  } catch (e) {
    return returnText;
  }
  return returnText;
}
/**
 * 蓝奏云直链解析 ✅
 * @param link
 * @returns
 */
function getLanLink(link) {
  let responseLink = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseLink = UrlFetchApp.fetch(
      "https://apis.jxcxin.cn/api/lanzou?url=" +
      link +
      "&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseLink.getContentText());
    returnText =
      "<b>以下数据来自API Store，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "解析结果：" +
      (jsonData.code != 200
        ? jsonData.msg
        : jsonData.msg +
        "\n" +
        "\n" +
        "资源名称：" +
        jsonData.data.name +
        "\n" +
        "资源作者：" +
        jsonData.data.author +
        "\n" +
        "资源大小：" +
        jsonData.data.size +
        "\n" +
        "资源描述：" +
        jsonData.data.describe +
        "\n" +
        "资源直链地址：" +
        jsonData.data.url) +
      "\n";
  } catch (e) {
    return returnText;
  }
  return returnText;
}
/**
 * chat api✅
 * @param word
 * @returns
 */
function getChatBot(word) {
  let responseHelloBot = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  if (word == "") {
    returnText = "查询的内容为空，请在指令后面加上问题再试吧～";
    return returnText;
  }

  try {
    responseHelloBot = UrlFetchApp.fetch(
      "https://v1.apigpt.cn/?q=" +
      word +
      "&apitype=sql&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseHelloBot.getContentText());
    returnText =
      "<b>以下数据来自OpenAI&夏柔，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "<pre><code class='language-python'>" +
      jsonData.ChatGPT_Answer.toString()
        .replace("\n\n", "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;") +
      "</code></pre>";
  } catch (e) {
    return returnText;
  }
  return returnText;
}
/**
 * 聊天api✅
 * @param word
 * @returns
 */
function getHelloBot(word) {
  let responseHelloBot = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  if (word == "") {
    returnText = "查询的内容为空，请在指令后面加上问题再试吧～";
    return returnText;
  }

  try {
    responseHelloBot = UrlFetchApp.fetch(
      "http://api.qingyunke.com/api.php?key=free&appid=0&msg=" +
      word +
      "&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseHelloBot.getContentText());
    returnText =
      "<b>以下数据来自菲菲，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      jsonData.content;
  } catch (e) {
    return returnText;
  }
  return returnText;
}
/**
 * 视频查询
 * @param video
 * @returns
 */
function getVideo() {
  let returnText = "";
  let url =
    "http://tucdn.wpon.cn/api-girl/index.php?wpon=" +
    parseInt(Math.random() * 99999);
  returnText =
    "<b>以下数据来自wpon，由XiaoMao加工：</b>" +
    "\n" +
    "\n" +
    "<a href='" +
    url +
    "'>美女小姐姐视频·点击在线播放</a>" +
    "\n";

  return returnText;
}
/**
 * 毒鸡汤查询
 * @param music
 * @returns
 */
function getDuJiTang() {
  let responseDuJiTang = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseDuJiTang = UrlFetchApp.fetch(
      "https://api.btstu.cn/yan/api.php",
      {
        muteHttpExceptions: true,
      }
    );

    returnText =
      "<b>以下数据来自博天，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseDuJiTang.getContentText();
  } catch (e) {
    return returnText;
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
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";
  // return returnText;
  try {
    responseTianGou = UrlFetchApp.fetch(
      "https://cloud.qqshabi.cn/api/tiangou/api.php",
      {
        muteHttpExceptions: true,
      }
    );

    returnText =
      "<b>以下数据来自God，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseTianGou.getContentText();
  } catch (e) {
    return returnText;
  }
  return returnText;
}
/**
 * 一言查询 ✅
 * @returns
 */
function getYiYan() {
  let responseYiYan = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseYiYan = UrlFetchApp.fetch(
      "https://apis.jxcxin.cn/api/yiyan?type=json&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
      }
    );
    if (200 == responseYiYan.getResponseCode()) {
      let jsonData = JSON.parse(responseYiYan.getContentText());
      returnText =
        "<b>以下数据来自API Store，由XiaoMao加工：</b>" +
        "\n" +
        "\n" +
        jsonData.msg;
    }
  } catch (e) {
    return returnText;
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
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  if (phone == "") {
    returnText = "查询的手机号为空，请在指令后面加上手机号码再试～";
    return returnText;
  }

  try {
    responsePhone = UrlFetchApp.fetch(
      "https://www.mxnzp.com/api/mobile_location/aim_mobile?mobile=" +
      phone +
      "&app_id=rgihdrm0kslojqvm&app_secret=WnhrK251TWlUUThqaVFWbG5OeGQwdz09" +
      "&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
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
    return returnText;
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
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseMusic = UrlFetchApp.fetch(
      "https://anime-music.jijidown.com/api/v2/music",
      {
        muteHttpExceptions: true,
      }
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
      "'>点击在线播放</a>" +
      "\n";
  } catch (e) {
    return returnText;
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
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  if (link == "") {
    returnText = "查询的内容为空，请在指令后面加上链接再试吧～";
    return returnText;
  }

  try {
    let data = {
      url: link,
      token: "18a709553844b10c078c91bde2ec624f",
      mark: "来自pc网页",
      env_code: "self",
      times: new Date().getTime(),
      muteHttpExceptions: true,
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
    return returnText;
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

  if (location == "") {
    returnText = "查询的内容为空，请在指令后面加上地区再试吧～";
    return returnText;
  }

  try {
    responseWeather = UrlFetchApp.fetch(
      "https://query.asilu.com/weather/baidu/?city=" +
      location +
      "&times=" +
      new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
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
    return returnText;
  }
  return returnText;
}

/**
 * 热榜查询
 * @param type
 * @returns
 */
function getHotList(type) {
  let responseText = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  let typeObj = {};
  if (type == "") {
    returnText =
      "<b>查询的热榜参数为空，请在指令后面加上参数吧～</b>" +
      "\n" +
      "\n" +
      "🔥热榜查询" +
      "\n" +
      "虎扑热榜：/hot hp" +
      "\n" +
      "知乎热榜：/hot zh" +
      "\n" +
      "36氪热榜：/hot 36" +
      "\n" +
      "百度热榜：/hot bd" +
      "\n" +
      "B站热榜：/hot bz" +
      "\n" +
      "贴吧热榜：/hot tb" +
      "\n" +
      "微博热榜：/hot wb" +
      "\n" +
      "抖音热榜：/hot dy" +
      "\n" +
      "豆瓣热榜：/hot db" +
      "\n" +
      "微信热榜：/hot wx" +
      "\n" +
      "少数派热榜：/hot ss" +
      "\n" +
      "IT资讯热榜：/hot it" +
      "\n" +
      "IT资讯新榜：/hot itn" +
      "\n" +
      "\n" +
      "🌟趣榜查询" +
      "\n" +
      "历史上的今天：/hot ls" +
      "\n" +
      "微信美食榜：/hot ms" +
      "\n" +
      "微信财经榜：/hot cj" +
      "\n" +
      "微信搞笑榜：/hot gx" +
      "\n" +
      "微信科技榜：/hot kj" +
      "\n" +
      "微信八卦榜：/hot bg" +
      "\n" +
      "微信星座榜：/hot xz" +
      "\n" +
      "微信旅游榜：/hot ly";
    return returnText;
  } else {
    let typeList = [
      {
        name: "虎扑热榜",
        type: "hp",
        params: "huPu",
      },
      {
        name: "知乎热榜",
        type: "zh",
        params: "zhihuHot",
      },
      {
        name: "36氪热榜",
        type: "36",
        params: "36Ke",
      },
      {
        name: "百度热榜",
        type: "bd",
        params: "baiduRD",
      },
      {
        name: "B站热榜",
        type: "bz",
        params: "bili",
      },
      {
        name: "贴吧热榜",
        type: "tb",
        params: "baiduRY",
      },
      {
        name: "微博热榜",
        type: "wb",
        params: "wbHot",
      },
      {
        name: "抖音热榜",
        type: "gy",
        params: "douyinHot",
      },
      {
        name: "豆瓣热榜",
        type: "db",
        params: "douban",
      },
      {
        name: "微信热榜",
        type: "wx",
        params: "wxHot",
      },
      {
        name: "少数派热榜",
        type: "ss",
        params: "ssPai",
      },
      {
        name: "IT资讯热榜",
        type: "it",
        params: "itInfo",
      },
      {
        name: "IT资讯新榜",
        type: "itn",
        params: "itNews",
      },
      {
        name: "历史上的今天",
        type: "ls",
        params: "history",
      },
      {
        name: "微信美食榜",
        type: "ms",
        params: "wxFood",
      },
      {
        name: "微信搞笑榜",
        type: "gx",
        params: "wxJoke",
      },
      {
        name: "微信财经榜",
        type: "cj",
        params: "wxMoney",
      },
      {
        name: "微信科技榜",
        type: "kj",
        params: "wxKeJi",
      },
      {
        name: "微信八卦榜",
        type: "bg",
        params: "wxBaGua",
      },
      {
        name: "微信星座榜",
        type: "xz",
        params: "wxXingZuo",
      },
      {
        name: "微信旅游榜",
        type: "ly",
        params: "wxLvYou",
      },
    ];
    typeObj = typeList.find((el) => el.type == type);

    if (typeObj == undefined) {
      returnText = "查询参数匹配失败，请核对参数正确性！";
      return returnText;
    }
  }

  try {
    responseText = UrlFetchApp.fetch(
      "https://api.vvhan.com/api/hotlist?type=" + typeObj.params,
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseText.getContentText());

    let dealText = "内容获取失败，请稍后再试～";
    if (jsonData.success && jsonData.data.length) {
      dealText = "";
      jsonData.data.forEach((el, i) => {
        dealText =
          dealText +
          "[" +
          el.index +
          "] " +
          (el.hasOwnProperty("hot")
            ? "[" +
              (i < 5 ? "🔥" : "") +
              "热度：" +
              el.hot
                .toString()
                .replace("热度", "")
                .replace("万", "w")
                .replace("千", "k") +
              "] "
            : "") +
          "<a href='" +
          el.mobilUrl +
          "'>" +
          el.title +
          "</a>" +
          "\n";
      });
    }
    returnText =
      "<b>以下数据来自韩小韩，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "<b>🌟" +
      "以下内容来自" +
      typeObj.name +
      "</b>" +
      "\n" +
      "<b>数据更新时间：" +
      (jsonData.update_time || "-") +
      "</b>" +
      "\n" +
      "\n" +
      dealText;
  } catch (e) {
    return returnText;
  }
  return returnText;
}

/**
 * 星座运势
 * @param type 
 * @returns 
 */
function getHoroscopeList(type) {
  let responseText = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  let typeObj = {};
  let timeObj = {};
  let typeArr = [];
  let timeObjName = "";
  if (type == "") {
    returnText =
      "<b>查询的星座参数为空，请在指令后面加上参数吧～</b>" +
      "\n" +
      "\n" +
      "🌌支持的星座" +
      "\n" +
      "♈️白羊座：baiyang" +
      "\n" +
      "♉️金牛座：jinniu" +
      "\n" +
      "♊️双子座：shuangzi" +
      "\n" +
      "♌️狮子座：shizi" +
      "\n" +
      "♍️处女座：chunv" +
      "\n" +
      "♎️天秤座：tiancheng" +
      "\n" +
      "♏️天蝎座：tianxie" +
      "\n" +
      "♐️射手座：sheshou" +
      "\n" +
      "♑️摩羯座：mojie" +
      "\n" +
      "♒️水瓶座：shuiping" +
      "\n" +
      "♓️双鱼座：shuangyu" +
      "\n" +
      "\n" +
      "🌟支持的范围" +
      "\n" +
      "今日运势：D" +
      "\n" +
      "明日运势：T" +
      "\n" +
      "本周运势：W" +
      "\n" +
      "本月运势：M" +
      "\n" +
      "本年运势：Y" +
      "\n" +
      "\n" +
      "🔥星座运势查询" +
      "\n" +
      "双子座今日运势：/xz shuangzi+D" +
      "\n" +
      "天秤座本月运势：/xz tiancheng+M";
    return returnText;
  } else {
    let typeList = [
      { name: "♈️白羊座", type: "baiyang", params: "aries" },
      { name: "♉️金牛座", type: "jinniu", params: "taurus" },
      { name: "♊️双子座", type: "shuangzi", params: "gemini" },
      { name: "♋️巨蟹座", type: "juxie", params: "cancer" },
      { name: "♌️狮子座", type: "shizi", params: "leo" },
      { name: "♍️处女座", type: "chunv", params: "virgo" },
      { name: "♎️天秤座", type: "tiancheng", params: "libra" },
      { name: "♏️天蝎座", type: "tianxie", params: "scorpio" },
      { name: "♐️射手座", type: "sheshou", params: "sagittarius" },
      { name: "♑️摩羯座", type: "mojie", params: "capricorn" },
      { name: "♒️水瓶座", type: "shuiping", params: "aquarius" },
      { name: "♓️双鱼座", type: "shuangyu", params: "pisces" },
    ];
    let timeList = [
      {
        name: "今日运势",
        type: "D",
        params: "today",
      },
      {
        name: "明日运势",
        type: "T",
        params: "nextday",
      },
      {
        name: "本周运势",
        type: "W",
        params: "week",
      },
      {
        name: "本月运势",
        type: "M",
        params: "month",
      },
      {
        name: "本年运势",
        type: "Y",
        params: "year",
      },
    ];
    if (type) {
      typeArr = type.split("+");
    }

    typeObj = typeList.find((el) => el.type == typeArr[0]);
    timeObj = timeList.find((el) => el.type == (typeArr[1] || "D"));
    if (typeObj == undefined || timeObj == undefined) {
      returnText = "查询参数匹配失败，请核对参数正确性！";
      return returnText;
    }
    timeObjName = timeObj.name.slice(0, 2);
  }

  try {
    responseText = UrlFetchApp.fetch(
      "https://api.vvhan.com/api/horoscope?type=" +
        typeObj.params +
        "&time=" +
        timeObj.params,
      {
        muteHttpExceptions: true,
      }
    );
    let jsonData = JSON.parse(responseText.getContentText());

    let dealText = "内容获取失败，请稍后再试～";
    if (jsonData.success) {
      dealText = "";
      if (jsonData.data.hasOwnProperty("todo")) {
        dealText =
          dealText +
          timeObjName +
          "吉凶宜忌：" +
          "\n" +
          "✅适宜动作：" +
          (jsonData.data.todo.yi || "- ") +
          "\n" +
          "❎忌讳动作：" +
          (jsonData.data.todo.ji || "- ") +
          "\n" +
          "🔢幸运数字：" +
          (jsonData.data.luckynumber || "- ") +
          "\n" +
          "🎨幸运颜色：" +
          (jsonData.data.luckycolor || "- ") +
          "\n" +
          "❤️速配星座：" +
          (jsonData.data.luckyconstellation || "- ") +
          "\n" +
          "💔提防星座：" +
          (jsonData.data.badconstellation || "- ") +
          "\n" +
          "💮运势短评：" +
          (jsonData.data.shortcomment || "- ") +
          "\n\n";
      }
      if (jsonData.data.hasOwnProperty("fortune")) {
        let starIndex = "🌟🌟🌟🌟🌟";
        dealText =
          dealText +
          timeObjName +
          "运势：" +
          "\n" +
          "🈴综合运势：" +
          starIndex.slice(0, 2 * parseInt(jsonData.data.fortune.all)) +
          "\n" +
          "💞爱情运势：" +
          starIndex.slice(0, 2 * parseInt(jsonData.data.fortune.love)) +
          "\n" +
          "📖事业运势：" +
          starIndex.slice(0, 2 * parseInt(jsonData.data.fortune.work)) +
          "\n" +
          "💰财富运势：" +
          starIndex.slice(0, 2 * parseInt(jsonData.data.fortune.money)) +
          "\n" +
          "💪健康运势：" +
          starIndex.slice(0, 2 * parseInt(jsonData.data.fortune.health)) +
          "\n\n";
      }
      if (jsonData.data.hasOwnProperty("index")) {
        dealText =
          dealText +
          timeObjName +
          "指数：" +
          "\n" +
          "🈴综合运势：" +
          jsonData.data.index.all +
          "\n" +
          "💞爱情运势：" +
          jsonData.data.index.love +
          "\n" +
          "📖事业运势：" +
          jsonData.data.index.work +
          "\n" +
          "💰财富运势：" +
          jsonData.data.index.money +
          "\n" +
          "💪健康运势：" +
          jsonData.data.index.health +
          "\n\n";
      }
      if (jsonData.data.hasOwnProperty("fortunetext")) {
        dealText =
          dealText +
          timeObjName +
          "运势解析：" +
          "\n" +
          "🈴综合运势：" +
          jsonData.data.fortunetext.all +
          "\n" +
          "💞爱情运势：" +
          jsonData.data.fortunetext.love +
          "\n" +
          "📖事业运势：" +
          jsonData.data.fortunetext.work +
          "\n" +
          "💰财富运势：" +
          jsonData.data.fortunetext.money +
          "\n" +
          "💪健康运势：" +
          jsonData.data.fortunetext.health +
          "\n" +
          "😮‍💨解压秘诀：" +
          (jsonData.data.fortunetext.decompression || "- ") +
          "\n" +
          "😄开运秘诀：" +
          (jsonData.data.fortunetext.openluck || "- ") +
          "\n\n";
      }
    }
    returnText =
      "<b>以下数据来自韩小韩，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      typeObj.name +
      "- " +
      jsonData.data.type +
      "（" +
      jsonData.data.time +
      "）" +
      "\n" +
      "\n" +
      dealText;
  } catch (e) {
    return returnText;
  }
  return returnText;
}

/**
 * 豆瓣电影排行
 * @param params
 * @returns
 */
function getDouBan(params) {
  let responseText = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";
  try {
    responseText = UrlFetchApp.fetch("https://api.vvhan.com/api/douban", {
      muteHttpExceptions: true,
    });
    let jsonData = JSON.parse(responseText.getContentText());

    let dealText = "内容获取失败，请稍后再试～";
    if (jsonData.success && jsonData.data.length) {
      dealText = "";
      jsonData.data.forEach((el, i) => {
        dealText =
          dealText +
          "[" +
          (i + 1) +
          "] " +
          "<a href='" +
          el.info.url +
          "'>" +
          el.title +
          "</a>" +
          "\n" +
          "<b>豆瓣评分：</b>" +
          el.info.pingfen +
          "\n" +
          "<b>演员名单：</b>" +
          el.info.yanyuan +
          "\n" +
          "<b>评价人数：</b>" +
          el.info.pingjia +
          "\n" +
          "\n";
      });
    }
    returnText =
      "<b>以下数据来自韩小韩，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      "<b>🎬豆瓣电影排行</b>" +
      "\n" +
      "<b>数据更新时间：" +
      (jsonData.time || "-") +
      "</b>" +
      "\n" +
      "\n" +
      dealText;
  } catch (e) {
    return returnText;
  }
  return returnText;
}


// ------------------------- 核心存储函数 -----------------

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
    let messageInfoType = MESSAGE.message.hasOwnProperty("text")
      ? "[文本消息]"
      : MESSAGE.message.hasOwnProperty("sticker")
        ? "[表情消息]"
        : MESSAGE.message.hasOwnProperty("photo")
          ? "[图片消息]"
          : MESSAGE.message.hasOwnProperty("video")
            ? "[视频消息]"
            : MESSAGE.message.hasOwnProperty("document")
              ? "[文件消息]"
              : MESSAGE.message.hasOwnProperty("voice")
                ? "[音频消息]"
                : "[未知消息类型]";

    messageContent =
      messageInfoType +
      (messageInfoType.indexOf("[文本消息]") != -1 ? MESSAGE.message.text : "");

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

/**
 * 获取unix时间戳
 * @param t N分钟后 Nm ; N天后 Nd
 * @returns
 */
function getUnixTime(t = "") {
  let text = t.toLowerCase().replace(/\s*/g, "");
  if (text.indexOf("d") != -1) {
    let dealText = text.replace("d", "") * -1;
    return getGoneDay(dealText);
  } else if (text.indexOf("m") != -1) {
    let dealText = text.replace("m", "") * 1;
    return getGoneMinutes(dealText);
  } else {
    return 0;
  }

  // 获取N分钟后的时间
  function getGoneMinutes(params = 0) {
    let date = new Date();
    let min = date.getMinutes()+1;
    date.setMinutes(min + params);
    let y = date.getFullYear();
    let m =
      date.getMonth() + 1 < 10
        ? "0" + (date.getMonth() + 1)
        : date.getMonth() + 1;
    let d = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    let h = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    let f =
      date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    let s =
      date.getSeconds() < 10 ? "0" + date.getseconds() : date.getSeconds();
    let formatDate = y + "-" + m + "-" + d + " " + h + ":" + f + ":" + s;
    return Math.floor(new Date(formatDate).getTime() / 1000);
  }

  // 获取N天后的时间
  function getGoneDay(n = 0, yearFlag = true) {
    let myDate = new Date();
    myDate.setDate(myDate.getDate() - n);
    let month = myDate.getMonth() + 1;
    let day = myDate.getDate();
    let result =
      "" +
      (yearFlag ? myDate.getFullYear() : "") +
      "/" +
      (month < 10 ? "0" + month : month) +
      "/" +
      (day < 10 ? "0" + day : day);
    return Math.floor(new Date(result).getTime() / 1000);
  }
}

