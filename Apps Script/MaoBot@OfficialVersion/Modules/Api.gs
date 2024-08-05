/**
 * 接口类
 */

/**
 * 用于接口前的回复
 */
const apiReply = (id, useJson) => {
  let payloadPostData = {
    method: "sendMessage",
    chat_id: id,
    text:
      "<b>🕹 来自XiaoMaoBot的消息：</b>" +
      "\n" +
      "\n" +
      "<b>您的查询指令已成功发送，本次查询过程中将受到运营商网络管制，若200s内无响应则此次通信将被异常终止，请稍后再试～</b>",
    reply_to_message_id: useJson.message_id,
    parse_mode: "HTML",
    reply_markup: JSON.stringify(keyboardFollowParams),
    disable_web_page_preview: true,
  };
  linkBot({
    method: "post",
    payload: payloadPostData,
  });
};

/**
 * 骚话大全 ✅
 * @param
 * @returns
 */
const getSao = () => {
  let responseSao = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseSao = UrlFetchApp.fetch(
      "https://api.vvhan.com/api/text/sexy" + "&times=" + new Date().getTime(),
      {
        muteHttpExceptions: true,
      }
    );
    returnText =
      "<b>以下数据来自韩小韩，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseSao.getContentText();
  } catch (e) {
    return returnText;
  }
  return returnText;
};
/**
 * 蓝奏云直链解析 ✅
 * @param link
 * @returns
 */
const getLanLink = (link) => {
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
};
/**
 * chat api✅
 * @param word
 * @returns
 */
const getChatBot = (word) => {
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
};
/**
 * 聊天api✅
 * @param word
 * @returns
 */
const getHelloBot = (word) => {
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
};
/**
 * 视频查询
 * @param video
 * @returns
 */
const getVideo = () => {
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
};
/**
 * 毒鸡汤查询
 * @param music
 * @returns
 */
const getDuJiTang = () => {
  let responseDuJiTang = null;
  let returnText =
    "查询结果受运营商网络管制，本次通信被异常终止，此管控行为非人为可控，请稍后再试～";

  try {
    responseDuJiTang = UrlFetchApp.fetch("https://api.btstu.cn/yan/api.php", {
      muteHttpExceptions: true,
    });

    returnText =
      "<b>以下数据来自博天，由XiaoMao加工：</b>" +
      "\n" +
      "\n" +
      responseDuJiTang.getContentText();
  } catch (e) {
    return returnText;
  }
  return returnText;
};
/**
 * 舔狗日记生成 ✅
 * @param id
 * @returns
 */
const getTianGou = () => {
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
};
/**
 * 一言查询 ✅
 * @returns
 */
const getYiYan = () => {
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
};
/**
 * 查询手机号码归属地✅
 * @param phone
 * @returns
 */
const getPhoneWhere = (phone) => {
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
};
/**
 * 随机歌曲 ✅
 * @param text
 * @returns
 */
const getMusic = () => {
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
};
/**
 * 短网址生成✅
 * @param link
 * @returns
 */
const getLinkShort = (link) => {
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
};
/**
 * 天气api查询✅
 * @param location
 * @returns
 */
const getWeatherApi = (location) => {
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
};

/**
 * 热榜查询
 * @param type
 * @returns
 */
const getHotList = (type) => {
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
        type: "dy",
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
      "https://api.vvhan.com/api/hotlist/" + typeObj.params,
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
};

/**
 * 星座运势
 * @param type
 * @returns
 */
const getHoroscopeList = (type) => {
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
};

/**
 * 豆瓣电影排行
 * @param params
 * @returns
 */
const getDouBan = (params) => {
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
};
